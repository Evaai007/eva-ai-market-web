begin;

insert into public.store_products (
  id,
  category,
  name,
  subtitle,
  price_usd,
  stock,
  warranty_days,
  access_label,
  active,
  sort_order,
  updated_at
)
values (
  'aws-kiro-gcp-bundle',
  'Cloud & AI Accounts',
  'AWS + Kiro + GCP AI Bundle',
  'AWS Bedrock access, Kiro Power activation, and GCP $25,000 credit with Vertex AI and Claude support',
  350,
  5,
  30,
  'Full account access',
  true,
  45,
  now()
)
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  subtitle = excluded.subtitle,
  price_usd = excluded.price_usd,
  stock = excluded.stock,
  warranty_days = excluded.warranty_days,
  access_label = excluded.access_label,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;
