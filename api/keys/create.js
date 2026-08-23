import { createHash, randomBytes } from 'node:crypto';
import { json, requireUser, serviceRequest } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const secret = `eva_live_${randomBytes(24).toString('base64url')}`;
  const keyHash = createHash('sha256').update(secret).digest('hex');
  const keyPrefix = secret.slice(0, 14);
  const name = String(req.body?.name || 'Gemini key').trim().slice(0, 60) || 'Gemini key';

  const response = await serviceRequest(ctx, 'rpc/issue_customer_api_key', {
    method: 'POST',
    body: JSON.stringify({
      p_user_id: ctx.user.id,
      p_key_hash: keyHash,
      p_key_prefix: keyPrefix,
      p_name: name
    })
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    return json(res, 400, { error: result?.message || 'Could not create API key.' });
  }

  return json(res, 201, {
    apiKey: secret,
    id: result,
    prefix: keyPrefix,
    warning: 'Copy this key now. It will not be shown again.'
  });
}
