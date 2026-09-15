import { json, serviceRequest } from './_supabase.js';

const serviceContext = () => ({
  url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  service: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
});

const ageSeconds = (value) => {
  const time = new Date(value || 0).getTime();
  if (!time) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 1000));
};

const withinWindow = (seconds, days = 30) => Number.isFinite(seconds) && seconds <= days * 86400;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const ctx = serviceContext();
  if (!ctx.url || !ctx.service) return json(res, 503, { ok: false, error: 'Activity service is not configured.' });

  try {
    const [ordersResponse, depositsResponse] = await Promise.all([
      serviceRequest(ctx, 'store_orders?select=product_name,price_usd,status,delivered_at,created_at&status=eq.delivered&order=delivered_at.desc.nullslast,created_at.desc&limit=8'),
      serviceRequest(ctx, 'deposits?select=amount_usdt,network,status,created_at&status=eq.approved&order=created_at.desc&limit=8')
    ]);

    const [ordersBody, depositsBody] = await Promise.all([
      ordersResponse.json().catch(() => []),
      depositsResponse.json().catch(() => [])
    ]);

    const events = [];

    if (ordersResponse.ok && Array.isArray(ordersBody)) {
      for (const order of ordersBody) {
        const age = ageSeconds(order.delivered_at || order.created_at);
        if (!withinWindow(age)) continue;
        events.push({
          type: 'order',
          product: String(order.product_name || 'EVA product').slice(0, 90),
          amount: Number(order.price_usd || 0),
          age_seconds: age
        });
      }
    }

    if (depositsResponse.ok && Array.isArray(depositsBody)) {
      for (const deposit of depositsBody) {
        const age = ageSeconds(deposit.created_at);
        if (!withinWindow(age)) continue;
        events.push({
          type: 'deposit',
          amount: Number(deposit.amount_usdt || 0),
          network: ['TRC20', 'BEP20', 'ERC20'].includes(String(deposit.network || '').toUpperCase())
            ? String(deposit.network).toUpperCase()
            : 'USDT',
          age_seconds: age
        });
      }
    }

    events.sort((a, b) => (a.age_seconds ?? Number.MAX_SAFE_INTEGER) - (b.age_seconds ?? Number.MAX_SAFE_INTEGER));

    return json(res, 200, {
      ok: true,
      events: events.slice(0, 10),
      privacy: 'Customer identities, transaction IDs and delivery details are never exposed.'
    });
  } catch (error) {
    console.error('Public activity feed failed:', error?.message || error);
    return json(res, 500, { ok: false, error: 'Could not load recent activity.' });
  }
}
