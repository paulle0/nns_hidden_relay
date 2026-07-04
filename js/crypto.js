/**
 * NNS Hidden Relay — Crypto helpers
 * Key generation, signing, NIP-44/04 encryption, bech32 encoding.
 */
import { STORAGE_KEY, KIND } from './config.js';

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
  return Array.from(bytes, b =>
    b.toString(16).padStart(2, '0')
  ).join('');
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

// ——— nrvrelay bech32 encoding (NNS NIP) ——— //

/**
 * Encode an nrvrelay1… bech32 string per the NNS NIP spec.
 * TLV 0 = 32-byte relay pubkey
 * TLV 1 = rendezvous relay URLs (one per entry)
 * TLV 3 = kind number 10112 (4 bytes big-endian)
 */
export function nrvrelayEncode(hexPubkey, relayUrls) {
  const parts = [];

  // TLV 0: pubkey (32 bytes)
  const pkBytes = hexToBytes(hexPubkey);
  parts.push(new Uint8Array([0, pkBytes.length]));
  parts.push(pkBytes);

  // TLV 1: relay URLs
  const encoder = new TextEncoder();
  for (const url of relayUrls) {
    const urlBytes = encoder.encode(url);
    parts.push(new Uint8Array([1, urlBytes.length]));
    parts.push(urlBytes);
  }

  // TLV 3: kind 10112 as 4-byte big-endian
  const kindBytes = new Uint8Array(4);
  kindBytes[0] = (KIND.RELAY_LIST >> 24) & 0xff;
  kindBytes[1] = (KIND.RELAY_LIST >> 16) & 0xff;
  kindBytes[2] = (KIND.RELAY_LIST >> 8) & 0xff;
  kindBytes[3] = KIND.RELAY_LIST & 0xff;
  parts.push(new Uint8Array([3, 4]));
  parts.push(kindBytes);

  // Concatenate all TLV parts
  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const data = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    data.set(p, offset);
    offset += p.length;
  }

  // Bech32-encode with 'nrvrelay' prefix
  const words = NT.utils.bech32.toWords(data);
  return NT.utils.bech32.encode('nrvrelay', words, 5000);
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
  const ck = NT.nip44.v2.utils.getConversationKey(
    sk, recipientPubkey
  );
  return NT.nip44.v2.encrypt(plaintext, ck);
}

export function nip44Decrypt(sk, senderPubkey, ciphertext) {
  const ck = NT.nip44.v2.utils.getConversationKey(
    sk, senderPubkey
  );
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

export function verifyEvent(event) {
  return NT.verifyEvent(event);
}
