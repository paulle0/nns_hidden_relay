/**
 * NNS Hidden Relay — Crypto helpers
 * Key generation, signing, NIP-44/04 encryption, bech32 encoding.
 */
import { STORAGE_KEY } from './config.js';

const NT = window.NostrTools;

// ——— Key generation & derivation ——— //

export function generateSecretKey() {
  return NT.generateSecretKey();
}

export function getPublicKey(sk) {
  return NT.getPublicKey(sk);
}

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

export function nsecEncode(skBytes) {
  return NT.nip19.nsecEncode(skBytes);
}

export function npubEncode(hexPubkey) {
  return NT.nip19.npubEncode(hexPubkey);
}

/**
 * Decode an nsec1… string to a Uint8Array secret key.
 * Throws on invalid input.
 */
export function nsecDecode(nsecStr) {
  const { type, data } = NT.nip19.decode(nsecStr);
  if (type !== 'nsec') throw new Error('Not an nsec string');
  return data;
}

/**
 * Decode an npub1… string to a 64-char hex public key.
 * Throws on invalid input.
 */
export function npubDecode(npubStr) {
  const { type, data } = NT.nip19.decode(npubStr);
  if (type !== 'npub') throw new Error('Not an npub string');
  return data; // already hex string
}

// ——— Persistence ——— //

export function saveSecretKey(sk) {
  localStorage.setItem(STORAGE_KEY.SECRET_KEY, bytesToHex(sk));
}

export function loadSecretKey() {
  const hex = localStorage.getItem(STORAGE_KEY.SECRET_KEY);
  if (!hex) return null;
  return hexToBytes(hex);
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

export function nip44Encrypt(sk, recipientPubkey, plaintext) {
  const conversationKey = NT.nip44.v2.utils.getConversationKey(sk, recipientPubkey);
  return NT.nip44.v2.encrypt(plaintext, conversationKey);
}

export function nip44Decrypt(sk, senderPubkey, ciphertext) {
  const conversationKey = NT.nip44.v2.utils.getConversationKey(sk, senderPubkey);
  return NT.nip44.v2.decrypt(ciphertext, conversationKey);
}

// ——— NIP-04 (fallback) ——— //

export async function nip04Encrypt(sk, recipientPubkey, plaintext) {
  return NT.nip04.encrypt(sk, recipientPubkey, plaintext);
}

export async function nip04Decrypt(sk, senderPubkey, ciphertext) {
  return NT.nip04.decrypt(sk, senderPubkey, ciphertext);
}

// ——— Verification ——— //

export function verifyEvent(event) {
  return NT.verifyEvent(event);
}
