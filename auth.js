let evaClient;
const statusEl = document.getElementById('auth-status');
let pendingSignupEmail = '';
const OTP_COOLDOWN_SECONDS = 60;
let otpCooldownTimer;

function friendlyAuthError(error) {
  const message = String(error?.message || '');
  if (/rate limit|too many requests|429/i.test(message)) return 'Too many verification emails were requested. Please wait a moment before trying again.';
  if (/expired/i.test(message)) return 'This verification code has expired. Request a new code and try again.';
  if (/invalid.*token|token.*invalid/i.test(message)) return 'The verification code is incorrect. Check the email and try again.';
  return message || 'Authentication request failed. Please try again.';
}

function startOtpCooldown(seconds = OTP_COOLDOWN_SECONDS) {
  clearInterval(otpCooldownTimer);
  const button = document.getElementById('resend-code');
  if (!button) return;
  let remaining = seconds;
  button.disabled = true;
  button.textContent = `Resend code in ${remaining}s`;
  otpCooldownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(otpCooldownTimer);
      button.disabled = false;
      button.textContent = 'Resend 6-digit code';
    } else button.textContent = `Resend code in ${remaining}s`;
  }, 1000);
}

const showStatus = (message, error = false) => {
  statusEl.textContent = message;
  statusEl.className = error ? 'auth-status error' : 'auth-status success';
};

function showAuthForm(id) {
  document.querySelectorAll('.auth-form').forEach(form => { form.hidden = form.id !== id; });
}

function setActiveTab(name) {
  document.querySelectorAll('[data-auth-tab]').forEach(item => {
    const active = item.dataset.authTab === name;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
}

function getSafeReturnTarget() {
  const queryTarget = new URLSearchParams(location.search).get('next');
  const storedTarget = sessionStorage.getItem('eva-return-to');
  const target = queryTarget || storedTarget || '';
  if (!target.startsWith('/') || target.startsWith('//')) return '';
  return target;
}

async function redirectAfterLogin(defaultTarget = '/dashboard.html') {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data } = await evaClient.auth.getSession();
    if (data.session?.access_token) {
      const target = getSafeReturnTarget() || defaultTarget;
      sessionStorage.removeItem('eva-return-to');
      sessionStorage.removeItem('eva-pending-signup-email');
      location.replace(target);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Your sign-in could not be saved on this device. Please try again.');
}

async function init() {
  try {
    const signupLink=document.querySelector('.signup-link a[href="/signup.html"]');
    if(signupLink){
      const next=getSafeReturnTarget();
      if(next) signupLink.href='/signup.html?next='+encodeURIComponent(next);
    }
    const response = await fetch('/api/config');
    const config = await response.json();
    if (!response.ok) throw new Error(config.error || 'Configuration unavailable');
    evaClient = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data } = await evaClient.auth.getSession();
    if (data.session) await redirectAfterLogin();
  } catch (error) {
    showStatus(error.message, true);
  }
}

async function sendSignupNotification(email) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('/api/store', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'notify_signup', email }),
      signal: controller.signal,
      keepalive: true
    });
    const body = await response.json().catch(() => ({}));
    return response.ok && body.telegram !== false;
  } catch (error) {
    return false;
  } finally {
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
  if (error) return showStatus(error.message || 'Could not sign in. Check your email and password.', true);
  try { await redirectAfterLogin(); } catch (error) { showStatus(error.message, true); }
});

document.getElementById('signup-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!evaClient) return showStatus('Signup service is not ready. Please refresh and try again.', true);
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showStatus('Enter a valid email address.', true);
  if (password.length < 8) return showStatus('Password must be at least 8 characters.', true);

  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  showStatus('Creating your account…');
  try {
    const { data, error } = await evaClient.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error('Email confirmation is still enabled in account settings. Disable Confirm Email to allow instant account access.');
    await sendSignupNotification(email);
    showStatus('Account created. Opening your dashboard…');
    await redirectAfterLogin('/dashboard.html');
  } catch (error) {
    showStatus(friendlyAuthError(error), true);
  } finally {
    button.disabled = false;
  }
});

document.getElementById('forgot-password').addEventListener('click', async () => {
  if (!evaClient) return showStatus('Account service is still loading. Please try again.', true);
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('login-email').focus();
    return showStatus('Enter your account email first, then tap Forgot password.', true);
  }
  const button = document.getElementById('forgot-password');
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Sending reset link…';
  showStatus('Sending a secure password reset email…');
  try {
    const redirectTo = `${location.origin}/reset-password.html`;
    const { error } = await evaClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    showStatus('Password reset email sent. Open the link in your email to choose a new password.');
  } catch (error) {
    showStatus(error.message || 'Could not send the password reset email.', true);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
});

document.querySelectorAll('[data-toggle-password]').forEach(button => button.addEventListener('click', () => {
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

if (location.hash === '#signup') {
  setActiveTab('signup');
  showAuthForm('signup-form');
}

init();
