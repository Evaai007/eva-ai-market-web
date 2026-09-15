(() => {
  'use strict';

  const tbody = document.getElementById('eva-live-feed-body');
  const status = document.getElementById('eva-live-feed-status');
  let liveOrders = [];
  let liveOrderIndex = 0;
  let liveTimer = null;

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

  function mountIntegratedDesign() {
    if (document.getElementById('eva-uploaded-design-style')) return;

    const style = document.createElement('style');
    style.id = 'eva-uploaded-design-style';
    style.textContent = `
      :root{--eva-bg:#080b14;--eva-panel:rgba(15,23,42,.75);--eva-cyan:#00f2fe;--eva-purple:#7f00ff;--eva-gold:#f59e0b;--eva-border:rgba(255,255,255,.08)}
      body.premium-home{background:#080b14!important;color:#e2e8f0!important;font-family:'Segoe UI',Inter,system-ui,-apple-system,sans-serif!important;overflow-x:hidden!important}
      body.premium-home:before{content:'';position:fixed;top:-100px;left:-100px;width:500px;height:500px;border-radius:50%;background:rgba(6,182,212,.10);filter:blur(120px);pointer-events:none;z-index:-3}
      body.premium-home:after{content:'';position:fixed;top:20%;right:-100px;width:600px;height:600px;border-radius:50%;background:rgba(126,34,206,.10);filter:blur(140px);pointer-events:none;z-index:-3}

      #eva-integrated-modebar{position:sticky;top:0;z-index:70;background:rgba(2,6,23,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid rgba(34,211,238,.28);padding:8px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px}
      #eva-integrated-modebar .eva-mode-title{display:flex;align-items:center;gap:8px;color:#67e8f9;font:800 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;white-space:nowrap}
      #eva-integrated-modebar .eva-mode-title i{width:9px;height:9px;border-radius:50%;background:#22d3ee;box-shadow:0 0 14px rgba(34,211,238,.9);animation:evaModePulse 1.3s infinite}
      #eva-integrated-modebar .eva-mode-tabs{display:flex;align-items:center;gap:4px;padding:4px;background:#0f172a;border:1px solid #1e293b;border-radius:12px}
      #eva-integrated-modebar .eva-mode-tabs a{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:9px;color:#94a3b8;text-decoration:none;font-size:11px;font-weight:700;white-space:nowrap}
      #eva-integrated-modebar .eva-mode-tabs a.active{background:#22d3ee;color:#06111b;box-shadow:0 0 18px rgba(34,211,238,.22)}
      #eva-integrated-modebar .eva-mode-tabs a:hover{color:#fff}
      @keyframes evaModePulse{0%,100%{opacity:.45;transform:scale(.9)}50%{opacity:1;transform:scale(1.15)}}

      .pro-app:before{display:none!important}
      .pro-topbar{top:44px!important;z-index:60!important;background:rgba(15,23,42,.72)!important;backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important;border-bottom:1px solid rgba(255,255,255,.08)!important;box-shadow:none!important}
      .pro-topbar .nav-wrap{max-width:1280px!important;min-height:80px!important;height:80px!important;padding:0 20px!important}
      .pro-mobile-brand{gap:12px!important;color:#fff!important;font-weight:900!important;letter-spacing:.045em!important}
      .pro-mobile-brand .brand-mark{width:40px!important;height:40px!important;flex:0 0 40px!important;border-radius:12px!important;background:linear-gradient(135deg,#06b6d4,#7c3aed)!important;border:0!important;box-shadow:0 0 20px rgba(0,242,254,.28)!important;color:transparent!important;position:relative!important;overflow:hidden!important}
      .pro-mobile-brand .brand-mark:before{content:'♛'!important;position:absolute!important;inset:0!important;display:grid!important;place-items:center!important;color:#fbbf24!important;font-size:22px!important;line-height:1!important;transform:none!important;background:none!important;border:0!important;box-shadow:none!important}
      .pro-mobile-brand>span:last-child:after{content:'PREMIUM AI TOOLS'!important;display:block!important;color:#22d3ee!important;font:700 9px/1.1 ui-monospace,SFMono-Regular,Menlo,monospace!important;letter-spacing:.14em!important;margin-top:2px!important}
      .pro-search{background:rgba(15,23,42,.92)!important;border:1px solid #334155!important;border-radius:12px!important;color:#64748b!important;height:38px!important}
      .pro-topbar nav{gap:22px!important}.pro-topbar nav a{font-size:12px!important;color:#cbd5e1!important;font-weight:600!important}.pro-topbar nav a:hover{color:#22d3ee!important}
      .pro-topbar nav .video-get-started{border-radius:999px!important;background:linear-gradient(90deg,#06b6d4,#2563eb)!important;box-shadow:0 0 20px rgba(0,242,254,.25)!important;color:#fff!important;border:0!important}

      .ref-hero{padding:48px 0 46px!important;background:transparent!important}
      .ref-hero>.container,.store-showcase>.container,.eva-live-feed>.container{max-width:1280px!important;padding-left:20px!important;padding-right:20px!important}
      .ref-hero-grid{grid-template-columns:minmax(0,7fr) minmax(340px,5fr)!important;gap:48px!important;align-items:center!important;min-height:500px!important}
      .ref-hero-copy{max-width:680px!important}
      .ref-kicker{display:inline-flex!important;width:auto!important;align-items:center!important;padding:7px 12px!important;border-radius:999px!important;background:rgba(8,51,68,.62)!important;border:1px solid rgba(34,211,238,.30)!important;color:#22d3ee!important;font-size:10px!important;font-weight:800!important;letter-spacing:.05em!important}
      .ref-kicker:before{content:'●';margin-right:7px;color:#22d3ee;font-size:8px;animation:evaModePulse 1.3s infinite}
      .ref-hero-copy h1{font-size:clamp(48px,5.4vw,72px)!important;line-height:1.02!important;letter-spacing:-.045em!important;margin:18px 0 18px!important;color:#fff!important;font-weight:900!important}
      .ref-hero-copy h1 span{display:block!important;background:linear-gradient(90deg,#22d3ee,#5eead4 48%,#c084fc)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important;text-shadow:0 0 24px rgba(0,242,254,.12)!important}
      .ref-hero-copy p{color:#94a3b8!important;font-size:17px!important;line-height:1.7!important;max-width:620px!important}
      .ref-mini-trust{grid-template-columns:repeat(4,max-content)!important;gap:17px!important;border-top:1px solid rgba(51,65,85,.6)!important;padding-top:20px!important;margin-top:24px!important;color:#94a3b8!important;font-size:11px!important}.ref-mini-trust span:before{content:'✓';color:#22d3ee;margin-right:6px}
      .ref-hero-actions{gap:14px!important;margin-top:20px!important}.ref-btn-primary,.ref-btn-secondary{min-height:48px!important;padding:0 24px!important;border-radius:12px!important;font-size:12px!important;font-weight:800!important}.ref-btn-primary{background:linear-gradient(90deg,#06b6d4,#2563eb)!important;box-shadow:0 0 20px rgba(0,242,254,.28)!important}.ref-btn-secondary{background:rgba(15,23,42,.76)!important;border:1px solid #334155!important;color:#e2e8f0!important}
      .ref-customer-proof{display:none!important}

      .ref-visual{min-height:410px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:rgba(15,23,42,.58)!important;backdrop-filter:blur(16px)!important;border:1px solid rgba(148,163,184,.20)!important;border-radius:28px!important;padding:34px!important;box-shadow:0 24px 70px rgba(0,0,0,.35)!important;overflow:visible!important}
      .ref-visual:before{content:''!important;position:absolute!important;width:310px!important;height:310px!important;border-radius:50%!important;background:radial-gradient(circle,rgba(6,182,212,.20),rgba(79,70,229,.18) 50%,transparent 72%)!important;filter:blur(8px)!important;z-index:-1!important}
      .ref-cyber-head{width:205px!important;height:205px!important;border-radius:50%!important;background:radial-gradient(circle at 45% 35%,rgba(34,211,238,.26),rgba(15,23,42,.98) 66%)!important;border:2px solid rgba(34,211,238,.55)!important;box-shadow:0 0 36px rgba(34,211,238,.28),0 0 80px rgba(124,58,237,.20)!important;position:relative!important}
      .ref-cyber-head:before{content:'♛'!important;position:absolute!important;top:-34px!important;left:50%!important;transform:translateX(-50%)!important;color:#f59e0b!important;font-size:28px!important;text-shadow:0 0 16px rgba(245,158,11,.5)!important;z-index:5!important}
      .ref-cyber-head:after{display:none!important}.ref-eye{width:84px!important;height:52px!important}.ref-head-label{bottom:28px!important;font-size:9px!important;letter-spacing:.11em!important;color:#67e8f9!important}.ref-head-label:after{content:'AI TODAY, A BETTER TOMORROW'!important;display:block!important;color:#94a3b8!important;font-size:6px!important;letter-spacing:.08em!important;margin-top:3px!important}
      .ref-orbit-card{position:absolute!important;display:flex!important;align-items:center!important;gap:6px!important;padding:7px 10px!important;border-radius:999px!important;background:rgba(15,23,42,.88)!important;border:1px solid rgba(148,163,184,.18)!important;color:#e2e8f0!important;font-size:9px!important;box-shadow:0 10px 28px rgba(0,0,0,.28)!important;white-space:nowrap!important}.ref-orbit-card b{color:#22d3ee!important}.ref-orbit-card.c1{left:-54px!important;top:20px!important}.ref-orbit-card.c2{left:-72px!important;top:84px!important}.ref-orbit-card.c3{left:-54px!important;bottom:72px!important}.ref-orbit-card.c8{left:-22px!important;bottom:18px!important}.ref-orbit-card.c4{right:-50px!important;top:22px!important}.ref-orbit-card.c5{right:-74px!important;top:84px!important}.ref-orbit-card.c6{right:-58px!important;bottom:72px!important}.ref-orbit-card.c7{right:-28px!important;bottom:18px!important}
      .ref-side-promise{display:none!important}

      .ref-stat-grid{grid-template-columns:repeat(4,1fr)!important;gap:16px!important;margin:6px 0 24px!important}.ref-stat{min-height:86px!important;padding:16px!important;border-radius:16px!important;background:rgba(15,23,42,.68)!important;backdrop-filter:blur(14px)!important;border:1px solid rgba(148,163,184,.12)!important;box-shadow:none!important}.ref-stat i{width:42px!important;height:42px!important;border-radius:12px!important;background:rgba(30,64,175,.16)!important;color:#22d3ee!important}.ref-stat strong{font-size:23px!important;color:#fff!important}.ref-stat small{font-size:10px!important;color:#94a3b8!important}

      .eva-live-feed{padding:10px 0 20px!important}.eva-live-panel{background:rgba(15,23,42,.70)!important;backdrop-filter:blur(16px)!important;border:1px solid rgba(34,211,238,.28)!important;border-radius:18px!important;box-shadow:0 18px 45px rgba(0,0,0,.20)!important;padding:18px!important}.eva-live-head{padding-bottom:12px!important;border-bottom:1px solid rgba(51,65,85,.6)!important}.eva-live-title span{color:#34d399!important;font:800 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace!important;letter-spacing:.08em!important;text-transform:uppercase!important}.eva-live-title i{background:#34d399!important;box-shadow:0 0 12px rgba(52,211,153,.8)!important}.eva-live-head small{color:#94a3b8!important;font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;font-size:10px!important}.eva-live-table th{color:#64748b!important;font:700 9px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace!important;text-transform:uppercase!important;letter-spacing:.08em!important}.eva-live-table td{font-size:10px!important}.eva-live-privacy{margin-top:10px!important;padding-top:10px!important;border-top:1px solid rgba(51,65,85,.5)!important;font-size:9px!important;color:#64748b!important}

      .pro-category-strip{background:transparent!important;border:0!important}.pro-category-strip .container{max-width:1280px!important;padding:12px 20px 6px!important;gap:7px!important;overflow-x:auto!important;flex-wrap:nowrap!important}.pro-category-strip a{padding:7px 12px!important;border-radius:10px!important;background:rgba(15,23,42,.86)!important;border:1px solid #1e293b!important;color:#94a3b8!important;font-size:10px!important;white-space:nowrap!important}.pro-category-strip a.active{background:#06b6d4!important;color:#06111b!important;border-color:#22d3ee!important}

      .store-showcase{padding:36px 0 64px!important}.pro-section-title{margin-bottom:20px!important}.pro-section-title>div>span{color:#f59e0b!important;font-size:11px!important}.pro-section-title h2{font-size:30px!important;color:#fff!important}.pro-section-title p{color:#94a3b8!important}.store-products{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:18px!important}.account-product,.store-product,.panel{background:rgba(15,23,42,.70)!important;backdrop-filter:blur(16px)!important;border:1px solid rgba(148,163,184,.14)!important;border-radius:18px!important;box-shadow:none!important;transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease!important}.account-product:hover,.store-product:hover{transform:translateY(-3px)!important;border-color:rgba(0,242,254,.40)!important;box-shadow:0 0 25px rgba(0,242,254,.12)!important}.account-product h3,.store-product h3{color:#fff!important}.account-product p,.store-product p{color:#94a3b8!important}.button,.product-card button{border-radius:11px!important}.button.primary,.product-card .primary{background:linear-gradient(90deg,#06b6d4,#2563eb)!important}

      .eva-ai-playground{margin-top:10px!important}.eva-ai-shell{background:rgba(15,23,42,.70)!important;backdrop-filter:blur(16px)!important;border:1px solid rgba(34,211,238,.30)!important;border-radius:24px!important;box-shadow:0 18px 60px rgba(0,0,0,.28)!important}.eva-ai-eyebrow{color:#67e8f9!important}.eva-ai-head h2{color:#fff!important}.eva-ai-head p{color:#94a3b8!important}.eva-ai-btn.primary,.eva-ai-run{background:linear-gradient(90deg,#7c3aed,#2563eb)!important}.eva-ai-console{background:rgba(2,6,23,.88)!important;border-color:#1e293b!important}.eva-ai-input,.eva-ai-mode,.eva-ai-chip{background:#0f172a!important;border-color:#1e293b!important}

      #eva-live-order-popup{z-index:80!important}

      @media(max-width:1100px){.ref-hero-grid{grid-template-columns:1fr!important}.ref-visual{max-width:680px!important;margin:0 auto!important;width:100%!important}.store-products{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:760px){
        #eva-integrated-modebar{padding:6px 10px;min-height:40px}.pro-topbar{top:40px!important}.eva-mode-title{max-width:115px;overflow:hidden;text-overflow:ellipsis}.eva-mode-tabs a{padding:6px 8px!important;font-size:9px!important}.eva-mode-tabs a span{display:none}
        .pro-topbar .nav-wrap{height:72px!important;min-height:72px!important;padding:0 12px!important}.pro-mobile-brand{max-width:205px!important}.pro-mobile-brand .brand-mark{width:38px!important;height:38px!important;flex-basis:38px!important}.pro-search{display:none!important}
        .ref-hero{padding:32px 0 28px!important}.ref-hero>.container{padding-left:14px!important;padding-right:14px!important}.ref-hero-grid{gap:26px!important;min-height:auto!important}.ref-hero-copy h1{font-size:clamp(40px,13vw,56px)!important}.ref-hero-copy p{font-size:14px!important}.ref-mini-trust{grid-template-columns:repeat(2,1fr)!important;gap:10px!important}.ref-hero-actions{flex-wrap:wrap!important}.ref-btn-primary,.ref-btn-secondary{flex:1 1 150px!important}.ref-visual{min-height:320px!important;padding:26px 18px!important;border-radius:22px!important}.ref-cyber-head{width:170px!important;height:170px!important}.ref-orbit-card{font-size:8px!important;padding:6px 8px!important}.ref-orbit-card.c1{left:-28px!important}.ref-orbit-card.c2{left:-42px!important}.ref-orbit-card.c3{left:-28px!important}.ref-orbit-card.c4{right:-28px!important}.ref-orbit-card.c5{right:-42px!important}.ref-orbit-card.c6{right:-28px!important}.ref-stat-grid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important}.ref-stat{min-height:78px!important;padding:13px!important}.ref-stat strong{font-size:20px!important}.store-products{grid-template-columns:1fr!important}.store-showcase>.container,.eva-live-feed>.container{padding-left:12px!important;padding-right:12px!important}.eva-live-panel{padding:12px!important}.eva-live-table{min-width:620px!important}
      }
    `;
    document.head.appendChild(style);

    if (!document.getElementById('eva-integrated-modebar')) {
      const bar = document.createElement('div');
      bar.id = 'eva-integrated-modebar';
      bar.innerHTML = `
        <div class="eva-mode-title"><i></i><span>EVA AI — LIVE INTEGRATED MODE</span></div>
        <div class="eva-mode-tabs">
          <a class="active" href="/"><b>▣</b><span>Storefront</span></a>
          <a href="/dashboard.html"><b>◉</b><span>Customer Portal</span></a>
          <a href="/eva-ops-93k7m2"><b>🔒</b><span>Admin Panel</span></a>
        </div>`;
      document.body.insertBefore(bar, document.body.firstChild);
    }
  }

  function render(events) {
    if (!tbody) return;
    const orders = Array.isArray(events) ? events.filter((event) => event?.type === 'order').slice(0, 6) : [];
    liveOrders = orders;

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
      liveOrders = [];
    }
  }

  function mountLiveOrderPopup() {
    if (document.getElementById('eva-live-order-popup')) return;

    const style = document.createElement('style');
    style.textContent = `
      #eva-live-order-popup{position:fixed;left:9px;bottom:9px;z-index:86;width:min(278px,calc(100vw - 18px));opacity:0;transform:translateY(14px) scale(.985);pointer-events:none;transition:opacity .26s ease,transform .26s ease}
      #eva-live-order-popup.show{opacity:1;transform:translateY(0) scale(1)}
      #eva-live-order-popup .eva-live-card{background:linear-gradient(145deg,rgba(7,16,31,.98),rgba(10,22,43,.98));border:1px solid rgba(34,211,238,.30);border-radius:12px;box-shadow:0 10px 24px rgba(0,0,0,.34),0 0 16px rgba(34,211,238,.08);padding:7px 8px;display:flex;gap:7px;align-items:center;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
      #eva-live-order-popup .eva-live-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;position:relative;background:linear-gradient(145deg,#07111f,#0b1b31);border:1px solid rgba(245,158,11,.5);flex:0 0 auto;overflow:hidden}
      #eva-live-order-popup .eva-live-icon svg{position:absolute;top:2px;width:11px;height:11px;fill:#fbbf24}
      #eva-live-order-popup .eva-live-icon b{position:absolute;bottom:2px;font:900 10px/1 Inter,system-ui,sans-serif;color:#f8fafc}
      #eva-live-order-popup .eva-live-copy{min-width:0;flex:1}
      #eva-live-order-popup .eva-live-top{display:flex;align-items:center;gap:5px;margin-bottom:1px}
      #eva-live-order-popup .eva-live-label{font:800 8px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.11em;color:#34d399;text-transform:uppercase}
      #eva-live-order-popup .eva-live-label:before{content:'●';font-size:6px;margin-right:4px;color:#34d399}
      #eva-live-order-popup .eva-live-customer{font:800 10px/1.2 Inter,system-ui,sans-serif;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #eva-live-order-popup .eva-live-meta{font:600 8px/1.25 Inter,system-ui,sans-serif;color:#94a3b8;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #eva-live-order-popup .eva-live-product{color:#67e8f9}
      @media (max-width:620px){#eva-live-order-popup{left:7px;bottom:7px;width:min(258px,calc(100vw - 14px))}}
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
          <div class="eva-live-top"><span class="eva-live-label">Live</span></div>
          <div class="eva-live-customer">Private customer</div>
          <div class="eva-live-meta"><span class="eva-live-product" data-live-product>Verified delivery</span> · <span data-live-time>Just now</span></div>
        </div>
      </div>`;
    document.body.appendChild(popup);

    const showNext = () => {
      if (document.hidden || !liveOrders.length) return;
      const event = liveOrders[liveOrderIndex % liveOrders.length];
      liveOrderIndex += 1;
      popup.querySelector('[data-live-product]').textContent = String(event?.product || 'EVA product').slice(0, 80);
      popup.querySelector('[data-live-time]').textContent = formatAge(event?.age_seconds);
      popup.classList.add('show');
      window.setTimeout(() => popup.classList.remove('show'), 3000);
    };

    window.setTimeout(() => {
      showNext();
      liveTimer = window.setInterval(showNext, 5200);
    }, 1700);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) popup.classList.remove('show');
    });

    window.addEventListener('beforeunload', () => {
      if (liveTimer) window.clearInterval(liveTimer);
    }, { once: true });
  }

  const init = async () => {
    mountIntegratedDesign();
    await refresh();
    mountLiveOrderPopup();
  };

  document.addEventListener('DOMContentLoaded', init, { once: true });
  if (document.readyState !== 'loading') init();

  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
})();
