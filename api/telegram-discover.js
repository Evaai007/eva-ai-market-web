const DISCOVERY_KEY='eva-tg-7Qm4N9x2';

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(String(req.query?.key||'')!==DISCOVERY_KEY)return res.status(404).json({ok:false,error:'Not found'});
 const token=process.env.TELEGRAM_BOT_TOKEN;
 if(!token)return res.status(503).json({ok:false,error:'Telegram bot token is not configured'});
 try{
  const response=await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100&timeout=0`,{cache:'no-store'});
  const body=await response.json().catch(()=>({}));
  if(!response.ok||!body?.ok)return res.status(502).json({ok:false,error:body?.description||'Telegram getUpdates failed'});
  const updates=Array.isArray(body.result)?body.result:[];
  const chats=[];
  for(const update of updates){
   const message=update.message||update.edited_message||update.channel_post||update.callback_query?.message;
   const chat=message?.chat;
   const from=message?.from||update.callback_query?.from;
   if(!chat)continue;
   chats.push({id:chat.id,type:chat.type,username:chat.username||from?.username||null,first_name:chat.first_name||from?.first_name||null,last_name:chat.last_name||from?.last_name||null,date:message?.date||null});
  }
  const target=[...chats].reverse().find(item=>String(item.username||'').toLowerCase()==='eva007_8');
  return res.status(200).json({ok:true,found:Boolean(target),target:target||null,updateCount:updates.length});
 }catch(error){
  return res.status(500).json({ok:false,error:'Telegram discovery failed'});
 }
}
