import { json, requireUser, serviceRequest } from './_supabase.js';

const serviceContext=()=>({
 url:process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,
 anon:process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY,
 service:process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY
});

const validTx=(network,value)=>{
 const own=new Set(['0x644ed89caecc120d3a3180e9f20a90d970cfa3e8','tjcfs6hdksenquguvw43krk141qlvhngbg']);
 const tx=String(value||'').trim();
 if(own.has(tx.toLowerCase()))return false;
 return network==='BEP20'||network==='ERC20'?/^0x[a-fA-F0-9]{64}$/.test(tx):/^[a-fA-F0-9]{64}$/.test(tx);
};

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
 return json(res,200,{
  submitted:true,
  already_submitted:false,
  access_token:tokenBody.access_token,
  refresh_token:tokenBody.refresh_token
 });
}

export default async function handler(req,res){
 if(req.method==='POST'&&req.body?.action==='submit_deposit')return submitDepositWithRefresh(req,res);
 if(req.method==='GET'&&req.query?.view!=='orders'){
  const ctx=serviceContext();
  if(!ctx.url||!ctx.service)return json(res,503,{error:'Store is not configured.'});
  const response=await serviceRequest(ctx,'store_products?select=id,category,name,subtitle,price_usd,stock,warranty_days,access_label&active=eq.true&order=sort_order.asc');
  const products=await response.json().catch(()=>[]);
  if(!response.ok)return json(res,502,{error:products?.message||'Could not load products.'});
  const restockValues=[5,10,1];
  const soldOut=Array.isArray(products)?products.filter(product=>Number(product.stock)===0):[];
  if(soldOut.length){
   await Promise.all(soldOut.map(async(product,index)=>{
    const stock=restockValues[index%restockValues.length];
    const update=await serviceRequest(ctx,`store_products?id=eq.${encodeURIComponent(product.id)}&stock=eq.0`,{
     method:'PATCH',
     headers:{Prefer:'return=minimal'},
     body:JSON.stringify({stock})
    });
    if(update.ok)product.stock=stock;
   }));
  }
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
  return json(res,200,{purchased:true,status,result});
 }
 return json(res,405,{error:'Method not allowed.'});
}