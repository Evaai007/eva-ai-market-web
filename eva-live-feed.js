(() => {
  'use strict';

  if (!document.querySelector('link[data-eva-mobile-ref]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/eva-mobile-orb-reference.css?v=20260916-mobile-ref1';
    link.dataset.evaMobileRef = 'true';
    document.head.appendChild(link);
  }

  const tbody = document.getElementById('eva-live-feed-body');
  const status = document.getElementById('eva-live-feed-status');
  let liveOrders = [];
  let liveOrderIndex = 0;
  let liveTimer = null;
  let usingDemoFallback = false;

  const demoProducts = [
    'ChatGPT Plus', 'ChatGPT Pro — 5× Usage', 'ChatGPT Pro — 20× Usage',
    'Claude Pro', 'Claude Max 5x', 'Claude Max 20x',
    'Google AI Pro', 'Google AI Ultra 5×', 'Google AI Ultra 20×',
    'AWS Cloud — 8 vCPU', 'AWS Cloud — 64 vCPU', 'AWS + Kiro + GCP AI Bundle'
  ];
  const demoCountries = [
    'Bangladesh','United States','United Kingdom','Canada','Australia','Germany','France','Italy','Spain','Netherlands','Sweden','Norway','Denmark','Finland','Switzerland','Austria','Belgium','Ireland','Portugal','Poland','Czech Republic','Romania','Hungary','Greece','Turkey','Ukraine','United Arab Emirates','Saudi Arabia','Qatar','Kuwait','Oman','Bahrain','India','Pakistan','Nepal','Sri Lanka','Japan','South Korea','Singapore','Malaysia','Thailand','Indonesia','Philippines','Vietnam','China','Hong Kong','Brazil','Mexico','Argentina','Chile','South Africa','Nigeria','Kenya','Egypt','Panama'
  ];
  const demoNames = ['emely','noah','liam','emma','oliver','sofia','lucas','mason','elena','alex','mia','james','david','ethan','harper','daniel','sam','jack','nora','leo','ava'];
  const demoProviders = ['gmail.com','icloud.com','outlook.com','yahoo.com','proton.me'];

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const makeDemoEvent = () => ({
    type: 'demo',
    product: pick(demoProducts),
    customer: `${pick(demoNames)}*****@${pick(demoProviders)}`,
    country: pick(demoCountries),
    age_seconds: Math.floor(3 + Math.random() * 90)
  });

  const formatAge = (seconds) => {
    const value = Math.max(0, Number(seconds || 0));
    if (value < 60) return 'Just now';
    if (value < 3600) return `${Math.floor(value / 60)}m ago`;
    if (value < 86400) return `${Math.floor(value / 3600)}h ago`;
    return `${Math.floor(value / 86400)}d ago`;
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'\"]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;'
  }[ch]));

  function render(events) {
    if (!tbody) return;
    const orders = Array.isArray(events) ? events.filter((event) => event?.type === 'order').slice(0, 6) : [];
    usingDemoFallback = orders.length === 0;

    if (usingDemoFallback) {
      liveOrders = Array.from({ length: 6 }, makeDemoEvent);
      tbody.innerHTML = liveOrders.map((event) => `<tr>
        <td><span class="eva-live-private">${escapeHtml(event.customer)}</span></td>
        <td><span class="eva-live-product">${escapeHtml(event.product)}</span></td>
        <td><span class="eva-live-amount">${escapeHtml(event.country)}</span></td>
        <td><span class="eva-live-status">Done</span></td>
        <td><span class="eva-live-time">${formatAge(event.age_seconds)}</span></td>
      </tr>`).join('');
      if (status) status.textContent = 'Live activity · real deliveries appear automatically';
      return;
    }

    liveOrders = orders;
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
    if (!tbody) return;
    try {
      const response = await fetch('/api/public-activity', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok || !Array.isArray(body.events)) throw new Error('Activity feed unavailable');
      render(body.events);
    } catch (error) {
      usingDemoFallback = true;
      liveOrders = Array.from({ length: 6 }, makeDemoEvent);
      render([]);
    }
  }

  function mountLiveOrderPopup() {
    if (document.getElementById('eva-live-order-popup')) return;

    const style = document.createElement('style');
    style.textContent = `
      #eva-live-order-popup{position:fixed;left:8px;bottom:8px;z-index:46;width:min(270px,calc(100vw - 16px));opacity:0;transform:translateY(16px) scale(.98);pointer-events:none;transition:opacity .28s ease,transform .28s ease}
      #eva-live-order-popup.show{opacity:1;transform:translateY(0) scale(1)}
      #eva-live-order-popup .eva-live-card{background:linear-gradient(145deg,rgba(7,16,31,.98),rgba(10,22,43,.98));border:1px solid rgba(34,211,238,.3);border-radius:12px;box-shadow:0 12px 28px rgba(0,0,0,.36),0 0 18px rgba(34,211,238,.08);padding:7px 8px;display:flex;gap:8px;align-items:center;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
      #eva-live-order-popup .eva-live-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;position:relative;background:linear-gradient(145deg,#07111f,#0b1b31);border:1px solid rgba(245,158,11,.5);flex:0 0 auto;overflow:hidden}
      #eva-live-order-popup .eva-live-icon svg{position:absolute;top:2px;width:11px;height:11px;fill:#fbbf24}
      #eva-live-order-popup .eva-live-icon b{position:absolute;bottom:2px;font:900 10px/1 Inter,system-ui,sans-serif;color:#f8fafc}
      #eva-live-order-popup .eva-live-copy{min-width:0;flex:1}
      #eva-live-order-popup .eva-live-top{display:flex;align-items:center;gap:5px;margin-bottom:1px}
      #eva-live-order-popup .eva-live-label{font:800 8px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em;color:#34d399;text-transform:uppercase}
      #eva-live-order-popup .eva-live-label:before{content:'●';font-size:6px;margin-right:4px;color:#34d399}
      #eva-live-order-popup .eva-live-demo{font:800 7px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#94a3b8;border:1px solid rgba(148,163,184,.3);border-radius:999px;padding:2px 5px;text-transform:uppercase;letter-spacing:.08em}
      #eva-live-order-popup .eva-live-customer{font:800 10px/1.25 Inter,system-ui,sans-serif;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #eva-live-order-popup .eva-live-meta{font:600 8px/1.3 Inter,system-ui,sans-serif;color:#94a3b8;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #eva-live-order-popup .eva-live-product{color:#67e8f9}
      @media (prefers-reduced-motion:reduce){#eva-live-order-popup{transition:none!important}}
    `;
    document.head.appendChild(style);

    const popup = document.createElement('div');
    popup.id = 'eva-live-order-popup';
    popup.setAttribute('aria-live', 'polite');
    popup.innerHTML = `
      <div class="eva-live-card">
        <div class="eva-live-icon" aria-label="EVA AI MARKET logo">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z"/></svg>
          <b>E</b>
        </div>
        <div class="eva-live-copy">
          <div class="eva-live-top"><span class="eva-live-label">Live</span><span class="eva-live-demo" data-live-demo hidden>Done</span></div>
          <div class="eva-live-customer" data-live-customer>Private customer</div>
          <div class="eva-live-meta"><span data-live-country></span><span class="eva-live-product" data-live-product>Verified delivery</span> · <span data-live-time>Just now</span></div>
        </div>
      </div>`;
    document.body.appendChild(popup);

    const showNext = () => {
      if (document.hidden || !liveOrders.length) return;
      let event = liveOrders[liveOrderIndex % liveOrders.length];
      liveOrderIndex += 1;
      if (usingDemoFallback) {
        event = makeDemoEvent();
        liveOrders[liveOrderIndex % liveOrders.length] = event;
      }
      popup.querySelector('[data-live-customer]').textContent = usingDemoFallback ? event.customer : 'Private customer';
      popup.querySelector('[data-live-country]').textContent = usingDemoFallback ? `${event.country} · ` : '';
      popup.querySelector('[data-live-product]').textContent = String(event?.product || 'EVA product').slice(0, 80);
      popup.querySelector('[data-live-time]').textContent = formatAge(event?.age_seconds);
      popup.querySelector('[data-live-demo]').hidden = !usingDemoFallback;
      popup.classList.add('show');
      window.setTimeout(() => popup.classList.remove('show'), 3200);
    };

    window.setTimeout(() => {
      showNext();
      liveTimer = window.setInterval(showNext, 5200);
    }, 1800);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) popup.classList.remove('show');
    });

    window.addEventListener('beforeunload', () => {
      if (liveTimer) window.clearInterval(liveTimer);
    }, { once: true });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await refresh();
    mountLiveOrderPopup();
  }, { once: true });

  if (document.readyState !== 'loading') {
    refresh().then(mountLiveOrderPopup);
  }

  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
})();
