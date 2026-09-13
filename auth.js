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
  showStatus('Creating your account…');
  const { data, error } = await evaClient.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${location.origin}/dashboard.html` }
  });
  if (error) return showStatus(error.message, true);

  fetch('/api/store',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'notify_signup',email})
  }).catch(()=>{});

  if (data.session) return location.replace('/dashboard.html');

  pendingSignupEmail=email;
  document.getElementById('confirm-email-label').textContent=email;
  showAuthForm('confirm-email-panel');
  document.querySelectorAll('[data-auth-tab]').forEach(item=>{
    item.classList.remove('active');
    item.setAttribute('aria-selected','false');
  });
  showStatus('Verification email sent. Open your inbox and confirm your email address.');
});

document.getElementById('resend-confirmation').addEventListener('click', async () => {
  if (!evaClient || !pendingSignupEmail) return showStatus('Create your account again to resend the email.', true);
  const button=document.getElementById('resend-confirmation');
  button.disabled=true;
  showStatus('Resending verification email…');
  const { error }=await evaClient.auth.resend({
    type:'signup',
    email:pendingSignupEmail,
    options:{emailRedirectTo:`${location.origin}/dashboard.html`}
  });
  button.disabled=false;
  if(error)return showStatus(error.message,true);
  showStatus('Verification email sent again. Check your inbox and spam folder.');
});

document.getElementById('change-confirm-email').addEventListener('click',()=>{
  pendingSignupEmail='';
  setActiveTab('signup');
  showAuthForm('signup-form');
  showStatus('Enter the email address you want to use.');
});

document.getElementById('back-to-signin').addEventListener('click',()=>{
  pendingSignupEmail='';
  setActiveTab('login');
  showAuthForm('login-form');
  showStatus('Sign in after you confirm your email address.');
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
  setActiveTab(button.dataset.authTab);
  showAuthForm(`${button.dataset.authTab}-form`);
  statusEl.textContent = '';
  statusEl.className = 'auth-status';
}));

init();
