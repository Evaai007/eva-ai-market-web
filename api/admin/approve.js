import { json, requireAdmin, serviceRequest } from '../_supabase.js';

const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const txPattern=/^(?:0x)?[a-fA-F0-9]{64}$/;

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
  return json(res,200,{reassigned:true,email:customer.email,depositId:deposit.id,amount:deposit.amount_usdt});
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  if(req.body?.action==='reassign')return reassignDeposit(ctx,req,res);

  const depositId = req.body?.depositId;
  const repair = req.body?.repair === true;
  const adminNote = String(req.body?.adminNote || '').trim().slice(0, 500) || null;

  if (!/^[0-9a-f-]{36}$/i.test(depositId || '')) {
    return json(res, 400, { error: 'Invalid deposit.' });
  }

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

  return json(res, 200, {
    approved: !repair,
    repaired: repair ? Boolean(result.repaired) : false,
    result
  });
}
