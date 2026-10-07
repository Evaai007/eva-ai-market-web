import { randomUUID, createHash } from 'crypto';
import { json, requireUser, serviceRequest } from './_supabase.js';

const VERIFIED_TELEGRAM_CHAT_ID='5461634710';
const PUBLIC_SITE_URL='https://aicloudmarket.shop/';
const ADMIN_URL='https://aicloudmarket.shop/eva-ops-93k7m2';

const notifyCustomer=async(ctx,{userId,type,title,message,referenceId})=>{
 try{
  if(!userId||!referenceId)return;
  await serviceRequest(ctx,'customer_notifications',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:userId,type,title,message:String(message||'').slice(0,500),reference_id:referenceId})});
 }catch(error){console.error('Customer notification failed:',error?.message||error);}
};

const serviceContext=()=>({
 url:process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,
 anon:process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||process.env.anon_public,
 service:process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY
});

const cleanPublicPriceLabel=value=>{
 const label=String(value||'').trim();
 if(!label)return null;
 return label
  .replace(/\s*\+\s*5%\s*EVA\s*fee\s*/gi,' ')
  .replace(/\s+·\s+/g,' · ')
  .replace(/\s{2,}/g,' ')
  .trim()
  .replace(/^·\s*|\s*·$/g,'')
  .trim()||null;
};

const sanitizeStoreProduct=product=>({
 id:product?.id,
 category:product?.category,
 name:product?.name,
 subtitle:product?.subtitle,
 price_usd:product?.price_usd,
 unlimited_stock:product?.unlimited_stock,
 warranty_days:product?.warranty_days,
 access_label:product?.access_label,
 official_price_label:cleanPublicPriceLabel(product?.official_price_label),
 purchase_mode:product?.purchase_mode,
 card_tone:product?.card_tone,
 logo_url:product?.logo_url,
 brand_domain:product?.brand_domain
});

async function sendTelegramAlert(text){
 const token=process.env.TELEGRAM_BOT_TOKEN;
 const chatId=VERIFIED_TELEGRAM_CHAT_ID;
 if(!token)return {sent:false,reason:'bot_token_not_configured'};
 try{
  const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
   method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({chat_id:chatId,text:String(text||'').slice(0,3900),disable_web_page_preview:true})
  });
  const body=await response.json().catch(()=>({}));
  const result=response.ok&&body?.ok?{sent:true}:{sent:false,reason:body?.description||'telegram_error'};
  if(!result.sent)console.error('Telegram alert failed:',result.reason);
  return result;
 }catch(error){
  console.error('Telegram alert network error:',error?.message||error);
  return {sent:false,reason:'network_error'};
 }
}

const validTx=(network,value)=>{
 const own=new Set(['0x644ed89caecc120d3a3180e9f20a90d970cfa3e8','tjcfs6hdksenquguvw43krk141qlvhngbg']);
 const tx=String(value||'').trim();
 if(own.has(tx.toLowerCase()))return false;
 return network==='BEP20'||network==='ERC20'?/^0x[a-fA-F0-9]{64}$/.test(tx):/^[a-fA-F0-9]{64}$/.test(tx);
};

const readCookie=(req,name)=>{
 const raw=String(req.headers?.cookie||'');
 const match=raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
 return match?decodeURIComponent(match[1]):'';
};

const visitorGeo=req=>{
 const headers=req.headers||{};
 const countryCode=String(headers['x-vercel-ip-country']||'').trim().toUpperCase();
 const rawRegion=decodeURIComponent(String(headers['x-vercel-ip-country-region']||'').trim());
 const region=/^(?:0+|unknown|null|undefined|-)$/i.test(rawRegion)?'':rawRegion;
 const city=decodeURIComponent(String(headers['x-vercel-ip-city']||'').trim());
 const timeZone=decodeURIComponent(String(headers['x-vercel-ip-timezone']||'').trim())||'UTC';
 let country=countryCode||'Unknown';
 try{
  if(countryCode&&typeof Intl.DisplayNames==='function')country=new Intl.DisplayNames(['en'],{type:'region'}).of(countryCode)||countryCode;
 }catch{}
 const flag=/^[A-Z]{2}$/.test(countryCode)?String.fromCodePoint(...[...countryCode].map(char=>127397+char.charCodeAt(0))):'🌐';
 return {countryCode,country,region,city,timeZone,flag};
};

