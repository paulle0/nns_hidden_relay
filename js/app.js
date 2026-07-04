/**
 * NNS Hidden Relay — Application entry point
 */
import { DEFAULTS, STORAGE_KEY } from './config.js';
import * as crypto from './crypto.js';
import * as log from './logger.js';
import {
  el, setStatus, appendLog, renderEvents,
  renderWhitelist, renderRelayChips,
  setTheme, initModal, showLogin, showApp,
} from './ui.js';
import { initAppControls } from './app-controls.js';

let secretKey = null;
let loginRelays = [];

// ——— Boot ——— //
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  log.onLog((entry) => appendLog(entry));

  if (isLoggedIn()) {
    secretKey = crypto.loadSecretKey();
    if (secretKey) {
      enterApp();
    } else {
      showLogin();
      initLoginScreen();
    }
  } else {
    showLogin();
    initLoginScreen();
  }
});

function isLoggedIn() {
  return localStorage.getItem(STORAGE_KEY.LOGGED_IN) === '1'
    && localStorage.getItem(STORAGE_KEY.SECRET_KEY);
}

// ——— Theme ——— //
function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY.THEME) || 'dark';
  setTheme(saved);
  document.getElementById('theme-toggle')
    ?.addEventListener('click', toggleTheme);
  document.getElementById('login-theme-toggle')
    ?.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  localStorage.setItem(STORAGE_KEY.THEME, next);
}

// ——— Login screen ——— //
function initLoginScreen() {
  loginRelays = [...DEFAULTS.rendezvousRelays];
  renderLoginRelays();

  el.loginBtnImport.addEventListener('click', handleImportNsec);
  el.loginNsecInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleImportNsec();
  });
  el.loginRelayAdd.addEventListener('click', handleLoginRelayAdd);
  el.loginRelayInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLoginRelayAdd();
  });
}

function handleImportNsec() {
  const val = el.loginNsecInput.value.trim();
  if (!val) return showLoginError('Please paste an nsec1… key.');
  try {
    secretKey = crypto.nsecDecode(val);
    completeLogin();
  } catch (e) {
    showLoginError('Invalid nsec. Must start with nsec1…');
  }
}

function completeLogin() {
  if (loginRelays.length === 0) {
    return showLoginError('Add at least one rendezvous relay.');
  }
  crypto.saveSecretKey(secretKey);
  localStorage.setItem(
    STORAGE_KEY.RELAY_URLS, JSON.stringify(loginRelays)
  );
  localStorage.setItem(STORAGE_KEY.LOGGED_IN, '1');
  enterApp();
}

function handleLoginRelayAdd() {
  const val = el.loginRelayInput.value.trim();
  if (!val) return;
  if (!val.startsWith('wss://') && !val.startsWith('ws://')) {
    return showLoginError('Relay URL must start with wss:// or ws://');
  }
  if (loginRelays.includes(val)) return;
  loginRelays.push(val);
  el.loginRelayInput.value = '';
  renderLoginRelays();
  showLoginError('');
}

function renderLoginRelays() {
  renderRelayChips(loginRelays, (idx) => {
    loginRelays.splice(idx, 1);
    renderLoginRelays();
  }, el.loginRelayList);
}

function showLoginError(msg) {
  el.loginError.textContent = msg;
  el.loginError.classList.toggle('hidden', !msg);
}

// ——— Enter main app ——— //
function enterApp() {
  showApp();
  initModal();

  const pk = crypto.getPublicKey(secretKey);
  el.pubkeyDisplay.textContent = pk;
  el.pubkeyDisplay.title = pk;
  el.npubDisplay.textContent = crypto.npubEncode(pk);
  el.nsecDisplay.textContent = crypto.nsecEncode(secretKey);

  updateNrvrelayDisplay(pk);
  initCopyNrvrelay();

  el.logoutBtn.addEventListener('click', handleLogout);
  initAppControls(secretKey, updateNrvrelayDisplay);
  renderEvents();
  log.info('NNS Hidden Relay ready.');
}

/** Build and display the nrvrelay1… string. */
function updateNrvrelayDisplay(pk) {
  const saved = localStorage.getItem(STORAGE_KEY.RELAY_URLS);
  const relays = saved ? JSON.parse(saved) : [];
  try {
    const nrvrelay = crypto.nrvrelayEncode(pk, relays);
    el.nrvrelayDisplay.textContent = nrvrelay;
    el.nrvrelayDisplay.title = nrvrelay;
  } catch (e) {
    el.nrvrelayDisplay.textContent = '—';
  }
}

function initCopyNrvrelay() {
  const btn = document.getElementById('btn-copy-nrvrelay');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const text = el.nrvrelayDisplay.textContent;
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = '📋'; }, 1500);
      log.ok('nrvrelay string copied to clipboard.');
    }).catch(() => {
      log.err('Failed to copy to clipboard.');
    });
  });
}

function handleLogout() {
  const msg = 'Log out? Your relay will stop and your key '
    + 'will be removed from this browser.';
  if (!confirm(msg)) return;
  crypto.clearSecretKey();
  localStorage.removeItem(STORAGE_KEY.LOGGED_IN);
  secretKey = null;
  location.reload();
}
