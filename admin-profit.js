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
})();