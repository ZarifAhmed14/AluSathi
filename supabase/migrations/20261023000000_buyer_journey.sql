-- Shared buyer journey: offers, requests, multi-pickup purchases and auditable money records.
-- Existing browser-only marketplace records are intentionally not imported.

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('market-lot-photos', 'market-lot-photos', true, 550000, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 550000, allowed_mime_types = array['image/jpeg'];

drop policy if exists "Public potato lot photos" on storage.objects;
create policy "Public potato lot photos" on storage.objects for select to public using (bucket_id = 'market-lot-photos');
drop policy if exists "Farmers upload own potato lot photos" on storage.objects;
create policy "Farmers upload own potato lot photos" on storage.objects for insert to authenticated
with check (bucket_id = 'market-lot-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Farmers delete own potato lot photos" on storage.objects;

create table if not exists public.market_buying_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  variety text,
  quantity_kg numeric(14,3) not null check (quantity_kg > 0),
  reserved_kg numeric(14,3) not null default 0 check (reserved_kg >= 0),
  fulfilled_kg numeric(14,3) not null default 0 check (fulfilled_kg >= 0),
  target_price numeric(14,4) not null check (target_price >= 0),
  price_unit text not null default 'kg' check (price_unit in ('kg','mon','bag')),
  price_unit_kg numeric(10,3) not null default 1 check (price_unit_kg > 0),
  district text not null,
  destination text not null,
  needed_date date not null,
  notes text not null default '' check (char_length(notes) <= 500),
  status text not null default 'open' check (status in ('open','closed','fulfilled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reserved_kg + fulfilled_kg <= quantity_kg)
);

alter table public.market_profiles add column if not exists share_contact boolean not null default false;
alter table public.market_lots add column if not exists asking_price_min numeric(14,2);
alter table public.market_lots add column if not exists asking_price_max numeric(14,2);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='market_lots_price_range_check') then
    alter table public.market_lots add constraint market_lots_price_range_check check (
      (asking_price_min is null and asking_price_max is null) or
      (asking_price_min is not null and asking_price_max is not null and asking_price_min >= 0 and asking_price_max >= asking_price_min)
    );
  end if;
end $$;
alter table public.market_offers add column if not exists latest_proposer uuid references auth.users(id);
alter table public.market_offers add column if not exists awaiting_user_id uuid references auth.users(id);
alter table public.market_offers add column if not exists buying_request_id uuid references public.market_buying_requests(id);
alter table public.market_offers add column if not exists price_unit text not null default 'kg' check (price_unit in ('kg','mon','bag'));
alter table public.market_offers add column if not exists price_unit_kg numeric(10,3) not null default 1 check (price_unit_kg > 0);
alter table public.market_offers add column if not exists destination text not null default '';
alter table public.market_offers add column if not exists notes text not null default '' check (char_length(notes) <= 500);
update public.market_offers set latest_proposer = buyer_id, awaiting_user_id = seller_id where latest_proposer is null or awaiting_user_id is null;
alter table public.market_offers alter column latest_proposer set not null;
alter table public.market_offers alter column awaiting_user_id set not null;

alter table public.market_purchases add column if not exists collection_closed boolean not null default false;
alter table public.market_purchases add column if not exists closed_at timestamptz;
alter table public.market_purchases add column if not exists collected_net_kg numeric(14,3) not null default 0 check (collected_net_kg >= 0);
alter table public.market_purchases add column if not exists accepted_kg numeric(14,3) not null default 0 check (accepted_kg >= 0);
alter table public.market_purchases add column if not exists refund_due numeric(14,2) not null default 0 check (refund_due >= 0);
alter table public.market_purchases add column if not exists cancelled_at timestamptz;
alter table public.market_purchases add column if not exists buying_request_id uuid references public.market_buying_requests(id);
alter table public.market_purchases add column if not exists price_unit text not null default 'kg' check (price_unit in ('kg','mon','bag'));
alter table public.market_purchases add column if not exists price_unit_kg numeric(10,3) not null default 1 check (price_unit_kg > 0);

create table if not exists public.market_offer_revisions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.market_offers(id) on delete cascade,
  revision integer not null check (revision > 0),
  proposer_id uuid not null references auth.users(id),
  awaiting_user_id uuid not null references auth.users(id),
  terms jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (offer_id, revision)
);

create table if not exists public.market_pickups (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.market_purchases(id) on delete cascade,
  reported_by uuid not null references auth.users(id),
  pickup_date date not null,
  gross_kg numeric(14,3) not null check (gross_kg > 0),
  tare_kg numeric(14,3) not null default 0 check (tare_kg >= 0),
  net_kg numeric(14,3) not null check (net_kg >= 0),
  deduction_kg numeric(14,3) not null default 0 check (deduction_kg >= 0),
  accepted_kg numeric(14,3) not null check (accepted_kg >= 0),
  zero_weight_reason text not null default '' check (char_length(zero_weight_reason) <= 200),
  note text not null default '' check (char_length(note) <= 500),
  receipt_path text,
  status text not null default 'pending' check (status in ('pending','confirmed','disputed','corrected','cancelled')),
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  check (net_kg = gross_kg - tare_kg),
  check (accepted_kg = net_kg - deduction_kg)
);
alter table public.market_payment_reports add column if not exists idempotency_key uuid;
create unique index if not exists market_payment_reports_idempotency_idx on public.market_payment_reports(idempotency_key) where idempotency_key is not null;

create table if not exists public.market_expenses (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.market_purchases(id) on delete cascade,
  pickup_id uuid references public.market_pickups(id) on delete cascade,
  paid_by uuid not null references auth.users(id),
  label text not null check (char_length(label) between 1 and 80),
  amount numeric(14,2) check (amount is null or amount >= 0),
  status text not null default 'estimated' check (status in ('estimated','actual','unknown')),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  check ((status = 'unknown' and amount is null) or (status <> 'unknown' and amount is not null))
);

create table if not exists public.market_purchase_actions (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.market_purchases(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  action text not null check (action in ('cancel_purchase','close_remainder','correct_pickup','resolve_disagreement')),
  target_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','declined','completed')),
  response_by uuid references auth.users(id),
  idempotency_key uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table public.market_buying_requests enable row level security;
alter table public.market_offer_revisions enable row level security;
alter table public.market_pickups enable row level security;
alter table public.market_expenses enable row level security;
alter table public.market_purchase_actions enable row level security;

drop policy if exists "Buying requests visible" on public.market_buying_requests;
create policy "Buying requests visible" on public.market_buying_requests for select to authenticated using (status = 'open' or (select auth.uid()) = buyer_id);
drop policy if exists "Offer revisions participants" on public.market_offer_revisions;
create policy "Offer revisions participants" on public.market_offer_revisions for select to authenticated using (exists (select 1 from public.market_offers o where o.id = offer_id and (select auth.uid()) in (o.buyer_id,o.seller_id)));
drop policy if exists "Pickups participants" on public.market_pickups;
create policy "Pickups participants" on public.market_pickups for select to authenticated using (exists (select 1 from public.market_purchases p where p.id = purchase_id and (select auth.uid()) in (p.buyer_id,p.seller_id)));
drop policy if exists "Expenses participants" on public.market_expenses;
create policy "Expenses participants" on public.market_expenses for select to authenticated using (exists (select 1 from public.market_purchases p where p.id = purchase_id and (select auth.uid()) in (p.buyer_id,p.seller_id)));
drop policy if exists "Purchase actions participants" on public.market_purchase_actions;
create policy "Purchase actions participants" on public.market_purchase_actions for select to authenticated using (exists (select 1 from public.market_purchases p where p.id = purchase_id and (select auth.uid()) in (p.buyer_id,p.seller_id)));

-- Private phone access is opt-in and scoped to the farmer's lot.
create or replace function public.market_farmer_contact(p_lot_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_seller uuid; v_contact jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select seller_id into v_seller from public.market_lots where id = p_lot_id and published;
  if v_seller is null then raise exception 'record not found'; end if;
  if auth.uid() not in (select buyer_id from public.market_offers where lot_id=p_lot_id union select buyer_id from public.market_purchases where lot_id=p_lot_id) then
    raise exception 'contact is available after an offer';
  end if;
  select jsonb_build_object('contact_name',contact_name,'mobile',mobile) into v_contact from public.market_profiles where user_id=v_seller and share_contact;
  return coalesce(v_contact,'{}'::jsonb);
end $$;

create or replace function public.market_offer_contact(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.market_offers; v_other uuid; v_contact jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into o from public.market_offers where id=p_offer_id;
  if not found or auth.uid() not in (o.buyer_id,o.seller_id) then raise exception 'record not found'; end if;
  v_other := case when auth.uid()=o.buyer_id then o.seller_id else o.buyer_id end;
  select jsonb_build_object('contact_name',contact_name,'mobile',mobile,'business_name',business_name)
    into v_contact from public.market_profiles where user_id=v_other and share_contact;
  return coalesce(v_contact,'{}'::jsonb);
end $$;

create or replace function public.market_create_request(p_request jsonb, p_request_id uuid)
returns public.market_buying_requests language plpgsql security definer set search_path = '' as $$
declare r public.market_buying_requests;
begin
  if auth.uid() is null or p_request_id is null then raise exception 'authentication required'; end if;
  if coalesce((p_request->>'quantity_kg')::numeric,0) <= 0 or coalesce((p_request->>'target_price')::numeric,-1) < 0 then raise exception 'invalid request'; end if;
  select * into r from public.market_buying_requests where id=p_request_id;
  if found then
    if r.buyer_id<>auth.uid()
      or r.variety is distinct from nullif(left(trim(coalesce(p_request->>'variety','')),80),'')
      or r.quantity_kg<>(p_request->>'quantity_kg')::numeric
      or r.target_price<>(p_request->>'target_price')::numeric
      or r.price_unit is distinct from coalesce(p_request->>'price_unit','kg')
      or r.price_unit_kg is distinct from coalesce((p_request->>'price_unit_kg')::numeric,1)
      or r.district is distinct from left(trim(p_request->>'district'),60)
      or r.destination is distinct from left(trim(p_request->>'destination'),180)
      or r.needed_date is distinct from (p_request->>'needed_date')::date
      or r.notes is distinct from left(coalesce(p_request->>'notes',''),500) then raise exception 'request id already used'; end if;
    return r;
  end if;
  insert into public.market_buying_requests(id,buyer_id,variety,quantity_kg,target_price,price_unit,price_unit_kg,district,destination,needed_date,notes)
  values(p_request_id,auth.uid(),nullif(left(trim(coalesce(p_request->>'variety','')),80),''),(p_request->>'quantity_kg')::numeric,(p_request->>'target_price')::numeric,
    coalesce(p_request->>'price_unit','kg'),coalesce((p_request->>'price_unit_kg')::numeric,1),left(trim(p_request->>'district'),60),left(trim(p_request->>'destination'),180),(p_request->>'needed_date')::date,left(coalesce(p_request->>'notes',''),500)) returning * into r;
  insert into public.market_history(purchase_id,actor_id,event_type,payload) values(null,auth.uid(),'buying_request_created',jsonb_build_object('request_id',r.id));
  return r;
end $$;

create or replace function public.market_send_offer_v2(p_lot_id uuid,p_terms jsonb,p_idempotency_key uuid,p_request_id uuid default null)
returns public.market_offers language plpgsql security definer set search_path = '' as $$
declare lot public.market_lots; r public.market_buying_requests; v_buyer uuid := auth.uid(); v_qty numeric; v_offer public.market_offers; v_terms jsonb; v_now timestamptz := now();
begin
  if v_buyer is null or p_idempotency_key is null then raise exception 'authentication required'; end if;
  v_qty := (p_terms->>'quantity_kg')::numeric;
  if v_qty is null or v_qty <= 0 or v_qty > 1000000 or (p_terms->>'price')::numeric < 0 then raise exception 'invalid terms'; end if;
  select * into v_offer from public.market_offers where buyer_id=v_buyer and idempotency_key=p_idempotency_key::text;
  if found then
    if v_offer.lot_id<>p_lot_id or v_offer.quantity_kg<>v_qty or v_offer.price_kg<>(p_terms->>'price')::numeric then raise exception 'request id already used'; end if;
    return v_offer;
  end if;
  select * into lot from public.market_lots where id=p_lot_id and published and seller_id<>v_buyer for update;
  if not found or lot.quantity_kg-lot.reserved_kg < v_qty then raise exception 'lot unavailable'; end if;
  if p_request_id is not null then
    select * into r from public.market_buying_requests where id=p_request_id and status='open' for update;
    if not found or r.buyer_id<>v_buyer or r.quantity_kg-r.reserved_kg-r.fulfilled_kg < v_qty then raise exception 'request unavailable'; end if;
  end if;
  v_terms := p_terms || jsonb_build_object('price_unit',coalesce(p_terms->>'price_unit','kg'),'price_unit_kg',coalesce(p_terms->>'price_unit_kg','1'));
  insert into public.market_offers(lot_id,buyer_id,seller_id,quantity_kg,price_kg,pickup_date,pickup_responsibility,payment_timing,payment_method,expires_at,terms,buyer_costs,idempotency_key,latest_proposer,awaiting_user_id,buying_request_id,price_unit,price_unit_kg,destination,notes)
  values(p_lot_id,v_buyer,lot.seller_id,v_qty,(p_terms->>'price')::numeric,nullif(p_terms->>'pickup_date','')::date,coalesce(p_terms->>'pickup_responsibility','buyer'),coalesce(p_terms->>'payment_timing','on_collection'),nullif(p_terms->>'payment_method',''),v_now+interval '48 hours',v_terms,coalesce(p_terms->'buyer_costs','{}'),p_idempotency_key::text,v_buyer,lot.seller_id,p_request_id,coalesce(p_terms->>'price_unit','kg'),coalesce((p_terms->>'price_unit_kg')::numeric,1),left(coalesce(p_terms->>'destination',''),180),left(coalesce(p_terms->>'notes',''),500)) returning * into v_offer;
  insert into public.market_offer_revisions(offer_id,revision,proposer_id,awaiting_user_id,terms,expires_at) values(v_offer.id,1,v_buyer,lot.seller_id,v_terms,v_offer.expires_at);
  insert into public.market_history(purchase_id,actor_id,event_type,payload) values(null,v_buyer,'offer_sent',jsonb_build_object('offer_id',v_offer.id,'revision',1));
  return v_offer;
end $$;

create or replace function public.market_propose_request(p_request_id uuid,p_lot_id uuid,p_terms jsonb,p_idempotency_key uuid)
returns public.market_offers language plpgsql security definer set search_path = '' as $$
declare lot public.market_lots; r public.market_buying_requests; o public.market_offers; v_qty numeric; v_now timestamptz := now(); v_terms jsonb;
begin
  if auth.uid() is null or p_idempotency_key is null then raise exception 'authentication required'; end if;
  v_qty := (p_terms->>'quantity_kg')::numeric;
  if v_qty is null or v_qty<=0 or (p_terms->>'price')::numeric<0 then raise exception 'invalid terms'; end if;
  select * into r from public.market_buying_requests where id=p_request_id for update;
  if not found or r.status<>'open' or r.buyer_id=auth.uid() then raise exception 'request unavailable'; end if;
  select * into o from public.market_offers where buyer_id=r.buyer_id and idempotency_key=p_idempotency_key::text;
  if found then
    if o.lot_id<>p_lot_id or o.seller_id<>auth.uid() or o.buying_request_id<>r.id or o.quantity_kg<>v_qty or o.price_kg<>(p_terms->>'price')::numeric then raise exception 'request id already used'; end if;
    return o;
  end if;
  if r.quantity_kg-r.reserved_kg-r.fulfilled_kg<v_qty then raise exception 'request unavailable'; end if;
  select * into lot from public.market_lots where id=p_lot_id and seller_id=auth.uid() and published for update;
  if not found or lot.quantity_kg-lot.reserved_kg<v_qty then raise exception 'lot unavailable'; end if;
  v_terms := p_terms || jsonb_build_object('price_unit',coalesce(p_terms->>'price_unit','kg'),'price_unit_kg',coalesce(p_terms->>'price_unit_kg','1'));
  insert into public.market_offers(lot_id,buyer_id,seller_id,quantity_kg,price_kg,pickup_date,pickup_responsibility,payment_timing,payment_method,expires_at,terms,idempotency_key,latest_proposer,awaiting_user_id,buying_request_id,price_unit,price_unit_kg,destination,notes)
  values(p_lot_id,r.buyer_id,auth.uid(),v_qty,(p_terms->>'price')::numeric,nullif(p_terms->>'pickup_date','')::date,coalesce(p_terms->>'pickup_responsibility','farmer'),coalesce(p_terms->>'payment_timing','on_collection'),nullif(p_terms->>'payment_method',''),v_now+interval '48 hours',v_terms,p_idempotency_key::text,auth.uid(),r.buyer_id,r.id,coalesce(p_terms->>'price_unit','kg'),coalesce((p_terms->>'price_unit_kg')::numeric,1),left(coalesce(p_terms->>'destination',r.destination),180),left(coalesce(p_terms->>'notes',''),500)) returning * into o;
  insert into public.market_offer_revisions(offer_id,revision,proposer_id,awaiting_user_id,terms,expires_at) values(o.id,1,auth.uid(),r.buyer_id,v_terms,o.expires_at);
  insert into public.market_history(purchase_id,actor_id,event_type,payload) values(null,auth.uid(),'request_proposal_sent',jsonb_build_object('request_id',r.id,'offer_id',o.id));
  return o;
end $$;

create or replace function public.market_respond_offer_v2(p_offer_id uuid,p_action text,p_expected_revision integer,p_terms jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.market_offers; lot public.market_lots; req public.market_buying_requests; p public.market_purchases; v_terms jsonb; v_actor uuid := auth.uid(); v_revision integer;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  select * into o from public.market_offers where id=p_offer_id for update;
  if not found or v_actor not in (o.buyer_id,o.seller_id) then raise exception 'record not found'; end if;
  if o.version<>p_expected_revision then raise exception 'stale offer'; end if;
  if p_action='withdraw' then
    if v_actor<>o.latest_proposer or o.status not in ('pending','counter') then raise exception 'withdrawal not allowed'; end if;
  elsif o.awaiting_user_id is distinct from v_actor or o.status not in ('pending','counter') then
    raise exception 'response not required';
  end if;
  if o.expires_at <= now() and o.status in ('pending','counter') then
    update public.market_offers set status='expired',version=version+1,updated_at=now() where id=o.id returning * into o;
    return jsonb_build_object('offer',to_jsonb(o),'expired',true);
  end if;
  if p_action='counter' then
    if coalesce((p_terms->>'quantity_kg')::numeric,0)<=0 or (p_terms->>'quantity_kg')::numeric>1000000
      or coalesce((p_terms->>'price')::numeric,-1)<0 or coalesce((p_terms->>'price_unit_kg')::numeric,0)<=0
      or coalesce(p_terms->>'price_unit','kg') not in ('kg','mon','bag') then raise exception 'invalid terms'; end if;
    v_terms := p_terms || jsonb_build_object('price_unit',coalesce(p_terms->>'price_unit',o.price_unit),'price_unit_kg',coalesce(p_terms->>'price_unit_kg',o.price_unit_kg::text));
    v_revision := o.version+1;
    update public.market_offers set quantity_kg=(v_terms->>'quantity_kg')::numeric,price_kg=(v_terms->>'price')::numeric,pickup_date=nullif(v_terms->>'pickup_date','')::date,pickup_responsibility=coalesce(v_terms->>'pickup_responsibility','buyer'),payment_timing=coalesce(v_terms->>'payment_timing','on_collection'),payment_method=nullif(v_terms->>'payment_method',''),terms=v_terms,price_unit=v_terms->>'price_unit',price_unit_kg=(v_terms->>'price_unit_kg')::numeric,destination=left(coalesce(v_terms->>'destination',''),180),notes=left(coalesce(v_terms->>'notes',''),500),latest_proposer=v_actor,awaiting_user_id=case when v_actor=o.buyer_id then o.seller_id else o.buyer_id end,status='counter',expires_at=now()+interval '48 hours',version=v_revision,updated_at=now() where id=o.id returning * into o;
    insert into public.market_offer_revisions(offer_id,revision,proposer_id,awaiting_user_id,terms,expires_at) values(o.id,v_revision,v_actor,o.awaiting_user_id,v_terms,o.expires_at);
    insert into public.market_history(purchase_id,actor_id,event_type,payload) values(null,v_actor,'offer_countered',jsonb_build_object('offer_id',o.id,'revision',v_revision));
    return jsonb_build_object('offer',to_jsonb(o));
  elsif p_action='withdraw' then
    update public.market_offers set status='withdrawn',version=version+1,updated_at=now() where id=o.id returning * into o;
    insert into public.market_history(purchase_id,actor_id,event_type,payload) values(null,v_actor,'offer_withdrawn',jsonb_build_object('offer_id',o.id));
    return jsonb_build_object('offer',to_jsonb(o));
  elsif p_action='decline' then
    update public.market_offers set status='rejected',version=version+1,updated_at=now() where id=o.id returning * into o;
    insert into public.market_history(purchase_id,actor_id,event_type,payload) values(null,v_actor,'offer_declined',jsonb_build_object('offer_id',o.id));
    return jsonb_build_object('offer',to_jsonb(o));
  elsif p_action='accept' then
    if o.buying_request_id is not null then
      select * into req from public.market_buying_requests where id=o.buying_request_id for update;
      if not found or req.status<>'open' or req.quantity_kg-req.reserved_kg-req.fulfilled_kg<o.quantity_kg then raise exception 'request allocation unavailable'; end if;
    end if;
    select * into lot from public.market_lots where id=o.lot_id for update;
    if not found or lot.quantity_kg-lot.reserved_kg<o.quantity_kg then raise exception 'lot unavailable'; end if;
    if o.buying_request_id is not null then
      update public.market_buying_requests set reserved_kg=reserved_kg+o.quantity_kg,updated_at=now() where id=req.id;
    end if;
    update public.market_lots set reserved_kg=reserved_kg+o.quantity_kg,version=version+1,updated_at=now() where id=lot.id;
    update public.market_offers set status='agreed',version=version+1,updated_at=now() where id=o.id returning * into o;
    v_terms := o.terms || jsonb_build_object('quantity_kg',o.quantity_kg,'price',o.price_kg,'price_unit',o.price_unit,'price_unit_kg',o.price_unit_kg);
    insert into public.market_purchases(offer_id,lot_id,buyer_id,seller_id,agreed_quantity_kg,price_kg,terms,buying_request_id,price_unit,price_unit_kg)
      values(o.id,o.lot_id,o.buyer_id,o.seller_id,o.quantity_kg,o.price_kg,v_terms,o.buying_request_id,o.price_unit,o.price_unit_kg) returning * into p;
    insert into public.market_history(purchase_id,actor_id,event_type,payload) values(p.id,v_actor,'purchase_agreed',jsonb_build_object('offer_id',o.id,'terms',v_terms));
    return jsonb_build_object('offer',to_jsonb(o),'purchase',to_jsonb(p));
  end if;
  raise exception 'invalid action';
end $$;

create or replace function public.market_report_pickup(p_purchase_id uuid,p_pickup jsonb,p_idempotency_key uuid)
returns public.market_pickups language plpgsql security definer set search_path = '' as $$
declare p public.market_purchases; r public.market_pickups; v_gross numeric; v_tare numeric; v_net numeric; v_deduct numeric; v_pending numeric; v_confirmed numeric;
begin
  if auth.uid() is null or p_idempotency_key is null then raise exception 'authentication required'; end if;
  select * into p from public.market_purchases where id=p_purchase_id for update;
  if not found or auth.uid() not in (p.buyer_id,p.seller_id) or p.collection_closed or p.cancelled_at is not null then raise exception 'purchase unavailable'; end if;
  select * into r from public.market_pickups where idempotency_key=p_idempotency_key;
  if found then
    if r.purchase_id<>p.id or r.reported_by<>auth.uid() then raise exception 'request id already used'; end if;
    return r;
  end if;
  v_gross := (p_pickup->>'gross_kg')::numeric; v_tare := coalesce((p_pickup->>'tare_kg')::numeric,0);
  v_net := v_gross-v_tare;
  v_deduct := case when coalesce(p_pickup->>'deduction_type','kg')='percent' then round(v_net*coalesce((p_pickup->>'deduction_value')::numeric,0)/100,3) else coalesce((p_pickup->>'deduction_value')::numeric,0) end;
  if v_gross<=0 or v_tare<0 or v_net<0 or v_deduct<0 or v_deduct>v_net then raise exception 'invalid weight'; end if;
  select coalesce(sum(net_kg),0) into v_pending from public.market_pickups where purchase_id=p.id and status='pending';
  select coalesce(sum(net_kg),0) into v_confirmed from public.market_pickups where purchase_id=p.id and status in ('confirmed','corrected');
  if v_pending+v_confirmed+v_net>p.agreed_quantity_kg then raise exception 'pickup exceeds remaining quantity'; end if;
  if v_net-v_deduct=0 and coalesce(trim(p_pickup->>'zero_weight_reason'),'')='' then raise exception 'reason required for zero accepted weight'; end if;
  insert into public.market_pickups(purchase_id,reported_by,pickup_date,gross_kg,tare_kg,net_kg,deduction_kg,accepted_kg,zero_weight_reason,note,idempotency_key)
  values(p.id,auth.uid(),(p_pickup->>'pickup_date')::date,v_gross,v_tare,v_net,v_deduct,v_net-v_deduct,left(coalesce(p_pickup->>'zero_weight_reason',''),200),left(coalesce(p_pickup->>'note',''),500),p_idempotency_key) returning * into r;
  insert into public.market_history(purchase_id,actor_id,event_type,payload) values(p.id,auth.uid(),'pickup_reported',jsonb_build_object('pickup_id',r.id,'net_kg',r.net_kg,'accepted_kg',r.accepted_kg));
  return r;
end $$;

create or replace function public.market_confirm_pickup(p_pickup_id uuid)
returns public.market_pickups language plpgsql security definer set search_path = '' as $$
declare r public.market_pickups; p public.market_purchases; l public.market_lots; req public.market_buying_requests;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into r from public.market_pickups where id=p_pickup_id for update;
  if not found or r.status<>'pending' or r.reported_by=auth.uid() then raise exception 'confirmation not allowed'; end if;
  select * into p from public.market_purchases where id=r.purchase_id for update;
  if auth.uid() not in (p.buyer_id,p.seller_id) then raise exception 'record not found'; end if;
  select * into l from public.market_lots where id=p.lot_id for update;
  if l.reserved_kg<r.net_kg then raise exception 'reservation mismatch'; end if;
  update public.market_lots set reserved_kg=reserved_kg-r.net_kg,quantity_kg=greatest(0,quantity_kg-r.net_kg),version=version+1,updated_at=now() where id=l.id;
  update public.market_pickups set status='confirmed',confirmed_by=auth.uid(),confirmed_at=now() where id=r.id returning * into r;
  update public.market_purchases set collected_net_kg=collected_net_kg+r.net_kg,accepted_kg=accepted_kg+r.accepted_kg,version=version+1,updated_at=now() where id=p.id returning * into p;
  if p.buying_request_id is not null then
    select * into req from public.market_buying_requests where id=p.buying_request_id for update;
    update public.market_buying_requests set reserved_kg=greatest(0,reserved_kg-r.net_kg),fulfilled_kg=fulfilled_kg+r.net_kg,status=case when fulfilled_kg+r.net_kg+reserved_kg-r.net_kg>=quantity_kg then 'fulfilled' else status end,updated_at=now() where id=req.id;
  end if;
  if p.collected_net_kg >= p.agreed_quantity_kg then update public.market_purchases set collection_closed=true,closed_at=now() where id=p.id; end if;
  insert into public.market_history(purchase_id,actor_id,event_type,payload) values(p.id,auth.uid(),'pickup_confirmed',jsonb_build_object('pickup_id',r.id,'net_kg',r.net_kg,'accepted_kg',r.accepted_kg));
  perform public.market_refresh_purchase_stage(p.id);
  return r;
end $$;

create or replace function public.market_report_payment_v2(p_purchase_id uuid,p_amount numeric,p_method text,p_reference text,p_payment_date date,p_idempotency_key uuid)
returns public.market_payment_reports language plpgsql security definer set search_path = '' as $$
declare p public.market_purchases; report public.market_payment_reports; v_due numeric;
begin
  if auth.uid() is null or p_idempotency_key is null then raise exception 'authentication required'; end if;
  select * into p from public.market_purchases where id=p_purchase_id for update;
  if not found or auth.uid() not in (p.buyer_id,p.seller_id) or p_amount<=0 then raise exception 'invalid payment'; end if;
  if p_method in ('mfs','bank') and coalesce(trim(p_reference),'')='' then raise exception 'reference required'; end if;
  select * into report from public.market_payment_reports where idempotency_key=p_idempotency_key;
  if found then
    if report.purchase_id<>p.id or report.reported_by<>auth.uid() then raise exception 'duplicate request id'; end if;
    return report;
  end if;
  select coalesce(sum(amount),0) into v_due from public.market_payment_reports where purchase_id=p.id and status in ('reported','confirmed') and reported_by=auth.uid();
  if auth.uid()=p.buyer_id and p_amount > greatest(0,(p.agreed_quantity_kg*p.price_kg/p.price_unit_kg)-v_due) then raise exception 'payment exceeds agreed estimate'; end if;
  if auth.uid()=p.seller_id and p_amount > greatest(0,p.refund_due-v_due) then raise exception 'refund exceeds confirmed due'; end if;
  insert into public.market_payment_reports(purchase_id,reported_by,amount,payment_date,method,reference,idempotency_key)
  values(p.id,auth.uid(),p_amount,p_payment_date,p_method,left(coalesce(p_reference,''),80),p_idempotency_key) returning * into report;
  insert into public.market_history(purchase_id,actor_id,event_type,payload) values(p.id,auth.uid(),case when auth.uid()=p.buyer_id then 'payment_reported' else 'refund_reported' end,jsonb_build_object('payment_id',report.id,'amount',report.amount));
  return report;
end $$;

create or replace function public.market_confirm_payment_v2(p_report_id uuid)
returns public.market_payment_reports language plpgsql security definer set search_path = '' as $$
declare r public.market_payment_reports; p public.market_purchases;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into r from public.market_payment_reports where id=p_report_id for update;
  if not found or r.status<>'reported' then raise exception 'confirmation unavailable'; end if;
  select * into p from public.market_purchases where id=r.purchase_id for update;
  if (r.reported_by=p.buyer_id and auth.uid()<>p.seller_id) or (r.reported_by=p.seller_id and auth.uid()<>p.buyer_id) then raise exception 'confirmation not allowed'; end if;
  update public.market_payment_reports set status='confirmed',confirmed_at=now() where id=r.id returning * into r;
  insert into public.market_history(purchase_id,actor_id,event_type,payload) values(p.id,auth.uid(),'payment_confirmed',jsonb_build_object('payment_id',r.id,'amount',r.amount));
  perform public.market_refresh_purchase_stage(p.id);
  return r;
end $$;

create or replace function public.market_request_purchase_action(p_purchase_id uuid,p_action text,p_payload jsonb default '{}'::jsonb,p_target_id uuid default null)
returns public.market_purchase_actions language plpgsql security definer set search_path = '' as $$
declare p public.market_purchases; a public.market_purchase_actions;
begin
  if auth.uid() is null or p_action not in ('cancel_purchase','close_remainder','correct_pickup','resolve_disagreement') then raise exception 'invalid action'; end if;
  select * into p from public.market_purchases where id=p_purchase_id for update;
  if not found or auth.uid() not in (p.buyer_id,p.seller_id) then raise exception 'record not found'; end if;
  if exists(select 1 from public.market_pickups where purchase_id=p.id and status='pending') then raise exception 'resolve pending pickups first'; end if;
  if p_action in ('cancel_purchase','close_remainder') and exists(select 1 from public.market_payment_reports where purchase_id=p.id and status='reported') then raise exception 'resolve pending payments first'; end if;
  if p_action='correct_pickup' and (p_target_id is null or not exists(select 1 from public.market_pickups where id=p_target_id and purchase_id=p.id)) then raise exception 'pickup not found'; end if;
  if p_action='resolve_disagreement' and (p_target_id is null or not exists(select 1 from public.market_disagreements where id=p_target_id and purchase_id=p.id and resolved_at is null)) then raise exception 'disagreement not found'; end if;
  insert into public.market_purchase_actions(purchase_id,requested_by,action,target_id,payload) values(p.id,auth.uid(),p_action,p_target_id,coalesce(p_payload,'{}')) returning * into a;
  insert into public.market_history(purchase_id,actor_id,event_type,payload) values(p.id,auth.uid(),'action_requested',jsonb_build_object('action_id',a.id,'action',p_action));
  return a;
end $$;

create or replace function public.market_respond_purchase_action(p_action_id uuid,p_approve boolean)
returns public.market_purchase_actions language plpgsql security definer set search_path = '' as $$
declare a public.market_purchase_actions; p public.market_purchases; l public.market_lots; v_release numeric;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into a from public.market_purchase_actions where id=p_action_id for update;
  if not found or a.status<>'pending' or a.requested_by=auth.uid() then raise exception 'response unavailable'; end if;
  select * into p from public.market_purchases where id=a.purchase_id for update;
  if auth.uid() not in (p.buyer_id,p.seller_id) then raise exception 'record not found'; end if;
  if not p_approve then update public.market_purchase_actions set status='declined',response_by=auth.uid(),responded_at=now() where id=a.id returning * into a;
  else
    if a.action in ('cancel_purchase','close_remainder') then
      select * into l from public.market_lots where id=p.lot_id for update;
      v_release := greatest(0,p.agreed_quantity_kg-p.collected_net_kg);
      update public.market_lots set reserved_kg=greatest(0,reserved_kg-v_release),version=version+1,updated_at=now() where id=l.id;
      if p.buying_request_id is not null then update public.market_buying_requests set reserved_kg=greatest(0,reserved_kg-v_release),updated_at=now() where id=p.buying_request_id; end if;
      update public.market_purchases set collection_closed=true,closed_at=now(),cancelled_at=case when a.action='cancel_purchase' then now() else cancelled_at end,stage=case when a.action='cancel_purchase' then 'cancelled' else 'received' end,refund_due=case when a.action='cancel_purchase' then greatest(0,(select coalesce(sum(amount),0) from public.market_payment_reports where purchase_id=p.id and reported_by=p.buyer_id and status='confirmed')-(select coalesce(sum(amount),0) from public.market_payment_reports where purchase_id=p.id and reported_by=p.seller_id and status='confirmed')-(p.accepted_kg*p.price_kg/p.price_unit_kg)) else refund_due end,version=version+1,updated_at=now() where id=p.id;
    elsif a.action='correct_pickup' then
      update public.market_pickups set status='disputed' where id=a.target_id and status in ('confirmed','corrected');
    elsif a.action='resolve_disagreement' then
      update public.market_disagreements set resolved_at=now() where id=a.target_id and reported_by<>auth.uid();
    end if;
    update public.market_purchase_actions set status='approved',response_by=auth.uid(),responded_at=now() where id=a.id returning * into a;
  end if;
  insert into public.market_history(purchase_id,actor_id,event_type,payload) values(p.id,auth.uid(),'action_responded',jsonb_build_object('action_id',a.id,'status',a.status));
  return a;
end $$;

create or replace function public.market_add_expense(p_purchase_id uuid,p_pickup_id uuid,p_label text,p_amount numeric,p_status text,p_note text)
returns public.market_expenses language plpgsql security definer set search_path = '' as $$
declare p public.market_purchases; e public.market_expenses;
begin
  if auth.uid() is null or p_amount<0 or p_status not in ('estimated','actual','unknown') then raise exception 'invalid expense'; end if;
  select * into p from public.market_purchases where id=p_purchase_id;
  if not found or auth.uid()<>p.buyer_id then raise exception 'record not found'; end if;
  if p_pickup_id is not null and not exists(select 1 from public.market_pickups where id=p_pickup_id and purchase_id=p.id) then raise exception 'pickup not found'; end if;
  insert into public.market_expenses(purchase_id,pickup_id,paid_by,label,amount,status,note) values(p.id,p_pickup_id,auth.uid(),left(trim(p_label),80),case when p_status='unknown' then null else p_amount end,p_status,left(coalesce(p_note,''),300)) returning * into e;
  insert into public.market_history(purchase_id,actor_id,event_type,payload) values(p.id,auth.uid(),'expense_added',jsonb_build_object('expense_id',e.id,'status',e.status));
  return e;
end $$;

create or replace function public.market_refresh_purchase_stage(p_purchase_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.market_purchases; payable numeric; confirmed numeric; has_open boolean;
begin
  select * into p from public.market_purchases where id=p_purchase_id for update;
  if not found or p.cancelled_at is not null then return; end if;
  select coalesce(sum(amount) filter(where reported_by=p.buyer_id and status='confirmed'),0),
         coalesce(sum(amount) filter(where reported_by=p.seller_id and status='confirmed'),0)
    into confirmed,payable from public.market_payment_reports where purchase_id=p.id;
  select exists(select 1 from public.market_pickups where purchase_id=p.id and status in ('pending','disputed')) or exists(select 1 from public.market_disagreements where purchase_id=p.id and resolved_at is null)
    into has_open;
  update public.market_purchases set stage=case when collection_closed and not has_open and confirmed-payable>=greatest(0,p.accepted_kg*p.price_kg/p.price_unit_kg) then 'settled' when collection_closed and not has_open then 'received' else 'agreed' end,updated_at=now() where id=p.id;
end $$;

-- Privileged functions are only callable by signed-in participants and enforce their own ownership checks.
revoke all on public.market_offer_revisions,public.market_buying_requests,public.market_pickups,public.market_expenses,public.market_purchase_actions from anon,authenticated;
grant select on public.market_buying_requests,public.market_offer_revisions,public.market_pickups,public.market_expenses,public.market_purchase_actions to authenticated;
revoke all on function public.market_farmer_contact(uuid),public.market_offer_contact(uuid),public.market_create_request(jsonb,uuid),public.market_send_offer_v2(uuid,jsonb,uuid,uuid),public.market_propose_request(uuid,uuid,jsonb,uuid),public.market_respond_offer_v2(uuid,text,integer,jsonb),public.market_report_pickup(uuid,jsonb,uuid),public.market_confirm_pickup(uuid),public.market_report_payment_v2(uuid,numeric,text,text,date,uuid),public.market_confirm_payment_v2(uuid),public.market_request_purchase_action(uuid,text,jsonb,uuid),public.market_respond_purchase_action(uuid,boolean),public.market_add_expense(uuid,uuid,text,numeric,text,text),public.market_refresh_purchase_stage(uuid) from public,anon;
grant execute on function public.market_farmer_contact(uuid),public.market_offer_contact(uuid),public.market_create_request(jsonb,uuid),public.market_send_offer_v2(uuid,jsonb,uuid,uuid),public.market_propose_request(uuid,uuid,jsonb,uuid),public.market_respond_offer_v2(uuid,text,integer,jsonb),public.market_report_pickup(uuid,jsonb,uuid),public.market_confirm_pickup(uuid),public.market_report_payment_v2(uuid,numeric,text,text,date,uuid),public.market_confirm_payment_v2(uuid),public.market_request_purchase_action(uuid,text,jsonb,uuid),public.market_respond_purchase_action(uuid,boolean),public.market_add_expense(uuid,uuid,text,numeric,text,text),public.market_refresh_purchase_stage(uuid) to authenticated;

revoke execute on function public.market_send_offer(uuid,uuid,numeric,numeric,date,text,text,text,timestamptz,jsonb,jsonb,text),public.market_respond_offer(uuid,text,integer,jsonb),public.market_report_collection(uuid,numeric,numeric,text,integer),public.market_confirm_collection(uuid),public.market_report_payment(uuid,numeric,text,text),public.market_confirm_payment(uuid),public.market_record_disagreement(uuid,text,numeric,numeric) from anon,authenticated;

drop policy if exists "History participants" on public.market_history;
drop policy if exists "History append participant" on public.market_history;
create policy "History participants" on public.market_history for select to authenticated using (exists(select 1 from public.market_purchases p where p.id=purchase_id and (select auth.uid()) in (p.buyer_id,p.seller_id)));
revoke insert,update,delete,truncate on public.market_history from anon,authenticated;

create index if not exists market_requests_open_idx on public.market_buying_requests(status,district,needed_date) where status='open';
create index if not exists market_offers_awaiting_idx on public.market_offers(awaiting_user_id,status,expires_at);
create index if not exists market_pickups_pending_idx on public.market_pickups(purchase_id,status);
create index if not exists market_actions_pending_idx on public.market_purchase_actions(purchase_id,status);
