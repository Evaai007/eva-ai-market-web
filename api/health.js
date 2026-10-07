import { json, serviceRequest } from './_supabase.js';

const VERIFIED_TELEGRAM_CHAT_ID='5461634710';

async function checkTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = VERIFIED_TELEGRAM_CHAT_ID;
  const result = {
    telegramTokenConfigured: Boolean(token),
    telegramChatConfigured: true,
    telegramBotReachable: false,
    telegramChatReachable: false,
    telegramError: null
  };

  if (!token) {
    result.telegramError = 'Telegram bot token is missing.';
    return result;
  }

  try {
    const botResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const botBody = await botResponse.json().catch(() => ({}));
    result.telegramBotReachable = Boolean(botResponse.ok && botBody?.ok);
    if (!result.telegramBotReachable) {
      result.telegramError = botBody?.description || 'Telegram bot authentication failed.';
      return result;
    }

    const chatResponse = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`);
    const chatBody = await chatResponse.json().catch(() => ({}));
    result.telegramChatReachable = Boolean(chatResponse.ok && chatBody?.ok);
    if (!result.telegramChatReachable) {
      result.telegramError = chatBody?.description || 'Telegram chat is not reachable.';
    }
  } catch (error) {
    result.telegramError = error?.message || 'Telegram network check failed.';
  }

  return result;
}

const ageSeconds = (value) => {
  const time = new Date(value || 0).getTime();
  if (!time) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 1000));
};

const withinWindow = (seconds, days = 30) => Number.isFinite(seconds) && seconds <= days * 86400;

async function publicActivity(url, service, res) {
  if (!url || !service) return json(res, 503, { ok: false, error: 'Activity service is not configured.' });

  try {
    const ctx = { url, service };
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

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed.' });

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.anon_public;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const adminEmail = process.env.ADMIN_EMAIL?.trim();

  if (req.query?.view === 'activity') return publicActivity(url, service, res);

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

  const telegram = await checkTelegram();
  Object.assign(checks, telegram);

  const requiredChecks = [
    checks.vercelFunction,
    checks.supabaseUrlConfigured,
    checks.supabaseAnonConfigured,
    checks.supabaseServiceConfigured,
    checks.adminEmailConfigured,
    checks.supabaseReachable,
    checks.storeTableReachable,
    checks.telegramTokenConfigured,
    checks.telegramChatConfigured,
    checks.telegramBotReachable,
    checks.telegramChatReachable
  ];

  const ok = requiredChecks.every(Boolean);
  return json(res, ok ? 200 : 503, {
    ok,
    checks,
    timestamp: new Date().toISOString()
  });
}
