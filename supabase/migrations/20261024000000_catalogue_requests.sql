-- A small, total-price request flow for catalogue lots.
alter table public.market_lots add column if not exists size_description text;
alter table public.market_lots add column if not exists condition_description text;
alter table public.market_lots add column if not exists storage_description text;
alter table public.market_lots add column if not exists harvest_date date;
alter table public.market_offers add column if not exists quoted_total numeric(14,2) check (quoted_total >= 0);
alter table public.market_purchases add column if not exists agreed_total numeric(14,2) check (agreed_total >= 0);

create table if not exists public.market_catalogue_request_reads (
  offer_id uuid not null references public.market_offers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null check (revision > 0),
  read_at timestamptz not null default now(),
  primary key (offer_id,user_id)
);
alter table public.market_catalogue_request_reads enable row level security;
drop policy if exists "Request reads own" on public.market_catalogue_request_reads;
create policy "Request reads own" on public.market_catalogue_request_reads for select to authenticated using (user_id=(select auth.uid()));
revoke all on public.market_catalogue_request_reads from anon,authenticated;

create or replace function public.market_catalogue_seller_info(p_lot_ids uuid[])
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'lot_id',l.id,'name',p.contact_name,'business_name',p.business_name,
    'mobile',case when p.share_contact then p.mobile else null end
  )), '[]'::jsonb)
  from public.market_lots l join public.market_profiles p on p.user_id=l.seller_id
  where l.id=any(coalesce(p_lot_ids,'{}'::uuid[])) and l.published
$$;

create or replace function public.market_catalogue_request_feed()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',o.id,'lot_id',o.lot_id,'buyer_id',o.buyer_id,'seller_id',o.seller_id,
    'quantity_kg',o.quantity_kg,'quoted_total',o.quoted_total,'status',o.status,
    'version',o.version,'latest_proposer',o.latest_proposer,'awaiting_user_id',o.awaiting_user_id,
    'expires_at',o.expires_at,'created_at',o.created_at,
    'lot',jsonb_build_object('variety',l.variety,'photos',l.photos,'district',l.district,'upazila',l.upazila,
      'asking_price_min',l.asking_price_min,'asking_price_max',l.asking_price_max),
    'buyer',jsonb_build_object('name',bp.contact_name,'business_name',bp.business_name,'district',bp.district,
      'mobile',case when bp.share_contact then bp.mobile else null end),
    'farmer',jsonb_build_object('name',sp.contact_name,'business_name',sp.business_name,
      'mobile',case when sp.share_contact then sp.mobile else null end),
    'is_read',coalesce(r.revision=o.version,false)
  ) order by o.updated_at desc),'[]'::jsonb)
  from public.market_offers o
  join public.market_lots l on l.id=o.lot_id
  join public.market_profiles bp on bp.user_id=o.buyer_id
  join public.market_profiles sp on sp.user_id=o.seller_id
  left join public.market_catalogue_request_reads r on r.offer_id=o.id and r.user_id=auth.uid()
  where auth.uid() in (o.buyer_id,o.seller_id) and o.terms->>'mode'='catalogue_total'
$$;

