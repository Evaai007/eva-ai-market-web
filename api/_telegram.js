export async function sendTelegramAlert(text){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  const chatId=process.env.TELEGRAM_CHAT_ID;
  if(!token||!chatId)return {sent:false,reason:'not_configured'};
  try{
    const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        chat_id:chatId,
        text:String(text||'').slice(0,3900),
        disable_web_page_preview:true
      })
    });
    const body=await response.json().catch(()=>({}));
    return response.ok&&body?.ok?{sent:true}:{sent:false,reason:body?.description||'telegram_error'};
  }catch(_error){
    return {sent:false,reason:'network_error'};
  }
}
