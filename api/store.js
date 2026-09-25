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
  const telegram=await sendTelegramAlert(`🛒 EVA AI MARKET — New Order\n\nCustomer: ${ctx.user.email||ctx.user.id}\nProduct: ${productName}\nPrice: $${price.toFixed(2)}\nStatus: ${status}\nOrder: ${orderId||'Created'}\nTime: ${new Date().toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} (BD)\n\nAdmin: ${ADMIN_URL}`);
  return json(res,200,{purchased:true,status,result,telegram:telegram.sent,telegramError:telegram.sent?null:telegram.reason});
 }
 return json(res,405,{error:'Method not allowed.'});
}