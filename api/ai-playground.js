const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 6;
const buckets = globalThis.__evaAiBuckets || new Map();
globalThis.__evaAiBuckets = buckets;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(body));
}

function cleanText(value, max = 1800) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

function getIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
}

function rateAllowed(req) {
  const ip = getIp(req);
  const now = Date.now();
  const old = buckets.get(ip);
  const bucket = !old || now - old.startedAt > RATE_WINDOW_MS
    ? { startedAt: now, count: 0 }
    : old;
  bucket.count += 1;
  buckets.set(ip, bucket);

  if (buckets.size > 1500) {
    for (const [key, value] of buckets.entries()) {
      if (now - value.startedAt > RATE_WINDOW_MS) buckets.delete(key);
    }
  }

  return bucket.count <= RATE_LIMIT;
}

function systemPrompt(kind, mode, catalog) {
  const modes = {
    coding: 'Act as a senior software architect. Give concise, production-minded technical answers with safe code patterns.',
    creative: 'Act as a sharp creative strategist and copywriter. Produce concise, original, practical output.',
    reasoning: 'Act as a careful reasoning assistant. Give the answer with a concise explanation and verify assumptions.',
    market: 'Act as a technology market analyst. Compare tradeoffs, cost, and fit without inventing facts or prices.'
  };

  const base = 'You are EVA AI MARKET AI Assistant. Be concise, accurate, and do not claim access, delivery, stock, pricing, warranties, or provider terms unless they are present in the supplied live catalog. Do not request passwords, API keys, wallet seed phrases, or other secrets.';
  if (kind === 'advisor') {
    return `${base}\nRecommend products only from this live catalog when relevant:\n${catalog || 'Catalog unavailable.'}\nGive a short recommendation, expected listed price if present, and why it fits.`;
  }
  if (kind === 'compare') {
    return `${base}\nCompare only the products named by the user, using the live catalog when available:\n${catalog || 'Catalog unavailable.'}\nUse a compact comparison and a clear recommendation.`;
  }
  return `${base}\n${modes[mode] || modes.coding}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  if (!rateAllowed(req)) {
    return send(res, 429, { ok: false, error: 'Demo limit reached. Please try again in a few minutes.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return send(res, 503, { ok: false, code: 'AI_NOT_CONFIGURED', error: 'AI Playground is ready, but the server-side Gemini API key is not configured yet.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const kind = ['sandbox', 'advisor', 'compare'].includes(body.kind) ? body.kind : 'sandbox';
  const mode = ['coding', 'creative', 'reasoning', 'market'].includes(body.mode) ? body.mode : 'coding';
  const prompt = cleanText(body.prompt, 1800);
  const catalog = cleanText(body.catalog, 6500);

  if (!prompt) return send(res, 400, { ok: false, error: 'Prompt is required.' });

  const model = cleanText(process.env.GEMINI_MODEL || 'gemini-2.5-flash', 80);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const started = Date.now();

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt(kind, mode, catalog) }] },
        generationConfig: {
          temperature: kind === 'creative' ? 0.8 : 0.35,
          maxOutputTokens: 700
        }
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('Gemini playground upstream error', upstream.status, data?.error?.status || data?.error?.message || 'unknown');
      return send(res, 502, { ok: false, error: 'Gemini request failed. Please try again shortly.' });
    }

    const text = (data.candidates?.[0]?.content?.parts || [])
      .map(part => typeof part?.text === 'string' ? part.text : '')
      .join('\n')
      .trim();

    if (!text) return send(res, 502, { ok: false, error: 'No AI response was returned.' });

    return send(res, 200, {
      ok: true,
      text,
      model,
      latency_ms: Date.now() - started
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    console.error('Gemini playground error', timedOut ? 'timeout' : error?.message);
    return send(res, timedOut ? 504 : 500, { ok: false, error: timedOut ? 'AI request timed out. Please retry.' : 'AI Playground is temporarily unavailable.' });
  } finally {
    clearTimeout(timeout);
  }
}
