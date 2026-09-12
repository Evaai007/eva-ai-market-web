let evaClient;
let pendingSignupEmail='';
const statusEl = document.getElementById('auth-status');
const showStatus = (message, error = false) => {
  statusEl.textContent = message;
  statusEl.className = error ? 'auth-status error' : 'auth-status success';
};

function showAuthForm(id){
  document.querySelectorAll('.auth-form').forEach(form=>{form.hidden=form.id!==id;});
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
  showStatus('Verification code sent. Enter the 6-digit code from your email.');
  setTimeout(()=>document.getElementById('verify-code').focus(),50);
});

document.getElementById('verify-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!evaClient || !pendingSignupEmail) return showStatus('Start account creation again.', true);
  const token=document.getElementById('verify-code').value.replace(/\D/g,'').slice(0,6);
  if(token.length!==6)return showStatus('Enter the 6-digit verification code.',true);
  showStatus('Verifying code…');
  const { data, error } = await evaClient.auth.verifyOtp({
    email: pendingSignupEmail,
    token,
    type: 'email'
  });
  if(error)return showStatus(error.message,true);
  if(!data?.session)return showStatus('Code verified, but no session was created. Please sign in.',true);
  fetch('/api/store',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'notify_signup',email:pendingSignupEmail})}).catch(()=>{});
  showStatus('Email verified. Opening your account…');
  location.replace('/dashboard.html');
});

document.getElementById('resend-code').addEventListener('click',async()=>{
  if(!evaClient||!pendingSignupEmail)return;
  showStatus('Sending a new code…');
  const { error }=await evaClient.auth.resend({type:'signup',email:pendingSignupEmail,options:{emailRedirectTo:`${location.origin}/dashboard.html`}});
  if(error)return showStatus(error.message,true);
  showStatus('A new verification code was sent.');
});

document.getElementById('change-signup-email').addEventListener('click',()=>{
  pendingSignupEmail='';
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
  pendingSignupEmail='';
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
