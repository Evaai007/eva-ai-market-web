(() => {
  'use strict';

  const tbody = document.getElementById('eva-live-feed-body');
  const status = document.getElementById('eva-live-feed-status');

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
    if (!tbody) return;
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
    if (!tbody) return;
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

  function mountSampleActivityPopup() {
    if (document.getElementById('eva-sample-activity')) return;

    const style = document.createElement('style');
    style.textContent = `
      #eva-sample-activity{position:fixed;left:16px;bottom:18px;z-index:46;width:min(380px,calc(100vw - 32px));opacity:0;transform:translateY(22px) scale(.97);pointer-events:none;transition:opacity .32s ease,transform .32s ease}
      #eva-sample-activity.show{opacity:1;transform:translateY(0) scale(1)}
      #eva-sample-activity .eva-sample-card{background:linear-gradient(145deg,rgba(7,16,31,.97),rgba(10,22,43,.97));border:1px solid rgba(34,211,238,.32);border-radius:18px;box-shadow:0 18px 45px rgba(0,0,0,.4),0 0 26px rgba(34,211,238,.1);padding:13px 14px;display:flex;gap:12px;align-items:center;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
      #eva-sample-activity .eva-sample-icon{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;position:relative;background:linear-gradient(145deg,#07111f,#0b1b31);border:1px solid rgba(245,158,11,.52);box-shadow:inset 0 0 18px rgba(245,158,11,.06),0 0 14px rgba(245,158,11,.12);flex:0 0 auto;overflow:hidden}
      #eva-sample-activity .eva-sample-icon svg{position:absolute;top:5px;width:18px;height:18px;fill:#fbbf24;filter:drop-shadow(0 0 5px rgba(251,191,36,.45))}
      #eva-sample-activity .eva-sample-icon b{position:absolute;bottom:4px;font:900 16px/1 Inter,system-ui,sans-serif;color:#f8fafc;letter-spacing:-.04em}
      #eva-sample-activity .eva-sample-copy{min-width:0;flex:1}
      #eva-sample-activity .eva-sample-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px}
      #eva-sample-activity .eva-sample-label{font:800 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;color:#67e8f9;text-transform:uppercase}
      #eva-sample-activity .eva-sample-badge{font:800 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#cbd5e1;border:1px solid rgba(148,163,184,.28);border-radius:999px;padding:4px 7px;background:rgba(15,23,42,.8)}
      #eva-sample-activity .eva-sample-email{font:800 13px/1.35 Inter,system-ui,sans-serif;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #eva-sample-activity .eva-sample-meta{font:600 11px/1.35 Inter,system-ui,sans-serif;color:#94a3b8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #eva-sample-activity .eva-sample-country{color:#cbd5e1}
      #eva-sample-activity .eva-sample-product{color:#67e8f9}
      @media (max-width:620px){#eva-sample-activity{left:12px;bottom:12px;width:calc(100vw - 24px)}#eva-sample-activity .eva-sample-card{padding:11px 12px;border-radius:16px}#eva-sample-activity .eva-sample-icon{width:42px;height:42px}}
      @media (prefers-reduced-motion:reduce){#eva-sample-activity{transition:none!important}}
    `;
    document.head.appendChild(style);

    const popup = document.createElement('div');
    popup.id = 'eva-sample-activity';
    popup.setAttribute('aria-live', 'polite');
    popup.innerHTML = `
      <div class="eva-sample-card">
        <div class="eva-sample-icon" aria-label="EVA AI MARKET logo">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z"/></svg>
          <b>E</b>
        </div>
        <div class="eva-sample-copy">
          <div class="eva-sample-top"><span class="eva-sample-label">Sample activity</span><span class="eva-sample-badge">SAMPLE</span></div>
          <div class="eva-sample-email" data-sample-email>emely*****@gmail.com</div>
          <div class="eva-sample-meta"><span class="eva-sample-country" data-sample-country>Bangladesh</span> · <span class="eva-sample-product" data-sample-product>Browsing Claude Pro</span></div>
        </div>
      </div>`;
    document.body.appendChild(popup);

    const names = ['emely','alex','sarah','liam','noah','sofia','daniel','fatima','oliver','maria','kenji','yusuf','emma','lucas','ayaan','nora','hassan','isabella','mateo','mia','leo','amina','adam','grace','ethan','chloe','ryan','layla','samir','ava','jack','lina','omar','elena','arthur','clara','tariq','arjun','sakura','felix'];
    const domains = ['gmail.com','icloud.com','outlook.com','yahoo.com','proton.me','hotmail.com'];
    const products = ['ChatGPT Plus','Claude Pro','Gemini','AWS Cloud','CapCut Pro','Telegram Premium','Official AI Credits','Google Cloud','Kling AI','GitHub Copilot'];
    const countries = [
      'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czechia','Democratic Republic of the Congo','Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Ivory Coast','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe','Kosovo'
    ];
    let timer = null;

    const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
    const makeMaskedEmail = () => `${randomItem(names)}*****@${randomItem(domains)}`;

    const showNext = () => {
      if (document.hidden) return;
      const emailEl = popup.querySelector('[data-sample-email]');
      const countryEl = popup.querySelector('[data-sample-country]');
      const productEl = popup.querySelector('[data-sample-product]');
      emailEl.textContent = makeMaskedEmail();
      countryEl.textContent = randomItem(countries);
      productEl.textContent = `Browsing ${randomItem(products)}`;
      popup.classList.add('show');
      window.setTimeout(() => popup.classList.remove('show'), 3600);
    };

    window.setTimeout(() => {
      showNext();
      timer = window.setInterval(showNext, 6200);
    }, 2200);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      popup.classList.remove('show');
    });

    window.addEventListener('beforeunload', () => {
      if (timer) window.clearInterval(timer);
    }, { once: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    mountSampleActivityPopup();
  }, { once: true });

  if (document.readyState !== 'loading') {
    refresh();
    mountSampleActivityPopup();
  }

  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
})();
