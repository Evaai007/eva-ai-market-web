import { randomUUID } from 'crypto';
import { json, requireUser, serviceRequest } from './_supabase.js';

const serviceContext=()=>({
 url:process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,
 anon:process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY,
 service:process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY
});

async function sendTelegramAlert(text){
 const token=process.env.TELEGRAM_BOT_TOKEN;
 const chatId=process.env.TELEGRAM_CHAT_ID;
 if(!token||!chatId)return {sent:false,reason:'not_configured'};
 try{
  const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
   method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({chat_id:chatId,text:String(text||'').slice(0,3900),disable_web_page_preview:true})
  });
  const body=await response.json().catch(()=>({}));
  return response.ok&&body?.ok?{sent:true}:{sent:false,reason:body?.description||'telegram_error'};
 }catch(_error){
  return {sent:false,reason:'network_error'};
 }
}

const validTx=(network,value)=>{
 const own=new Set(['0x644ed89caecc120d3a3180e9f20a90d970cfa3e8','tjcfs6hdksenquguvw43krk141qlvhngbg']);
 const tx=String(value||'').trim();
 if(own.has(tx.toLowerCase()))return false;
 return network==='BEP20'||network==='ERC20'?/^0x[a-fA-F0-9]{64}$/.test(tx):/^[a-fA-F0-9]{64}$/.test(tx);
};

const readCookie=(req,name)=>{
 const raw=String(req.headers?.cookie||'');
 const match=raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
 return match?decodeURIComponent(match[1]):'';
};

async function trackVisit(req,res,ctx){
 try{
  const referer=String(req.headers?.referer||'');
  let pathname='/';
  try{pathname=referer?new URL(referer).pathname:'/';}catch{}
  if(/^\/(dashboard(?:\.html)?|eva-ops-93k7m2|admin(?:\.html)?)/i.test(pathname))return;

  let visitorId=readCookie(req,'eva_vid');
  const cookies=[];
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(visitorId)){
   visitorId=randomUUID();
   cookies.push(`eva_vid=${encodeURIComponent(visitorId)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
  }
  const recentPing=readCookie(req,'eva_vping');
  if(!recentPing)cookies.push(`eva_vping=1; Path=/; Max-Age=1800; SameSite=Lax; Secure`);
  if(cookies.length)res.setHeader('Set-Cookie',cookies);

  const path=(referer||pathname||'/').slice(0,500);
  await serviceRequest(ctx,'site_visit_events',{
   method:'POST',
   headers:{Prefer:'return=minimal'},
   body:JSON.stringify({visitor_id:visitorId,path})
  });

  if(!recentPing){
   const ua=String(req.headers?.['user-agent']||'Unknown device').slice(0,180);
   await sendTelegramAlert(`👀 EVA AI MARKET — New Visit\n\nPage: ${pathname}\nVisitor: ${visitorId.slice(0,8)}…\nDevice: ${ua}\nTime: ${new Date().toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} (BD)\n\nhttps://eva-ai-market.vercel.app/`);
  }
 }catch(_error){
  // Analytics and alerts must never block the storefront.
 }
}

