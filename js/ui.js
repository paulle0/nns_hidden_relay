/**
 * NNS Hidden Relay — UI helpers
 */
import * as storage from './storage.js';
import * as crypto from './crypto.js';

const $ = (sel) => document.querySelector(sel);

// ——— DOM references ——— //
export const el = {
  // Login screen
  get loginScreen()     { return $('#login-screen'); },
  get loginNsecInput()  { return $('#login-nsec'); },
  get loginBtnImport()  { return $('#btn-login-import'); },
  get loginRelayInput() { return $('#login-relay-input'); },
  get loginRelayAdd()   { return $('#btn-login-relay-add'); },
  get loginRelayList()  { return $('#login-relay-list'); },
  get loginError()      { return $('#login-error'); },
  // Main app
  get appScreen()       { return $('#app-screen'); },
  get pubkeyDisplay()   { return $('#pubkey-display'); },
  get npubDisplay()     { return $('#npub-display'); },
  get nsecDisplay()     { return $('#nsec-display'); },
  get nrvrelayDisplay() { return $('#nrvrelay-display'); },
  get startBtn()        { return $('#btn-start'); },
  get stopBtn()         { return $('#btn-stop'); },
  get statusBanner()    { return $('#status-banner'); },
  get statusText()      { return $('#status-text'); },
  get statusDot()       { return $('#status-dot'); },
  get logArea()         { return $('#log-area'); },
  get eventList()       { return $('#event-list'); },
  get eventCount()      { return $('#event-count'); },
  get whitelistInput()  { return $('#whitelist-input'); },
  get whitelistAdd()    { return $('#whitelist-add'); },
  get chipList()        { return $('#chip-list'); },
  get clearEventsBtn()  { return $('#btn-clear-events'); },
  get themeToggle()     { return $('#theme-toggle'); },
  get modal()           { return $('#modal-backdrop'); },
  get modalBody()       { return $('#modal-body'); },
  get modalClose()      { return $('#modal-close'); },
  get logoutBtn()       { return $('#btn-logout'); },
  // Relay management (main app)
  get relayInput()      { return $('#relay-input'); },
  get relayAddBtn()     { return $('#btn-relay-add'); },
  get relayChipList()   { return $('#relay-chip-list'); },
};

// ——— Screens ——— //
export function showLogin() {
  el.loginScreen.classList.remove('hidden');
  el.appScreen.classList.add('hidden');
}

export function showApp() {
  el.loginScreen.classList.add('hidden');
  el.appScreen.classList.remove('hidden');
}

// ——— Status banner ——— //
export function setStatus(state, text) {
  const banner = el.statusBanner;
  const dot = el.statusDot;
  banner.className = 'status-banner';
  dot.className = 'status-dot';
  if (state === 'on') {
    banner.classList.add('status-banner--on');
    dot.classList.add('status-dot--active');
  } else if (state === 'error') {
    banner.classList.add('status-banner--err');
  } else {
    banner.classList.add('status-banner--off');
  }
  el.statusText.textContent = text;
}

// ——— Log rendering ——— //
export function appendLog(entry) {
  if (!entry) { el.logArea.innerHTML = ''; return; }
  const line = document.createElement('div');
  line.className = `log--${entry.level}`;
  line.textContent = `[${entry.time}] ${entry.msg}`;
  el.logArea.appendChild(line);
  el.logArea.scrollTop = el.logArea.scrollHeight;
}

// ——— Event list ——— //
export async function renderEvents() {
  const events = await storage.getAllEvents();
  const list = el.eventList;
  el.eventCount.textContent = events.length;

  if (events.length === 0) {
    list.innerHTML =
      '<div class="event-list__empty">No stored events yet.</div>';
    return;
  }

  list.innerHTML = events.map(ev => `
    <div class="event-row">
      <span class="event-row__kind">kind:${ev.kind}</span>
      <span class="event-row__pubkey"
            title="${ev.pubkey}">${ev.pubkey.slice(0, 16)}…</span>
      <span class="event-row__time">${formatTime(ev.created_at)}</span>
      <span class="event-row__actions">
        <button class="btn btn--ghost btn--sm"
                data-view-id="${ev.id}">↗</button>
      </span>
    </div>
  `).join('');

  list.querySelectorAll('[data-view-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const evts = await storage.getAllEvents();
      const ev = evts.find(e => e.id === btn.dataset.viewId);
      if (ev) showEventModal(ev);
    });
  });
}

function formatTime(ts) {
  return new Date(ts * 1000)
    .toLocaleTimeString('en-GB', { hour12: false });
}

// ——— Whitelist chips (full npub + hex) ——— //
export function renderWhitelist(list, removeFn) {
  const container = el.chipList;
  if (!container) return;
  if (list.length === 0) {
    container.innerHTML =
      '<span class="chip-list__empty">'
      + 'No pubkeys whitelisted — all requests will be rejected.'
      + '</span>';
    return;
  }
  container.innerHTML = list.map((pk, i) => {
    const npub = crypto.npubEncode(pk);
    return `
      <div class="whitelist-entry">
        <div class="whitelist-entry__keys">
          <span class="whitelist-entry__npub"
                title="${npub}">${npub}</span>
          <span class="whitelist-entry__hex"
                title="${pk}">${pk}</span>
        </div>
        <button class="chip__remove" data-idx="${i}">×</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.chip__remove').forEach(btn => {
    btn.addEventListener('click', () =>
      removeFn(parseInt(btn.dataset.idx))
    );
  });
}

// ——— Relay chips ——— //
export function renderRelayChips(urls, removeFn, container) {
  if (!container) return;
  if (urls.length === 0) {
    container.innerHTML =
      '<span class="chip-list__empty">No relays configured.</span>';
    return;
  }
  container.innerHTML = urls.map((url, i) => `
    <span class="chip chip--relay" title="${url}">
      ${url.replace('wss://', '').replace('ws://', '')}
      <button class="chip__remove" data-idx="${i}">×</button>
    </span>
  `).join('');
  container.querySelectorAll('.chip__remove').forEach(btn => {
    btn.addEventListener('click', () =>
      removeFn(parseInt(btn.dataset.idx))
    );
  });
}

// ——— Modal ——— //
export function initModal() {
  el.modalClose?.addEventListener('click', closeModal);
  el.modal?.addEventListener('click', (e) => {
    if (e.target === el.modal) closeModal();
  });
}
function closeModal() {
  el.modal.classList.remove('modal-backdrop--open');
}
function showEventModal(ev) {
  const json = JSON.stringify(ev, null, 2);
  el.modalBody.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-all;font-size:0.78rem;font-family:var(--font-mono);color:var(--text-secondary)">${json}</pre>`;
  el.modal.classList.add('modal-backdrop--open');
}
// ——— Theme ——— //
export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = el.themeToggle;
  if (btn) btn.textContent = theme === 'dark' ? '☀' : '☾';
}
