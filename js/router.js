// js/router.js — Switch between views and trigger render functions
import { state } from './state.js';
import { renderLogin } from './views/login.js';
import { renderRelay } from './views/relay.js';
import { renderSettings } from './views/settings.js';

const renderers = {
  login: renderLogin,
  relay: renderRelay,
  settings: renderSettings,
};

export async function applyView() {
  const v = state.view;

  // Toggle view sections
  document.querySelectorAll('.view').forEach((el) => {
    el.hidden = el.dataset.view !== v;
  });

  // Run view renderer
  const fn = renderers[v];
  if (fn) await fn();

  // Toggle nav + logout visibility
  const topnav = document.getElementById('topnav');
  const logoutBtn = document.getElementById('logoutBtn');
  const authed = !!state.secretKey;

  topnav.hidden = !authed || v === 'login';
  logoutBtn.hidden = !authed;

  // Highlight active nav link
  topnav.querySelectorAll('.nav-link').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === v);
  });
}

export function wireTopNav() {
  document.getElementById('topnav').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-link');
    if (!btn) return;
    import('./state.js').then((m) => m.setState({ view: btn.dataset.view }));
  });
}