create or replace function public.market_send_catalogue_request(p_lot_id uuid,p_quantity_kg numeric,p_total numeric,p_idempotency_key uuid)
returns public.market_offers language plpgsql security definer set search_path = '' as $$
declare l public.market_lots; o public.market_offers; v_buyer uuid:=auth.uid(); v_price numeric;
begin
  if v_buyer is null or p_idempotency_key is null or p_quantity_kg is null or p_quantity_kg<=0 or p_quantity_kg>1000000 or p_quantity_kg<>round(p_quantity_kg,3) or p_total is null or p_total<0 or p_total>999999999999.99 or p_total<>round(p_total,2) then raise exception 'invalid request'; end if;
  if not exists(select 1 from public.market_profiles where user_id=v_buyer and business_type in ('wholesaler','aratdar','retailer','processor')) then raise exception 'buyer profile required'; end if;
  select * into o from public.market_offers where buyer_id=v_buyer and idempotency_key=p_idempotency_key::text;
  if found then
    if o.lot_id<>p_lot_id or o.quantity_kg<>p_quantity_kg or o.quoted_total<>p_total then raise exception 'request id already used'; end if;
    return o;
  end if;
  select * into l from public.market_lots where id=p_lot_id and published and seller_id<>v_buyer for share;
  if not found or l.quantity_kg-l.reserved_kg<p_quantity_kg then raise exception 'lot unavailable'; end if;
  v_price:=round(p_total/p_quantity_kg,8);
  insert into public.market_offers(lot_id,buyer_id,seller_id,quantity_kg,price_kg,quoted_total,expires_at,terms,buyer_costs,idempotency_key,latest_proposer,awaiting_user_id)
  values(l.id,v_buyer,l.seller_id,p_quantity_kg,round(v_price,2),p_total,now()+interval '48 hours',jsonb_build_object('mode','catalogue_total','total',p_total), '{}'::jsonb,p_idempotency_key::text,v_buyer,l.seller_id)
  on conflict(buyer_id,idempotency_key) do nothing returning * into o;
  if not found then
    select * into o from public.market_offers where buyer_id=v_buyer and idempotency_key=p_idempotency_key::text;
    if o.lot_id<>p_lot_id or o.quantity_kg<>p_quantity_kg or o.quoted_total<>p_total then raise exception 'request id already used'; end if;
    return o;
  end if;
  insert into public.market_offer_revisions(offer_id,revision,proposer_id,awaiting_user_id,terms,expires_at)
  values(o.id,1,v_buyer,l.seller_id,o.terms,o.expires_at);
  insert into public.market_history(purchase_id,actor_id,event_type,payload) values(null,v_buyer,'catalogue_request_sent',jsonb_build_object('offer_id',o.id,'revision',1,'quantity_kg',p_quantity_kg,'quoted_total',p_total));
  return o;
end $$;

