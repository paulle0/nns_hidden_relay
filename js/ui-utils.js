// js/ui-utils.js — Toasts, modal, clipboard, theme toggle
import { state, setState } from './state.js';
import { setThemePref } from './storage.js';

export function toast(message, kind = 'info', ms = 3200) {
  const stack = document.getElementById('toasts');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 240ms, transform 240ms';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 260);
  }, ms);
}

export function modal({ title, body, confirmText = 'Confirm', confirmKind = 'primary', cancelText = 'Cancel' }) {
  return new Promise((resolve) => {
    const root = document.getElementById('modalRoot');
    root.hidden = false;
    root.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${title}</h3>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">
          <button class="btn-ghost" data-act="cancel">${cancelText}</button>
          <button class="btn-${confirmKind === 'danger' ? 'danger' : 'primary'}" data-act="ok">${confirmText}</button>
        </div>
      </div>`;
    const close = (val) => { root.hidden = true; root.innerHTML = ''; resolve(val); };
    root.querySelector('[data-act="ok"]').addEventListener('click', () => close(true));
    root.querySelector('[data-act="cancel"]').addEventListener('click', () => close(false));
    root.addEventListener('click', (e) => { if (e.target === root) close(false); }, { once: true });
  });
}

export async function copy(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const orig = btn.textContent;
      btn.classList.add('copied');
      btn.textContent = 'Copied';
      setTimeout(() => { btn.classList.remove('copied'); btn.textContent = orig; }, 1500);
    }
    return true;
  } catch (e) {
    toast('Copy failed: ' + e.message, 'error');
    return false;
  }
}

export function attachCopy(root) {
  root.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => copy(btn.dataset.copy, btn));
  });
}

export function toggleTheme() {
  const next = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  setThemePref(next);
  setState({ theme: next });
}

export function escapeHtml(s) {
  return (s ?? '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
