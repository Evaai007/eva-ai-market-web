(()=>{
  const order=['ChatGPT Plans','Claude Plans','Gemini Plans','Claude Accounts','Cloud & AI Accounts','AWS Cloud Accounts','Telegram Services'];
  const meta={
    'ChatGPT Plans':['ChatGPT','Official OpenAI plans and account options'],
    'Claude Plans':['Claude','Official Anthropic plan references'],
    'Gemini Plans':['Gemini','Google AI and Gemini plans'],
    'Claude Accounts':['Claude Accounts','Ready-to-order Claude account products'],
    'Cloud & AI Accounts':['AI Bundles','Cloud and AI bundled products'],
    'AWS Cloud Accounts':['AWS Cloud','AWS cloud capacity and account products'],
    'Telegram Services':['Telegram','Premium, Stars and Telegram services']
  };
  function clean(){
    const store=document.getElementById('public-store-products');
    if(!store||store.querySelector('.store-loading'))return false;
    const cards=[...store.children].filter(el=>el.classList.contains('account-product'));
    if(!cards.length)return false;
    store.querySelectorAll('.clean-category-head').forEach(el=>el.remove());
    const groups=new Map();
    cards.forEach(card=>{
      const tag=card.querySelector('.product-tag')?.textContent.trim()||'Other';
      if(!groups.has(tag))groups.set(tag,[]);
      groups.get(tag).push(card);
    });
    const sequence=[...order,...[...groups.keys()].filter(k=>!order.includes(k))];
    sequence.forEach(category=>{
      const list=groups.get(category);if(!list?.length)return;
      const [title,desc]=meta[category]||[category,'Current products and availability'];
      const head=document.createElement('div');
      head.className='clean-category-head';
      head.dataset.category=category;
      head.innerHTML=`<div><span class="clean-category-dot"></span><div><h3>${title} <b>${list.length}</b></h3><p>${desc}</p></div></div>`;
      store.appendChild(head);
      list.forEach(card=>store.appendChild(card));
    });
    document.querySelectorAll('[data-total-products]').forEach(el=>el.textContent=String(cards.length));
    document.querySelectorAll('[data-live-product-count]').forEach(el=>el.textContent=String(cards.length));
    return true;
  }
  function boot(){
    if(clean())return;
    const store=document.getElementById('public-store-products');
    if(store)new MutationObserver(()=>clean()).observe(store,{childList:true});
    let n=0;const t=setInterval(()=>{n++;if(clean()||n>60)clearInterval(t)},250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();