(()=>{
const ORDER=['ChatGPT Plans','Claude Plans','Gemini Plans','Claude Accounts','Cloud & AI Accounts','AWS Cloud Accounts','Telegram Services'];
const META={'ChatGPT Plans':['ChatGPT','Official OpenAI plans and account options'],'Claude Plans':['Claude','Official Anthropic plan references'],'Gemini Plans':['Gemini','Google AI and Gemini plans'],'Claude Accounts':['Claude Accounts','Ready-to-order Claude products'],'Cloud & AI Accounts':['AI Bundles','Cloud and AI bundled products'],'AWS Cloud Accounts':['AWS Cloud','Cloud capacity and account products'],'Telegram Services':['Telegram','Premium, Stars and Telegram services']};
function ensureCleanCss(){if(document.querySelector('link[href*="clean-storefront.css"]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='/clean-storefront.css?v=20260911-final-clean';document.head.appendChild(link)}
function updateCount(n){
 document.querySelectorAll('[data-total-products]').forEach(e=>e.textContent=n);
 document.querySelectorAll('.pro-hero-art strong').forEach(e=>e.textContent=n);
 document.querySelectorAll('.pro-hero-copy .button').forEach(e=>{if(/Browse\s+\d+\s+Products/i.test(e.textContent))e.textContent=`Browse ${n} Products →`});
 document.querySelectorAll('.pro-category-strip a').forEach(e=>{if(/^All\s+/i.test(e.textContent.trim()))e.innerHTML=`All <b>${n}</b>`});
 document.querySelectorAll('.pro-section-title h2').forEach(e=>{if(/All AI Products/i.test(e.textContent))e.innerHTML=`All AI Products <b>(${n})</b>`});
}
function arrange(){
 const store=document.getElementById('public-store-products');if(!store||store.querySelector('.store-loading'))return false;
 store.querySelectorAll('.claude-official-section,.catalog-layout,.catalog-compact-summary,.clean-category-head').forEach(e=>{if(e.classList.contains('catalog-layout')){[...e.querySelectorAll('.account-product')].forEach(c=>store.appendChild(c))}e.remove()});
 const cards=[...store.children].filter(e=>e.classList.contains('account-product'));if(!cards.length)return false;
 const groups=new Map();cards.forEach(card=>{const cat=card.querySelector('.product-tag')?.textContent.trim()||'Other';if(!groups.has(cat))groups.set(cat,[]);groups.get(cat).push(card)});
 [...ORDER,...[...groups.keys()].filter(k=>!ORDER.includes(k))].forEach(cat=>{const list=groups.get(cat);if(!list?.length)return;const [title,desc]=META[cat]||[cat,'Current products and availability'];const head=document.createElement('div');head.className='clean-category-head';head.innerHTML=`<div><span class="clean-category-dot"></span><div><h3>${title} <b>${list.length}</b></h3><p>${desc}</p></div></div>`;store.appendChild(head);list.forEach(card=>store.appendChild(card))});
 updateCount(cards.length);return true;
}
function boot(){ensureCleanCss();updateCount(38);let tries=0;const t=setInterval(()=>{tries++;if(arrange()||tries>80)clearInterval(t)},200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();