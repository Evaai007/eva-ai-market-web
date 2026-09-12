let evaClient;
const statusEl = document.getElementById('auth-status');
const showStatus = (message, error = false) => {
  statusEl.textContent = message;
  statusEl.className = error ? 'auth-status error' : 'auth-status success';
};

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
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if (password.length < 8) return showStatus('Password must be at least 8 characters.', true);
  showStatus('Creating your account…');
  const { data, error } = await evaClient.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${location.origin}/dashboard.html` }
  });
  if (error) return showStatus(error.message, true);
  fetch('/api/notify',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({type:'signup',email})
  }).catch(()=>{});
  if (data.session) location.replace('/dashboard.html');
  else showStatus('Account created. Check your email and confirm the address, then sign in.');
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
  document.querySelectorAll('[data-auth-tab]').forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('.auth-form').forEach(form => {
    form.hidden = form.id !== `${button.dataset.authTab}-form`;
  });
  statusEl.textContent = '';
  statusEl.className = 'auth-status';
}));

init();
