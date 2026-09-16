(()=>{
  'use strict';
  const scopeSelector='#public-store-products, #official-credits, #dashboard-store-products';
  const cardSelector='.account-product, .product-card, .store-product, [data-credit-card]';
  const state={gyro:false,beta:0,gamma:0,pending:null};
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return('00000000'+(h>>>0).toString(16)).slice(-8)};
  const productData=card=>{
    const name=clean(card.querySelector('h3')?.textContent||card.dataset.creditName||'EVA Digital Product');
    const category=clean(card.querySelector('.product-tag')?.textContent||'Digital Service');
    const description=clean(card.querySelector('p')?.textContent||'Verified digital service with secure delivery.');
    const price=clean(card.querySelector('.product-price,.credit-price,.price')?.textContent||[...card.querySelectorAll('strong')].map(x=>clean(x.textContent)).find(x=>/\$|USDT|QUOTE/i.test(x))||'Contact for price');
    const stock=clean(card.querySelector('.stock-line')?.textContent||'Availability verified before order');
    const cpu=(name+' '+description).match(/(\d{1,4})\s*(?:v?cpu|cores?)/i)?.[1];
    const cloud=/aws|azure|cloud|h100|gpu/i.test(name+' '+category);
    return {name,category,description,price,stock,cpu,cloud};
  };
  const specs=data=>[
    [data.cloud?'Compute allocation':'Plan configuration',data.cpu?`${data.cpu} vCPU allocation`:data.category],
    ['Availability',data.stock||'Verified before order'],
    ['Access & delivery',data.cloud?'Private account dashboard / assisted delivery':'Secure authenticated dashboard delivery'],
    ['Verification','EVA inventory and order audit enabled']
  ];
  function flip(card,on){card.classList.toggle('eva-is-flipped',on);card.setAttribute('aria-expanded',String(on))}
  function upgrade(card){
    if(card.dataset.evaDimensionReady||!card.closest(scopeSelector))return;
    card.dataset.evaDimensionReady='1';card.classList.add('eva-dimension-card');card.setAttribute('aria-expanded','false');
    const data=productData(card),children=[...card.childNodes];
    const inner=document.createElement('div');inner.className='eva-card-inner';
    const front=document.createElement('div');front.className='eva-card-face eva-card-front';
    const label=document.createElement('div');label.className='eva-live-label';label.innerHTML='<span>DimensionCard · 3D Live Tilt</span><i></i>';front.append(label,...children);
    const trigger=document.createElement('button');trigger.type='button';trigger.className='eva-flip-trigger';trigger.textContent='Tap or click to see architecture specs';front.append(trigger);
    const back=document.createElement('div');back.className='eva-card-face eva-card-back';
    const fallback=`0x${hash(data.name)}${hash(data.category)}${hash(data.price)}${hash(data.name+data.stock)}`;
    back.innerHTML=`<div class="eva-back-kicker"><span>Architecture Blueprint</span><b>Technical Verification</b></div><h3>${escapeHtml(data.name)}</h3><p>${escapeHtml(data.description)}</p><div class="eva-spec-list">${specs(data).map(([a,b])=>`<div class="eva-spec"><small>${escapeHtml(a)}</small><strong>${escapeHtml(b)}</strong></div>`).join('')}</div><div class="eva-audit"><small>Cryptographic Card Hash</small><code>${fallback}</code></div><button class="eva-gyro-button" type="button" aria-pressed="false">Enable Device Gyroscope for Motion Tilt</button><button class="eva-flip-trigger eva-return" type="button">Return to Product View</button>`;
    inner.append(front,back);card.append(inner);
    if(window.crypto?.subtle){window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${data.name}|${data.category}|${data.price}|${data.stock}`)).then(buffer=>{back.querySelector('.eva-audit code').textContent='0x'+[...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('')}).catch(()=>{})}
    trigger.addEventListener('click',()=>flip(card,true));back.querySelector('.eva-return').addEventListener('click',()=>flip(card,false));
    back.querySelector('.eva-gyro-button').addEventListener('click',event=>enableGyro(event.currentTarget));
    card.addEventListener('pointermove',event=>{if(event.pointerType==='touch'||state.gyro||card.classList.contains('eva-is-flipped'))return;const r=card.getBoundingClientRect(),x=(event.clientX-r.left)/r.width-.5,y=(event.clientY-r.top)/r.height-.5;card.style.setProperty('--eva-rx',`${(-y*8).toFixed(2)}deg`);card.style.setProperty('--eva-ry',`${(x*10).toFixed(2)}deg`)});
    card.addEventListener('pointerleave',()=>{if(!state.gyro){card.style.setProperty('--eva-rx','0deg');card.style.setProperty('--eva-ry','0deg')}});
  }
  const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function scan(root=document){root.querySelectorAll?.(`${scopeSelector} ${cardSelector}`).forEach(upgrade)}
  function onOrientation(event){state.beta=Math.max(-25,Math.min(25,Number(event.beta)||0));state.gamma=Math.max(-25,Math.min(25,Number(event.gamma)||0));document.querySelectorAll('.eva-dimension-card').forEach(card=>{if(card.classList.contains('eva-is-flipped'))return;card.style.setProperty('--eva-rx',`${(-state.beta/5).toFixed(2)}deg`);card.style.setProperty('--eva-ry',`${(state.gamma/5).toFixed(2)}deg`)})}
  async function enableGyro(button){
    try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const result=await DeviceOrientationEvent.requestPermission();if(result!=='granted')throw new Error('Permission not granted')}
      window.addEventListener('deviceorientation',onOrientation,{passive:true});state.gyro=true;document.querySelectorAll('.eva-gyro-button').forEach(b=>{b.setAttribute('aria-pressed','true');b.textContent='Device Gyroscope Enabled'});
    }catch{button.textContent='Gyroscope permission was not enabled'}
  }
  function ensureModal(){
    if(document.querySelector('.eva-balance-modal'))return;
    const modal=document.createElement('div');modal.className='eva-balance-modal';modal.hidden=true;modal.innerHTML=`<div class="eva-balance-scrim" data-eva-cancel></div><section class="eva-balance-panel" role="dialog" aria-modal="true" aria-labelledby="eva-balance-title"><div class="eva-modal-kicker">Secure EVA Checkout</div><h2 id="eva-balance-title">Authorize EVA Balance</h2><p>Instant delivery to your authenticated account dashboard.</p><div class="eva-balance-lines"><span>Asset <b data-eva-asset></b></span><span class="eva-deduction">Deduction <b data-eva-price></b></span><span>EVA Network Fee <b>0.00 USDT (Waived)</b></span></div><div class="eva-balance-actions"><button class="eva-balance-cancel" type="button" data-eva-cancel>Cancel</button><button class="eva-balance-confirm" type="button">Confirm Order</button></div></section>`;document.body.append(modal);
    modal.querySelectorAll('[data-eva-cancel]').forEach(x=>x.addEventListener('click',()=>{modal.hidden=true;state.pending=null}));
    modal.querySelector('.eva-balance-confirm').addEventListener('click',()=>{const pending=state.pending;if(!pending)return;modal.hidden=true;state.pending=null;if(pending.type==='dashboard'){pending.button.dataset.evaAuthorized='1';const old=window.confirm;window.confirm=()=>true;pending.button.click();window.confirm=old}else{sessionStorage.setItem('eva-pending-product',JSON.stringify({name:pending.data.name,price:pending.data.price}));sessionStorage.setItem('eva-return-to','/dashboard.html#customer-products');location.href=pending.href||'/login.html'}});
  }
  function openBalance(card,target,type){ensureModal();const modal=document.querySelector('.eva-balance-modal'),data=productData(card);state.pending=type==='dashboard'?{type,button:target,data}:{type:'public',href:target.getAttribute('href'),data};modal.querySelector('[data-eva-asset]').textContent=data.name;modal.querySelector('[data-eva-price]').textContent=data.price;modal.hidden=false;
  }
  document.addEventListener('click',event=>{const target=event.target.closest('a,button');if(!target)return;const card=target.closest('.eva-dimension-card');if(!card)return;if(target.classList.contains('buy-product')){if(target.dataset.evaAuthorized==='1'){delete target.dataset.evaAuthorized;return}event.preventDefault();event.stopImmediatePropagation();openBalance(card,target,'dashboard');return}if(target.matches('a.button[href*="login.html"]')&&/buy|balance/i.test(target.textContent)){event.preventDefault();event.stopImmediatePropagation();openBalance(card,target,'public')}},true);
  function showSuccess(){ensureModal();const modal=document.querySelector('.eva-balance-modal');modal.innerHTML='<div class="eva-balance-scrim"></div><section class="eva-balance-panel eva-success-copy" role="dialog" aria-modal="true"><div class="eva-success-mark">✓</div><h2>Order Executed Successfully</h2><p>Order created successfully. Delivery details will appear in your secure vault.</p><button type="button">Return to Dashboard</button></section>';modal.hidden=false;modal.querySelector('button').addEventListener('click',()=>{modal.remove();location.hash='customer-orders'})}
  const observer=new MutationObserver(records=>{for(const record of records){for(const node of record.addedNodes){if(node.nodeType===1){if(node.matches?.(cardSelector))upgrade(node);scan(node)}}}const notice=document.getElementById('dash-notice');if(notice?.classList.contains('success')&&/purchase successful/i.test(notice.textContent)&&notice.dataset.evaSeen!==notice.textContent){notice.dataset.evaSeen=notice.textContent;showSuccess()}});
  const start=()=>{scan();observer.observe(document.body,{childList:true,subtree:true,characterData:true})};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
