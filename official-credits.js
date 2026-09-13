(()=>{
 const margin=1.05;
 const cards=[...document.querySelectorAll('[data-credit-card]')];
 const money=value=>Number(value).toLocaleString('en-US',{minimumFractionDigits:Number(value)%1?2:0,maximumFractionDigits:2});
 function actualTotal(){
  const store=document.getElementById('public-store-products');
  const rendered=store?[...store.querySelectorAll('.account-product')].length:0;
  const credits=document.querySelectorAll('[data-credit-card]').length;
  return rendered+credits;
 }
 function syncCounters(){
  const total=actualTotal();
  if(!total)return;
  document.querySelectorAll('[data-total-products]').forEach(el=>el.textContent=String(total));
  document.querySelectorAll('[data-total-products-parenthesized]').forEach(el=>el.textContent='('+total+')');
  document.querySelectorAll('[data-total-products-label]').forEach(el=>el.textContent='Browse '+total+' Products →');
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
  card.querySelectorAll('[data-credit-option]').forEach(button=>button.classList.toggle('active',button.dataset.creditOption===select.value));
 }
 function mountChoices(card){
  const select=card.querySelector('[data-credit-select]');
  const field=select?.closest('.credit-field');
  if(!select||!field||field.querySelector('.credit-choice-grid'))return;
  const grid=document.createElement('div');
  grid.className='credit-choice-grid';
  [...select.options].forEach(option=>{
   const button=document.createElement('button');
   button.type='button';
   button.className='credit-choice';
   button.dataset.creditOption=option.value;
   const base=Number(option.value);
   const sell=Number((base*margin).toFixed(2));
   const title=option.textContent.replace(/\s+official$/i,'').trim();
   button.innerHTML=`<span>${title}</span><small>EVA $${money(sell)}</small>`;
   button.addEventListener('click',()=>{select.value=option.value;updateCard(card)});
   grid.appendChild(button);
  });
  select.classList.add('credit-native-select');
  field.appendChild(grid);
  updateCard(card);
 }
 cards.forEach(card=>{
  const select=card.querySelector('[data-credit-select]');
  if(select)select.addEventListener('change',()=>updateCard(card));
  mountChoices(card);
  updateCard(card);
 });
 const store=document.getElementById('public-store-products');
 if(store){new MutationObserver(syncCounters).observe(store,{childList:true,subtree:true});}
 syncCounters();
 window.addEventListener('load',syncCounters,{once:true});
})();
