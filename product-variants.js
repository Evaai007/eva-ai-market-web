(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const $=s=>document.querySelector(s);
  const purchasable=p=>String(p?.purchase_mode||'balance').toLowerCase()==='balance';
  const id=()=>new URLSearchParams(location.search).get('id');
  const nameOf=p=>String(p?.name||'');
  function groupKey(p){
    const s=(nameOf(p)+' '+(p?.category||'')).toLowerCase();
    if(s.includes('chatgpt')) return 'chatgpt';
    if(s.includes('claude')) return 'claude';
    if(s.includes('kiro')) return 'kiro';
    if(s.includes('gemini')||s.includes('google ai')) return 'gemini';
    if(s.includes('grok')) return 'grok';
    if(s.includes('aws')) return 'aws';
    if(s.includes('capcut')) return 'capcut';
    if(s.includes('kling')) return 'kling';
    if(s.includes('telegram premium')) return 'telegram';
    if(s.includes('gcp')) return 'gcp';
    if(s.includes('cloud & ai bundle')) return 'bundle';
    return 'single:'+String(p?.category||'').toLowerCase();
  }
  function label(p,key){
    const n=nameOf(p), s=(p?.subtitle||'').trim(); let x=n;
    if(key==='chatgpt') x=x.replace(/^ChatGPT\s*/i,'').replace(/\s+Usage/i,'').trim();
    else if(key==='claude') x=x.replace(/^Claude\s*/i,'').trim();
    else if(key==='kiro') x=x.replace(/^Kiro\s*/i,'').trim();
    else if(key==='gemini') x=x.replace(/^Google\s*/i,'').replace(/^Gemini\s*/i,'').trim();
    else if(key==='grok') x=x.replace(/^SuperGrok\s*/i,'SuperGrok ').trim();
    else if(key==='aws') x=x.replace(/^AWS Cloud\s*[—-]?\s*/i,'').trim();
    else if(key==='capcut') x=x.replace(/^CapCut Pro\s*[—-]?\s*/i,'').trim();
    else if(key==='kling') x=x.replace(/^Kling\s*/i,'').trim();
    else if(key==='telegram') x=x.replace(/^Telegram Premium\s*[—-]?\s*/i,'').trim();
    else if(key==='gcp') x=x.replace(/^GCP Billing \/ Credit\s*[—-]?\s*/i,'').trim();
    if(!x) x=s||'Plan'; return x.length>20?x.slice(0,20)+'…':x;
  }
  function spec(p,key){
    const n=nameOf(p), sub=p?.subtitle||'';
    if(key==='aws') return n.match(/\d+\s*vCPU/i)?.[0]||sub.split('·')[0]||'Cloud tier';
    if(key==='kiro') return sub||'Kiro plan';
    return sub.split('·')[0]||sub||'Plan';
  }
  function sortProducts(list,key){
    const num=s=>Number(String(s||'').match(/\d+(?:\.\d+)?/)?.[0]||999999);
    return [...list].sort((a,b)=>{
      if(key==='aws') return num(a.name)-num(b.name);
      if(['telegram','capcut','kling','grok'].includes(key)) return num(a.name)-num(b.name)||Number(a.price_usd||0)-Number(b.price_usd||0);
      return Number(a.price_usd||0)-Number(b.price_usd||0);
    });
  }
  async function load(){const r=await fetch('/api/store',{cache:'no-store'});const b=await r.json();if(!r.ok)throw new Error(b.error||'Catalog unavailable');return Array.isArray(b.products)?b.products:[];}
  function syncDetails(p,key){
    const features=$('#pFeatures'), body=$('#refTabBody');
    if(features){
      const items=[];
      if(p.subtitle)items.push(p.subtitle);
      if(p.official_price_label)items.push(p.official_price_label);
      if(p.access_label)items.push(p.access_label);
      if(Number(p.warranty_days)>0)items.push(Number(p.warranty_days)+' day warranty');
      if(key==='kiro')items.push('Monthly credits included in the selected Kiro tier');
      if(key==='aws')items.push('Selected vCPU tier');
      features.innerHTML=items.map(v=>'<li>✓ '+esc(v)+'</li>').join('');
    }
    if(body) body.textContent=(p.subtitle||'Professional AI service')+' — please confirm the selected plan, stock, regional restrictions and delivery terms before purchase.';
  }
  function renderVariantGroup(products,current){
    const section=document.querySelector('.section:has(.ref-plans)'),box=$('.ref-plans');if(!section||!box)return;
    const key=groupKey(current),related=sortProducts(products.filter(p=>groupKey(p)===key),key);
    if(related.length<=1){section.style.display='none';return;}
    section.style.display='block';
    box.innerHTML=related.map(p=>{const active=String(p.id)===String(current.id),unavailable=!purchasable(p)||(p.unlimited_stock===true?false:Number(p.stock)<=0);return '<button class="ref-plan'+(active?' active':'')+'" type="button" data-variant-id="'+esc(p.id)+'" '+(unavailable?'disabled':'')+'><b>'+esc(label(p,key))+'</b><strong>$'+Number(p.price_usd||0).toFixed(2)+'</strong><small>'+esc(spec(p,key))+'</small></button>';}).join('');
    box.querySelectorAll('[data-variant-id]').forEach(btn=>btn.addEventListener('click',()=>{const next=products.find(p=>String(p.id)===String(btn.dataset.variantId));if(!next)return;history.replaceState(null,'',`/product.html?id=${encodeURIComponent(next.id)}`);renderProduct(products,next);}));
  }
  function renderProduct(products,p){
    const name=$('#pName'),sub=$('#pSub'),price=$('#pPrice'),stock=$('#pStock'),art=$('#detailArt'),buy=$('#buyNow'),badges=$('#pBadges');if(!p)return;
    const key=groupKey(p);
    name.textContent=p.name||'Product';sub.textContent=p.subtitle||p.category||'';price.textContent='$'+Number(p.price_usd||0).toFixed(2);stock.textContent=!purchasable(p)?'Contact Us':(p.unlimited_stock===true?'Unlimited Stock':(Number(p.stock)>0?'In Stock ('+p.stock+')':'Out of Stock'));
    if(art){const n=nameOf(p).toLowerCase();art.dataset.icon=n.includes('kiro')?'K':n.includes('chatgpt')?'◉':n.includes('claude')?'✺':n.includes('gemini')?'✦':n.includes('grok')?'𝕏':n.includes('aws')?'aws':n.includes('telegram')?'➤':n.includes('capcut')?'✂':'AI';}
    if(badges){const parts=[];if(p.category)parts.push('<span class="badge green">● '+esc(p.category)+'</span>');if(p.access_label)parts.push('<span class="badge">▣ '+esc(p.access_label)+'</span>');badges.innerHTML=parts.join('');}
    const unavailable=!purchasable(p)||(p.unlimited_stock===true?false:Number(p.stock)<=0);if(buy){buy.disabled=unavailable;buy.setAttribute('aria-disabled',String(unavailable));buy.textContent=!purchasable(p)?'Contact Us':(unavailable?'Out of Stock':'Buy Now');buy.onclick=unavailable?null:()=>{sessionStorage.setItem('eva-checkout-product',JSON.stringify(p));const cloudLike=/aws|gcp|google cloud|digitalocean|azure|cloud/i.test(((p.name||'')+' '+(p.category||'')));location.href=(cloudLike?'/cloud-config.html?id='/:'/checkout.html?id=')+encodeURIComponent(p.id);};}
    syncDetails(p,key);renderVariantGroup(products,p);sessionStorage.setItem('eva-checkout-product',JSON.stringify(p));
  }
  document.addEventListener('DOMContentLoaded',async()=>{if(document.body.dataset.page!=='product')return;try{const products=await load(),current=products.find(p=>String(p.id)===String(id()));if(!current)return;renderProduct(products,current);}catch(e){console.warn('[variant-grouping]',e);}});
})();