async function notifySignup(req,res){
 const email=String(req.body?.email||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Invalid email.'});
 const ctx=serviceContext();
 if(!ctx.url||!ctx.service)return json(res,503,{error:'Notification service unavailable.'});
 try{
  const response=await fetch(`${ctx.url}/auth/v1/admin/users?page=1&per_page=1000`,{
   headers:{apikey:ctx.service,authorization:`Bearer ${ctx.service}`}
  });
  const body=await response.json().catch(()=>({users:[]}));
  if(!response.ok)return json(res,502,{error:'Could not verify signup.'});
  const user=(body.users||[]).find(item=>String(item.email||'').toLowerCase()===email);
  if(!user)return json(res,404,{error:'Signup not found.'});
  const created=new Date(user.created_at||0).getTime();
  if(!created||Date.now()-created>10*60*1000)return json(res,409,{error:'Signup is not recent.'});
  const result=await sendTelegramAlert(`✅ EVA AI MARKET — New Signup\n\nEmail: ${email}\nTime: ${new Date(user.created_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} (BD)\n\nAdmin: https://eva-ai-market.vercel.app/eva-ops-93k7m2`);
  return json(res,200,{ok:true,telegram:result.sent});
 }catch(_error){
  return json(res,500,{error:'Could not send signup notification.'});
 }
}

async function submitDepositWithRefresh(req,res){
 const ctx=serviceContext();
 if(!ctx.url||!ctx.anon||!ctx.service)return json(res,503,{error:'Account service is not configured.'});
 const refreshToken=String(req.body?.refreshToken||'');
 const amount=Number(req.body?.amount);
 const network=String(req.body?.network||'');
 const transactionId=String(req.body?.transaction_id||'').trim();
 if(!refreshToken)return json(res,401,{error:'Please sign in again.'});
 if(amount<10||!['TRC20','BEP20','ERC20'].includes(network)||!validTx(network,transactionId))return json(res,400,{error:'Enter at least 10 USDT and a valid completed payment transaction ID.'});
 const tokenResponse=await fetch(`${ctx.url}/auth/v1/token?grant_type=refresh_token`,{
  method:'POST',
  headers:{apikey:ctx.anon,'content-type':'application/json'},
  body:JSON.stringify({refresh_token:refreshToken})
 });
 const tokenBody=await tokenResponse.json().catch(()=>({}));
 if(!tokenResponse.ok||!tokenBody?.user?.id)return json(res,401,{error:'Your secure session expired. Please sign in again.'});
 const insertResponse=await serviceRequest(ctx,'deposits',{
  method:'POST',
  headers:{Prefer:'return=minimal'},
  body:JSON.stringify({user_id:tokenBody.user.id,amount_usdt:amount,network,transaction_id:transactionId})
 });
 const insertBody=await insertResponse.json().catch(()=>({}));
 if(!insertResponse.ok){
  if(insertBody?.code==='23505'){
   const existingResponse=await serviceRequest(ctx,`deposits?select=id,user_id,status,amount_usdt,network&transaction_id=eq.${encodeURIComponent(transactionId)}&limit=1`);
   const existingBody=await existingResponse.json().catch(()=>[]);
   const existing=Array.isArray(existingBody)?existingBody[0]:null;
   if(existingResponse.ok&&existing?.user_id===tokenBody.user.id){
    return json(res,200,{
     submitted:true,
     already_submitted:true,
     status:existing.status,
     amount:existing.amount_usdt,
     access_token:tokenBody.access_token,
     refresh_token:tokenBody.refresh_token
    });
   }
   return json(res,409,{error:'This transaction ID was already used by another account. Contact support with the TxID.'});
  }
  return json(res,400,{error:insertBody?.message||'Deposit submission failed.'});
 }

 const email=String(tokenBody.user?.email||'Unknown customer');
 const txShort=transactionId.length>22?`${transactionId.slice(0,12)}…${transactionId.slice(-8)}`:transactionId;
 const telegram=await sendTelegramAlert(`💰 EVA AI MARKET — New Deposit Submitted\n\nCustomer: ${email}\nAmount: ${amount.toFixed(2)} USDT\nNetwork: ${network}\nTxID: ${txShort}\nStatus: Pending verification\nTime: ${new Date().toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} (BD)\n\nAdmin: https://eva-ai-market.vercel.app/eva-ops-93k7m2`);

 return json(res,200,{
  submitted:true,
  already_submitted:false,
  telegram:telegram.sent,
  access_token:tokenBody.access_token,
  refresh_token:tokenBody.refresh_token
 });
}

export default async function handler(req,res){
 if(req.method==='POST'&&req.body?.action==='notify_signup')return notifySignup(req,res);
 if(req.method==='POST'&&req.body?.action==='submit_deposit')return submitDepositWithRefresh(req,res);
 if(req.method==='GET'&&req.query?.view!=='orders'){
  const ctx=serviceContext();
  if(!ctx.url||!ctx.service)return json(res,503,{error:'Store is not configured.'});
  const response=await serviceRequest(ctx,'store_products?select=id,category,name,subtitle,price_usd,stock,warranty_days,access_label,sort_order,official_price_label,purchase_mode,card_tone&active=eq.true&order=sort_order.asc');
  const products=await response.json().catch(()=>[]);
  if(!response.ok)return json(res,502,{error:products?.message||'Could not load products.'});
  await trackVisit(req,res,ctx);
  return json(res,200,{products});
 }
 const ctx=await requireUser(req,res);if(!ctx)return;
 if(req.method==='GET'&&req.query?.view==='orders'){
  const path='store_orders?select=id,product_name,price_usd,status,warranty_days,delivery_details,admin_note,created_at,delivered_at&user_id=eq.'+encodeURIComponent(ctx.user.id)+'&order=created_at.desc';
  const response=await serviceRequest(ctx,path);const orders=await response.json().catch(()=>[]);
  if(!response.ok)return json(res,502,{error:orders?.message||'Could not load orders.'});
  return json(res,200,{orders});
 }
 if(req.method==='POST'){
  const productId=String(req.body?.productId||'').trim();
  if(!/^[a-z0-9-]{2,60}$/.test(productId))return json(res,400,{error:'Invalid product.'});
  const response=await serviceRequest(ctx,'rpc/purchase_store_product',{method:'POST',body:JSON.stringify({p_user_id:ctx.user.id,p_product_id:productId})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)return json(res,400,{error:result.message||'Purchase failed.'});
  const orderId=String(result?.order_id||'');
  let status='approved';
  if(/^[0-9a-f-]{36}$/i.test(orderId)){
   const processingResponse=await serviceRequest(ctx,'rpc/admin_update_store_order',{method:'POST',body:JSON.stringify({p_order_id:orderId,p_status:'processing',p_delivery_details:null,p_admin_note:'Balance deducted. Awaiting manual admin delivery.'})});
   if(processingResponse.ok)status='processing';
  }
  let order={};
  if(/^[0-9a-f-]{36}$/i.test(orderId)){
   const orderResponse=await serviceRequest(ctx,`store_orders?select=product_name,price_usd,status&id=eq.${encodeURIComponent(orderId)}&limit=1`);
   const orderBody=await orderResponse.json().catch(()=>[]);
   if(orderResponse.ok&&Array.isArray(orderBody)&&orderBody[0])order=orderBody[0];
  }
  const productName=String(order?.product_name||result?.product_name||productId);
  const price=Number(order?.price_usd??result?.price_usd??0);
  const telegram=await sendTelegramAlert(`🛒 EVA AI MARKET — New Order\n\nCustomer: ${ctx.user.email||ctx.user.id}\nProduct: ${productName}\nPrice: $${price.toFixed(2)}\nStatus: ${status}\nOrder: ${orderId||'Created'}\nTime: ${new Date().toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} (BD)\n\nAdmin: https://eva-ai-market.vercel.app/eva-ops-93k7m2`);
  return json(res,200,{purchased:true,status,result,telegram:telegram.sent});
 }
 return json(res,405,{error:'Method not allowed.'});
}