const formatVisitorTime=timeZone=>{
 try{return new Date().toLocaleString('en-GB',{timeZone:timeZone||'UTC'});}
 catch{return new Date().toLocaleString('en-GB',{timeZone:'UTC'});}
};

const requestIp=req=>{
 const forwarded=String(req.headers?.['x-forwarded-for']||'').split(',')[0].trim();
 return forwarded||String(req.headers?.['x-real-ip']||req.socket?.remoteAddress||'').trim();
};

const hashedVisitorFingerprint=req=>{
 const ip=requestIp(req);
 const ua=String(req.headers?.['user-agent']||'');
 const lang=String(req.headers?.['accept-language']||'');
 const seed=`${ip}|${ua}|${lang}`;
 return createHash('sha256').update(seed).digest('hex').slice(0,16);
};

const classifyVisitor=req=>{
 const headers=req.headers||{};
 const ua=String(headers['user-agent']||'');
 const lower=ua.toLowerCase();
 const accept=String(headers.accept||'');
 const fetchMode=String(headers['sec-fetch-mode']||'').toLowerCase();
 const fetchSite=String(headers['sec-fetch-site']||'').toLowerCase();
 const knownBot=/(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|twitterbot|linkedinbot|headlesschrome|lighthouse|pagespeed|vercel-screenshot|uptimerobot|pingdom|curl|wget|python-requests|go-http-client|axios|postmanruntime|insomnia)/i.test(ua);
 const browser=/(safari|chrome|crios|firefox|fxios|edg|opr|opera)/i.test(ua);
 const mobile=/(iphone|ipad|android|mobile)/i.test(ua);
 const browserHeaders=/text\/html/i.test(accept)||fetchMode==='navigate'||['same-origin','same-site','none'].includes(fetchSite);
 const malformedUa=!ua||ua.length<12;
 const scriptedClient=!browser&&!mobile&&/(http|client|library|monitor|python|node|java|okhttp)/i.test(lower);
 let score=0;
 const reasons=[];
 if(knownBot)return {isBot:true,level:'bot',label:'Bot',score:-100,reasons:['known automation signature']};
 if(browser)score+=3;
 if(mobile)score+=1;
 if(browserHeaders)score+=2;
 if(malformedUa){score-=4;reasons.push('missing or malformed user-agent');}
 if(scriptedClient){score-=5;reasons.push('scripted client signature');}
 if(!browserHeaders){score-=1;reasons.push('limited browser navigation headers');}
 const suspicious=malformedUa||scriptedClient||(!browserHeaders&&!browser&&!mobile)||score<2;
 return {isBot:false,level:suspicious?'suspicious':'human',label:suspicious?'Suspicious':'Likely human',score,reasons};
};

