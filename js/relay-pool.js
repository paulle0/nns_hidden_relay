/**
 * NNS Hidden Relay — Relay Pool
 * Manages multiple concurrent rendezvous relay connections.
 */
import { RelayConnection } from './relay-connection.js';
import * as log from './logger.js';

export class RelayPool {
  constructor() {
    this._connections = new Map();
    this._onEvent = null;
    this._onStatus = null;
  }

  onEvent(fn) { this._onEvent = fn; }
  onStatus(fn) { this._onStatus = fn; }

  connect(urls, ourPubkey) {
    for (const url of urls) {
      if (this._connections.has(url)) continue;
      const conn = new RelayConnection(url);
      conn.onEvent((event) => {
        if (this._onEvent) this._onEvent(event);
      });
      conn.onStatus((status, relayUrl) => {
        if (this._onStatus) this._onStatus(relayUrl, status);
      });
      conn.connect(ourPubkey);
      this._connections.set(url, conn);
    }
  }

  publish(signedEvent) {
    for (const conn of this._connections.values()) {
      conn.send(signedEvent);
    }
  }

  disconnectAll() {
    for (const [url, conn] of this._connections) {
      conn.disconnect();
      log.info(`Disconnected from ${url}`);
    }
    this._connections.clear();
  }

  get size() {
    return this._connections.size;
  }

  getStatuses() {
    const result = new Map();
    for (const [url, conn] of this._connections) {
      const ready = conn.ws?.readyState;
      let status = 'closed';
      if (ready === WebSocket.OPEN) status = 'open';
      else if (ready === WebSocket.CONNECTING) {
        status = 'connecting';
      }
      result.set(url, status);
    }
    return result;
  }
}
