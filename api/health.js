import { json, serviceRequest } from './_supabase.js';

async function checkTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const result = {
    telegramTokenConfigured: Boolean(token),
    telegramChatConfigured: Boolean(chatId),
    telegramBotReachable: false,
    telegramChatReachable: false,
    telegramError: null
  };

  if (!token || !chatId) {
    result.telegramError = 'Telegram environment variables are missing.';
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