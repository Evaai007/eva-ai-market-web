-- Allow all deposit networks exposed by the customer dashboard.
-- Run this migration in the linked Supabase project.

alter table public.deposits
  drop constraint if exists deposits_network_check;

alter table public.deposits
  add constraint deposits_network_check
  check (network in ('TRC20', 'BEP20', 'ERC20'));
