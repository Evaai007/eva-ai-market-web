const menuButton=document.querySelector('.menu-button'),siteNav=document.querySelector('nav'),toast=document.getElementById('toast');
function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2200)}
menuButton.addEventListener('click',()=>{const open=siteNav.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open))});
siteNav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{siteNav.classList.remove('open');menuButton.setAttribute('aria-expanded','false')}));
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{const address=document.getElementById(button.dataset.copy).textContent.trim();try{await navigator.clipboard.writeText(address)}catch{const area=document.createElement('textarea');area.value=address;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove()}const original=button.textContent;button.textContent='Copied ✓';showToast('Wallet address copied');setTimeout(()=>button.textContent=original,1800)}));

const bedrockProvider=[...document.querySelectorAll('.provider')].find(provider=>provider.querySelector('strong')?.textContent.trim()==='AWS Bedrock — Claude');
if(bedrockProvider){const status=bedrockProvider.querySelector('small'),indicator=bedrockProvider.querySelector(':scope > span');if(status)status.textContent='Status: Live & Available';if(indicator)indicator.textContent='✓'}

const heroButtons=document.querySelector('.hero .buttons');
if(heroButtons){const fundButton=[...heroButtons.querySelectorAll('a')].find(link=>/Add Balance|Fund/i.test(link.textContent));if(fundButton){fundButton.classList.remove('secondary');fundButton.classList.add('primary');fundButton.textContent='Login & Submit Deposit';fundButton.href='/login.html'}const notice=document.createElement('p');notice.className='mini-note';notice.style.marginTop='14px';notice.style.padding='12px 14px';notice.style.border='1px solid rgba(65,215,232,.35)';notice.style.borderRadius='12px';notice.style.background='rgba(65,215,232,.08)';notice.innerHTML='<strong>Already paid?</strong> Submit the successful payment TXID below. Your balance is added after admin approval.';heroButtons.insertAdjacentElement('afterend',notice)}
const depositNav=[...siteNav.querySelectorAll('a')].find(link=>link.textContent.trim()==='Deposit Credits');if(depositNav){depositNav.href='#deposit';depositNav.textContent='Submit Deposit'}

function highlightPaymentNetwork(network){document.querySelectorAll('[data-network-card]').forEach(card=>card.classList.toggle('active',card.dataset.networkCard===network))}
function isValidTelegram(value){return /^@[A-Za-z0-9_]{5,32}$/.test(value)}
function isValidTransactionId(network,value){const ownAddresses=new Set(['0x644ed89caecc120d3a3180e9f20a90d970cfa3e8'.toLowerCase(),'TJCFS6hDKsEnquGuvw43krk141QLvHnGbG'.toLowerCase()]);if(ownAddresses.has(value.toLowerCase()))return false;if(network==='BEP20'||network==='ERC20')return /^0x[a-fA-F0-9]{64}$/.test(value);return /^[a-fA-F0-9]{64}$/.test(value)}
const networkSelect=document.getElementById('network');
networkSelect.addEventListener('change',()=>highlightPaymentNetwork(networkSelect.value));
highlightPaymentNetwork(networkSelect.value);

const form=document.getElementById('payment-form');
function setError(id,message){const input=document.getElementById(id);input.classList.toggle('invalid',Boolean(message));const target=document.querySelector(`[data-error="${id}"]`);if(target)target.textContent=message}