const visitorClient=req=>{
 const ua=String(req.headers?.['user-agent']||'');
 let browser='Other';
 if(/edg\//i.test(ua))browser='Microsoft Edge';
 else if(/opr\//i.test(ua))browser='Opera';
 else if(/firefox\//i.test(ua))browser='Firefox';
 else if(/fxios\//i.test(ua))browser='Firefox iOS';
 else if(/crios\//i.test(ua))browser='Chrome iOS';
 else if(/chrome\//i.test(ua))browser='Chrome';
 else if(/safari\//i.test(ua))browser='Safari';

 let os='Other';
 if(/windows nt 10\.0/i.test(ua))os='Windows 10/11';
 else if(/windows/i.test(ua))os='Windows';
 else if(/iphone|ipad|ipod/i.test(ua))os='iOS/iPadOS';
 else if(/android/i.test(ua))os='Android';
 else if(/mac os x/i.test(ua))os='macOS';
 else if(/linux/i.test(ua))os='Linux';

 let device='Desktop';
 if(/ipad|tablet/i.test(ua))device='Tablet';
 else if(/iphone|android.+mobile|mobile/i.test(ua))device='Mobile';
 else if(/bot|crawler|spider|headless/i.test(ua))device='Automated client';

 return {browser,os,device};
};

const visitorReferrer=req=>{
 const raw=String(req.headers?.referer||'').trim();
 if(!raw)return 'Direct / Unknown';
 try{
  const url=new URL(raw);
  if(
   url.hostname==='aicloudmarket.shop'
   ||url.hostname.endsWith('.aicloudmarket.shop')
   ||url.hostname==='eva-ai-market.vercel.app'
   ||url.hostname.endsWith('.eva-ai-market.vercel.app')
  )return 'Internal';
  return url.hostname.replace(/^www\./,'');
 }catch{return 'Unknown';}
};

const visitorNetworkSignal=(geo,client,traffic)=>{
 if(traffic?.isBot)return 'Automated / bot network';
 const city=String(geo?.city||'').toLowerCase();
 const region=String(geo?.region||'').toLowerCase();
 const cloudHub=/(ashburn|boardman|dalles|prineville|Council Bluffs|singapore|frankfurt|dublin|amsterdam|london)/i.test(city)
  ||/(^|\b)(va|virginia)(\b|$)/i.test(region)&&/ashburn/i.test(city);
 const unusualClient=client?.os==='Other'||client?.browser==='Other'||client?.device==='Automated client';
 if(cloudHub&&unusualClient)return 'Possible cloud/datacenter (low confidence)';
 return 'Standard internet / unknown';
};

const visitorConfidence=(geo,client,traffic,network,referrer)=>{
 if(traffic?.level==='bot')return 'High (bot)';
 let score=Number(traffic?.score||0);
 if(client?.os&&client.os!=='Other')score+=1;
 if(client?.browser&&client.browser!=='Other')score+=1;
 if(client?.device&&client.device!=='Automated client')score+=1;
 if(geo?.city)score+=1;
 if(geo?.region)score+=1;
 if(referrer&&referrer!=='Unknown'&&referrer!=='Direct / Unknown')score+=1;
 if(/cloud\/datacenter/i.test(String(network||'')))score-=2;
 return score>=7?'High':score>=4?'Medium':'Low';
};

const visitorVerdict=(client,traffic,network,confidence)=>{
 if(traffic?.level==='bot')return {level:'Bot',emoji:'🔴',text:'Bot / automated traffic'};
 const cloudLike=/cloud\/datacenter/i.test(String(network||''));
 const unknownClient=client?.os==='Other'&&client?.browser==='Other';
 if(traffic?.level==='suspicious'||(cloudLike&&unknownClient)||confidence==='Low'){
  return {level:'Suspicious',emoji:'🟡',text:'Suspicious — verify before treating as a real customer'};
 }
 return {level:'Real Human',emoji:'🟢',text:cloudLike?'Probably real human; location/network may be masked or approximate':'Probably real human; location may be approximate'};
};

async function trackVisit(req,res,ctx){
 try{
  const referer=String(req.headers?.referer||'');
  let pathname='/';
  try{pathname=referer?new URL(referer).pathname:'/';}catch{}
  if(/^\/(dashboard(?:\.html)?|eva-ops-93k7m2|admin(?:\.html)?)/i.test(pathname))return;

  const existingVisitorId=readCookie(req,'eva_vid');
  let visitorId=existingVisitorId;
  const isReturning=/^[a-zA-Z0-9-]{16,80}$/.test(existingVisitorId);
  const cookies=[];
  if(!isReturning){
   visitorId=`${hashedVisitorFingerprint(req)}-${randomUUID().slice(0,8)}`;
   cookies.push(`eva_vid=${encodeURIComponent(visitorId)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
  }
  const recentPing=readCookie(req,'eva_vping');
  if(!recentPing)cookies.push(`eva_vping=1; Path=/; Max-Age=1800; SameSite=Lax; Secure`);
  if(cookies.length)res.setHeader('Set-Cookie',cookies);

  const path=(referer||pathname||'/').slice(0,500);
  const geo=visitorGeo(req);
  await serviceRequest(ctx,'site_visit_events',{
   method:'POST',headers:{Prefer:'return=minimal'},
   body:JSON.stringify({
    visitor_id:visitorId,
    path,
    country_code:geo.countryCode||null,
    country:geo.country&&geo.country!=='Unknown'?geo.country:null
   })
  });

  if(!recentPing){
   const geo=visitorGeo(req);
   const locationParts=[geo.city,geo.region,geo.country].filter(Boolean);
   const location=locationParts.length>1
    ?locationParts.join(', ')
    :geo.country&&geo.country!=='Unknown'
      ?`City/region unavailable, ${geo.country}`
      :'Location unavailable';
   const zoneLabel=geo.timeZone==='UTC'?'UTC':geo.timeZone;
   const traffic=classifyVisitor(req);
   const client=visitorClient(req);
   const visitorType=isReturning?'Returning visitor':'New visitor';
   const fingerprint=hashedVisitorFingerprint(req);
   const referrer=visitorReferrer(req);
   const network=visitorNetworkSignal(geo,client,traffic);
   const confidence=visitorConfidence(geo,client,traffic,network,referrer);
   const verdict=visitorVerdict(client,traffic,network,confidence);
   const trafficIcon=verdict.level==='Bot'?'🤖':verdict.level==='Suspicious'?'⚠️':'👤';
   await sendTelegramAlert(`👀 EVA AI MARKET — New Visit\n\nPage: ${pathname}\nVisitor: ${visitorId.slice(0,12)}…\nVisitor Type: ${visitorType}\nTraffic: ${traffic.label} ${trafficIcon}\nConfidence: ${confidence}\nVerdict: ${verdict.emoji} ${verdict.text}\nNetwork: ${network}\nFingerprint: ${fingerprint}\nCountry: ${geo.flag} ${geo.country}${geo.countryCode?` (${geo.countryCode})`:''}\nLocation: ${location}\nDevice Type: ${client.device}\nOS: ${client.os}\nBrowser: ${client.browser}\nReferrer: ${referrer}\nTime: ${formatVisitorTime(geo.timeZone)} (${zoneLabel})\n\n${PUBLIC_SITE_URL}`);
  }
 }catch(error){console.error('Visit tracking/notification failed:',error?.message||error);}
}

async function notifySignup(req,res){
 const email=String(req.body?.email||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Invalid email.'});
 const ctx=serviceContext();
 if(!ctx.url||!ctx.service)return json(res,503,{error:'Notification service unavailable.'});
 try{
  const response=await fetch(`${ctx.url}/auth/v1/admin/users?page=1&per_page=1000`,{headers:{apikey:ctx.service,authorization:`Bearer ${ctx.service}`}});
  const body=await response.json().catch(()=>({users:[]}));
  if(!response.ok)return json(res,502,{error:'Could not verify signup.'});
  const user=(body.users||[]).find(item=>String(item.email||'').toLowerCase()===email);
  if(!user)return json(res,404,{error:'Signup not found.'});
  const created=new Date(user.created_at||0).getTime();
  if(!created||Date.now()-created>10*60*1000)return json(res,409,{error:'Signup is not recent.'});
  const result=await sendTelegramAlert(`✅ EVA AI MARKET — New Signup\n\nEmail: ${email}\nTime: ${new Date(user.created_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} (BD)\n\nAdmin: ${ADMIN_URL}`);
  return json(res,200,{ok:true,telegram:result.sent,telegramError:result.sent?null:result.reason});
 }catch(error){console.error('Signup notification failed:',error?.message||error);return json(res,500,{error:'Could not send signup notification.'});}
}

async function submitDepositWithRefresh(req,res){
 const ctx=serviceContext();
 if(!ctx.url||!ctx.anon||!ctx.service)return json(res,503,{error:'Account service is not configured.'});
 const refreshToken=String(req.body?.refreshToken||'');
 const amount=Number(req.body?.amount);
 const network=String(req.body?.network||'');
 const transactionId=String(req.body?.transaction_id||'').trim();
 if(!refreshToken)return json(res,401,{error:'Please sign in again.'});
 if(amount<10||!['TRC20','BEP20','ERC20'].includes(network)||!validTx(network,transactionId))return json(res,400,{error:'Enter at least 10 USDT and a valid completed payment transaction ID.'});
 const tokenResponse=await fetch(`${ctx.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:ctx.anon,'content-type':'application/json'},body:JSON.stringify({refresh_token:refreshToken})});
 const tokenBody=await tokenResponse.json().catch(()=>({}));
 if(!tokenResponse.ok||!tokenBody?.user?.id)return json(res,401,{error:'Your secure session expired. Please sign in again.'});
 const insertResponse=await serviceRequest(ctx,'deposits',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:tokenBody.user.id,amount_usdt:amount,network,transaction_id:transactionId})});
 const insertBody=await insertResponse.json().catch(()=>({}));
 if(!insertResponse.ok){
  if(insertBody?.code==='23505'){
   const existingResponse=await serviceRequest(ctx,`deposits?select=id,user_id,status,amount_usdt,network&transaction_id=eq.${encodeURIComponent(transactionId)}&limit=1`);
   const existingBody=await existingResponse.json().catch(()=>[]);
   const existing=Array.isArray(existingBody)?existingBody[0]:null;
   if(existingResponse.ok&&existing?.user_id===tokenBody.user.id)return json(res,200,{submitted:true,already_submitted:true,status:existing.status,amount:existing.amount_usdt,access_token:tokenBody.access_token,refresh_token:tokenBody.refresh_token});
   return json(res,409,{error:'This transaction ID was already used by another account. Contact support with the TxID.'});
  }
  return json(res,400,{error:insertBody?.message||'Deposit submission failed.'});
 }
 const depositId=Array.isArray(insertBody)?String(insertBody[0]?.id||''):String(insertBody?.id||'');
 if(depositId)await notifyCustomer(ctx,{userId:tokenBody.user.id,type:'deposit_submitted',title:'充值申请已提交',message:'你的 '+amount.toFixed(2)+' USDT 充值申请已提交，等待审核。',referenceId:depositId});
 const email=String(tokenBody.user?.email||'Unknown customer');
 const txShort=transactionId.length>22?`${transactionId.slice(0,12)}…${transactionId.slice(-8)}`:transactionId;
 const telegram=await sendTelegramAlert(`💰 EVA AI MARKET — New Deposit Submitted\n\nCustomer: ${email}\nAmount: ${amount.toFixed(2)} USDT\nNetwork: ${network}\nTxID: ${txShort}\nStatus: Pending verification\nTime: ${new Date().toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} (BD)\n\nAdmin: ${ADMIN_URL}`);
 return json(res,200,{submitted:true,already_submitted:false,telegram:telegram.sent,telegramError:telegram.sent?null:telegram.reason,access_token:tokenBody.access_token,refresh_token:tokenBody.refresh_token});
}

export default async function handler(req,res){
 if(req.method==='POST'&&req.body?.action==='notify_signup')return notifySignup(req,res);
 if(req.method==='POST'&&req.body?.action==='submit_deposit')return submitDepositWithRefresh(req,res);
 if(req.method==='GET'&&req.query?.view!=='orders'){
  const ctx=serviceContext();
  if(!ctx.url||!ctx.service)return json(res,503,{error:'Store is not configured.'});
  const response=await serviceRequest(ctx,'store_products?select=id,category,name,subtitle,price_usd,stock,unlimited_stock,warranty_days,access_label,sort_order,official_price_label,purchase_mode,card_tone,logo_url,brand_domain,logo_source&active=eq.true&order=sort_order.asc');
  const products=await response.json().catch(()=>[]);
  if(!response.ok)return json(res,502,{error:products?.message||'Could not load products.'});
  await trackVisit(req,res,ctx);
  const publicProducts=Array.isArray(products)?products.map(sanitizeStoreProduct):[];
  return json(res,200,{products:publicProducts});
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
  let order={};
  if(/^[0-9a-f-]{36}$/i.test(orderId)){
   const orderResponse=await serviceRequest(ctx,`store_orders?select=product_name,price_usd,status&id=eq.${encodeURIComponent(orderId)}&limit=1`);
   const orderBody=await orderResponse.json().catch(()=>[]);
   if(orderResponse.ok&&Array.isArray(orderBody)&&orderBody[0])order=orderBody[0];
  }
  await notifyCustomer(ctx,{userId:ctx.user.id,type:'order_created',title:'订单已创建',message:`你的订单 ${orderId||''} 已创建，正在等待处理。`,referenceId:orderId});
  const productName=String(order?.product_name||result?.product_name||productId);
  const price=Number(order?.price_usd??result?.price_usd??0);
  const telegram=await sendTelegramAlert(`🛒 EVA AI MARKET — New Order\n\nCustomer: ${ctx.user.email||ctx.user.id}\nProduct: ${productName}\nPrice: $${price.toFixed(2)}\nStatus: ${status}\nOrder: ${orderId||'Created'}\nTime: ${new Date().toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} (BD)\n\nAdmin: ${ADMIN_URL}`);
  return json(res,200,{purchased:true,status,result,telegram:telegram.sent,telegramError:telegram.sent?null:telegram.reason});
 }
 return json(res,405,{error:'Method not allowed.'});
}