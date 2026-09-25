/* EVA AI MARKET — non-destructive official-logo bridge. */
(function(){
  function apply(root){
    (root||document).querySelectorAll('[data-logo-url],[data-brand-domain]').forEach(function(el){
      var url=el.getAttribute('data-logo-url');
      var domain=el.getAttribute('data-brand-domain');
      if(!url&&domain) url='https://logo.clearbit.com/'+domain;
      if(!url||el.dataset.evaLogoApplied==='1') return;
      var img=el.tagName==='IMG'?el:(el.querySelector('img')||document.createElement('img'));
      img.src=url; img.alt=img.alt||el.getAttribute('data-brand-name')||'Official product logo'; img.loading='lazy'; img.referrerPolicy='no-referrer';
      if(img.parentNode!==el) el.appendChild(img);
      el.dataset.evaLogoApplied='1';
    });
  }
  window.EVA_LOGO_MAPPER={apply:apply};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){apply(document);}); else apply(document);
  new MutationObserver(function(m){m.forEach(function(x){x.addedNodes.forEach(function(n){if(n.nodeType===1)apply(n);});});}).observe(document.documentElement,{childList:true,subtree:true});
})();