function loadScript(src){return new Promise((resolve,reject)=>{if(document.querySelector(`script[src="${src}"]`))return resolve();const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.head.appendChild(script)})}
async function createPublicDepositClient(){await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');const response=await fetch('/api/config',{cache:'no-store'});const config=await response.json().catch(()=>({}));if(!response.ok)throw new Error(config.error||'Account service unavailable.');return window.supabase.createClient(config.url,config.anonKey)}

(function mountPublicDepositForm(){
 const depositSection=document.getElementById('deposit');
 if(!depositSection||!form)return;
 form.hidden=false;
 form.className='payment-form panel public-deposit-form';
 form.innerHTML=`
  <h3 style="margin-top:0">Submit payment for balance</h3>
  <p class="safe-note">You must be signed in. After admin verification, the approved amount is added to your EVA balance.</p>
  <label>Telegram username<input id="telegram" type="text" placeholder="@username" required><small data-error="telegram"></small></label>
  <label>Amount in USDT<input id="amount" type="number" min="10" step="0.01" value="10" required><small data-error="amount"></small></label>
  <label>Product / purpose<select id="product"><option>Wallet balance</option><option>Claude / AI subscription</option><option>AWS / Cloud service</option><option>Telegram service</option></select></label>
  <label>Network<select id="network"><option>TRC20</option><option>BEP20</option><option>ERC20</option></select></label>
  <label>Completed transaction ID<input id="txid" type="text" placeholder="Paste TxID / transaction hash" required><small data-error="txid"></small></label>
  <button class="button primary submit" type="submit">Submit for verification</button>
  <p class="form-note">Do not paste the wallet address. Use the completed transaction ID.</p>`;
 const grid=depositSection.querySelector('.deposit-grid');
 if(grid)grid.insertAdjacentElement('afterend',form);
 const select=document.getElementById('network');
 select.addEventListener('change',()=>highlightPaymentNetwork(select.value));
 highlightPaymentNetwork(select.value);
})();

form.addEventListener('submit',async event=>{
 event.preventDefault();
 event.stopImmediatePropagation();
 const button=form.querySelector('button[type="submit"]');
 const telegram=document.getElementById('telegram').value.trim();
 const amount=Number(document.getElementById('amount').value);
 const network=document.getElementById('network').value;
 const txid=document.getElementById('txid').value.trim();
 const telegramOk=isValidTelegram(telegram),txidOk=isValidTransactionId(network,txid);
 setError('telegram',telegramOk?'':'Enter a valid username starting with @.');
 setError('amount',amount>=10?'':'Minimum deposit is 10 USDT.');
 setError('txid',txidOk?'':'Enter the completed payment TxID—not a wallet address.');
 if(!telegramOk||amount<10||!txidOk){showToast('Please correct the payment details');return}
 const original=button.textContent;button.disabled=true;button.textContent='Submitting…';
 try{
  const client=await createPublicDepositClient();
  let {data:{session}}=await client.auth.getSession();
  if(!session){const refreshed=await client.auth.refreshSession();session=refreshed.data.session}
  if(!session){sessionStorage.setItem('eva-return-to','/#deposit');location.href='/login.html';return}
  const response=await fetch('/api/store',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'submit_deposit',refreshToken:session.refresh_token,amount,network,transaction_id:txid})});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body.error||'Deposit submission failed.');
  showToast('Deposit submitted for verification');
  form.reset();
  document.getElementById('amount').value='10';
  document.getElementById('network').value='TRC20';
  highlightPaymentNetwork('TRC20');
 }catch(error){showToast(error.message||'Deposit submission failed.')}
 finally{button.disabled=false;button.textContent=original}
},true);

function sortStoreProducts(products){return [...products].sort((a,b)=>{const aAws=a.category==='AWS Cloud Accounts',bAws=b.category==='AWS Cloud Accounts';if(aAws!==bAws)return aAws?-1:1;if(!aAws)return 0;const size=p=>{const text=`${p.name||''} ${p.subtitle||''}`;const match=text.match(/(\d{1,4})\s*(?:v?cpu|v\b)/i);return match?Number(match[1]):Number((p.name||'').match(/\d{1,4}/)?.[0]||0)};return size(b)-size(a)})}
const telegramQuoteServices=[
 {name:'Telegram Premium',subtitle:'3, 6 or 12-month official gift subscription'},
 {name:'Telegram Stars Recharge',subtitle:'Official Stars top-up for your Telegram account'},
 {name:'Telegram Ads Recharge',subtitle:'Telegram Ads balance top-up assistance'},
 {name:'Channel / Group Boost',subtitle:'Official boost setup for eligible channels and groups'},
 {name:'Telegram Giveaway',subtitle:'Premium or Stars giveaway setup assistance'},
 {name:'Telegram Recharge / Top-up',subtitle:'Custom official Telegram recharge service'}
];
function telegramQuoteCards(){return telegramQuoteServices.map(service=>`<article class="account-product panel telegram-service"><div class="product-cover cover-telegram"><div class="cover-grid"></div><div class="brand-icon-shell">${brandMark('telegram')}</div><div class="cover-brand">Telegram</div><strong>${escapeStore(service.name)}</strong><small><i></i> Official service support</small></div><span class="product-tag">Telegram Services</span><h3>${escapeStore(service.name)}</h3><p>${escapeStore(service.subtitle)}</p><strong>Custom <small>QUOTE</small></strong><div class="stock-line"><span class="in-stock">Available</span><span>Manual delivery</span></div><a class="button secondary" href="https://t.me/eva007_8?text=${encodeURIComponent('Hello, I want '+service.name+'. Please send the current price.')}" target="_blank" rel="noopener noreferrer">Contact for Price</a></article>`).join('')}

