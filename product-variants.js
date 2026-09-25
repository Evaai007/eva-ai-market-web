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
    const n=nameOf(p), s=(p?.subtitle||'').toLowerCase(); let x=n;
    if(key==='chatgpt') x=x.replace(/^ChatGPT\s*/i,'').replace(/\s+Usage/i,'').trim();
    else if(key==='claude') x=x.replace(/^Claude\s*/i,'').trim();
    else if(key==='kiro') x=x.replace(/^Kiro\s*/i,'').trim();
    else if(key==='gemini') x=x.replace(/^Google\s*/i,'').replace(/^Gemini\s*/i,'').trim();
    else if(key==='grok') x=x.replace(/^SuperGrok\s*/i,'SuperGrok ').trim();
    else if(key==='aws') x=x.replace(/^AWS Cloud\s*[—-]?\s*/i,'').trim();
    else if(key==='capcut'||key==='kling') x=x.replace(/^CapCut Pro\s*[—-]?\s*/i,'').trim();
    else if(key==='telegram') x=x.replace(/^Telegram Premium\s*[—-]?\s*/i,'').trim();
    else if(key==='gcp') x=x.replace(/^GCP Billing \/ Credit\s*[—-]?\s*/i,'').trim();
    if(!x) x=s||'Plan'; return x.length>18?x.slice(0,18)+'…':x;
  }
  function spec(p,key){
    const n=nameOf(p), sub=p?.subtitle||'';
    if(key==='kiro') return sub||'Kiro plan';
    if(key==='aws') return (n.match(/\d+\s*vCPU/i)?.[0]||sub.split('·')[0]||'Cloud tier');
    if(key==='telegram'||key==='capcut'||key==='kling'||key==='grok') return sub.split('·')[0]||'Plan';
    if(key==='claude'||key==='chatgpt'||key==='gemini') return sub.split('·')[0]||'Plan';
    return sub||p?.category||'Plan';
  }
  function sortProducts(list,key){
    return [...list].sort((a,b)=>{
      if(key==='aws') return parseInt(nameOf(a).match(/\d+/)?.[0]||0)-parseInt(nameOf(b).match(/\d+/)?.[0]||0);
      if(key==='telegram'||key==='capcut'||key==='grok') return parseInt(nameOf(a).match(/\d+/)?.[0]||999)-parseInt(nameOf(b).match(/\d+/)?.[0]||999);
      return Number(a.price_usd||0)-Number(b.price_usd||0);
    });
  }
  async function load(){const r=await fetch('/api/store',{cache:'no-store'});const b=await r.json();if(!r.ok)throw new Error(b.error||'Catalog unavailable');return Array.isArray(b.products)?b.products:[];}
  function renderVariantGroup(products,current){
    const section=document.querySelector('.section:has(.ref-plans)'),box=$('.ref-plans');if(!section||!box)return;
    const key=groupKey(current),related=sortProducts(products.filter(p=>groupKey(p)===key),key);
    if(related.length<=1){section.style.display='none';return;}
    section.style.display='block';
    box.innerHTML=related.map(p=>{const active=String(p.id)===String(current.id),unavailable=!purchasable(p)||(p.unlimited_stock===true?false:Number(p.stock)<=0);return `<button class="ref-plan${active?' active':''}" type="button" data-variant-id="${esc(p.id)}" ${unavailable?'disabled':''}><b>${esc(label(p,key))}</b><strong>$${Number(p.price_usd||0).toFixed(2)}</strong><small>${esc(spec(p,key))}</small></button>`;}).join('');
    box.querySelectorAll('[data-variant-id]').forEach(btn=>btn.addEventListener('click',()=>{const next=products.find(p=>String(p.id)===String(btn.dataset.variantId));if(!next)return;history.replaceState(null,'',`/product.html?id=${encodeURIComponent(next.id)}`);renderProduct(products,next);}));
  }
  function renderProduct(products,p){
    const name=$('#pName'),sub=$('#pSub'),price=$('#pPrice'),stock=$('#pStock'),art=$('#detailArt'),buy=$('#buyNow'),badges=$('#pBadges');if(!p)return;
    name.textContent=p.name||'Product';sub.textContent=p.subtitle||p.category||'';price.textContent='$'+Number(p.price_usd||0).toFixed(2);stock.textContent=!purchasable(p)?'Contact Us':(p.unlimited_stock===true?'Unlimited Stock':(Number(p.stock)>0?'In Stock ('+p.stock+')':'Out of Stock'));
    if(art&&nameOf(p).toLowerCase().includes('kiro'))art.dataset.icon='K';
    if(badges){const parts=[];if(p.category)parts.push(`<span class="badge green">● ${esc(p.category)}</span>`);if(p.access_label)parts.push(`<span class="badge">▣ ${esc(p.access_label)}</span>`);badges.innerHTML=parts.join('');}
    const unavailable=!purchasable(p)||(p.unlimited_stock===true?false:Number(p.stock)<=0);if(buy){buy.disabled=unavailable;buy.setAttribute('aria-disabled',String(unavailable));buy.textContent=!purchasable(p)?'Contact Us':(unavailable?'Out of Stock':'Buy Now');buy.onclick=unavailable?null:()=>{sessionStorage.setItem('eva-checkout-product',JSON.stringify(p));const cloudLike=/aws|gcp|google cloud|digitalocean|azure|cloud/i.test(((p.name||'')+' '+(p.category||'')));location.href=(cloudLike?'/cloud-config.html?id=':'/checkout.html?id=')+encodeURIComponent(p.id);};}
    renderVariantGroup(products,p);sessionStorage.setItem('eva-checkout-product',JSON.stringify(p));
  }
  document.addEventListener('DOMContentLoaded',async()=>{if(document.body.dataset.page!=='product')return;try{const products=await load(),current=products.find(p=>String(p.id)===String(id()));if(!current)return;renderProduct(products,current);}catch(e){console.warn('[variant-grouping]',e);}});
})();
