(() => {
  'use strict';

  const tbody = document.getElementById('eva-live-feed-body');
  const status = document.getElementById('eva-live-feed-status');
  if (!tbody) return;

  const formatAge = (seconds) => {
    const value = Math.max(0, Number(seconds || 0));
    if (value < 60) return 'Just now';
    if (value < 3600) return `${Math.floor(value / 60)}m ago`;
    if (value < 86400) return `${Math.floor(value / 3600)}h ago`;
    return `${Math.floor(value / 86400)}d ago`;
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[ch]));

  function render(events) {
    const orders = Array.isArray(events) ? events.filter((event) => event?.type === 'order').slice(0, 6) : [];
    if (!orders.length) {
      tbody.innerHTML = '<tr><td class="eva-live-empty" colspan="5">No recent verified deliveries are available right now.</td></tr>';
      if (status) status.textContent = 'Waiting for verified deliveries';
      return;
    }

    tbody.innerHTML = orders.map((event) => {
      const amount = Number(event?.amount || 0);
      const product = escapeHtml(String(event?.product || 'EVA product').slice(0, 90));
      return `<tr>
        <td><span class="eva-live-private">Private customer</span></td>
        <td><span class="eva-live-product">${product}</span></td>
        <td><span class="eva-live-amount">${amount > 0 ? '$' + amount.toFixed(2) + ' USDT' : 'Completed'}</span></td>
        <td><span class="eva-live-status">Delivered</span></td>
        <td><span class="eva-live-time">${formatAge(event?.age_seconds)}</span></td>
      </tr>`;
    }).join('');

    if (status) status.textContent = `${orders.length} recent verified deliver${orders.length === 1 ? 'y' : 'ies'}`;
  }

  async function refresh() {
    try {
      const response = await fetch('/api/public-activity', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok || !Array.isArray(body.events)) throw new Error('Activity feed unavailable');
      render(body.events);
    } catch (error) {
      tbody.innerHTML = '<tr><td class="eva-live-empty" colspan="5">Live delivery feed is temporarily unavailable.</td></tr>';
      if (status) status.textContent = 'Feed unavailable';
    }
  }

  document.addEventListener('DOMContentLoaded', refresh, { once: true });
  if (document.readyState !== 'loading') refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
})();
