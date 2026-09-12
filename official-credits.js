(()=>{
 const TARGET_TOTAL=45;
 const margin=1.05;
 const cards=[...document.querySelectorAll('[data-credit-card]')];
 const money=value=>Number(value).toLocaleString('en-US',{minimumFractionDigits:Number(value)%1?2:0,maximumFractionDigits:2});
 function syncCounters(){
  document.querySelectorAll('[data-total-products]').forEach(el=>{if(el.textContent.trim()!==String(TARGET_TOTAL))el.textContent=String(TARGET_TOTAL)});
  document.querySelectorAll('[data-total-products-parenthesized]').forEach(el=>{const value='('+TARGET_TOTAL+')';if(el.textContent.trim()!==value)el.textContent=value});
  document.querySelectorAll('[data-total-products-label]').forEach(el=>{const value='Browse '+TARGET_TOTAL+' Products →';if(el.textContent.trim()!==value)el.textContent=value});
 }
 function updateCard(card){
  const select=card.querySelector('[data-credit-select]');
  const option=select?.selectedOptions?.[0];
  if(!select||!option)return;
  const base=Number(option.value);
  const sell=Number((base*margin).toFixed(2));
  const official=option.dataset.official||('$'+money(base));
  const price=card.querySelector('[data-credit-price]');
  const officialEl=card.querySelector('[data-credit-official]');
  const order=card.querySelector('[data-credit-order]');
  if(price)price.innerHTML='$'+money(sell)+' <em>USDT</em>';
  if(officialEl)officialEl.textContent=official;
  if(order){
   const service=card.dataset.creditName||'Official AI Credits';
   const message=`Hello, I want ${service}. Selected official amount: ${official}. EVA price with 5% service margin: $${money(sell)} USDT. Please help me complete the top-up.`;
   order.href='https://t.me/eva007_8?text='+encodeURIComponent(message);
  }
 }
 cards.forEach(card=>{
  const select=card.querySelector('[data-credit-select]');
  if(select)select.addEventListener('change',()=>updateCard(card));
  updateCard(card);
 });
 syncCounters();
 const store=document.getElementById('public-store-products');
 if(store){
  const observer=new MutationObserver(()=>syncCounters());
  observer.observe(store,{childList:true,subtree:true});
 }
 setTimeout(syncCounters,700);
 setTimeout(syncCounters,1800);
})();
