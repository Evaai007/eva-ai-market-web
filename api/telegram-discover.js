const DISCOVERY_KEY='eva-tg-7Qm4N9x2';
const TEST_CHAT_ID='5461634710';

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(String(req.query?.key||'')!==DISCOVERY_KEY)return res.status(404).json({ok:false,error:'Not found'});
 const token=process.env.TELEGRAM_BOT_TOKEN;
 if(!token)return res.status(503).json({ok:false,error:'Telegram bot token is not configured'});
 try{
  const [meResponse,webhookResponse]=await Promise.all([
   fetch(`https://api.telegram.org/bot${token}/getMe`,{cache:'no-store'}),
   fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`,{cache:'no-store'})
  ]);
  const me=await meResponse.json().catch(()=>({}));
  const webhook=await webhookResponse.json().catch(()=>({}));
  if(!meResponse.ok||!me?.ok)return res.status(502).json({ok:false,error:me?.description||'Telegram getMe failed'});
  if(!webhookResponse.ok||!webhook?.ok)return res.status(502).json({ok:false,error:webhook?.description||'Telegram getWebhookInfo failed'});
  const info=webhook.result||{};

  let sendTest=null;
  if(String(req.query?.test||'')==='1'){
   const sendResponse=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({chat_id:TEST_CHAT_ID,text:'✅ EVA AI MARKET Telegram notification test\n\nIf you received this, the bot and Chat ID are working correctly.',disable_web_page_preview:true})
   });
   const sendBody=await sendResponse.json().catch(()=>({}));
   sendTest={ok:Boolean(sendResponse.ok&&sendBody?.ok),chat_id:TEST_CHAT_ID,error:sendBody?.description||null};
  }

  return res.status(200).json({
   ok:true,
   bot:{id:me.result?.id||null,username:me.result?.username||null,first_name:me.result?.first_name||null},
   webhook:{
    active:Boolean(info.url),
    url:info.url||null,
    pending_update_count:Number(info.pending_update_count||0),
    last_error_date:info.last_error_date||null,
    last_error_message:info.last_error_message||null,
    max_connections:info.max_connections||null,
    allowed_updates:info.allowed_updates||null,
    has_custom_certificate:Boolean(info.has_custom_certificate)
   },
   sendTest,
   note:'Webhook was inspected only. It was not deleted or changed.'
  });
 }catch(error){
  return res.status(500).json({ok:false,error:'Telegram webhook inspection failed'});
 }
}
