import { json, requireAdmin, serviceRequest } from '../_supabase.js';

const notifyCustomer=async(ctx,{userId,type,title,message,referenceId})=>{
  try{
   if(!userId||!referenceId)return;
   await serviceRequest(ctx,'customer_notifications',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:userId,type,title,message:String(message||'').slice(0,500),reference_id:referenceId})});
  }catch(error){console.error('Customer notification failed:',error?.message||error);}
 };

const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const txPattern=/^(?:0x)?[a-fA-F0-9]{64}$/;

async function sendTelegramAlert(text){
  const token=String(process.env.TELEGRAM_BOT_TOKEN||'').trim();
  const chatId=String(process.env.TELEGRAM_CHAT_ID||'').trim();
  if(!token||!chatId)return {sent:false,configured:false};
  try{
    const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({chat_id:chatId,text:String(text||'').slice(0,3900),disable_web_page_preview:true})
    });
    const body=await response.json().catch(()=>({}));
    return {sent:Boolean(response.ok&&body?.ok),configured:true};
  }catch(_error){return {sent:false,configured:true};}
}

async function findAuthUserByEmail(ctx,email){
  for(let page=1;page<=10;page++){
    const response=await fetch(`${ctx.url}/auth/v1/admin/users?page=${page}&per_page=1000`,{
      headers:{apikey:ctx.service,authorization:`Bearer ${ctx.service}`}
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body?.msg||body?.message||'Could not search registered customers.');
    const users=Array.isArray(body?.users)?body.users:Array.isArray(body)?body:[];
    const found=users.find(user=>String(user?.email||'').toLowerCase()===email);
    if(found)return found;
    if(users.length<1000)break;
  }
  return null;
}

async function reassignDeposit(ctx,req,res){
  const email=String(req.body?.email||'').trim().toLowerCase();
  const transactionId=String(req.body?.transactionId||'').trim();
  if(!emailPattern.test(email))return json(res,400,{error:'Enter a valid customer email.'});
  if(!txPattern.test(transactionId))return json(res,400,{error:'Enter the full valid transaction ID.'});

  let customer;
  try{customer=await findAuthUserByEmail(ctx,email)}catch(error){return json(res,502,{error:error.message});}
  if(!customer?.id)return json(res,404,{error:'No registered account was found for this email.'});

  const depositResponse=await serviceRequest(ctx,`deposits?select=id,user_id,status,amount_usdt,transaction_id&transaction_id=eq.${encodeURIComponent(transactionId)}&limit=1`);
  const deposits=await depositResponse.json().catch(()=>[]);
  const deposit=Array.isArray(deposits)?deposits[0]:null;
  if(!depositResponse.ok)return json(res,502,{error:deposits?.message||'Could not find deposit.'});
  if(!deposit?.id)return json(res,404,{error:'No deposit was found for this TxID.'});
  if(deposit.status!=='pending')return json(res,409,{error:'Only pending deposits can be reassigned safely.'});
  if(deposit.user_id===customer.id)return json(res,200,{reassigned:false,email:customer.email,depositId:deposit.id,message:'Deposit is already linked to this customer.'});

  const updateResponse=await serviceRequest(ctx,`deposits?id=eq.${encodeURIComponent(deposit.id)}`,{
    method:'PATCH',
    headers:{Prefer:'return=representation'},
    body:JSON.stringify({user_id:customer.id,admin_note:`Reassigned by admin to ${customer.email}`})
  });
  const updated=await updateResponse.json().catch(()=>[]);
  if(!updateResponse.ok)return json(res,400,{error:updated?.message||'Could not reassign deposit.'});
  if(!repair&&deposit?.user_id){
    await notifyCustomer(ctx,{userId:deposit.user_id,type:'deposit_approved',title:'充值已到账',message:'你的 '+Number(deposit?.amount_usdt||0).toFixed(2)+' USDT 充值已审核通过并计入余额。',referenceId:depositId});
  }
  const telegram=await sendTelegramAlert(`🔁 EVA AI MARKET — Deposit Reassigned\n\nCustomer: ${customer.email}\nAmount: ${Number(deposit.amount_usdt||0).toFixed(2)} USDT\nTxID: ${transactionId}\nTime: ${new Date().toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} (BD)`);
  return json(res,200,{reassigned:true,email:customer.email,depositId:deposit.id,amount:deposit.amount_usdt,telegram:telegram.sent});
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  if(req.body?.action==='reassign')return reassignDeposit(ctx,req,res);

  if(req.body?.action==='reject'){
    const depositId=String(req.body?.depositId||'').trim();
    const adminNote=String(req.body?.adminNote||'').trim().slice(0,500);
    if(!/^[0-9a-f-]{36}$/i.test(depositId))return json(res,400,{error:'Invalid deposit.'});
    const depositResponse=await serviceRequest(ctx,`deposits?select=id,user_id,amount_usdt,status& id=eq.${encodeURIComponent(depositId)}&limit=1`.replace('status& id','status&id'));
    const body=await depositResponse.json().catch(()=>[]);
    const deposit=Array.isArray(body)?body[0]:null;
    if(!deposit)return json(res,404,{error:'Deposit not found.'});
    if(deposit.status!=='pending')return json(res,409,{error:'Only pending deposits can be rejected.'});
    const update=await serviceRequest(ctx,`deposits?id=eq.${encodeURIComponent(depositId)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'rejected',admin_note:adminNote||'Payment could not be verified.'})});
    const result=await update.json().catch(()=>({}));
    if(!update.ok)return json(res,400,{error:result?.message||'Could not reject deposit.'});
    await notifyCustomer(ctx,{userId:deposit.user_id,type:'deposit_rejected',title:'充值未通过',message:adminNote||'你的充值申请未通过审核，请检查交易信息或联系客服。',referenceId:depositId});
    return json(res,200,{rejected:true});
  }


  const depositId = req.body?.depositId;
  const repair = req.body?.repair === true;
  const adminNote = String(req.body?.adminNote || '').trim().slice(0, 500) || null;

  if (!/^[0-9a-f-]{36}$/i.test(depositId || '')) {
    return json(res, 400, { error: 'Invalid deposit.' });
  }

  const depositResponse=await serviceRequest(ctx,`deposits?select=id,user_id,amount_usdt,network,transaction_id,status&id=eq.${encodeURIComponent(depositId)}&limit=1`);
  const depositBody=await depositResponse.json().catch(()=>[]);
  const deposit=Array.isArray(depositBody)?depositBody[0]:null;

  const rpc = repair ? 'rpc/repair_approved_deposit' : 'rpc/approve_deposit';
  const payload = repair
    ? { p_deposit_id: depositId }
    : { p_deposit_id: depositId, p_admin_note: adminNote };

  const response = await serviceRequest(ctx, rpc, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json(res, 400, { error: result.message || (repair ? 'Repair failed.' : 'Approval failed.') });
  }

  let email='Unknown customer';
  if(deposit?.user_id){
    const userResponse=await fetch(`${ctx.url}/auth/v1/admin/users/${encodeURIComponent(deposit.user_id)}`,{headers:{apikey:ctx.service,authorization:`Bearer ${ctx.service}`}});
    const userBody=await userResponse.json().catch(()=>({}));
    if(userResponse.ok&&userBody?.email)email=userBody.email;
  }
  const telegram=await sendTelegramAlert(`${repair?'🛠️ EVA AI MARKET — Deposit Balance Repair':'✅ EVA AI MARKET — Deposit Approved'}\n\nCustomer: ${email}\nAmount: ${Number(deposit?.amount_usdt||0).toFixed(2)} USDT\nNetwork: ${deposit?.network||'—'}\nStatus: ${repair?(result?.repaired?'Repaired':'No repair needed'):'Approved'}\nTxID: ${deposit?.transaction_id||'—'}\nTime: ${new Date().toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} (BD)`);

  return json(res, 200, {
    approved: !repair,
    repaired: repair ? Boolean(result.repaired) : false,
    result,
    telegram:telegram.sent
  });
}
