// js/storage.js — IndexedDB event storage + localStorage helpers
import { DB, STORAGE_KEY } from './config.js';

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB.name, DB.version);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB.store)) {
        const store = db.createObjectStore(DB.store, { keyPath: 'id' });
        store.createIndex('kind', 'kind', { unique: false });
        store.createIndex('pubkey', 'pubkey', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

export async function putEvent(event) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB.store, 'readwrite');
    const req = tx.objectStore(DB.store).put(event);
    req.onsuccess = () => resolve();
    req.onerror = () => {
      if (req.error?.name === 'ConstraintError') resolve();
      else reject(req.error);
    };
  });
}

export async function getAllEvents() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB.store, 'readonly');
    const req = tx.objectStore(DB.store).getAll();
    req.onsuccess = () => {
      const events = req.result;
      events.sort((a, b) => b.created_at - a.created_at);
      resolve(events);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteEvent(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB.store, 'readwrite');
    tx.objectStore(DB.store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearEvents() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB.store, 'readwrite');
    tx.objectStore(DB.store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function countEvents() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB.store, 'readonly');
    const req = tx.objectStore(DB.store).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ——— LocalStorage helpers ——— //
export function getThemePref() {
  return localStorage.getItem(STORAGE_KEY.THEME) || 'dark';
}
export function setThemePref(theme) {
  localStorage.setItem(STORAGE_KEY.THEME, theme);
}
