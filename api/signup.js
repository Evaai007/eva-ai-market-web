function json(res,status,body){
  res.setHeader('Cache-Control','no-store');
  return res.status(status).json(body);
}

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed.'});

  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!service) return json(res,503,{error:'Account service is not configured.'});

  const email=String(req.body?.email||'').trim().toLowerCase();
  const password=String(req.body?.password||'');

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res,400,{error:'Enter a valid email address.'});
  if(password.length<8||password.length>128) return json(res,400,{error:'Password must be 8 to 128 characters.'});

  try{
    const response=await fetch(`${url}/auth/v1/admin/users`,{
      method:'POST',
      headers:{
        apikey:service,
        authorization:`Bearer ${service}`,
        'content-type':'application/json'
      },
      body:JSON.stringify({
        email,
        password,
        email_confirm:true,
        user_metadata:{signup_source:'eva_direct'}
      })
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok){
      const raw=String(result?.msg||result?.message||result?.error_description||'Account creation failed.');
      const duplicate=/already|registered|exists/i.test(raw);
      return json(res,duplicate?409:400,{error:duplicate?'An account with this email already exists. Sign in instead.':raw});
    }
    return json(res,200,{created:true});
  }catch(_error){
    return json(res,500,{error:'Could not create the account right now. Please try again.'});
  }
}
