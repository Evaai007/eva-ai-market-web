import { json, requireAdmin, serviceRequest } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  const response = await serviceRequest(ctx, 'rpc/admin_list_deposits', {
    method: 'POST',
    body: '{}'
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    return json(res, 502, { error: result?.message || 'Could not load deposits.' });
  }

  let deposits = [];
  if (Array.isArray(result)) deposits = result;
  else if (Array.isArray(result?.admin_list_deposits)) deposits = result.admin_list_deposits;
  else if (Array.isArray(result?.data)) deposits = result.data;

  return json(res, 200, { deposits });
}
