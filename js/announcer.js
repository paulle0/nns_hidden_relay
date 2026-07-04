// js/announcer.js — Publishes kind:10112 (relay list) and kind:10113 (relay info)
import { KIND, DEFAULTS } from './config.js';
import * as crypto from './crypto.js';
import * as log from './logger.js';

export function publishRelayList(sk, relayUrls, publishFn) {
  const tags = relayUrls.map(url => ['r', url]);
  const event = crypto.signEvent(sk, {
    kind: KIND.RELAY_LIST,
    tags,
    content: '',
  });
  publishFn(event);
  log.ok('Published kind:10112 (rendezvous relay list)');
}

export function publishRelayInfo(sk, publishFn) {
  const infoDoc = JSON.stringify({
    name: DEFAULTS.relayName,
    description: DEFAULTS.relayDescription,
    supported_nips: [1, 11],
    software: 'nns-hidden-relay',
    version: '0.1.0',
  });
  const event = crypto.signEvent(sk, {
    kind: KIND.RELAY_INFO,
    tags: [['encryption', 'nip44_v2']],
    content: infoDoc,
  });
  publishFn(event);
  log.ok('Published kind:10113 (relay info document)');
}
