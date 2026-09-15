(() => {
  'use strict';

  let mode = 'coding';
  let cachedCatalog = '';
  let cachedProducts = [];

  const $ = (id) => document.getElementById(id);

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  function productPrice(product) {
    const value = Number(product?.price_usd ?? product?.price ?? product?.priceUsd);
    return Number.isFinite(value) ? `$${value}` : 'Contact';
  }

  async function getCatalog() {
    if (cachedCatalog) return cachedCatalog;
    try {
      const res = await fetch('/api/store', { cache: 'no-store' });
      if (!res.ok) throw new Error('Store unavailable');
      const body = await res.json();
      cachedProducts = Array.isArray(body?.products) ? body.products : [];
      cachedCatalog = cachedProducts.slice(0, 60).map((p) => {
        const name = String(p?.name || p?.title || 'Product').slice(0, 90);
        const category = String(p?.category || '').slice(0, 60);
        const stock = Number.isFinite(Number(p?.stock)) ? `stock ${Number(p.stock)}` : 'stock unknown';
        return `${name} — ${productPrice(p)} USDT — ${category} — ${stock}`;
      }).join('\n');
      populateCompareSelects();
      return cachedCatalog;
    } catch (error) {
      console.warn('AI playground catalog load failed', error?.message);
      return '';
    }
  }

  function populateCompareSelects() {
    if (!cachedProducts.length) return;
    const a = $('evaCompareA');
    const b = $('evaCompareB');
    if (!a || !b || a.dataset.loaded === '1') return;
    const products = cachedProducts.filter(p => p && (p.name || p.title)).slice(0, 45);
    const html = products.map((p) => {
      const name = String(p.name || p.title).replace(/[<>&"]/g, '');
      const value = `${name} (${productPrice(p)} USDT)`;
      return `<option value="${value.replace(/"/g, '&quot;')}">${value}</option>`;
    }).join('');
    a.innerHTML = html;
    b.innerHTML = html;
    if (b.options.length > 1) b.selectedIndex = 1;
    a.dataset.loaded = '1';
  }

  async function callAI(kind, prompt) {
    const catalog = await getCatalog();
    const response = await fetch('/api/ai-playground', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, mode, prompt, catalog })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      const error = new Error(data?.error || 'AI request failed.');
      error.code = data?.code || '';
      throw error;
    }
    return data;
  }

  function setOutput(message, isError = false) {
    const output = $('evaSandboxOutput');
    if (!output) return;
    output.classList.toggle('error', !!isError);
    output.textContent = message;
  }

  window.evaSetAiMode = function evaSetAiMode(nextMode, button) {
    mode = ['coding', 'creative', 'reasoning', 'market'].includes(nextMode) ? nextMode : 'coding';
    document.querySelectorAll('.eva-ai-mode').forEach((el) => el.classList.remove('active'));
    if (button) button.classList.add('active');
  };

  window.evaLoadAiPrompt = function evaLoadAiPrompt(type) {
    const input = $('evaSandboxPrompt');
    if (!input) return;
    const prompts = {
      code: 'Create a lightweight JavaScript pattern for a live crypto price ticker with retries, timeout handling, and clean DOM updates.',
      strategy: 'Write a concise 30-second social video script introducing an AI tools marketplace without making unverifiable claims.',
      aws: 'Compare an 8 vCPU general cloud server with a GPU instance for AI inference. Explain when each is the better choice.'
    };
    input.value = prompts[type] || '';
    input.focus();
  };

  window.evaRunSandbox = async function evaRunSandbox() {
    const input = $('evaSandboxPrompt');
    const button = $('evaSandboxRun');
    const status = $('evaSandboxStatus');
    const latency = $('evaSandboxLatency');
    const prompt = input?.value?.trim();
    if (!prompt) {
      setOutput('Please enter a prompt or choose a quick prompt first.', true);
      return;
    }

    if (button) button.disabled = true;
    setText(status, 'GENERATING');
    setText(latency, 'Latency: -- ms');
    setOutput('Connecting securely to the EVA AI server…');

    try {
      const data = await callAI('sandbox', prompt);
      setText(status, 'SUCCESS');
      setText(latency, `Latency: ${data.latency_ms || '--'} ms`);
      setOutput(data.text || 'No response returned.');
    } catch (error) {
      setText(status, error.code === 'AI_NOT_CONFIGURED' ? 'SETUP NEEDED' : 'ERROR');
      setOutput(error.message, true);
    } finally {
      if (button) button.disabled = false;
    }
  };

  window.evaToggleAdvisor = function evaToggleAdvisor(show) {
    const drawer = $('evaAiAdvisor');
    if (!drawer) return;
    drawer.classList.toggle('open', !!show);
    drawer.setAttribute('aria-hidden', String(!show));
    if (show) setTimeout(() => $('evaAdvisorInput')?.focus(), 180);
  };

  function addAdvisorMessage(text, who = 'bot') {
    const box = $('evaAdvisorMessages');
    if (!box) return null;
    const el = document.createElement('div');
    el.className = `eva-ai-msg ${who === 'user' ? 'user' : ''}`;
    el.textContent = text;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    return el;
  }

  window.evaAskAdvisorPreset = function evaAskAdvisorPreset(query) {
    const input = $('evaAdvisorInput');
    if (!input) return;
    input.value = query;
    window.evaSubmitAdvisor();
  };

  window.evaSubmitAdvisor = async function evaSubmitAdvisor() {
    const input = $('evaAdvisorInput');
    const button = $('evaAdvisorSend');
    const query = input?.value?.trim();
    if (!query) return;

    addAdvisorMessage(query, 'user');
    input.value = '';
    const pending = addAdvisorMessage('Checking the live EVA catalog and preparing a recommendation…');
    if (button) button.disabled = true;

    try {
      const data = await callAI('advisor', query);
      if (pending) pending.textContent = data.text;
    } catch (error) {
      if (pending) pending.textContent = error.message;
    } finally {
      if (button) button.disabled = false;
    }
  };

  window.evaOpenCompare = async function evaOpenCompare() {
    const modal = $('evaAiCompareModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    await getCatalog();
  };

  window.evaCloseCompare = function evaCloseCompare() {
    const modal = $('evaAiCompareModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  };

  window.evaRunCompare = async function evaRunCompare() {
    const a = $('evaCompareA');
    const b = $('evaCompareB');
    const output = $('evaCompareOutput');
    const button = $('evaCompareRun');
    if (!a || !b || !output) return;
    if (a.value === b.value) {
      output.classList.add('show');
      output.textContent = 'Choose two different products to compare.';
      return;
    }

    output.classList.add('show');
    output.textContent = 'Analyzing the two products against the live EVA catalog…';
    if (button) button.disabled = true;
    try {
      const prompt = `Compare these two products: ${a.value} versus ${b.value}. Cover best use case, value, strengths, limitations, and who should choose each.`;
      const data = await callAI('compare', prompt);
      output.textContent = data.text;
    } catch (error) {
      output.textContent = error.message;
    } finally {
      if (button) button.disabled = false;
    }
  };

  function wireKeyboardClose() {
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      window.evaToggleAdvisor(false);
      window.evaCloseCompare();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    getCatalog();
    wireKeyboardClose();
    const form = $('evaAdvisorForm');
    if (form) form.addEventListener('submit', (event) => {
      event.preventDefault();
      window.evaSubmitAdvisor();
    });
    const modal = $('evaAiCompareModal');
    if (modal) modal.addEventListener('click', (event) => {
      if (event.target === modal) window.evaCloseCompare();
    });
  });
})();
