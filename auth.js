let evaClient;
let pendingSignupEmail='';
let verifyExpiresAt=0;
let verifyTimer=null;
let codeMustBeReissued=false;
const statusEl = document.getElementById('auth-status');
const showStatus = (message, error = false) => {
  statusEl.textContent = message;
  statusEl.className = error ? 'auth-status error' : 'auth-status success';
};

function showAuthForm(id){
  document.querySelectorAll('.auth-form').forEach(form=>{form.hidden=form.id!==id;});
}

function setVerifyEnabled(enabled){
  const input=document.getElementById('verify-code');
  const button=document.getElementById('verify-submit');
  if(input)input.disabled=!enabled;
  if(button)button.disabled=!enabled;
}

function stopVerifyTimer(){
  if(verifyTimer){clearInterval(verifyTimer);verifyTimer=null;}
}

function expireVerification(){
  stopVerifyTimer();
  verifyExpiresAt=0;
  codeMustBeReissued=true;
  const countdown=document.getElementById('verify-countdown');
  if(countdown)countdown.textContent='00:00';
  setVerifyEnabled(false);
  showStatus('This verification code expired. Request a new code to continue.',true);
}

function startVerifyTimer(){
  stopVerifyTimer();
  verifyExpiresAt=Date.now()+60000;
  codeMustBeReissued=false;
  setVerifyEnabled(true);
  const countdown=document.getElementById('verify-countdown');
  const update=()=>{
    const remaining=Math.max(0,verifyExpiresAt-Date.now());
    const seconds=Math.ceil(remaining/1000);
    if(countdown)countdown.textContent=`00:${String(seconds).padStart(2,'0')}`;
    if(remaining<=0)expireVerification();
  };
  update();
  verifyTimer=setInterval(update,250);
}

async function init() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    if (!response.ok) throw new Error(config.error || 'Configuration unavailable');
    evaClient = window.supabase.createClient(config.url, config.anonKey);
    const { data } = await evaClient.auth.getSession();
    if (data.session) location.replace('/dashboard.html');
  } catch (error) {
    showStatus(error.message, true);
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
  location.replace('/dashboard.html');
});

document.getElementById('signup-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!evaClient) return;
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  if (password.length < 8) return showStatus('Password must be at least 8 characters.', true);
  showStatus('Sending verification code…');
  const { data, error } = await evaClient.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${location.origin}/dashboard.html` }
  });
  if (error) return showStatus(error.message, true);
  if (data.session) {
    fetch('/api/store',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'notify_signup',email})}).catch(()=>{});
    return location.replace('/dashboard.html');
  }
  pendingSignupEmail=email;
  document.getElementById('verify-email-label').textContent=email;
  document.getElementById('verify-code').value='';
  showAuthForm('verify-form');
  document.querySelectorAll('[data-auth-tab]').forEach(item=>item.classList.remove('active'));
  startVerifyTimer();
  showStatus('Verification code sent. It is valid for 1 minute.');
  setTimeout(()=>document.getElementById('verify-code').focus(),50);
});

document.getElementById('verify-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!evaClient || !pendingSignupEmail) return showStatus('Start account creation again.', true);
  if(codeMustBeReissued||!verifyExpiresAt||Date.now()>verifyExpiresAt)return expireVerification();
  const token=document.getElementById('verify-code').value.replace(/\D/g,'').slice(0,6);
  if(token.length!==6)return showStatus('Enter the 6-digit verification code.',true);
  showStatus('Verifying code…');
  const { data, error } = await evaClient.auth.verifyOtp({
    email: pendingSignupEmail,
    token,
    type: 'email'
  });
  if(error){
    codeMustBeReissued=true;
    stopVerifyTimer();
    verifyExpiresAt=0;
    setVerifyEnabled(false);
    const countdown=document.getElementById('verify-countdown');
    if(countdown)countdown.textContent='00:00';
    return showStatus('Incorrect or expired code. Request a new code to try again.',true);
  }
  if(!data?.session)return showStatus('Code verified, but no session was created. Please sign in.',true);
  stopVerifyTimer();
  fetch('/api/store',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'notify_signup',email:pendingSignupEmail})}).catch(()=>{});
  showStatus('Email verified. Opening your account…');
  location.replace('/dashboard.html');
});

document.getElementById('resend-code').addEventListener('click',async()=>{
  if(!evaClient||!pendingSignupEmail)return;
  const button=document.getElementById('resend-code');
  button.disabled=true;
  showStatus('Requesting a new verification code…');
  const { error }=await evaClient.auth.resend({type:'signup',email:pendingSignupEmail,options:{emailRedirectTo:`${location.origin}/dashboard.html`}});
  button.disabled=false;
  if(error)return showStatus(error.message,true);
  document.getElementById('verify-code').value='';
  startVerifyTimer();
  showStatus('New verification code sent. It is valid for 1 minute.');
  setTimeout(()=>document.getElementById('verify-code').focus(),50);
});

document.getElementById('change-signup-email').addEventListener('click',()=>{
  stopVerifyTimer();
  pendingSignupEmail='';
  verifyExpiresAt=0;
  codeMustBeReissued=false;
  showAuthForm('signup-form');
  const signupTab=document.querySelector('[data-auth-tab="signup"]');
  document.querySelectorAll('[data-auth-tab]').forEach(item=>{
    const active=item===signupTab;
    item.classList.toggle('active',active);
    item.setAttribute('aria-selected',String(active));
  });
  showStatus('Enter the email address you want to use.');
});

document.getElementById('verify-code').addEventListener('input',event=>{
  event.currentTarget.value=event.currentTarget.value.replace(/\D/g,'').slice(0,6);
});

document.getElementById('forgot-password').addEventListener('click', async () => {
  if (!evaClient) return showStatus('Authentication is still loading. Please try again.', true);
  const email = document.getElementById('login-email').value.trim();
  if (!email) return showStatus('Enter your email address first.', true);
  showStatus('Sending a secure reset link…');
  const { error } = await evaClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}/reset-password.html`
  });
  if (error) return showStatus(error.message, true);
  showStatus('Password reset link sent. Check your email inbox.');
});

document.querySelectorAll('[data-toggle-password]').forEach((button) => button.addEventListener('click', () => {
  const input = document.getElementById(button.dataset.togglePassword);
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  button.textContent = showing ? 'Show' : 'Hide';
  button.setAttribute('aria-pressed', String(!showing));
}));

document.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', () => {
  stopVerifyTimer();
  pendingSignupEmail='';
  verifyExpiresAt=0;
  codeMustBeReissued=false;
  document.querySelectorAll('[data-auth-tab]').forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
  showAuthForm(`${button.dataset.authTab}-form`);
  statusEl.textContent = '';
  statusEl.className = 'auth-status';
}));

init();
