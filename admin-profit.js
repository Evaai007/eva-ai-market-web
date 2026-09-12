(()=>{
const q=id=>document.getElementById(id),money=n=>'$'+Number(n).toFixed(2);
const plan=q('profit-plan'),billing=q('profit-billing'),seats=q('profit-seats'),cost=q('profit-cost'),fee=q('profit-fee'),expense=q('profit-expense');
function setOfficialCost(){
 if(plan.value==='enterprise')return calculate();
 const count=Math.max(2,Math.min(200,Number(seats.value)||2));
 const standard=plan.value==='standard';
 const rate=standard?(billing.value==='annual'?20:25):(billing.value==='annual'?100:125);
 cost.value=(rate*count*(billing.value==='annual'?12:1)).toFixed(2);
 calculate();
}
function calculate(){
 const official=Math.max(0,Number(cost.value)||0);
 const feeRate=Math.max(0,Math.min(100,Number(fee.value)||0));
 const otherCost=Math.max(0,Number(expense.value)||0);
 const gross=official*feeRate/100,customer=official+gross,net=gross-otherCost;
 q('profit-customer').textContent=money(customer);
 q('profit-gross').textContent=money(gross);
 q('profit-net').textContent=money(net);
 q('profit-net').classList.toggle('loss',net<0);
 q('profit-formula').textContent=money(official)+' official cost + '+money(gross)+' EVA fee − '+money(otherCost)+' expenses = '+money(net)+' net profit';
}
[plan,billing,seats].forEach(el=>el.addEventListener('input',setOfficialCost));
[cost,fee,expense].forEach(el=>el.addEventListener('input',calculate));
setOfficialCost();

function mountRealtimeEnhancements(){
 const live=document.getElementById('admin-live-stats');
 if(!live||live.dataset.realtimeEnhanced==='1')return;
 live.dataset.realtimeEnhanced='1';
 const row=live.querySelector('.card-title-row');
 const badge=live.querySelector('.eva-live-badge');
 if(badge)badge.textContent='● LIVE · refreshes every 5 sec';
 if(row&&!document.getElementById('stats-refresh-now')){
  const btn=document.createElement('button');
  btn.id='stats-refresh-now';
  btn.type='button';
  btn.className='button secondary small-button';
  btn.textContent='Refresh Live Data';
  btn.style.cssText='pointer-events:auto;position:relative;z-index:10;touch-action:manipulation';
  btn.addEventListener('click',async()=>{
   const old=btn.textContent;btn.disabled=true;btn.textContent='Refreshing…';
   try{if(typeof loadAdminStats==='function')await loadAdminStats(false);}finally{btn.disabled=false;btn.textContent=old;}
  });
  row.appendChild(btn);
 }
 const grid=live.querySelector('.eva-stat-grid');
 if(grid&&!document.getElementById('stat-visitors-today')){
  grid.insertAdjacentHTML('beforeend','<article><span>Visitors today</span><strong id="stat-visitors-today">—</strong><small>Unique visitors today</small></article><article><span>Online now</span><strong id="stat-online-now">—</strong><small>Active in last 5 minutes</small></article>');
 }
 live.querySelectorAll('button,a,select,input,textarea').forEach(el=>{el.style.pointerEvents='auto';el.style.touchAction='manipulation';});
}

async function refreshRealtimeExtras(){
 if(typeof adminFetch!=='function'||typeof adminClient==='undefined'||!adminClient)return;
 mountRealtimeEnhancements();
 try{
  const data=await adminFetch(`/api/admin/stats?refresh=${Date.now()}`,{cache:'no-store',headers:{'cache-control':'no-cache'}});
  const today=document.getElementById('stat-visitors-today');
  const online=document.getElementById('stat-online-now');
  if(today)today.textContent=Number(data.visits?.uniqueToday||0).toLocaleString();
  if(online)online.textContent=Number(data.visits?.onlineNow||0).toLocaleString();
 }catch(_error){}
}

setTimeout(()=>{mountRealtimeEnhancements();refreshRealtimeExtras();},1800);
setInterval(()=>{
 if(typeof loadAdminStats==='function')loadAdminStats(false);
 setTimeout(refreshRealtimeExtras,250);
},5000);
})();