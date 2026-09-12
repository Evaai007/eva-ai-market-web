import { sendTelegramAlert } from './_telegram.js';

const serviceContext=()=>({
  url:process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,
  service:process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY
});

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  const type=String(req.body?.type||'');
  if(type!=='signup')return res.status(400).json({error:'Invalid notification type.'});
  const email=String(req.body?.email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Invalid email.'});

  const ctx=serviceContext();
  if(!ctx.url||!ctx.service)return res.status(503).json({error:'Notification service unavailable.'});

  try{
    const response=await fetch(`${ctx.url}/auth/v1/admin/users?page=1&per_page=1000`,{
      headers:{apikey:ctx.service,authorization:`Bearer ${ctx.service}`}
    });
    const body=await response.json().catch(()=>({users:[]}));
    if(!response.ok)return res.status(502).json({error:'Could not verify signup.'});
    const user=(body.users||[]).find(item=>String(item.email||'').toLowerCase()===email);
    if(!user)return res.status(404).json({error:'Signup not found.'});
    const created=new Date(user.created_at||0).getTime();
    if(!created||Date.now()-created>10*60*1000)return res.status(409).json({error:'Signup is not recent.'});

    const result=await sendTelegramAlert(`✅ EVA AI MARKET — New Signup\n\nEmail: ${email}\nTime: ${new Date(user.created_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} (BD)\n\nAdmin: https://eva-ai-market.vercel.app/eva-ops-93k7m2`);
    return res.status(200).json({ok:true,telegram:result.sent});
  }catch(_error){
    return res.status(500).json({error:'Could not send signup notification.'});
  }
}
