let client;
const money=value=>'$'+Number(value||0).toFixed(2);
const moneyPrecise=value=>'$'+Number(value||0).toFixed(6);
const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const setNotice=(message,error=false)=>{const el=document.getElementById('dash-notice');el.textContent=message;el.className=error?'dash-notice error':'dash-notice success'};
const isJwtClockError=error=>/jwt.*future|issued at future|not yet valid|iat/i.test(String(error?.message||error||''));

async function getSession(){const {data:{session}}=await client.auth.getSession();if(!session){location.replace('/login.html');throw new Error('Sign in required.')}return session}
async function apiFetch(path,options={},retry=true){const session=await getSession();const response=await fetch(path,{...options,headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`,...(options.headers||{})}});const body=await response.json().catch(()=>({}));if(response.status===401&&retry){const refreshed=await client.auth.refreshSession();if(refreshed.data.session)return apiFetch(path,options,false);await client.auth.signOut();location.replace('/login.html');throw new Error('Session expired. Please sign in again.')}if(!response.ok)throw new Error(body.error||'Request failed.');return body}
function renderRows(id,rows,mapper,colspan){const el=document.getElementById(id);if(el)el.innerHTML=rows.length?rows.map(mapper).join(''):`<tr><td colspan="${colspan}" class="empty">No records yet.</td></tr>`}

async function initDashboard(){try{const response=await fetch('/api/config');const config=await response.json();if(!response.ok)throw new Error(config.error||'Configuration unavailable');client=window.supabase.createClient(config.url,config.anonKey);const session=await getSession();document.getElementById('customer-email').textContent=session.user.email;const sideEmail=document.getElementById('side-customer-email');if(sideEmail)sideEmail.textContent=session.user.email;await Promise.all([loadData(session.user.id),loadStore()])}catch(error){setNotice(error.message,true)}}

async function loadData(userId){const [wallet,deposits,ledger]=await Promise.all([client.from('wallets').select('balance_usd,updated_at').eq('user_id',userId).single(),client.from('deposits').select('id,amount_usdt,network,transaction_id,status,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(20),client.from('wallet_ledger').select('amount_usd,entry_type,description,balance_after,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(20)]);const firstError=[wallet,deposits,ledger].find(result=>result.error)?.error;if(firstError)throw firstError;document.getElementById('balance').textContent=moneyPrecise(wallet.data?.balance_usd);document.getElementById('pending-count').textContent=deposits.data.filter(item=>item.status==='pending').length;renderRows('deposit-rows',deposits.data,item=>`<tr><td>${new Date(item.created_at).toLocaleDateString()}</td><td>${escapeHtml(item.network)}</td><td>${money(item.amount_usdt)}</td><td><span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td></tr>`,4);renderRows('ledger-rows',ledger.data,item=>`<tr><td>${new Date(item.created_at).toLocaleDateString()}</td><td>${escapeHtml(item.entry_type)}</td><td class="${Number(item.amount_usd)>=0?'positive':'negative'}">${moneyPrecise(item.amount_usd)}</td><td>${moneyPrecise(item.balance_after)}</td></tr>`,4)}

async function submitDepositSecurely(payload){
 const session=await getSession();
 if(!session.refresh_token)throw new Error('Please sign in again.');
 const response=await fetch('/api/store',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({
   action:'submit_deposit',
   refreshToken:session.refresh_token,
   amount:payload.amount_usdt,
   network:payload.network,
   transaction_id:payload.transaction_id
  })
 });
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(body.error||'Deposit submission failed.');
 if(body.access_token&&body.refresh_token){
  try{await client.auth.setSession({access_token:body.access_token,refresh_token:body.refresh_token})}catch{}
 }
 return body;
}

document.getElementById('dashboard-deposit-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;const button=event.submitter||form.querySelector('button[type="submit"]');const original=button?.textContent;try{if(button){button.disabled=true;button.textContent='Submitting…'}const session=await getSession();const user=session.user;const amount=Number(document.getElementById('dash-amount').value),network=document.getElementById('dash-network').value,transaction_id=document.getElementById('dash-txid').value.trim(),ownAddresses=new Set(['0x644ed89caecc120d3a3180e9f20a90d970cfa3e8','tj cfs6h dksenquguvw43krk141qlvhngbg'.replace(/ /g,'').toLowerCase()]),txValid=!ownAddresses.has(transaction_id.toLowerCase())&&((network==='BEP20'||network==='ERC20')?/^0x[a-fA-F0-9]{64}$/.test(transaction_id):/^[a-fA-F0-9]{64}$/.test(transaction_id));if(amount<10||!txValid)return setNotice('Enter at least 10 USDT and the completed payment TxID—not a wallet address.',true);const result=await submitDepositSecurely({user_id:user.id,amount_usdt:amount,network,transaction_id});form.reset();setNotice(result.already_submitted?`This TxID is already linked to your account (${result.status||'pending'}).`:'Deposit submitted successfully. It is pending verification.');try{await loadData(user.id)}catch{setNotice('Deposit submitted successfully. Refresh later to view its status.')}}catch(error){setNotice(error.message||'Deposit submission failed.',true)}finally{if(button){button.disabled=false;button.textContent=original}}});

const telegramQuoteServices=[
 {name:'Telegram Premium — 3 Months',subtitle:'Official 3-month Telegram Premium gift subscription',price:20},
 {name:'Telegram Premium — 6 Months',subtitle:'Official 6-month Telegram Premium gift subscription',price:30},
 {name:'Telegram Premium — 1 Year',subtitle:'Official 12-month Telegram Premium gift subscription',price:45},
 {name:'Telegram Stars Recharge',subtitle:'Official Stars top-up for your Telegram account'},
 {name:'Telegram Ads Recharge',subtitle:'Telegram Ads balance top-up assistance'},
 {name:'Channel / Group Boost',subtitle:'Official boost setup for eligible channels and groups'},
 {name:'Telegram Giveaway',subtitle:'Premium or Stars giveaway setup assistance'},
 {name:'Telegram Recharge / Top-up',subtitle:'Custom official Telegram recharge service'}
];
function dashboardTelegramCards(){return telegramQuoteServices.map(service=>{const priced=Number.isFinite(service.price);const price=priced?money(service.price)+' <small>USDT</small>':'Custom <small>QUOTE</small>';const msg=priced?`Hello, I want ${service.name} for ${service.price}.`:`Hello, I want ${service.name}. Please send the current price.`;const product={name:service.name,category:'Telegram Services',purchase_mode:'contact'};return `<article class="account-product panel master-product-card telegram-service">${dashboardBrandVisual(product)}<span class="product-tag">Telegram Services</span><h3>${escapeHtml(service.name)}</h3><p>${escapeHtml(service.subtitle)}</p><strong>${price}</strong><div class="stock-line"><span class="in-stock">Available</span><span>Manual delivery</span></div><a class="button secondary" href="https://t.me/eva007_8?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer">${priced?'Order Now':'Contact for Price'}</a><small class="master-purchase-hint">Tap or click to purchase</small><div class="master-features"><div><b>⚡</b><strong>Instant</strong><small>Delivery</small></div><div><b>◆</b><strong>Official</strong><small>Account</small></div><div><b>♛</b><strong>Premium</strong><small>Access</small></div><div><b>◉</b><strong>24/7</strong><small>Support</small></div></div></article>`}).join('')}

function dashboardProductSubtitle(product){return product.category==='AWS Cloud Accounts'?'':`<p>${escapeHtml(product.subtitle)}</p>`}

function dashboardBrandVisual(product){
 const s=(String(product.name||'')+' '+String(product.category||'')).toLowerCase();
 let brand='eva',label='EVA',icon='<span class="brand-svg eva-svg">EVA</span>';
 if(/telegram/.test(s)){brand='telegram';label='TELEGRAM';icon='<svg class="brand-svg telegram-svg" viewBox="0 0 64 64"><path d="M54 10 8 28c-3 1-3 4 0 5l11 4 5 15c1 3 4 3 6 1l7-7 12 9c2 1 4 0 5-3l8-38c1-4-2-6-8-4ZM23 36l25-17-20 21-2 8-3-12Z"/></svg>'}
 else if(/aws|amazon|kiro|gcp ai bundle/.test(s)){brand='aws';label='AWS';icon='<svg class="brand-svg aws-svg" viewBox="0 0 96 64"><text x="48" y="38" text-anchor="middle">aws</text><path d="M22 47c15 10 37 11 53 2"/><path d="m70 46 8 2-5 6"/></svg>'}
 else if(/claude|anthropic/.test(s)){brand='claude';label='CLAUDE';icon='<svg class="brand-svg claude-svg" viewBox="0 0 100 100"><g><path d="M50 18v16M50 66v16M18 50h16M66 50h16M27 27l12 12M61 61l12 12M27 73l12-12M61 39l12-12"/><path d="M38 22l6 13M62 78l-6-13M62 22l-6 13M38 78l6-13M22 38l13 6M78 62l-13-6M22 62l13-6M78 38l-13 6"/></g></svg>'}
 else if(/gemini|google/.test(s)){brand='gemini';label='GEMINI';icon='<svg class="brand-svg gemini-svg" viewBox="0 0 64 64"><path d="M32 5c3 16 11 24 27 27-16 3-24 11-27 27-3-16-11-24-27-27C21 29 29 21 32 5Z"/></svg>'}
 else if(/chatgpt|openai|gpt/.test(s)){brand='openai';label='CHATGPT';icon='<svg class="brand-svg openai-svg" viewBox="0 0 64 64"><g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"><path d="M31 9c8-5 17 1 17 10 8 1 12 10 7 17 5 7 0 16-8 17-4 8-14 9-20 3-8 3-16-3-15-12-7-4-7-14 0-19-2-9 6-17 15-15 1 0 3 0 4-1Z"/><path d="m20 25 12-7 12 7v14l-12 7-12-7V25Z"/></g></svg>'}
 const title=escapeHtml(product.name||label);
 const sideLabel=brand==='claude'?'ANTHROPIC CLAUDE':brand==='gemini'?'GOOGLE GEMINI':brand==='openai'?'OPENAI':label;
 return '<div class="mobile-brand-visual brand-'+brand+'" aria-hidden="true"><div class="master-top-badges"><span class="master-pro-badge"><b>♛</b> Pro</span><span class="master-status-badge"><b>✓</b> Official</span></div><div class="brand-watermark">'+label+'</div><div class="brand-side-copy brand-side-left">'+sideLabel.replace(' ','<br>')+'</div><div class="brand-side-copy brand-side-right">THINK<br>CREATE<br>SOLVE<br>FASTER</div><div class="brand-stage"><div class="brand-halo"></div><div class="mobile-brand-mark">'+icon+'</div><div class="mobile-brand-orbit orbit-outer"></div><div class="mobile-brand-orbit orbit-inner"></div><div class="pedestal-base"></div></div></div>'
}

function dashboardProductCard(product){
 const mode=['balance','contact','reference'].includes(product.purchase_mode)?product.purchase_mode:'balance';
 const custom=mode==='contact'||mode==='reference';
 const available=mode==='balance'&&Number(product.stock)>0;
 const calculatorIds=new Set(['claude-team-standard','claude-team-premium','claude-enterprise','chatgpt-business','chatgpt-enterprise','gemini-enterprise']);
 const price=custom?(mode==='reference'?escapeHtml(product.official_price_label||'Official reference'):'Custom <small>QUOTE</small>'):money(product.price_usd)+' <small>USDT</small>';
 const stock=custom?'<span class="in-stock"><i class="stock-dot"></i>Available on request</span><i class="stock-divider"></i><span class="warranty-line">Official/custom plan</span>':`<span class="${available?'in-stock':'out-stock'}">${available?'<i class="stock-dot"></i>'+product.stock+' in stock':'Out of stock'}</span><i class="stock-divider"></i><span class="warranty-line"><span class="mini-shield">✓</span>${product.warranty_days}-day warranty</span>`;
 let action='';
 if(custom&&calculatorIds.has(String(product.id)))action='<div class="eva-cta-shell"><i></i><a class="button primary" href="/#products">Calculate Price & Order</a></div>';
 else if(custom){const msg=encodeURIComponent('Hello, I want to order '+product.name+'. Please send the current price.');action='<div class="eva-cta-shell"><i></i><a class="button secondary" href="https://t.me/eva007_8?text='+msg+'" target="_blank" rel="noopener noreferrer">Contact for Order</a></div>'}
 else action=`<div class="eva-cta-shell"><i></i><button class="button ${available?'primary':'disabled'} buy-product" data-product-id="${escapeHtml(product.id)}" data-product-name="${escapeHtml(product.name)}" data-product-price="${Number(product.price_usd)}" ${available?'':'disabled'}>${available?'<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 7H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg><span>BUY WITH EVA BALANCE</span>':'Unavailable'}</button></div>`;
 return `<article class="account-product panel master-product-card${custom?' quote-product':''}">${dashboardBrandVisual(product)}<span class="product-tag">${escapeHtml(product.category)}</span><h3>${escapeHtml(product.name)}</h3>${dashboardProductSubtitle(product)}<strong>${price}</strong><div class="stock-line">${stock}</div>${action}<small class="master-purchase-hint">Tap or click to purchase</small><div class="master-features"><div><b class="feature-lightning">ϟ</b><strong>Instant</strong><small>Delivery</small></div><div><b class="feature-shield">◇</b><strong>Official</strong><small>Account</small></div><div><b class="feature-crown">♛</b><strong>Premium</strong><small>Access</small></div><div><b class="feature-support">◉</b><strong>24/7</strong><small>Support</small></div></div></article>`
}

async function loadStore(){try{const [catalog,orders]=await Promise.all([fetch('/api/store').then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error||'Store unavailable');return b}),apiFetch('/api/store?view=orders')]);document.getElementById('dashboard-store-products').innerHTML=catalog.products.map(dashboardProductCard).join('')+dashboardTelegramCards();document.querySelectorAll('.buy-product').forEach(button=>button.addEventListener('click',()=>buyProduct(button)));bindMasterCardInteractions();renderRows('order-rows',orders.orders,item=>{const terminal=['refunded','cancelled'].includes(item.status);const delivery=terminal?(item.status==='refunded'?'Refunded — no active delivery':'Cancelled — no active delivery'):(item.delivery_details?`<pre>${escapeHtml(item.delivery_details)}</pre>`:'Pending admin delivery');return `<tr><td>${new Date(item.created_at).toLocaleDateString()}</td><td>${escapeHtml(item.product_name)}</td><td>${money(item.price_usd)}</td><td><span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td><td>${delivery}</td></tr>`},5)}catch(error){setNotice(error.message,true)}}


function bindMasterCardInteractions(){
 const themes=['theme-cyan','theme-violet','theme-pink','theme-amber','theme-blue'];
 document.querySelectorAll('.master-product-card').forEach(card=>{
  if(card.dataset.themeBound)return;
  card.dataset.themeBound='1';
  card.setAttribute('tabindex','0');
  const cycle=()=>{
   const current=themes.findIndex(t=>card.classList.contains(t));
   themes.forEach(t=>card.classList.remove(t));
   card.classList.add(themes[(current+1)%themes.length]);
   card.classList.remove('theme-pop');void card.offsetWidth;card.classList.add('theme-pop');
  };
  card.addEventListener('click',event=>{
   if(event.target.closest('button,a,input,select,textarea'))return;
   cycle();
  });
  card.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&!event.target.closest('button,a,input,select,textarea')){event.preventDefault();cycle()}});
 });
}

async function buyProduct(button){const name=button.dataset.productName||'this product',price=Number(button.dataset.productPrice||0);if(!confirm(`Buy ${name} for ${price.toFixed(2)}? Your EVA balance will be deducted immediately.`))return;button.disabled=true;try{const purchase=await apiFetch('/api/store',{method:'POST',body:JSON.stringify({productId:button.dataset.productId})});const state=String(purchase.status||'approved');setNotice(state==='processing'?'Purchase successful. Balance deducted and order is Processing. The admin will deliver it securely.':'Purchase successful. Balance deducted and order created. Admin review is pending.');const {data:{user}}=await client.auth.getUser();if(user)await Promise.all([loadData(user.id),loadStore()])}catch(error){setNotice(error.message,true);button.disabled=false}}

document.getElementById('sign-out').addEventListener('click',async()=>{await client.auth.signOut();location.replace('/')});
initDashboard();
// deployment trigger: watermark 3ca8baad

// deployment trigger: watermark 22e76155