const publicStore=document.getElementById('public-store-products');
async function loadPublicStore(){if(!publicStore)return;try{const response=await fetch('/api/store');const body=await response.json();if(!response.ok)throw new Error(body.error||'Store unavailable');publicStore.innerHTML=sortStoreProducts(body.products).map(product=>`<article class="account-product panel">${publicProductCover(product)}<span class="product-tag">${escapeStore(product.category)}</span><h3>${escapeStore(product.name)}</h3>${publicProductSubtitle(product)}<strong>$${Number(product.price_usd).toFixed(2)} <small>USDT</small></strong><div class="stock-line"><span class="${product.stock>0?'in-stock':'out-stock'}">${product.stock>0?product.stock+' in stock':'Out of stock'}</span><span>${product.warranty_days}-day warranty</span></div><a class="button ${product.stock>0?'secondary':'disabled'}" href="/login.html">${product.stock>0?'Buy with EVA Balance':'Unavailable'}</a></article>`).join('')+telegramQuoteCards()}catch(error){publicStore.innerHTML=`<article class="panel store-loading">${escapeStore(error.message)} Contact support for current stock.</article>`}}
function brandMark(theme){
 const icons={
  aws:'<path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335c-.137.096-.287.096-.447-.04a3.34 3.34 0 0 1-.535-.846c-.622.734-1.405 1.101-2.347 1.101C1.588 12.295.993 11.537.993 10.188c0-1.365 1.03-2.267 2.681-2.267.551 0 1.15.088 1.764.24v-.583c0-1.213-.503-1.644-1.676-1.644-.559 0-1.15.12-1.74.36-.288.12-.447.063-.447-.2v-.391c0-.232.08-.32.28-.424a5.38 5.38 0 0 1 2.29-.51c1.9 0 2.801.862 2.801 2.705v2.562zm-3.24 1.214c.814 0 1.532-.4 1.772-1.15.095-.303.143-.71.143-1.045a6.5 6.5 0 0 0-1.468-.184c-1.061 0-1.58.447-1.58 1.277 0 .742.399 1.102 1.133 1.102zm6.41.862c-.256 0-.376-.08-.472-.391L7.586 5.55c-.096-.32-.056-.52.12-.52h.782c.263 0 .375.08.47.392l1.342 5.284 1.245-5.284c.08-.312.176-.392.47-.392h.639c.27 0 .375.08.47.392l1.262 5.348 1.381-5.348c.096-.312.2-.392.471-.392h.743c.176 0 .232.2.12.527l-1.924 6.17c-.095.312-.215.392-.47.392h-.687c-.271 0-.383-.08-.47-.4l-1.238-5.148-1.23 5.14c-.08.32-.191.408-.47.408zm10.256.215c-.83 0-1.676-.175-2.147-.463-.2-.12-.295-.224-.295-.447v-.407c0-.247.12-.311.383-.175.63.279 1.277.407 1.932.407 1.013 0 1.58-.343 1.58-1.022 0-.51-.303-.758-1.022-.99l-1.157-.36c-1.061-.335-1.556-.997-1.556-1.97 0-1.317 1.07-2.107 2.593-2.107.862 0 1.692.2 2.1.447.2.12.287.224.287.423v.375c0 .248-.12.32-.375.192a3.66 3.66 0 0 0-1.532-.311c-.95 0-1.437.31-1.437.933 0 .535.36.79 1.117 1.038l1.134.358c1.093.352 1.604.934 1.604 1.884 0 1.397-1.133 2.275-2.865 2.275zM21.698 16.207c-2.626 1.94-6.442 2.969-9.722 2.969-4.598 0-8.74-1.7-11.87-4.526-.247-.223-.024-.527.272-.351 3.384 1.963 7.559 3.153 11.877 3.153 2.914 0 6.114-.607 9.06-1.852.439-.2.814.287.383.607zM22.792 14.961c-.336-.43-2.22-.207-3.074-.103-.255.032-.295-.192-.063-.36 1.5-1.053 3.967-.75 4.254-.399.287.36-.08 2.826-1.485 4.007-.215.184-.423.088-.327-.151.32-.79 1.03-2.57.695-2.994z"/>',
  claude:'<path d="M17.304 3.541h-3.672l6.696 16.918H24zM6.696 3.541 0 20.459h3.744l1.37-3.553h7.005l1.369 3.553h3.744L10.536 3.541zm-.371 10.223 2.291-5.946 2.292 5.946z"/>',
  openai:'<path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.911 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.182a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.096 5.98 5.98 0 0 0 .511 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.989 5.989 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zm-9.022 12.608a4.476 4.476 0 0 1-2.876-1.041l4.92-2.839a.795.795 0 0 0 .392-.681v-6.737l2.02 1.169.038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.599 18.304a4.471 4.471 0 0 1-.535-3.014l4.926 2.843a.771.771 0 0 0 .781 0l5.843-3.368v2.332l-.034.062-4.84 2.791a4.499 4.499 0 0 1-6.141-1.646zM2.341 7.896a4.485 4.485 0 0 1 2.365-1.973V11.6c0 .28.148.538.388.677l5.814 3.354-2.02 1.169h-.071l-4.83-2.787A4.504 4.504 0 0 1 2.341 7.872zm16.596 3.855-5.833-3.387L15.119 7.2h.071l4.831 2.791a4.494 4.494 0 0 1-.677 8.104v-5.677a.79.79 0 0 0-.407-.667zm2.011-3.023-4.916-2.867a.776.776 0 0 0-.785 0L9.409 9.23V6.897l.028-.061 4.831-2.787a4.499 4.499 0 0 1 6.68 4.66zM8.307 12.863l-2.02-1.164-.038-.057V6.074a4.499 4.499 0 0 1 7.375-3.454L8.704 5.459a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>',
  gemini:'<path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"/>',
  grok:'<path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/>',
  capcut:'<path d="M3 5.2h17.8l-6.2 4.7 6.2 4.6H3l6.1-4.6zm0 9.3h17.8L14.5 19H3l6.1-4.5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
  telegram:'<path d="M11.944 0A12 12 0 1 0 24 12 12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14.12.098.153.23.171.325.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>',
  ai:'<path d="M12 1.5 14.8 9l7.7 3-7.7 3L12 22.5 9.2 15l-7.7-3 7.7-3z"/>'
 };
 const icon=icons[theme]||icons.ai;
 if(theme==='gemini')return `<svg class="brand-logo brand-logo-gemini" viewBox="0 0 24 24" role="img" aria-label="Google Gemini logo"><defs><linearGradient id="gemini-brand-gradient" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse"><stop stop-color="#4285F4"/><stop offset=".5" stop-color="#8E75FF"/><stop offset="1" stop-color="#D96570"/></linearGradient></defs><g fill="url(#gemini-brand-gradient)">${icon}</g></svg>`;
 return `<svg class="brand-logo brand-logo-${theme}" viewBox="0 0 24 24" role="img" aria-label="${theme} logo">${icon}</svg>`;
}
function publicProductCover(product){const text=`${product.name||''} ${product.subtitle||''}`.toLowerCase();let theme='ai',brand='EVA AI',label=product.name;if(text.includes('aws')||product.category==='AWS Cloud Accounts'){theme='aws';brand='AWS';label='Amazon Web Services'}else if(text.includes('claude')){theme='claude';brand='Claude';label=product.name}else if(text.includes('gpt')||text.includes('openai')){theme='openai';brand='OpenAI';label=product.name}else if(text.includes('gemini')||text.includes('google')){theme='gemini';brand='Google Gemini';label=product.name}else if(text.includes('grok')){theme='grok';brand='Grok';label=product.name}else if(text.includes('capcut')){theme='capcut';brand='CapCut';label=product.name}return `<div class="product-cover cover-${theme}" role="img" aria-label="${escapeStore(product.name)} product cover"><div class="cover-grid"></div><div class="brand-watermark" aria-hidden="true">${brandMark(theme)}</div><div class="brand-icon-shell">${brandMark(theme)}</div><div class="cover-brand">${escapeStore(brand)}</div><strong>${escapeStore(label)}</strong><small><i></i> Verified digital service</small></div>`}
function publicProductLogo(product){const aws=product.category==='AWS Cloud Accounts';return `<div class="product-logo ${aws?'aws-logo':'claude-logo'}"><span>${aws?'AWS':'AI'}</span><i></i></div>`}
function publicProductSubtitle(product){return product.category==='AWS Cloud Accounts'?'':`<p>${escapeStore(product.subtitle)}</p>`}
function escapeStore(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
loadPublicStore();

const demoTransactions=[
 {product:'Claude Max 5× — Monthly'},
 {product:'Claude Max 20× — Monthly'},
 {product:'GPT Premium Subscription'},
 {product:'AWS Bedrock Account'},
 {product:'Gemini Ultra Service'}
];
const demoUsernames=[
 '@li_wei88','@mei_lin24','@chenhao_ai','@xiaoyu_cloud','@wang_jun7','@anna_volkova','@dmitri_k92','@sofia_orlova','@nikita_dev','@elena_mir','@michael_reed','@emily_carter','@daniel_brooks','@olivia_hayes','@james_wilson','@sophia_morgan'
];
function mountDemoTransaction(){
 const popup=document.createElement('aside');
 popup.className='demo-transaction';
 popup.setAttribute('role','status');
 popup.setAttribute('aria-live','polite');
 popup.setAttribute('aria-label','Recent demo transaction');
 popup.innerHTML='<div class="demo-check">✓</div><div class="demo-copy"><div><strong>Transaction completed</strong><span class="demo-time">Just now</span><span class="demo-label">Demo</span></div><small class="demo-order"></small><small class="demo-user"></small><p>Purchased: <b class="demo-product"></b></p></div><em>Delivered</em>';
 document.body.appendChild(popup);
 let cursor=0;
 const demoTimes=['Just now','1 min ago','2 min ago','3 min ago','5 min ago'];
 const show=()=>{
  const item=demoTransactions[cursor%demoTransactions.length];
  popup.querySelector('.demo-time').textContent=demoTimes[cursor%demoTimes.length];cursor++;
  const now=new Date();
  const datePart=String(now.getFullYear()).slice(-2)+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0');
  let randomPart;
  do{randomPart=String(Math.floor(100000+Math.random()*900000))}while(randomPart===show.lastOrder);
  show.lastOrder=randomPart;
  popup.querySelector('.demo-order').textContent='Order No. '+datePart+randomPart;
  popup.querySelector('.demo-user').textContent='User: '+demoUsernames[Math.floor(Math.random()*demoUsernames.length)];
  popup.querySelector('.demo-product').textContent=item.product;
  popup.classList.add('show');
  clearTimeout(show.hideTimer);
  show.hideTimer=setTimeout(()=>popup.classList.remove('show'),6500);
 };
 setTimeout(show,8000);
 setInterval(show,26000);
}
mountDemoTransaction();
