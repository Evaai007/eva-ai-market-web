let resetClient;
const statusEl=document.getElementById('auth-status');
const button=document.getElementById('updateBtn');
const show=(m,e=false)=>{statusEl.textContent=m;statusEl.className=e?'auth-status error':'auth-status success'};

async function init(){
  try{
    const r=await fetch('/api/config',{cache:'no-store'});
    const c=await r.json();
    if(!r.ok)throw new Error(c.error||'Configuration unavailable');
    resetClient=window.supabase.createClient(c.url,c.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    resetClient.auth.onAuthStateChange(event=>{
      if(event==='PASSWORD_RECOVERY')show('Recovery link verified. Enter your new password.');
    });
  }catch(e){show(e.message||'Account service unavailable.',true)}
}

document.getElementById('reset-password-form').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!resetClient)return show('Account service is still loading. Please try again.',true);
  const p=document.getElementById('new-password').value;
  const c=document.getElementById('confirm-password').value;
  if(p.length<8)return show('Password must be at least 8 characters.',true);
  if(p!==c)return show('Passwords do not match.',true);
  button.disabled=true;button.textContent='正在更新…';
  show('Updating password…');
  try{
    const {error}=await resetClient.auth.updateUser({password:p});
    if(error)throw error;
    show('Password updated. Redirecting to sign in…');
    setTimeout(()=>location.replace('/login.html'),1200);
  }catch(err){show(err.message||'Could not update password.',true)}
  finally{setTimeout(()=>{button.disabled=false;button.textContent='更新密码'},1300)}
});

document.querySelectorAll('[data-toggle-password]').forEach(b=>b.addEventListener('click',()=>{
  const i=document.getElementById(b.dataset.togglePassword),showing=i.type==='text';
  i.type=showing?'password':'text';
  b.textContent=showing?'Show':'Hide';
}));

init();