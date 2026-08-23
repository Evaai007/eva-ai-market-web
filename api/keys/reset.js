import { json, requireUser, serviceRequest } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const response = await serviceRequest(ctx, 'rpc/reset_customer_api_keys', {
    method: 'POST',
    body: JSON.stringify({ p_user_id: ctx.user.id })
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    return json(res, 400, { error: result?.message || 'Could not reset API keys.' });
  }

  return json(res, 200, { revoked: Number(result || 0) });
}
