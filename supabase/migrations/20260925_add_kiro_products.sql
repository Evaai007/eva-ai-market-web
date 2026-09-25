insert into public.store_products (id, category, name, subtitle, price_usd, stock, warranty_days, access_label, sort_order)
values
  ('kiro-pro', 'Kiro', 'Kiro Pro', '1,000 credits / month', 20, 10000, 30, 'Official Kiro plan', 110),
  ('kiro-pro-plus', 'Kiro', 'Kiro Pro+', '2,000 credits / month', 40, 10000, 30, 'Official Kiro plan', 120),
  ('kiro-pro-max', 'Kiro', 'Kiro Pro Max', '5,000 credits / month', 100, 10000, 30, 'Official Kiro plan', 130),
  ('kiro-power', 'Kiro', 'Kiro Power', '10,000 credits / month', 200, 10000, 30, 'Official Kiro plan', 140)
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  subtitle = excluded.subtitle,
  price_usd = excluded.price_usd,
  stock = excluded.stock,
  warranty_days = excluded.warranty_days,
  access_label = excluded.access_label,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();
