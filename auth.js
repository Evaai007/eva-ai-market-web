let evaClient;
let directSignupUrl='';
const statusEl = document.getElementById('auth-status');
const showStatus = (message, error = false) => {
  statusEl.textContent = message;
  statusEl.className = error ? 'auth-status error' : 'auth-status success';
};

function showAuthForm(id){
  document.querySelectorAll('.auth-form').forEach(form=>{form.hidden=form.id!==id;});
}

function setActiveTab(name){
  document.querySelectorAll('[data-auth-tab]').forEach(item=>{
    const active=item.dataset.authTab===name;
    item.classList.toggle('active',active);
    item.setAttribute('aria-selected',String(active));
  });
}

async function init() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    if (!response.ok) throw new Error(config.error || 'Configuration unavailable');
    evaClient = window.supabase.createClient(config.url, config.anonKey);
    directSignupUrl=String(config.signupUrl||`${String(config.url).replace(/\/$/,'')}/functions/v1/direct-signup`);
    const { data } = await evaClient.auth.getSession();
    if (data.session) location.replace('/dashboard.html');
  } catch (error) {
    showStatus(error.message, true);
  }
}

async function sendSignupNotification(email){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5000);
  try{
    const response=await fetch('/api/store',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({action:'notify_signup',email}),
      signal:controller.signal,
      keepalive:true
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.telegram===false){
      console.warn('Signup Telegram notification was not confirmed.',body);
      return false;
    }
    return true;
  }catch(error){
    console.warn('Signup Telegram notification request failed.',error?.message||error);
    return false;
  }finally{
    clearTimeout(timer);
  }
}

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!evaClient) return;
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  showStatus('Signing in securely…');
  const { error } = await evaClient.auth.signInWithPassword({ email, password });
  if (error) return showStatus(error.message, true);
  const target=sessionStorage.getItem('eva-return-to');
  if(target){sessionStorage.removeItem('eva-return-to');location.replace(target);return;}
  location.replace('/dashboard.html');
});

document.getElementById('signup-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!evaClient||!directSignupUrl) return showStatus('Signup service is not ready. Please refresh and try again.',true);
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  if (password.length < 8) return showStatus('Password must be at least 8 characters.', true);

  const button=event.currentTarget.querySelector('button[type="submit"]');
  button.disabled=true;
  showStatus('Creating your account…');

  try{
    const response=await fetch(directSignupUrl,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({email,password})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(result.error||'Account creation failed.');

    showStatus('Account created. Signing you in…');
    const { error }=await evaClient.auth.signInWithPassword({email,password});
    if(error) throw error;

    showStatus('Account created. Finalizing…');
    await sendSignupNotification(email);
    const target=sessionStorage.getItem('eva-return-to');
    if(target){sessionStorage.removeItem('eva-return-to');location.replace(target);return;}
    location.replace('/dashboard.html');
  }catch(error){
    showStatus(error.message||'Could not create the account.',true);
    button.disabled=false;
  }
});

document.getElementById('forgot-password').addEventListener('click', async () => {
  if(!evaClient)return showStatus('Account service is still loading. Please try again.',true);
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    document.getElementById('login-email').focus();
    return showStatus('Enter your account email first, then tap Forgot password.',true);
  }
  const button=document.getElementById('forgot-password');
  const original=button.textContent;
  button.disabled=true;button.textContent='Sending reset link…';
  showStatus('Sending a secure password reset email…');
  try{
    const redirectTo=`${location.origin}/reset-password.html`;
    const {error}=await evaClient.auth.resetPasswordForEmail(email,{redirectTo});
    if(error)throw error;
    showStatus('Password reset email sent. Open the link in your email to choose a new password.');
  }catch(error){
    showStatus(error.message||'Could not send the password reset email.',true);
  }finally{
    button.disabled=false;button.textContent=original;
  }
});

document.querySelectorAll('[data-toggle-password]').forEach((button) => button.addEventListener('click', () => {
  const input = document.getElementById(button.dataset.togglePassword);
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  button.textContent = showing ? 'Show' : 'Hide';
  button.setAttribute('aria-pressed', String(!showing));
}));

document.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', () => {
  setActiveTab(button.dataset.authTab);
  showAuthForm(`${button.dataset.authTab}-form`);
  statusEl.textContent = '';
  statusEl.className = 'auth-status';
}));

init();