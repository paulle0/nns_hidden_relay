/**
 * NNS Hidden Relay — Controls
 * Relay URL management, whitelist, start/stop.
 */
import { DEFAULTS, STORAGE_KEY } from './config.js';
import * as crypto from './crypto.js';
import * as storage from './storage.js';
import * as log from './logger.js';
import { RelayPool } from './relay-pool.js';
import { RelayHandler } from './relay-handler.js';
import {
  el, setStatus, renderEvents,
  renderWhitelist, renderRelayChips,
} from './ui.js';

let pool = null;
let handler = null;
let secretKey = null;
let whitelist = [];
let relayUrls = [];
let _onRelayChange = null;
export function initAppControls(sk, onRelayChange) {
  secretKey = sk;
  _onRelayChange = onRelayChange || null;
  loadRelayUrls();
  loadWhitelist();
  initRelayManagement();
  initWhitelistControls();
  initStartStop();
}

// ——— Relay URLs ——— //
function loadRelayUrls() {
  const saved = localStorage.getItem(STORAGE_KEY.RELAY_URLS);
  relayUrls = saved
    ? JSON.parse(saved)
    : [...DEFAULTS.rendezvousRelays];
  renderAppRelays();
}

function initRelayManagement() {
  el.relayAddBtn.addEventListener('click', addRelay);
  el.relayInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addRelay();
  });
}

function addRelay() {
  const val = el.relayInput.value.trim();
  if (!val) return;
  if (!val.startsWith('wss://') && !val.startsWith('ws://')) {
    log.err('Relay URL must start with wss:// or ws://');
    return;
  }
  if (relayUrls.includes(val)) return;
  relayUrls.push(val);
  el.relayInput.value = '';
  saveRelays();
  renderAppRelays();
  notifyRelayChange();
  log.ok(`Added relay: ${val}`);
}

function removeRelay(idx) {
  const removed = relayUrls.splice(idx, 1)[0];
  saveRelays();
  renderAppRelays();
  notifyRelayChange();
  log.info(`Removed relay: ${removed}`);
}

function saveRelays() {
  localStorage.setItem(
    STORAGE_KEY.RELAY_URLS, JSON.stringify(relayUrls)
  );
}

function renderAppRelays() {
  renderRelayChips(relayUrls, removeRelay, el.relayChipList);
}

function notifyRelayChange() {
  if (_onRelayChange && secretKey) {
    const pk = crypto.getPublicKey(secretKey);
    _onRelayChange(pk);
  }
}

// ——— Whitelist ——— //
function loadWhitelist() {
  const saved = localStorage.getItem(STORAGE_KEY.WHITELIST);
  whitelist = saved ? JSON.parse(saved) : [];
  renderWhitelist(whitelist, removeFromWhitelist);
}
function initWhitelistControls() {
  el.whitelistAdd.addEventListener('click', addToWhitelist);
  el.whitelistInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addToWhitelist();
  });
}

function addToWhitelist() {
  let val = el.whitelistInput.value.trim();
  if (!val) return;

  if (val.startsWith('npub1')) {
    try {
      val = crypto.npubDecode(val);
    } catch (e) {
      log.err('Invalid npub string.');
      return;
    }
  }

  if (!/^[0-9a-f]{64}$/i.test(val)) {
    log.err('Invalid pubkey. Use 64-char hex or npub1…');
    return;
  }
  val = val.toLowerCase();
  if (whitelist.includes(val)) {
    log.info('Pubkey already whitelisted.');
    return;
  }
  whitelist.push(val);
  localStorage.setItem(
    STORAGE_KEY.WHITELIST, JSON.stringify(whitelist)
  );
  el.whitelistInput.value = '';
  renderWhitelist(whitelist, removeFromWhitelist);
  if (handler) handler.setWhitelist(whitelist);
  log.ok(`Whitelisted ${val.slice(0, 12)}…`);
}

function removeFromWhitelist(idx) {
  const removed = whitelist.splice(idx, 1)[0];
  localStorage.setItem(
    STORAGE_KEY.WHITELIST, JSON.stringify(whitelist)
  );
  renderWhitelist(whitelist, removeFromWhitelist);
  if (handler) handler.setWhitelist(whitelist);
  log.info(`Removed ${removed.slice(0, 12)}… from whitelist`);
}

// ——— Start / Stop ——— //
function initStartStop() {
  el.startBtn.addEventListener('click', startRelay);
  el.stopBtn.addEventListener('click', stopRelay);
  el.clearEventsBtn.addEventListener('click', async () => {
    if (!confirm('Delete all stored events?')) return;
    await storage.clearEvents();
    renderEvents();
    log.ok('Cleared all events.');
  });
}

function startRelay() {
  if (!secretKey) { log.err('No identity.'); return; }
  if (relayUrls.length === 0) {
    log.err('No relays configured.');
    return;
  }

  const pk = crypto.getPublicKey(secretKey);
  pool = new RelayPool();
  handler = new RelayHandler(secretKey,
    (ev) => pool.publish(ev),
    () => renderEvents()
  );
  handler.setWhitelist(whitelist);

  pool.onEvent((event) => handler.handleEvent(event));
  pool.onStatus((url, status) => {
    if (status === 'open') {
      const n = pool.size;
      setStatus('on',
        `Connected (${n} relay${n > 1 ? 's' : ''})`
      );
    } else if (status === 'error') {
      setStatus('error', 'Connection error');
    }
  });
  pool.connect(relayUrls, pk);

  setStatus('on', 'Connecting…');
  el.startBtn.disabled = true;
  el.stopBtn.disabled = false;
  log.ok('Relay started.');
}

function stopRelay() {
  if (pool) {
    pool.disconnectAll();
    pool = null;
  }
  handler = null;
  setStatus('off', 'Stopped');
  el.startBtn.disabled = false;
  el.stopBtn.disabled = true;
  log.info('Relay stopped.');
}
