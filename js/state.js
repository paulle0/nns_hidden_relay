// js/state.js — Global app state with subscription
const listeners = new Set();

export const state = {
  secretKey: null,     // Uint8Array
  relayUrls: [],       // string[]
  whitelist: [],       // string[] (hex pubkeys)
  running: false,
  view: 'login',
  theme: 'dark',
};

export function setState(patch) {
  Object.assign(state, patch);
  emit();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) {
    try { fn(state); } catch (e) { console.error('listener error', e); }
  }
}
