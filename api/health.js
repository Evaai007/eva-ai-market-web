import { json, serviceRequest } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed.' });

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const adminEmail = process.env.ADMIN_EMAIL?.trim();

  const checks = {
    vercelFunction: true,
    supabaseUrlConfigured: Boolean(url),
    supabaseAnonConfigured: Boolean(anon),
    supabaseServiceConfigured: Boolean(service),
    adminEmailConfigured: Boolean(adminEmail),
    supabaseReachable: false,
    storeTableReachable: false
  };

  if (url && service) {
    try {
      const response = await serviceRequest({ url, service }, 'store_products?select=id&limit=1');
      checks.supabaseReachable = response.status !== 0;
      checks.storeTableReachable = response.ok;
    } catch {
      checks.supabaseReachable = false;
    }
  }

  const ok = Object.values(checks).every(Boolean);
  return json(res, ok ? 200 : 503, {
    ok,
    checks,
    timestamp: new Date().toISOString()
  });
}
