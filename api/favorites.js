const { requireUser, serviceRequest } = require('./_supabase');

const json = (status, body) => ({
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
});

module.exports = async (req, res) => {
  try {
    const { user } = await requireUser(req);
    if (req.method === 'GET') {
      const result = await serviceRequest('/customer_favorites?select=id,product_id,created_at&user_id=eq.' + encodeURIComponent(user.id) + '&order=created_at.desc');
      if (!result.ok) return res.status(result.status).json({ error: 'Unable to load favorites.' });
      return res.status(200).json({ favorites: result.data || [] });
    }

    if (req.method === 'POST') {
      const productId = String(req.body?.productId || '').trim();
      if (!productId) return res.status(400).json({ error: 'productId is required.' });

      const product = await serviceRequest('/store_products?select=id&eq.id=' + encodeURIComponent(productId) + '&eq.active=eq.true&limit=1');
      if (!product.ok) return res.status(502).json({ error: 'Unable to verify product.' });
      if (!product.data?.length) return res.status(404).json({ error: 'Product not found.' });

      const existing = await serviceRequest('/customer_favorites?select=id&user_id=eq.' + encodeURIComponent(user.id) + '&product_id=eq.' + encodeURIComponent(productId) + '&limit=1');
      if (!existing.ok) return res.status(502).json({ error: 'Unable to check favorite.' });
      if (existing.data?.length) return res.status(200).json({ favorite: true, id: existing.data[0].id });

      const created = await serviceRequest('/customer_favorites', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: user.id, product_id: productId })
      });
      if (!created.ok) return res.status(created.status).json({ error: 'Unable to save favorite.' });
      return res.status(201).json({ favorite: true, id: created.data?.[0]?.id || null });
    }

    if (req.method === 'DELETE') {
      const productId = String(req.query?.productId || '').trim();
      if (!productId) return res.status(400).json({ error: 'productId is required.' });
      const removed = await serviceRequest('/customer_favorites?user_id=eq.' + encodeURIComponent(user.id) + '&product_id=eq.' + encodeURIComponent(productId), {
        method: 'DELETE'
      });
      if (!removed.ok) return res.status(removed.status).json({ error: 'Unable to remove favorite.' });
      return res.status(200).json({ favorite: false });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Favorites service unavailable.' });
  }
};