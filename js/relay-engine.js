// js/relay-engine.js — Start/stop relay engine (pool + handler + announcer)
import { STORAGE_KEY } from './config.js';
import * as crypto from './crypto.js';
import * as log from './logger.js';
import { RelayPool } from './relay-pool.js';
import { RelayHandler } from './relay-handler.js';
import { publishRelayList, publishRelayInfo } from './announcer.js';

let pool = null;
let handler = null;

export function isRunning() { return pool !== null; }

export function startRelay(secretKey, relayUrls, whitelist, { onStatus, onStoreUpdate }) {
  if (pool) stopRelay();
  if (!secretKey) { log.err('No identity.'); return; }
  if (relayUrls.length === 0) { log.err('No relays configured.'); return; }

  const pk = crypto.getPublicKey(secretKey);
  pool = new RelayPool();
  handler = new RelayHandler(secretKey, (ev) => pool.publish(ev), onStoreUpdate);
  handler.setWhitelist(whitelist);

  let announced = false;
  const publishFn = (ev) => pool.publish(ev);

  pool.onEvent((event) => handler.handleEvent(event));
  pool.onStatus((url, status) => {
    if (status === 'open') {
      const n = pool.size;
      if (onStatus) onStatus('on', `Connected (${n} relay${n > 1 ? 's' : ''})`);
      if (!announced) {
        announced = true;
        publishRelayList(secretKey, relayUrls, publishFn);
        publishRelayInfo(secretKey, publishFn);
      }
    } else if (status === 'error') {
      if (onStatus) onStatus('error', 'Connection error');
    }
  });

  pool.connect(relayUrls, pk);
  if (onStatus) onStatus('on', 'Connecting…');
  log.ok('Relay started.');
}

export function stopRelay() {
  if (pool) {
    pool.disconnectAll();
    pool = null;
  }
  handler = null;
  log.info('Relay stopped.');
}

export function updateWhitelist(whitelist) {
  if (handler) handler.setWhitelist(whitelist);
}
