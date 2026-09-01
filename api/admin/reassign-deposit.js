import { json, requireAdmin, serviceRequest } from '../_supabase.js';

const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const txPattern=/^(?:0x)?[a-fA-F0-9]{64}$/;

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed.'});
  const ctx=await requireAdmin(req,res);if(!ctx)return;

  const email=String(req.body?.email||'').trim().toLowerCase();
  const transactionId=String(req.body?.transactionId||'').trim();
  if(!emailPattern.test(email))return json(res,400,{error:'Enter a valid customer email.'});
  if(!txPattern.test(transactionId))return json(res,400,{error:'Enter the full valid transaction ID.'});

  const profileResponse=await serviceRequest(ctx,`profiles?select=id,email&email=eq.${encodeURIComponent(email)}&limit=1`);
  const profiles=await profileResponse.json().catch(()=>[]);
  const profile=Array.isArray(profiles)?profiles[0]:null;
  if(!profileResponse.ok)return json(res,502,{error:profiles?.message||'Could not find customer.'});
  if(!profile?.id)return json(res,404,{error:'No registered account was found for this email.'});

  const depositResponse=await serviceRequest(ctx,`deposits?select=id,user_id,status,amount_usdt,transaction_id&transaction_id=eq.${encodeURIComponent(transactionId)}&limit=1`);
  const deposits=await depositResponse.json().catch(()=>[]);
  const deposit=Array.isArray(deposits)?deposits[0]:null;
  if(!depositResponse.ok)return json(res,502,{error:deposits?.message||'Could not find deposit.'});
  if(!deposit?.id)return json(res,404,{error:'No deposit was found for this TxID.'});
  if(deposit.status!=='pending')return json(res,409,{error:'Only pending deposits can be reassigned safely.'});
  if(deposit.user_id===profile.id)return json(res,200,{reassigned:false,email:profile.email,depositId:deposit.id,message:'Deposit is already linked to this customer.'});

  const updateResponse=await serviceRequest(ctx,`deposits?id=eq.${encodeURIComponent(deposit.id)}`,{
    method:'PATCH',
    headers:{Prefer:'return=representation'},
    body:JSON.stringify({user_id:profile.id,admin_note:`Reassigned by admin to ${profile.email}`})
  });
  const updated=await updateResponse.json().catch(()=>[]);
  if(!updateResponse.ok)return json(res,400,{error:updated?.message||'Could not reassign deposit.'});

  return json(res,200,{reassigned:true,email:profile.email,depositId:deposit.id,amount:deposit.amount_usdt});
}
