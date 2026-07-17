// js/crypto.js — Key gen, signing, NIP-44/04, bech32 encode/decode
import { STORAGE_KEY } from './config.js';

const NT = window.NostrTools;

// ——— Key generation & derivation ——— //
export function generateSecretKey() { return NT.generateSecretKey(); }
export function getPublicKey(sk) { return NT.getPublicKey(sk); }

// ——— Byte/hex conversion ——— //
export function bytesToHex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
export function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// ——— Bech32 nsec / npub ——— //
export function nsecEncode(skBytes) { return NT.nip19.nsecEncode(skBytes); }
export function npubEncode(hexPk) { return NT.nip19.npubEncode(hexPk); }
export function nsecDecode(nsecStr) {
  const { type, data } = NT.nip19.decode(nsecStr);
  if (type !== 'nsec') throw new Error('Not an nsec string');
  return data;
}
export function npubDecode(npubStr) {
  const { type, data } = NT.nip19.decode(npubStr);
  if (type !== 'npub') throw new Error('Not an npub string');
  return data;
}

// ——— nrvrelay bech32 encoding ——— //
function encodeTLV(tlv) {
  const entries = [];
  const keys = Object.keys(tlv).sort((a, b) => b - a);
  for (const t of keys) {
    for (const v of tlv[t]) {
      for (let i = 0; i < v.length; i += 255) {
        const chunk = v.slice(i, i + 255);
        const entry = new Uint8Array(chunk.length + 2);
        entry[0] = parseInt(t);
        entry[1] = chunk.length;
        entry.set(chunk, 2);
        entries.push(entry);
      }
    }
  }
  const total = entries.reduce((s, e) => s + e.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const e of entries) { out.set(e, off); off += e.length; }
  return out;
}

export function nrvrelayEncode(hexPubkey, relayUrls) {
  const utf8 = new TextEncoder();
  const data = encodeTLV({
    0: [hexToBytes(hexPubkey)],
    1: relayUrls.map(url => utf8.encode(url)),
  });
  return NT.nip19.encodeBytes('nrvrelay', data);
}

// ——— Persistence ——— //
export function saveSecretKey(sk) {
  localStorage.setItem(STORAGE_KEY.SECRET_KEY, bytesToHex(sk));
}
export function loadSecretKey() {
  const hex = localStorage.getItem(STORAGE_KEY.SECRET_KEY);
  return hex ? hexToBytes(hex) : null;
}
export function clearSecretKey() {
  localStorage.removeItem(STORAGE_KEY.SECRET_KEY);
}

// ——— Event signing ——— //
export function signEvent(sk, t) {
  const template = {
    kind: t.kind,
    tags: t.tags || [],
    content: t.content || '',
    created_at: t.created_at || Math.floor(Date.now() / 1000),
  };
  return NT.finalizeEvent(template, sk);
}

// ——— NIP-44 ——— //
export function nip44Encrypt(sk, recipientPk, plaintext) {
  const ck = NT.nip44.v2.utils.getConversationKey(sk, recipientPk);
  return NT.nip44.v2.encrypt(plaintext, ck);
}
export function nip44Decrypt(sk, senderPk, ciphertext) {
  const ck = NT.nip44.v2.utils.getConversationKey(sk, senderPk);
  return NT.nip44.v2.decrypt(ciphertext, ck);
}

// ——— NIP-04 (fallback) ——— //
export async function nip04Encrypt(sk, recipientPk, plaintext) {
  return NT.nip04.encrypt(sk, recipientPk, plaintext);
}
export async function nip04Decrypt(sk, senderPk, ciphertext) {
  return NT.nip04.decrypt(sk, senderPk, ciphertext);
}

// ——— Verification ——— //
export function verifyEvent(event) { return NT.verifyEvent(event); }
