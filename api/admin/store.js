import { json, requireAdmin, serviceRequest } from '../_supabase.js';

const allowedStatuses = new Set(['approved','processing','delivered','cancelled','refunded']);

export default async function handler(req,res){
 const ctx=await requireAdmin(req,res);if(!ctx)return;
 if(req.method==='GET'){
  const [pr,or,wr,ur]=await Promise.all([
   serviceRequest(ctx,'store_products?select=*&order=sort_order.asc'),
   serviceRequest(ctx,'store_orders?select=*&order=created_at.desc&limit=100'),
   serviceRequest(ctx,'wallets?select=user_id,balance_usd'),
   fetch(`${ctx.url}/auth/v1/admin/users?page=1&per_page=1000`,{
    headers:{apikey:ctx.service,authorization:`Bearer ${ctx.service}`}
   })
  ]);
  const [products,orders,wallets,userResult]=await Promise.all([
   pr.json().catch(()=>[]),
   or.json().catch(()=>[]),
   wr.json().catch(()=>[]),
   ur.json().catch(()=>({users:[]}))
  ]);
  if(!pr.ok||!or.ok||!wr.ok)return json(res,502,{error:products?.message||orders?.message||wallets?.message||'Could not load store.'});
  const emailByUserId=new Map((userResult.users||[]).map(user=>[user.id,user.email||'']));
  const balanceByUserId=new Map(wallets.map(wallet=>[wallet.user_id,Number(wallet.balance_usd)]));
  const ordersWithCustomers=orders.map(order=>({
   ...order,
   customer_email:emailByUserId.get(order.user_id)||'',
   customer_balance:balanceByUserId.get(order.user_id)
  }));
  return json(res,200,{products,orders:ordersWithCustomers});
 }
 if(req.method==='POST'){
  const action=String(req.body?.action||'');
  if(action==='stock'){
   const productId=String(req.body?.productId||''),stock=Number(req.body?.stock);
   if(!/^[a-z0-9-]{2,60}$/.test(productId)||!Number.isInteger(stock)||stock<0||stock>10000){
    return json(res,400,{error:'Invalid stock update.'});
   }
   const response=await serviceRequest(ctx,'rpc/admin_set_product_stock',{
    method:'POST',
    body:JSON.stringify({p_product_id:productId,p_stock:stock})
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok)return json(res,400,{error:result.message||'Stock update failed.'});
   return json(res,200,{updated:true,result});
  }
  if(action==='order'){
   const orderId=String(req.body?.orderId||''),status=String(req.body?.status||'');
   const deliveryDetails=String(req.body?.deliveryDetails||'').trim().slice(0,4000);
   const adminNote=String(req.body?.adminNote||'').trim().slice(0,1000);
   if(!/^[0-9a-f-]{36}$/i.test(orderId))return json(res,400,{error:'Invalid order.'});
   if(!allowedStatuses.has(status))return json(res,400,{error:'Invalid order status.'});
   if(status==='delivered'&&!deliveryDetails)return json(res,400,{error:'Delivery details are required before marking Delivered.'});
   const response=await serviceRequest(ctx,'rpc/admin_update_store_order',{
    method:'POST',
    body:JSON.stringify({
     p_order_id:orderId,
     p_status:status,
     p_delivery_details:deliveryDetails||null,
     p_admin_note:adminNote||null
    })
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok)return json(res,400,{error:result.message||'Order update failed.'});
   return json(res,200,{updated:true,result});
  }
  return json(res,400,{error:'Invalid store action.'});
 }
 return json(res,405,{error:'Method not allowed.'});
}
