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
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('login-theme-toggle')?.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
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
  el.loginBtnGenerate.addEventListener('click', handleGenerateKey);
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

function handleGenerateKey() {
  secretKey = crypto.generateSecretKey();
  completeLogin();
}

function completeLogin() {
  if (loginRelays.length === 0) {
    return showLoginError('Add at least one rendezvous relay.');
  }
  crypto.saveSecretKey(secretKey);
  localStorage.setItem(STORAGE_KEY.RELAY_URLS, JSON.stringify(loginRelays));
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

  el.logoutBtn.addEventListener('click', handleLogout);
  initAppControls(secretKey);
  renderEvents();
  log.info('NNS Hidden Relay ready.');
}

function handleLogout() {
  if (!confirm('Log out? Your relay will stop and your key will be removed from this browser.')) return;
  crypto.clearSecretKey();
  localStorage.removeItem(STORAGE_KEY.LOGGED_IN);
  secretKey = null;
  location.reload();
}
