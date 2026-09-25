/* EVA AI MARKET — official logo renderer
 * Reads logo_url/brand_domain/logo_source returned by /api/store and replaces
 * product-card placeholders without changing checkout or product data.
 */
(function(){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function logoHtml(p){
    const url=String(p?.logo_url||'').trim();
    if(!url)return '';
    const alt=esc((p?.name||p?.brand_domain||'Official product')+' official logo');
    return '<img class="eva-official-logo" src="'+esc(url)+'" alt="'+alt+'" loading="lazy" referrerpolicy="no-referrer">';
  }
  function apply(products){
    if(!Array.isArray(products))return;
    const byId=new Map(products.map(p=>[String(p.id),p]));
    document.querySelectorAll('[data-id], [data-product-id], .product, .account-product').forEach(card=>{
      const id=card.getAttribute('data-id')||card.getAttribute('data-product-id')||card.querySelector('[data-id],[data-product-id]')?.getAttribute('data-id')||card.querySelector('[data-id],[data-product-id]')?.getAttribute('data-product-id')||card.querySelector('.buy[data-id],button[data-id]')?.getAttribute('data-id');
      const p=byId.get(String(id)); if(!p)return;
      const host=card.querySelector('.plogo,.brand-icon-shell,.mobile-brand-mark,[data-logo-host]');
      if(!host)return;
      const html=logoHtml(p); if(!html)return;
      host.classList.add('eva-logo-host');
      host.innerHTML=html;
    });
  }
  function boot(){
    const style=document.createElement('style');
    style.textContent='.eva-logo-host{display:grid;place-items:center;overflow:hidden}.eva-official-logo{width:78%;height:78%;object-fit:contain;display:block}.brand-icon-shell .eva-official-logo{width:70%;height:70%}.mobile-brand-mark .eva-official-logo{width:72%;height:72%;filter:drop-shadow(0 6px 12px rgba(0,0,0,.18))}.eva-logo-host img{background:transparent}';
    document.head.appendChild(style);
    fetch('/api/store',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(b=>apply(b?.products)).catch(()=>{});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
