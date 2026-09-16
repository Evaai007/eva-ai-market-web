(() => {
  'use strict';

  const tbody = document.getElementById('eva-live-feed-body');
  const status = document.getElementById('eva-live-feed-status');
  const title = document.getElementById('eva-live-feed-title');
  let popupDeposits = [];
  let popupDepositIndex = 0;
  let liveTimer = null;
  let tableTimer = null;
  let demoTableCountryIndex = 0;
  let demoPopupCountryIndex = 0;

  const demoProducts = [
    'ChatGPT Plus', 'ChatGPT Pro — 5× Usage', 'ChatGPT Pro — 20× Usage',
    'Claude Pro', 'Claude Max 5x', 'Claude Max 20x',
    'Google AI Pro', 'Google AI Ultra 5×', 'Google AI Ultra 20×',
    'AWS Cloud — 8 vCPU', 'AWS Cloud — 64 vCPU', 'AWS + Kiro + GCP AI Bundle'
  ];

  const demoCountries = [
    'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan',
    'Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
    'Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic',
    'Democratic Republic of the Congo','Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia',
    'Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary',
    'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Ivory Coast','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan',
    'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
    'Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal',
    'Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
    'Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
    'Hong Kong','Macau','Puerto Rico','Greenland','Faroe Islands','Bermuda','Cayman Islands','British Virgin Islands','U.S. Virgin Islands','Guam','American Samoa','Northern Mariana Islands','Aruba','Curacao','Sint Maarten','New Caledonia','French Polynesia','Reunion','Martinique','Guadeloupe','Mayotte','Isle of Man','Jersey','Guernsey','Gibraltar'
  ];

  const demoNames = ['emely','noah','liam','emma','oliver','sofia','lucas','mason','elena','alex','mia','james','david','ethan','harper','daniel','sam','jack','nora','leo','ava','adam','anna','ben','chloe','diego','ella','fahim','grace','henry','isla','jacob','kai','luna','marco','nina','omar','peter','rayan','sara','theo','victor','yara','zane'];
  const demoProviders = ['gmail.com','icloud.com','outlook.com','yahoo.com','proton.me'];
  const demoNetworks = ['TRC20','BEP20','ERC20'];
  const demoAmounts = [15,20,21,25,30,35,50,80,100,150,200,300,500];

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const nextTableCountry = () => {
    const country = demoCountries[demoTableCountryIndex % demoCountries.length];
    demoTableCountryIndex += 1;
    return country;
  };
  const nextPopupCountry = () => {
    const country = demoCountries[demoPopupCountryIndex % demoCountries.length];
    demoPopupCountryIndex += 1;
    return country;
  };
  const makeDemoEvent = () => ({
    type: 'demo',
    product: pick(demoProducts),
    customer: `${pick(demoNames)}*****@${pick(demoProviders)}`,
    country: nextTableCountry(),
    age_seconds: Math.floor(3 + Math.random() * 90)
  });
  const makeDemoDeposit = () => ({
    type: 'demo-deposit',
    customer: `${pick(demoNames)}*****@${pick(demoProviders)}`,
    country: nextPopupCountry(),
    amount: pick(demoAmounts),
    network: pick(demoNetworks),
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

  function mountFinalMobileHeaderStyles() {
    if (document.getElementById('eva-mobile-header-final')) return;
    const style = document.createElement('style');
    style.id = 'eva-mobile-header-final';
    style.textContent = `
      @media (max-width:760px){
        body.premium-home .pro-topbar{position:sticky!important;top:0!important;z-index:200!important;height:64px!important;min-height:64px!important;max-height:64px!important;overflow:hidden!important;background:#070b12!important;border-bottom:1px solid rgba(59,130,246,.16)!important;backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important}
        body.premium-home .pro-topbar .nav-wrap{position:relative!important;width:100%!important;max-width:430px!important;height:64px!important;min-height:64px!important;max-height:64px!important;margin:0 auto!important;padding:0 8px!important;display:flex!important;flex-flow:row nowrap!important;align-items:center!important;justify-content:flex-start!important;gap:0!important;overflow:hidden!important;box-sizing:border-box!important}
        body.premium-home .pro-topbar .pro-search,body.premium-home .pro-topbar .menu-button{display:none!important}
        body.premium-home .pro-topbar .pro-mobile-brand{display:flex!important;align-items:center!important;gap:5px!important;width:136px!important;max-width:136px!important;min-width:0!important;flex:0 0 136px!important;margin:0!important;overflow:hidden!important;text-decoration:none!important;color:#f8fafc!important;font-size:8.8px!important;font-weight:900!important;line-height:1!important;letter-spacing:.04em!important}
        body.premium-home .pro-topbar .pro-mobile-brand .brand-mark{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;width:34px!important;height:34px!important;flex:0 0 34px!important;border-radius:11px!important;font-size:0!important;color:transparent!important;background:#090f1d!important;border:2px solid transparent!important;background-image:linear-gradient(#090f1d,#090f1d),linear-gradient(145deg,#f59e0b,#f97316)!important;background-origin:border-box!important;background-clip:padding-box,border-box!important;box-shadow:0 0 16px rgba(245,158,11,.22)!important}
        body.premium-home .pro-topbar .pro-mobile-brand .brand-mark:after{content:'♛'!important;color:#fbbf24!important;font-size:18px!important;line-height:1!important}
        body.premium-home .pro-topbar .pro-mobile-brand>span:last-child{display:block!important;position:relative!important;padding-bottom:8px!important;white-space:nowrap!important}
        body.premium-home .pro-topbar .pro-mobile-brand>span:last-child:after{content:'PREMIUM AI TOOLS'!important;position:absolute!important;left:0!important;bottom:0!important;color:#22d3ee!important;font-size:5.2px!important;font-weight:800!important;letter-spacing:.08em!important;white-space:nowrap!important}
        body.premium-home .pro-topbar #site-nav{display:flex!important;visibility:visible!important;opacity:1!important;position:absolute!important;right:6px!important;top:0!important;bottom:0!important;left:auto!important;transform:none!important;width:calc(100% - 146px)!important;max-width:none!important;height:64px!important;min-height:64px!important;margin:0!important;padding:0!important;flex-flow:row nowrap!important;align-items:center!important;justify-content:flex-end!important;gap:3px!important;overflow:hidden!important;z-index:999!important;background:transparent!important;border:0!important;box-shadow:none!important}
        body.premium-home .pro-topbar #site-nav>a{display:none!important;position:static!important;inset:auto!important;float:none!important;transform:none!important;margin:0!important;width:auto!important;max-width:none!important;min-width:0!important;flex:none!important}
        body.premium-home .pro-topbar #site-nav>a.nav-account,body.premium-home .pro-topbar #site-nav>a.video-get-started{display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important;text-decoration:none!important;pointer-events:auto!important}
        body.premium-home .pro-topbar #site-nav>a.nav-account{height:32px!important;padding:0 4px!important;font-size:9px!important;font-weight:600!important;color:#f1f5f9!important;background:transparent!important;border:0!important}
        body.premium-home .pro-topbar #site-nav>a.video-get-started{height:34px!important;padding:0 7px!important;font-size:9px!important;font-weight:700!important;color:#fff!important;border-radius:999px!important;border:2px solid transparent!important;background-image:linear-gradient(#08101f,#08101f),linear-gradient(90deg,#22d3ee,#2563eb,#4f46e5)!important;background-origin:border-box!important;background-clip:padding-box,border-box!important;box-shadow:0 0 14px rgba(37,99,235,.18)!important}
      }
      @media (min-width:391px) and (max-width:760px){
        body.premium-home .pro-topbar .pro-mobile-brand{width:145px!important;max-width:145px!important;flex-basis:145px!important;font-size:9.6px!important;gap:6px!important}
        body.premium-home .pro-topbar .pro-mobile-brand .brand-mark{width:36px!important;height:36px!important;flex-basis:36px!important}
        body.premium-home .pro-topbar #site-nav{right:8px!important;width:calc(100% - 158px)!important;gap:5px!important}
        body.premium-home .pro-topbar #site-nav>a.nav-account{height:34px!important;padding:0 7px!important;font-size:10px!important}
        body.premium-home .pro-topbar #site-nav>a.video-get-started{height:36px!important;padding:0 10px!important;font-size:10px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function mountUniversalResponsiveStyles() {
    if (document.getElementById('eva-responsive-final')) return;
    const style = document.createElement('style');
    style.id = 'eva-responsive-final';
    style.textContent = `
      html,body{max-width:100%;overflow-x:hidden}
      *,*:before,*:after{box-sizing:border-box}
      img,video,svg,canvas{max-width:100%;height:auto}
      body.premium-home main,body.premium-home footer{max-width:100%;overflow-x:clip}
      body.premium-home .container{width:min(100% - 28px,1280px);margin-left:auto;margin-right:auto}
      body.premium-home .eva-live-table-wrap,body.premium-home .table-wrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
      body.premium-home .eva-live-table,body.premium-home table{min-width:620px}
      @media (max-width:760px){
        body.premium-home .container{width:min(100% - 24px,430px)}
        body.premium-home .eva-live-panel,body.premium-home .panel,body.premium-home .account-product{max-width:100%}
        body.premium-home input,body.premium-home select,body.premium-home textarea,body.premium-home button,body.premium-home a{max-width:100%}
      }
      @media (min-width:761px) and (max-width:1024px){
        body.premium-home .container{width:min(100% - 40px,960px)}
        body.premium-home .pro-topbar{height:126px!important;min-height:126px!important;max-height:126px!important;background:#06090e!important;overflow:hidden!important}
        body.premium-home .pro-topbar .nav-wrap{position:relative!important;width:100%!important;max-width:1024px!important;height:126px!important;min-height:126px!important;margin:0 auto!important;padding:0 20px!important}
        body.premium-home .pro-topbar .pro-mobile-brand{left:20px!important;top:14px!important;height:58px!important;gap:12px!important;font-size:16px!important}
        body.premium-home .pro-topbar #site-nav{left:0!important;right:0!important;bottom:0!important;top:auto!important;height:50px!important;padding:0 270px 0 20px!important;gap:16px!important;overflow:hidden!important;border-radius:0!important}
        body.premium-home .pro-topbar #site-nav>a{height:50px!important;font-size:13px!important}
        body.premium-home .pro-topbar #site-nav>a:nth-child(5),body.premium-home .pro-topbar #site-nav>a:nth-child(6),body.premium-home .pro-topbar #site-nav>a:nth-child(7){display:none!important}
        body.premium-home .pro-topbar #site-nav>a.nav-account{display:flex!important;position:absolute!important;right:150px!important;top:-58px!important;width:96px!important;height:38px!important;font-size:13px!important}
        body.premium-home .pro-topbar #site-nav>a.video-get-started{display:flex!important;position:absolute!important;right:18px!important;top:-60px!important;width:120px!important;height:42px!important;font-size:13px!important}
        body.premium-home .ref-payment-row,body.premium-home .api-support-grid,body.premium-home .deposit-grid,body.premium-home .features,body.premium-home .ref-reviews{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      }
      @media (min-width:1025px){
        body.premium-home .container{width:min(100% - 56px,1280px)}
        body.premium-home .pro-topbar .nav-wrap{max-width:1500px!important}
        body.premium-home .pro-topbar #site-nav{gap:clamp(16px,2vw,34px)!important}
        body.premium-home .pro-topbar #site-nav>a{font-size:clamp(13px,1.1vw,15px)!important}
      }
      @media (min-width:1440px){
        body.premium-home .container{width:min(100% - 80px,1360px)}
      }
    `;
    document.head.appendChild(style);
  }

  function demoRow(event) {
    return `<tr data-eva-demo-row="true">
      <td><span class="eva-live-private">${escapeHtml(event.customer)}</span></td>
      <td><span class="eva-live-product">${escapeHtml(event.product)}</span></td>
      <td><span class="eva-live-amount">${escapeHtml(event.country)}</span></td>
      <td><span class="eva-live-status">Done</span></td>
      <td><span class="eva-live-time">${formatAge(event.age_seconds)}</span></td>
    </tr>`;
  }

  function render() {
    if (title) title.textContent = 'Sample Activity Feed';
    if (!tbody) return;
    tbody.innerHTML = demoRow(makeDemoEvent());
    if (status) status.textContent = 'EVA Activity · 221 Countries · Clients Welcome';
  }

  function setPopupDeposits() {
    popupDeposits = [{ type: 'demo-deposit' }];
  }

  function refresh() {
    render();
    setPopupDeposits();
    return Promise.resolve();
  }

  function startTableCountryRotation() {
    if (tableTimer) window.clearInterval(tableTimer);
    tableTimer = window.setInterval(() => {
      if (!document.hidden) render();
    }, 5000);
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
      #eva-live-order-popup .eva-live-top{display:flex;align-items:center;justify-content:space-between;gap:7px;margin-bottom:3px}
      #eva-live-order-popup .eva-live-label{font:900 9px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.11em;color:#34d399;text-transform:uppercase}
      #eva-live-order-popup .eva-live-label:before{content:'●';font-size:6px;margin-right:4px;color:#34d399}
      #eva-live-order-popup .eva-live-demo{font:800 7px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#a7f3d0;border:1px solid rgba(52,211,153,.36);border-radius:999px;padding:3px 6px;text-transform:uppercase;letter-spacing:.08em}
      #eva-live-order-popup .eva-live-customer{font:800 12px/1.25 Inter,system-ui,sans-serif;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #eva-live-order-popup .eva-live-meta{font:700 10px/1.35 Inter,system-ui,sans-serif;color:#94a3b8;margin-top:2px;white-space:normal;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
      #eva-live-order-popup .eva-live-product{color:#67e8f9;font-weight:800}
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
          <div class="eva-live-top"><span class="eva-live-label">Sample Activity</span><span class="eva-live-demo" data-live-demo>Done</span></div>
          <div class="eva-live-customer" data-live-customer>Sample activity</div>
          <div class="eva-live-meta"><span data-live-country></span><span class="eva-live-product" data-live-product>Deposit sample</span> · <span data-live-time>Just now</span></div>
        </div>
      </div>`;
    document.body.appendChild(popup);

    const showNext = () => {
      if (document.hidden || !popupDeposits.length) return;
      const event = makeDemoDeposit();
      const amount = Number(event.amount || 0);
      const network = String(event.network || 'USDT');
      popupDepositIndex += 1;
      popup.querySelector('[data-live-customer]').textContent = event.customer;
      popup.querySelector('[data-live-country]').textContent = `${event.country} · `;
      popup.querySelector('[data-live-product]').textContent = `${amount > 0 ? '$' + amount.toFixed(2) + ' USDT' : 'USDT'} Deposit (${network})`;
      popup.querySelector('[data-live-time]').textContent = formatAge(event.age_seconds);
      popup.classList.add('show');
      window.setTimeout(() => popup.classList.remove('show'), 3400);
    };

    window.setTimeout(() => {
      showNext();
      liveTimer = window.setInterval(showNext, 5000);
    }, 1200);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) popup.classList.remove('show');
    });

    window.addEventListener('beforeunload', () => {
      if (liveTimer) window.clearInterval(liveTimer);
      if (tableTimer) window.clearInterval(tableTimer);
    }, { once: true });
  }

  const boot = async () => {
    mountFinalMobileHeaderStyles();
    mountUniversalResponsiveStyles();
    await refresh();
    startTableCountryRotation();
    mountLiveOrderPopup();
  };

  document.addEventListener('DOMContentLoaded', boot, { once: true });

  if (document.readyState !== 'loading') boot();
})();