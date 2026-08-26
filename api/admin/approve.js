import { json, requireAdmin, serviceRequest } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  const depositId = req.body?.depositId;
  const repair = req.body?.repair === true;
  const adminNote = String(req.body?.adminNote || '').trim().slice(0, 500) || null;

  if (!/^[0-9a-f-]{36}$/i.test(depositId || '')) {
    return json(res, 400, { error: 'Invalid deposit.' });
  }

  const rpc = repair ? 'rpc/repair_approved_deposit' : 'rpc/approve_deposit';
  const payload = repair
    ? { p_deposit_id: depositId }
    : { p_deposit_id: depositId, p_admin_note: adminNote };

  const response = await serviceRequest(ctx, rpc, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json(res, 400, { error: result.message || (repair ? 'Repair failed.' : 'Approval failed.') });
  }

  return json(res, 200, {
    approved: !repair,
    repaired: repair ? Boolean(result.repaired) : false,
    result
  });
}