create or replace function public.market_respond_catalogue_request(p_offer_id uuid,p_action text,p_revision integer,p_total numeric default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.market_offers; l public.market_lots; p public.market_purchases; v_actor uuid:=auth.uid(); v_next integer; v_terms jsonb;
begin
  if v_actor is null or p_action not in ('accept','decline','withdraw','resend','cancel') then raise exception 'invalid action'; end if;
  select * into o from public.market_offers where id=p_offer_id and terms->>'mode'='catalogue_total' for update;
  if not found or v_actor not in(o.buyer_id,o.seller_id) then raise exception 'record not found'; end if;
  if o.version<>p_revision then raise exception 'stale request'; end if;
  if p_action='accept' then
    if v_actor<>o.seller_id or o.awaiting_user_id<>v_actor or o.status<>'pending' or o.expires_at<=now() then raise exception 'response not allowed'; end if;
    select * into l from public.market_lots where id=o.lot_id for update;
    if l.quantity_kg-l.reserved_kg<o.quantity_kg then raise exception 'lot unavailable'; end if;
    update public.market_lots set reserved_kg=reserved_kg+o.quantity_kg,version=version+1,updated_at=now() where id=l.id;
    update public.market_offers set status='agreed',version=version+1,updated_at=now() where id=o.id returning * into o;
    insert into public.market_purchases(offer_id,lot_id,buyer_id,seller_id,agreed_quantity_kg,price_kg,agreed_total,terms)
      values(o.id,o.lot_id,o.buyer_id,o.seller_id,o.quantity_kg,o.price_kg,o.quoted_total,o.terms) returning * into p;
    insert into public.market_history(purchase_id,actor_id,event_type,payload) values(p.id,v_actor,'catalogue_request_accepted',jsonb_build_object('offer_id',o.id,'agreed_total',o.quoted_total));
  elsif p_action='decline' then
    if v_actor<>o.seller_id or o.awaiting_user_id<>v_actor or o.status<>'pending' then raise exception 'response not allowed'; end if;
    update public.market_offers set status='rejected',version=version+1,updated_at=now() where id=o.id returning * into o;
  elsif p_action='withdraw' then
    if v_actor<>o.buyer_id or o.status<>'pending' then raise exception 'withdrawal not allowed'; end if;
    update public.market_offers set status='withdrawn',version=version+1,updated_at=now() where id=o.id returning * into o;
  elsif p_action='resend' then
    if v_actor<>o.buyer_id or o.status<>'rejected' or p_total is null or p_total<0 or p_total>999999999999.99 or p_total<>round(p_total,2) then raise exception 'revision not allowed'; end if;
    v_next:=o.version+1; v_terms:=jsonb_build_object('mode','catalogue_total','total',p_total);
    update public.market_offers set quoted_total=p_total,price_kg=round(p_total/o.quantity_kg,2),terms=v_terms,status='pending',version=v_next,latest_proposer=v_actor,awaiting_user_id=o.seller_id,expires_at=now()+interval '48 hours',updated_at=now() where id=o.id returning * into o;
    insert into public.market_offer_revisions(offer_id,revision,proposer_id,awaiting_user_id,terms,expires_at) values(o.id,v_next,v_actor,o.seller_id,v_terms,o.expires_at);
  elsif p_action='cancel' then
    select * into p from public.market_purchases where offer_id=o.id for update;
    if not found or p.cancelled_at is not null or exists(select 1 from public.market_pickups where purchase_id=p.id) or exists(select 1 from public.market_payment_reports where purchase_id=p.id) then raise exception 'purchase can no longer be cancelled here'; end if;
    select * into l from public.market_lots where id=o.lot_id for update;
    update public.market_lots set reserved_kg=greatest(0,reserved_kg-o.quantity_kg),version=version+1,updated_at=now() where id=l.id;
    update public.market_purchases set cancelled_at=now(),collection_closed=true,stage='cancelled',version=version+1,updated_at=now() where id=p.id;
    update public.market_offers set status='withdrawn',version=version+1,updated_at=now() where id=o.id returning * into o;
    insert into public.market_history(purchase_id,actor_id,event_type,payload) values(p.id,v_actor,'catalogue_purchase_cancelled','{}'::jsonb);
  end if;
  return jsonb_build_object('offer',to_jsonb(o),'purchase',case when p.id is null then null else to_jsonb(p) end);
end $$;

create or replace function public.market_ack_catalogue_request(p_offer_id uuid,p_revision integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.market_offers where id=p_offer_id and auth.uid() in(buyer_id,seller_id) and terms->>'mode'='catalogue_total') then raise exception 'record not found'; end if;
  insert into public.market_catalogue_request_reads(offer_id,user_id,revision) values(p_offer_id,auth.uid(),p_revision)
  on conflict(offer_id,user_id) do update set revision=excluded.revision,read_at=now();
end $$;

create or replace function public.market_report_payment_v2(p_purchase_id uuid,p_amount numeric,p_method text,p_reference text,p_payment_date date,p_idempotency_key uuid)
returns public.market_payment_reports language plpgsql security definer set search_path = '' as $$
declare p public.market_purchases; report public.market_payment_reports; v_due numeric; v_reported numeric;
begin
  if auth.uid() is null or p_idempotency_key is null or p_amount is null or p_amount<=0 or p_amount>999999999999.99 or p_amount<>round(p_amount,2) then raise exception 'invalid payment'; end if;
  select * into p from public.market_purchases where id=p_purchase_id for update;
  if not found or auth.uid() not in (p.buyer_id,p.seller_id) or p.cancelled_at is not null then raise exception 'invalid payment'; end if;
  if p_method not in ('cash','mfs','bank') or (p_method in ('mfs','bank') and coalesce(trim(p_reference),'')='') then raise exception 'payment reference required'; end if;
  select * into report from public.market_payment_reports where idempotency_key=p_idempotency_key;
  if found then
    if report.purchase_id<>p.id or report.reported_by<>auth.uid() then raise exception 'duplicate request id'; end if;
    return report;
  end if;
  v_due:=case when p.agreed_total is not null then
    case when p.collection_closed then round(p.agreed_total*coalesce(p.accepted_kg,0)/p.agreed_quantity_kg,2)
      when p.accepted_kg>0 then round(p.agreed_total*p.accepted_kg/p.agreed_quantity_kg,2) else p.agreed_total end
    else round(p.accepted_kg*p.price_kg/p.price_unit_kg,2) end;
  select coalesce(sum(amount),0) into v_reported from public.market_payment_reports
    where purchase_id=p.id and status in ('reported','confirmed') and reported_by=auth.uid();
  if auth.uid()=p.buyer_id and p_amount>greatest(0,v_due-v_reported) then raise exception 'payment exceeds current payable'; end if;
  if auth.uid()=p.seller_id and p_amount>greatest(0,p.refund_due-v_reported) then raise exception 'refund exceeds confirmed due'; end if;
  insert into public.market_payment_reports(purchase_id,reported_by,amount,payment_date,method,reference,idempotency_key)
    values(p.id,auth.uid(),p_amount,p_payment_date,p_method,left(coalesce(p_reference,''),80),p_idempotency_key) returning * into report;
  insert into public.market_history(purchase_id,actor_id,event_type,payload)
    values(p.id,auth.uid(),case when auth.uid()=p.buyer_id then 'payment_reported' else 'refund_reported' end,jsonb_build_object('payment_id',report.id,'amount',report.amount));
  return report;
end $$;

create or replace function public.market_refresh_purchase_stage(p_purchase_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.market_purchases; payable numeric; buyer_paid numeric; seller_refunds numeric; has_open boolean; v_refund numeric;
begin
  select * into p from public.market_purchases where id=p_purchase_id for update;
  if not found or p.cancelled_at is not null then return; end if;
  payable:=case when p.agreed_total is not null then round(p.agreed_total*coalesce(p.accepted_kg,0)/p.agreed_quantity_kg,2)
    else round(p.accepted_kg*p.price_kg/p.price_unit_kg,2) end;
  select coalesce(sum(amount) filter(where reported_by=p.buyer_id and status='confirmed'),0),
         coalesce(sum(amount) filter(where reported_by=p.seller_id and status='confirmed'),0)
    into buyer_paid,seller_refunds from public.market_payment_reports where purchase_id=p.id;
  select exists(select 1 from public.market_pickups where purchase_id=p.id and status in ('pending','disputed'))
      or exists(select 1 from public.market_payment_reports where purchase_id=p.id and status='reported')
      or exists(select 1 from public.market_disagreements where purchase_id=p.id and resolved_at is null)
    into has_open;
  v_refund:=case when p.collection_closed then greatest(0,buyer_paid-seller_refunds-payable) else p.refund_due end;
  update public.market_purchases set refund_due=v_refund,
    stage=case when collection_closed and not has_open and v_refund=0 and buyer_paid-seller_refunds>=payable then 'settled'
      when collection_closed and not has_open then 'received' else 'agreed' end,
    updated_at=now() where id=p.id;
end $$;

revoke all on function public.market_catalogue_seller_info(uuid[]),public.market_catalogue_request_feed(),public.market_send_catalogue_request(uuid,numeric,numeric,uuid),public.market_respond_catalogue_request(uuid,text,integer,numeric),public.market_ack_catalogue_request(uuid,integer) from public,anon;
grant execute on function public.market_catalogue_seller_info(uuid[]) to anon,authenticated;
grant execute on function public.market_catalogue_request_feed(),public.market_send_catalogue_request(uuid,numeric,numeric,uuid),public.market_respond_catalogue_request(uuid,text,integer,numeric),public.market_ack_catalogue_request(uuid,integer) to authenticated;
grant select on public.market_catalogue_request_reads to authenticated;

create index if not exists market_catalogue_requests_participant_idx on public.market_offers(buyer_id,seller_id,status) where terms->>'mode'='catalogue_total';
