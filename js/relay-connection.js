/**
 * NNS Hidden Relay — WebSocket connection to a single rendezvous relay
 */
import * as log from './logger.js';

export class RelayConnection {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this._onEvent = null;
    this._onStatus = null;
    this._subId = null;
    this._reconnectTimer = null;
    this._intentionallyClosed = false;
  }

  onEvent(fn) { this._onEvent = fn; }
  onStatus(fn) { this._onStatus = fn; }

  connect(ourPubkey) {
    this._intentionallyClosed = false;
    this._ourPubkey = ourPubkey;
    this._openSocket();
  }

  _openSocket() {
    if (this.ws) this._cleanup();
    this._setStatus('connecting');
    log.info(`Connecting to ${this.url}…`);

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this._setStatus('open');
      log.ok(`Connected to ${this.url}`);
      this._subscribe();
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        this._handleMessage(msg);
      } catch (e) {
        log.err(`Bad message: ${e.message}`);
      }
    };

    this.ws.onerror = () => {
      log.err(`WebSocket error on ${this.url}`);
      this._setStatus('error');
    };

    this.ws.onclose = () => {
      this._setStatus('closed');
      if (!this._intentionallyClosed) {
        log.info(`Lost ${this.url}. Reconnecting in 5s…`);
        this._reconnectTimer = setTimeout(() => this._openSocket(), 5000);
      }
    };
  }

  _subscribe() {
    this._subId = 'nns_' + Math.random().toString(36).slice(2, 10);
    const filter = { kinds: [27901], '#p': [this._ourPubkey] };
    this.ws.send(JSON.stringify(['REQ', this._subId, filter]));
    log.info(`Sub ${this._subId} on ${this.url}`);
  }

  _handleMessage(msg) {
    if (!Array.isArray(msg)) return;
    const [type] = msg;
    if (type === 'EVENT' && msg[2]) {
      if (this._onEvent) this._onEvent(msg[2]);
    } else if (type === 'EOSE') {
      log.info(`EOSE on ${this.url}`);
    } else if (type === 'NOTICE') {
      log.info(`Notice (${this.url}): ${msg[1]}`);
    } else if (type === 'OK') {
      const [, eventId, success, reason] = msg;
      if (success) {
        log.ok(`Published ${eventId.slice(0, 12)}…`);
      } else {
        log.err(`Rejected: ${reason}`);
      }
    }
  }

  send(signedEvent) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(['EVENT', signedEvent]));
    }
  }

  disconnect() {
    this._intentionallyClosed = true;
    clearTimeout(this._reconnectTimer);
    if (this.ws) {
      if (this._subId && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(['CLOSE', this._subId]));
      }
      this.ws.close();
    }
    this._cleanup();
  }

  _cleanup() {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws = null;
    }
    this._subId = null;
  }

  _setStatus(s) {
    if (this._onStatus) this._onStatus(s, this.url);
  }
}
