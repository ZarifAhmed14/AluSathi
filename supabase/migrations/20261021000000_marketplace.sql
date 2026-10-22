create table if not exists public.market_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  contact_name text not null check (char_length(contact_name) between 1 and 80),
  mobile text not null check (char_length(mobile) between 5 and 20),
  business_name text, business_type text check (business_type in ('wholesaler','aratdar','retailer','processor','farmer')),
  district text, destination text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.market_lots (
  id uuid primary key default gen_random_uuid(), seller_id uuid not null references auth.users(id) on delete cascade,
  variety text not null, quantity_kg numeric(14,3) not null check (quantity_kg > 0), reserved_kg numeric(14,3) not null default 0 check (reserved_kg >= 0),
  district text not null, upazila text, ready_date date not null, purpose text, notes text, photos jsonb not null default '[]'::jsonb,
  asking_price numeric(14,2), published boolean not null default false, version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.market_offers (
  id uuid primary key default gen_random_uuid(), lot_id uuid not null references public.market_lots(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade, seller_id uuid not null references auth.users(id) on delete cascade,
  quantity_kg numeric(14,3) not null check (quantity_kg > 0), price_kg numeric(14,2) not null check (price_kg >= 0),
  pickup_date date, pickup_responsibility text, payment_timing text, payment_method text, expires_at timestamptz,
  terms jsonb not null default '{}'::jsonb, buyer_costs jsonb not null default '{}'::jsonb, status text not null default 'pending' check (status in ('draft','pending','counter','agreed','rejected','withdrawn','expired')),
  version integer not null default 1, idempotency_key text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(buyer_id,idempotency_key)
);
create table if not exists public.market_purchases (
  id uuid primary key default gen_random_uuid(), offer_id uuid not null unique references public.market_offers(id), lot_id uuid not null references public.market_lots(id),
  buyer_id uuid not null references auth.users(id), seller_id uuid not null references auth.users(id), agreed_quantity_kg numeric(14,3) not null,
  price_kg numeric(14,2) not null, terms jsonb not null, stage text not null default 'agreed', version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.market_collection_reports (
  id uuid primary key default gen_random_uuid(), purchase_id uuid not null references public.market_purchases(id) on delete cascade,
  reported_by uuid not null references auth.users(id), dispatched_kg numeric(14,3), received_kg numeric(14,3), rejected_kg numeric(14,3) default 0,
  note text, slip_path text, status text not null default 'reported', created_at timestamptz not null default now(), confirmed_at timestamptz
);
create table if not exists public.market_payment_reports (
  id uuid primary key default gen_random_uuid(), purchase_id uuid not null references public.market_purchases(id) on delete cascade,
  reported_by uuid not null references auth.users(id), amount numeric(14,2) not null check (amount > 0), payment_date date not null,
  method text, reference text, receipt_path text, status text not null default 'reported', created_at timestamptz not null default now(), confirmed_at timestamptz
);
create table if not exists public.market_history (
  id uuid primary key default gen_random_uuid(), purchase_id uuid references public.market_purchases(id) on delete cascade,
  actor_id uuid not null references auth.users(id), event_type text not null, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.market_disagreements (
  id uuid primary key default gen_random_uuid(), purchase_id uuid not null references public.market_purchases(id) on delete cascade,
  reported_by uuid not null references auth.users(id), detail text not null check (char_length(detail) between 1 and 300),
  quantity_kg numeric(14,3), amount numeric(14,2), resolved_at timestamptz, created_at timestamptz not null default now()
);
alter table public.market_profiles enable row level security;
alter table public.market_lots enable row level security;
alter table public.market_offers enable row level security;
alter table public.market_purchases enable row level security;
alter table public.market_collection_reports enable row level security;
alter table public.market_payment_reports enable row level security;
alter table public.market_history enable row level security;
alter table public.market_disagreements enable row level security;
create policy "Profiles own" on public.market_profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Published lots browse" on public.market_lots for select to anon, authenticated using (published or (select auth.uid()) = seller_id);
create policy "Lots own" on public.market_lots for insert to authenticated with check ((select auth.uid()) = seller_id);
create policy "Lots update own" on public.market_lots for update to authenticated using ((select auth.uid()) = seller_id) with check ((select auth.uid()) = seller_id);
create policy "Offers participants" on public.market_offers for select to authenticated using ((select auth.uid()) in (buyer_id,seller_id));
create policy "Purchases participants" on public.market_purchases for select to authenticated using ((select auth.uid()) in (buyer_id,seller_id));
create policy "Collections participants" on public.market_collection_reports for select to authenticated using (exists(select 1 from public.market_purchases p where p.id=purchase_id and (select auth.uid()) in (p.buyer_id,p.seller_id)));
create policy "Payments participants" on public.market_payment_reports for select to authenticated using (exists(select 1 from public.market_purchases p where p.id=purchase_id and (select auth.uid()) in (p.buyer_id,p.seller_id)));
create policy "History participants" on public.market_history for select to authenticated using (exists(select 1 from public.market_purchases p where p.id=purchase_id and (select auth.uid()) in (p.buyer_id,p.seller_id)));
create policy "Differences participants" on public.market_disagreements for select to authenticated using (exists(select 1 from public.market_purchases p where p.id=purchase_id and (select auth.uid()) in (p.buyer_id,p.seller_id)));

create or replace function public.market_send_offer(lot_id uuid, buyer_id uuid, quantity_kg numeric, price_kg numeric, pickup_date date, pickup_responsibility text, payment_timing text, payment_method text, expires_at timestamptz, terms jsonb, buyer_costs jsonb, idempotency_key text)
returns public.market_offers language plpgsql security definer set search_path = public as $$
declare lot public.market_lots; result public.market_offers;
begin
  if buyer_id <> auth.uid() then raise exception 'not allowed'; end if;
  select * into lot from public.market_lots where id=lot_id and published for share;
  if not found or lot.quantity_kg-lot.reserved_kg < quantity_kg then raise exception 'lot unavailable'; end if;
  insert into public.market_offers(lot_id,buyer_id,seller_id,quantity_kg,price_kg,pickup_date,pickup_responsibility,payment_timing,payment_method,expires_at,terms,buyer_costs,idempotency_key)
  values(lot.id,auth.uid(),lot.seller_id,quantity_kg,price_kg,pickup_date,pickup_responsibility,payment_timing,payment_method,expires_at,coalesce(terms,'{}'),coalesce(buyer_costs,'{}'),idempotency_key)
  on conflict(buyer_id,idempotency_key) do update set updated_at=public.market_offers.updated_at returning * into result;
  return result;
end $$;

create or replace function public.market_respond_offer(p_offer_id uuid, p_action text, p_version integer, p_terms jsonb default '{}'::jsonb)
returns public.market_offers language plpgsql security definer set search_path = public as $$
declare offer public.market_offers; lot public.market_lots;
begin
  select * into offer from public.market_offers where id=p_offer_id for update;
  if not found or auth.uid() not in (offer.buyer_id,offer.seller_id) then raise exception 'not allowed'; end if;
  if offer.version <> p_version then raise exception 'stale offer'; end if;
  if p_action='accept' then
    if not ((offer.status='pending' and auth.uid()=offer.seller_id) or (offer.status='counter' and auth.uid()=offer.buyer_id)) then raise exception 'not allowed'; end if;
    select * into lot from public.market_lots where id=offer.lot_id for update;
    if lot.quantity_kg-lot.reserved_kg < offer.quantity_kg then raise exception 'lot unavailable'; end if;
    update public.market_lots set reserved_kg=reserved_kg+offer.quantity_kg, version=version+1, updated_at=now() where id=lot.id;
    update public.market_offers set status='agreed',version=version+1,updated_at=now() where id=offer.id returning * into offer;
    insert into public.market_purchases(offer_id,lot_id,buyer_id,seller_id,agreed_quantity_kg,price_kg,terms) values(offer.id,offer.lot_id,offer.buyer_id,offer.seller_id,offer.quantity_kg,offer.price_kg,jsonb_build_object('offer',to_jsonb(offer)));
  elsif p_action='reject' then
    update public.market_offers set status='rejected',version=version+1,updated_at=now() where id=offer.id returning * into offer;
  elsif p_action='withdraw' then
    if auth.uid() <> offer.buyer_id or offer.status not in ('draft','pending','counter') then raise exception 'not allowed'; end if;
    update public.market_offers set status='withdrawn',version=version+1,updated_at=now() where id=offer.id returning * into offer;
  elsif p_action='counter' then
    if offer.status not in ('pending','counter') then raise exception 'not allowed'; end if;
    update public.market_offers set status='counter',terms=coalesce(p_terms,'{}'),version=version+1,updated_at=now() where id=offer.id returning * into offer;
  else raise exception 'invalid action'; end if;
  return offer;
end $$;

create or replace function public.market_report_collection(p_purchase_id uuid, p_received_kg numeric, p_rejected_kg numeric, p_note text, p_version integer)
returns public.market_collection_reports language plpgsql security definer set search_path = public as $$
declare purchase public.market_purchases; report public.market_collection_reports;
begin
  select * into purchase from public.market_purchases where id=p_purchase_id for update;
  if not found or auth.uid() <> purchase.buyer_id or purchase.version <> p_version or purchase.stage not in ('agreed','collection_reported') then raise exception 'not allowed'; end if;
  if p_received_kg < 0 or p_rejected_kg < 0 or p_rejected_kg > p_received_kg then raise exception 'invalid weight'; end if;
  insert into public.market_collection_reports(purchase_id,reported_by,received_kg,rejected_kg,note)
  values(purchase.id,auth.uid(),p_received_kg,p_rejected_kg,left(coalesce(p_note,''),180)) returning * into report;
  update public.market_purchases set stage='collection_reported', version=version+1, updated_at=now() where id=purchase.id;
  return report;
end $$;

create or replace function public.market_confirm_collection(p_report_id uuid)
returns public.market_collection_reports language plpgsql security definer set search_path = public as $$
declare report public.market_collection_reports; purchase public.market_purchases;
begin
  select * into report from public.market_collection_reports where id=p_report_id for update;
  select * into purchase from public.market_purchases where id=report.purchase_id for update;
  if not found or auth.uid() <> purchase.seller_id or report.status <> 'reported' then raise exception 'not allowed'; end if;
  update public.market_collection_reports set status='confirmed', confirmed_at=now() where id=report.id returning * into report;
  update public.market_purchases set stage='collected', version=version+1, updated_at=now() where id=purchase.id;
  return report;
end $$;

create or replace function public.market_report_payment(p_purchase_id uuid, p_amount numeric, p_method text, p_reference text)
returns public.market_payment_reports language plpgsql security definer set search_path = public as $$
declare purchase public.market_purchases; report public.market_payment_reports;
begin
  select * into purchase from public.market_purchases where id=p_purchase_id for update;
  if not found or auth.uid() <> purchase.buyer_id or purchase.stage not in ('collected','payment_reported') or p_amount <= 0 then raise exception 'not allowed'; end if;
  insert into public.market_payment_reports(purchase_id,reported_by,amount,payment_date,method,reference)
  values(purchase.id,auth.uid(),p_amount,current_date,left(coalesce(p_method,''),40),left(coalesce(p_reference,''),80)) returning * into report;
  update public.market_purchases set stage='payment_reported', version=version+1, updated_at=now() where id=purchase.id;
  return report;
end $$;

create or replace function public.market_confirm_payment(p_report_id uuid)
returns public.market_payment_reports language plpgsql security definer set search_path = public as $$
declare report public.market_payment_reports; purchase public.market_purchases; accepted numeric; paid numeric;
begin
  select * into report from public.market_payment_reports where id=p_report_id for update;
  select * into purchase from public.market_purchases where id=report.purchase_id for update;
  if not found or auth.uid() <> purchase.seller_id or report.status <> 'reported' then raise exception 'not allowed'; end if;
  select coalesce(received_kg-rejected_kg,0) into accepted from public.market_collection_reports where purchase_id=purchase.id and status='confirmed' order by confirmed_at desc limit 1;
  if accepted is null then raise exception 'collection required'; end if;
  update public.market_payment_reports set status='confirmed', confirmed_at=now() where id=report.id returning * into report;
  select coalesce(sum(amount),0) into paid from public.market_payment_reports where purchase_id=purchase.id and status='confirmed';
  update public.market_purchases set stage=case when paid >= accepted*purchase.price_kg then 'paid' else 'collected' end, version=version+1, updated_at=now() where id=purchase.id;
  return report;
end $$;

create or replace function public.market_record_disagreement(p_purchase_id uuid, p_detail text, p_quantity_kg numeric default null, p_amount numeric default null)
returns public.market_disagreements language plpgsql security definer set search_path = public as $$
declare purchase public.market_purchases; issue public.market_disagreements;
begin
  select * into purchase from public.market_purchases where id=p_purchase_id for update;
  if not found or auth.uid() not in (purchase.buyer_id,purchase.seller_id) or char_length(trim(coalesce(p_detail,'')))=0 then raise exception 'not allowed'; end if;
  insert into public.market_disagreements(purchase_id,reported_by,detail,quantity_kg,amount) values(purchase.id,auth.uid(),left(trim(p_detail),300),p_quantity_kg,p_amount) returning * into issue;
  update public.market_purchases set stage='disputed', version=version+1, updated_at=now() where id=purchase.id;
  return issue;
end $$;
grant select on public.market_lots to anon, authenticated;
grant select, insert, update on public.market_profiles, public.market_lots, public.market_offers, public.market_purchases, public.market_collection_reports, public.market_payment_reports, public.market_history, public.market_disagreements to authenticated;
grant execute on function public.market_send_offer(uuid,uuid,numeric,numeric,date,text,text,text,timestamptz,jsonb,jsonb,text), public.market_respond_offer(uuid,text,integer,jsonb), public.market_report_collection(uuid,numeric,numeric,text,integer), public.market_confirm_collection(uuid), public.market_report_payment(uuid,numeric,text,text), public.market_confirm_payment(uuid), public.market_record_disagreement(uuid,text,numeric,numeric) to authenticated;
