(()=>{
const q=id=>document.getElementById(id),money=n=>'$'+Number(n).toFixed(2);
const plan=q('profit-plan'),billing=q('profit-billing'),seats=q('profit-seats'),cost=q('profit-cost'),fee=q('profit-fee'),expense=q('profit-expense');
let lastVisitTotal=null,lastSignupTotalForAlert=null;
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

function sendAdminAlert(title,body){
 try{
  if('vibrate' in navigator)navigator.vibrate([180,80,180]);
  if('Notification' in window&&Notification.permission==='granted'){
   new Notification(title,{body,tag:title+'-'+Date.now()});
  }
 }catch(_error){}
 if(typeof adminNotice==='function')adminNotice(title+' — '+body);
}

async function enableAlerts(button){
 if(!('Notification' in window)){
  if(typeof adminNotice==='function')adminNotice('Browser notifications are not supported on this device.',true);
  return;
 }
 try{
  const permission=await Notification.requestPermission();
  if(permission==='granted'){
   localStorage.setItem('eva-admin-alerts','enabled');
   button.textContent='Alerts Enabled ✓';
   sendAdminAlert('EVA Alerts Enabled','New visits and customer signups will alert you while the admin page is active.');
  }else{
   button.textContent='Enable Alerts';
   if(typeof adminNotice==='function')adminNotice('Notification permission was not granted.',true);
  }
 }catch(_error){}
}

async function testTelegram(button){
 const old=button.textContent;
 button.disabled=true;
 button.textContent='Testing Telegram…';
 try{
  await adminFetch('/api/admin/store',{method:'POST',body:JSON.stringify({action:'telegram_test'})});
  button.textContent='Telegram Connected ✓';
  if(typeof adminNotice==='function')adminNotice('✅ Telegram test sent. Check your bot chat now.');
 }catch(error){
  button.textContent='Test Telegram Alert';
  if(typeof adminNotice==='function')adminNotice(`Telegram test failed: ${error.message}`,true);
 }finally{
  setTimeout(()=>{button.disabled=false;if(button.textContent==='Testing Telegram…')button.textContent=old;},600);
 }
}

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
   try{if(typeof loadAdminStats==='function')await loadAdminStats(false);await refreshRealtimeExtras();}finally{btn.disabled=false;btn.textContent=old;}
  });
  row.appendChild(btn);
 }
 if(row&&!document.getElementById('telegram-test-alert')){
  const tg=document.createElement('button');
  tg.id='telegram-test-alert';
  tg.type='button';
  tg.className='button primary small-button';
  tg.textContent='Test Telegram Alert';
  tg.style.cssText='pointer-events:auto;position:relative;z-index:10;touch-action:manipulation';
  tg.addEventListener('click',()=>testTelegram(tg));
  row.appendChild(tg);
 }
 if(row&&!document.getElementById('enable-admin-alerts')){
  const alertBtn=document.createElement('button');
  alertBtn.id='enable-admin-alerts';
  alertBtn.type='button';
  alertBtn.className='button secondary small-button';
  alertBtn.textContent=('Notification' in window&&Notification.permission==='granted')?'Browser Alerts Enabled ✓':'Enable Browser Alerts';
  alertBtn.style.cssText='pointer-events:auto;position:relative;z-index:10;touch-action:manipulation';
  alertBtn.addEventListener('click',()=>enableAlerts(alertBtn));
  row.appendChild(alertBtn);
 }
 const grid=live.querySelector('.eva-stat-grid');
 if(grid&&!document.getElementById('stat-visitors-today')){
  grid.insertAdjacentHTML('beforeend','<article><span>Visitors today</span><strong id="stat-visitors-today">—</strong><small>Unique visitors today</small></article><article><span>Online now</span><strong id="stat-online-now">—</strong><small>Active in last 5 minutes</small></article><article><span>Telegram alerts</span><strong id="stat-telegram">—</strong><small>Server notification status</small></article>');
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
  const telegram=document.getElementById('stat-telegram');
  if(today)today.textContent=Number(data.visits?.uniqueToday||0).toLocaleString();
  if(online)online.textContent=Number(data.visits?.onlineNow||0).toLocaleString();
  if(telegram)telegram.textContent=data.telegram?.configured?'Configured ✓':'Missing';
  const visitTotal=Number(data.visits?.total||0);
  const signupTotal=Number(data.signups?.total||0);
  if(lastVisitTotal!==null&&visitTotal>lastVisitTotal){
   const diff=visitTotal-lastVisitTotal;
   sendAdminAlert('👀 New website visit',`${diff} new visit${diff>1?'s':''} detected. Today: ${Number(data.visits?.uniqueToday||0)} unique visitor${Number(data.visits?.uniqueToday||0)===1?'':'s'}.`);
  }
  if(lastSignupTotalForAlert!==null&&signupTotal>lastSignupTotalForAlert){
   const diff=signupTotal-lastSignupTotalForAlert;
   const recent=Array.isArray(data.signups?.recent)?data.signups.recent:[];
   const newest=recent[0]?.email||'New customer';
   sendAdminAlert('✅ New customer signup',`${diff} new signup${diff>1?'s':''}. Latest: ${newest}. Total customers: ${signupTotal}.`);
  }
  lastVisitTotal=visitTotal;
  lastSignupTotalForAlert=signupTotal;
 }catch(_error){}
}

setTimeout(()=>{mountRealtimeEnhancements();refreshRealtimeExtras();},1800);
setInterval(()=>{
 if(typeof loadAdminStats==='function')loadAdminStats(false);
 setTimeout(refreshRealtimeExtras,250);
},5000);
})();