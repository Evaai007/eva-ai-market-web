import { json, requireAdmin, serviceRequest } from '../../_supabase.js';

export default async function handler(req,res){
  const ctx=await requireAdmin(req,res); if(!ctx)return;
  if(req.method==='GET'){
    const tickets=await serviceRequest(ctx,'support_tickets?select=id,user_id,subject,category,priority,status,created_at,updated_at,closed_at&order=updated_at.desc&limit=200');
    const rows=await tickets.json().catch(()=>[]);
    if(!tickets.ok)return json(res,502,{error:rows?.message||'Could not load support tickets.'});
    const ids=rows.map(x=>x.id);
    const messages=ids.length?await serviceRequest(ctx,'support_messages?select=id,ticket_id,sender_user_id,sender_type,message,created_at&ticket_id=in.('+ids.join(',')+')&order=created_at.asc'):{ok:true,json:async()=>[]};
    const msgRows=await messages.json().catch(()=>[]);
    if(!messages.ok)return json(res,502,{error:msgRows?.message||'Could not load support messages.'});
    const users=await fetch(ctx.url+'/auth/v1/admin/users?page=1&per_page=1000',{headers:{apikey:ctx.service,authorization:'Bearer '+ctx.service}});
    const ub=await users.json().catch(()=>({users:[]}));
    const emailById=new Map((ub.users||[]).map(u=>[u.id,u.email||'']));
    return json(res,200,{tickets:rows.map(t=>({...t,customer_email:emailById.get(t.user_id)||''})),messages:msgRows});
  }
  if(req.method==='PATCH'){
    const ticketId=String(req.body?.ticketId||'').trim();
    const status=String(req.body?.status||'').trim();
    const priority=String(req.body?.priority||'').trim();
    const message=String(req.body?.message||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(ticketId))return json(res,400,{error:'Invalid ticket.'});
    if(status&&!['open','pending','resolved','closed'].includes(status))return json(res,400,{error:'Invalid status.'});
    if(priority&&!['low','normal','high'].includes(priority))return json(res,400,{error:'Invalid priority.'});
    const ticketResponse=await serviceRequest(ctx,'support_tickets?select=id,user_id,subject,status,priority&id=eq.'+encodeURIComponent(ticketId)+'&limit=1');
    const tb=await ticketResponse.json().catch(()=>[]);
    const ticket=Array.isArray(tb)?tb[0]:null;
    if(!ticket)return json(res,404,{error:'Ticket not found.'});
    if(message){
      if(message.length>4000)return json(res,400,{error:'Message is too long.'});
      const mr=await serviceRequest(ctx,'support_messages',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({ticket_id:ticketId,sender_user_id:ctx.user.id,sender_type:'admin',message})});
      const mb=await mr.json().catch(()=>[]);
      if(!mr.ok)return json(res,400,{error:mb?.message||'Unable to send reply.'});
      await serviceRequest(ctx,'support_tickets?id=eq.'+encodeURIComponent(ticketId),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({updated_at:new Date().toISOString(),status:status||'pending',priority:priority||ticket.priority})});
      await serviceRequest(ctx,'customer_notifications',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:ticket.user_id,type:'support_reply',title:'客服回复',message:message.slice(0,500),reference_id:ticketId})});
    }else if(status||priority){
      await serviceRequest(ctx,'support_tickets?id=eq.'+encodeURIComponent(ticketId),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({...(status?{status}:{}),...(priority?{priority}:{}),updated_at:new Date().toISOString(),...(status==='closed'||status==='resolved'?{closed_at:new Date().toISOString()}:(status==='open'||status==='pending'?{closed_at:null}:{}))})});
    }
    return json(res,200,{updated:true});
  }
  return json(res,405,{error:'Method not allowed.'});
}