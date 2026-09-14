(()=>{
const ORDER=['ChatGPT Plans','Claude Plans','Gemini Plans','Claude Accounts','Cloud & AI Accounts','AWS Cloud Accounts','Telegram Services'];
const META={'ChatGPT Plans':['ChatGPT','Official OpenAI plans and account options'],'Claude Plans':['Claude','Official Anthropic plan references'],'Gemini Plans':['Gemini','Google AI and Gemini plans'],'Claude Accounts':['Claude Accounts','Ready-to-order Claude products'],'Cloud & AI Accounts':['AI Bundles','Cloud and AI bundled products'],'AWS Cloud Accounts':['AWS Cloud','Cloud capacity and account products'],'Telegram Services':['Telegram','Premium, Stars and Telegram services']};
let activeFilter='all',searchQuery='';
function ensureCleanCss(){if(document.querySelector('link[href*="clean-storefront.css"]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='/clean-storefront.css?v=20260911-final-clean';document.head.appendChild(link)}
function updateCount(n){
 document.querySelectorAll('[data-total-products]').forEach(e=>e.textContent=n);
 document.querySelectorAll('.pro-hero-art strong').forEach(e=>e.textContent=n);
 document.querySelectorAll('.pro-hero-copy .button').forEach(e=>{if(/Browse\s+\d+\s+Products/i.test(e.textContent))e.textContent=`Browse ${n} Products →`});
 document.querySelectorAll('.pro-category-strip a').forEach(e=>{if(/^All\s+/i.test(e.textContent.trim()))e.innerHTML=`All <b>${n}</b>`});
 document.querySelectorAll('.pro-section-title h2').forEach(e=>{if(/All AI Products/i.test(e.textContent))e.innerHTML=`All AI Products <b>(${n})</b>`});
}
function cardCategory(card){return card.querySelector('.product-tag')?.textContent.trim()||'Other'}
function categoryMatches(category,filter){
 if(filter==='all')return true;
 const c=category.toLowerCase();
 if(filter==='chatgpt')return c.includes('chatgpt')||c.includes('openai');
 if(filter==='claude')return c.includes('claude')||c.includes('anthropic');
 if(filter==='gemini')return c.includes('gemini')||c.includes('google ai');
 if(filter==='credits')return c.includes('credit');
 if(filter==='grok')return c.includes('grok')||c.includes('xai');
 if(filter==='aws')return c.includes('aws');
 if(filter==='gcp')return c.includes('google cloud')||c.includes('gcp')||c.includes('cloud & ai');
 if(filter==='creative')return c.includes('creative')||c.includes('video')||c.includes('image')||c.includes('design');
 if(filter==='social')return c.includes('telegram')||c.includes('social');
 return true;
}
function applyFilters(){
 const store=document.getElementById('public-store-products');if(!store)return;
 const q=searchQuery.trim().toLowerCase();
 let visible=0;
 store.querySelectorAll('.account-product').forEach(card=>{
  const category=cardCategory(card);
  const text=(card.textContent||'').toLowerCase();
  const show=categoryMatches(category,activeFilter)&&(!q||text.includes(q));
  card.hidden=!show;if(show)visible++;
 });
 store.querySelectorAll('.clean-category-head').forEach(head=>{
  let node=head.nextElementSibling,any=false;
  while(node&&!node.classList.contains('clean-category-head')){if(node.classList.contains('account-product')&&!node.hidden){any=true;break}node=node.nextElementSibling}
  head.hidden=!any;
 });
 let empty=store.querySelector('.store-filter-empty');
 if(!visible){if(!empty){empty=document.createElement('article');empty.className='panel store-loading store-filter-empty';store.appendChild(empty)}empty.textContent='No products match your search. Try another keyword or category.';empty.hidden=false}else if(empty)empty.hidden=true;
 const title=document.querySelector('.pro-section-title h2');if(title)title.innerHTML=`Products <b>(${visible})</b>`;
}
function mountSearch(){
 const shell=document.querySelector('.pro-search');if(!shell||shell.dataset.ready)return;shell.dataset.ready='1';
 const old=shell.querySelector('span');if(old)old.remove();
 const input=document.createElement('input');input.type='search';input.id='eva-product-search';input.placeholder='Search AI tools, accounts, API access...';input.setAttribute('aria-label','Search products');input.autocomplete='off';input.style.cssText='flex:1;background:transparent;border:0;outline:0;color:inherit;font:inherit;min-width:0';
 const kbd=shell.querySelector('kbd');if(kbd)shell.insertBefore(input,kbd);else shell.appendChild(input);
 input.addEventListener('input',()=>{searchQuery=input.value;applyFilters()});
 document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();input.focus();input.select()}if(event.key==='Escape'&&document.activeElement===input){input.value='';searchQuery='';applyFilters();input.blur()}});
}
function mountCategories(){
 document.querySelectorAll('.pro-category-strip a').forEach(link=>{if(link.dataset.filterReady)return;link.dataset.filterReady='1';const text=link.textContent.trim().toLowerCase();let filter='all';if(text.includes('chatgpt'))filter='chatgpt';else if(text.includes('claude'))filter='claude';else if(text.includes('gemini'))filter='gemini';else if(text.includes('credit'))filter='credits';else if(text.includes('grok'))filter='grok';else if(text.includes('aws'))filter='aws';else if(text.includes('google cloud'))filter='gcp';else if(text.includes('creative'))filter='creative';else if(text.includes('social'))filter='social';link.dataset.productFilter=filter;link.addEventListener('click',event=>{event.preventDefault();activeFilter=filter;document.querySelectorAll('.pro-category-strip a').forEach(a=>a.classList.toggle('active',a===link));applyFilters();document.getElementById('products')?.scrollIntoView({behavior:'smooth',block:'start'})})});
}
function arrange(){
 const store=document.getElementById('public-store-products');if(!store||store.querySelector('.store-loading'))return false;
 store.querySelectorAll('.claude-official-section,.catalog-layout,.catalog-compact-summary,.clean-category-head').forEach(e=>{if(e.classList.contains('catalog-layout')){[...e.querySelectorAll('.account-product')].forEach(c=>store.appendChild(c))}e.remove()});
 const cards=[...store.children].filter(e=>e.classList.contains('account-product'));if(!cards.length)return false;
 const groups=new Map();cards.forEach(card=>{const cat=cardCategory(card);if(!groups.has(cat))groups.set(cat,[]);groups.get(cat).push(card)});
 [...ORDER,...[...groups.keys()].filter(k=>!ORDER.includes(k))].forEach(cat=>{const list=groups.get(cat);if(!list?.length)return;const [title,desc]=META[cat]||[cat,'Current products and availability'];const head=document.createElement('div');head.className='clean-category-head';head.innerHTML=`<div><span class="clean-category-dot"></span><div><h3>${title} <b>${list.length}</b></h3><p>${desc}</p></div></div>`;store.appendChild(head);list.forEach(card=>store.appendChild(card))});
 updateCount(cards.length);mountSearch();mountCategories();applyFilters();return true;
}
function boot(){ensureCleanCss();updateCount(38);mountSearch();mountCategories();let tries=0;const t=setInterval(()=>{tries++;if(arrange()||tries>80)clearInterval(t)},200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();