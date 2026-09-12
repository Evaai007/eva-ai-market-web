import { json, requireAdmin, serviceRequest } from '../_supabase.js';

export default async function handler(req,res){
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed.'});
  const ctx=await requireAdmin(req,res); if(!ctx) return;

  try{
    const [usersResponse,depositsResponse,visitsResponse] = await Promise.all([
      fetch(`${ctx.url}/auth/v1/admin/users?page=1&per_page=1000`,{
        headers:{apikey:ctx.service,authorization:`Bearer ${ctx.service}`}
      }),
      serviceRequest(ctx,'rpc/admin_list_deposits',{method:'POST',body:'{}'}),
      serviceRequest(ctx,'rpc/admin_site_visit_stats',{method:'POST',body:'{}'})
    ]);

    const usersBody=await usersResponse.json().catch(()=>({users:[]}));
    const depositsBody=await depositsResponse.json().catch(()=>[]);
    const visitsBody=await visitsResponse.json().catch(()=>[]);

    if(!usersResponse.ok) return json(res,502,{error:'Could not load customer signups.'});
    if(!depositsResponse.ok) return json(res,502,{error:'Could not load deposit statistics.'});

    const users=Array.isArray(usersBody?.users)?usersBody.users:[];
    const totalUsers=Number(usersBody?.total ?? users.length);
    const recentUsers=[...users]
      .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))
      .slice(0,10)
      .map(user=>({id:user.id,email:user.email||'',created_at:user.created_at||null,last_sign_in_at:user.last_sign_in_at||null}));

    let deposits=[];
    if(Array.isArray(depositsBody)) deposits=depositsBody;
    else if(Array.isArray(depositsBody?.admin_list_deposits)) deposits=depositsBody.admin_list_deposits;
    else if(Array.isArray(depositsBody?.data)) deposits=depositsBody.data;

    const pendingDeposits=deposits.filter(d=>d.status==='pending').length;
    const approvedDeposits=deposits.filter(d=>d.status==='approved').length;
    const approvedAmount=deposits
      .filter(d=>d.status==='approved')
      .reduce((sum,d)=>sum+Number(d.amount_usdt||0),0);

    const visitRow=Array.isArray(visitsBody)?visitsBody[0]:visitsBody;
    const visits={
      total:Number(visitRow?.total_visits||0),
      unique:Number(visitRow?.unique_visitors||0),
      today:Number(visitRow?.visits_today||0)
    };

    return json(res,200,{
      signups:{total:totalUsers,recent:recentUsers},
      deposits:{total:deposits.length,pending:pendingDeposits,approved:approvedDeposits,approvedAmount},
      visits
    });
  }catch(error){
    return json(res,500,{error:'Could not load admin statistics.'});
  }
}
