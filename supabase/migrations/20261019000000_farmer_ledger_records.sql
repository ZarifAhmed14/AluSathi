-- Add farmer ledger record types; existing owner-scoped RLS policies stay in force.
alter table public.farmer_records enable row level security;
alter table public.farmer_records drop constraint if exists farmer_records_kind_check;
alter table public.farmer_records add constraint farmer_records_kind_check
  check (kind in ('scan', 'reminder', 'yield', 'expense', 'calculation'));
