import { json, requireUser, serviceRequest } from './_supabase.js';

export default async function handler(req, res) {
  try {
    const ctx = await requireUser(req, res);
    if (!ctx) return;
    const userId = encodeURIComponent(ctx.user.id);

    if (req.method === 'GET') {
      const result = await serviceRequest(ctx, '/customer_notifications?select=id,type,title,message,reference_id,read_at,created_at&user_id=eq.' + userId + '&order=created_at.desc&limit=100');
      if (!result.ok) return res.status(result.status).json({ error: 'Unable to load notifications.' });
      const rows = result.data || [];
      return res.status(200).json({
        notifications: rows,
        unreadCount: rows.filter(item => !item.read_at).length
      });
    }

    if (req.method === 'PATCH') {
      const id = String(req.body?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'id is required.' });
      const result = await serviceRequest(ctx, '/customer_notifications?id=eq.' + encodeURIComponent(id) + '&user_id=eq.' + userId, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ read_at: new Date().toISOString() })
      });
      if (!result.ok) return res.status(result.status).json({ error: 'Unable to mark notification as read.' });
      return res.status(200).json({ read: true });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Notification service unavailable.' });
  }
};