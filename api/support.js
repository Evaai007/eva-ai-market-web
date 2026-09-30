const { requireUser, serviceRequest } = require('./_supabase');

module.exports = async (req, res) => {
  try {
    const ctx = await requireUser(req, res);
    if (!ctx) return;
    const uid = encodeURIComponent(ctx.user.id);

    if (req.method === 'GET') {
      const tickets = await serviceRequest(ctx, '/support_tickets?select=id,subject,category,priority,status,created_at,updated_at,closed_at&user_id=eq.' + uid + '&order=updated_at.desc');
      if (!tickets.ok) return res.status(tickets.status).json({ error: 'Unable to load support tickets.' });
      const rows = tickets.data || [];
      const messages = rows.length
        ? await serviceRequest(ctx, '/support_messages?select=id,ticket_id,sender_user_id,sender_type,message,created_at&ticket_id=in.(' + rows.map(x => x.id).join(',') + ')&order=created_at.asc')
        : { ok: true, data: [] };
      if (!messages.ok) return res.status(messages.status).json({ error: 'Unable to load support messages.' });
      return res.status(200).json({ tickets: rows, messages: messages.data || [] });
    }

    if (req.method === 'POST') {
      const subject = String(req.body?.subject || '').trim();
      const message = String(req.body?.message || '').trim();
      const category = String(req.body?.category || '').trim() || null;
      if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required.' });
      if (subject.length > 160 || message.length > 4000) return res.status(400).json({ error: 'Message is too long.' });

      const ticket = await serviceRequest(ctx, '/support_tickets', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: ctx.user.id, subject, category })
      });
      if (!ticket.ok) return res.status(ticket.status).json({ error: 'Unable to create support ticket.' });
      const row = ticket.data?.[0];
      const created = await serviceRequest(ctx, '/support_messages', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ticket_id: row.id, sender_user_id: ctx.user.id, sender_type: 'customer', message })
      });
      if (!created.ok) return res.status(created.status).json({ error: 'Ticket created but initial message failed.' });
      return res.status(201).json({ ticket: row, message: created.data?.[0] || null });
    }

    if (req.method === 'PATCH') {
      const ticketId = String(req.body?.ticketId || '').trim();
      const message = String(req.body?.message || '').trim();
      if (!ticketId || !message) return res.status(400).json({ error: 'ticketId and message are required.' });
      if (message.length > 4000) return res.status(400).json({ error: 'Message is too long.' });
      const ticket = await serviceRequest(ctx, '/support_tickets?select=id,status&user_id=eq.' + uid + '&id=eq.' + encodeURIComponent(ticketId) + '&limit=1');
      if (!ticket.ok) return res.status(ticket.status).json({ error: 'Unable to verify ticket.' });
      if (!ticket.data?.length) return res.status(404).json({ error: 'Ticket not found.' });
      if (['closed','resolved'].includes(ticket.data[0].status)) return res.status(409).json({ error: 'This ticket is closed.' });
      const created = await serviceRequest(ctx, '/support_messages', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ticket_id: ticketId, sender_user_id: ctx.user.id, sender_type: 'customer', message })
      });
      if (!created.ok) return res.status(created.status).json({ error: 'Unable to send message.' });
      await serviceRequest(ctx, '/support_tickets?id=eq.' + encodeURIComponent(ticketId) + '&user_id=eq.' + uid, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'open', updated_at: new Date().toISOString() })
      });
      return res.status(201).json({ message: created.data?.[0] || null });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Support service unavailable.' });
  }
};