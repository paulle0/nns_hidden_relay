/**
 * NNS Hidden Relay — Relay Pool
 * Manages multiple concurrent rendezvous relay connections.
 */
import { RelayConnection } from './relay-connection.js';
import * as log from './logger.js';

export class RelayPool {
  constructor() {
    this._connections = new Map(); // url → RelayConnection
    this._onEvent = null;
    this._onStatus = null;
  }

  /** Set callback for incoming events from any relay: fn(event) */
  onEvent(fn) { this._onEvent = fn; }

  /** Set callback for status changes: fn(url, status) */
  onStatus(fn) { this._onStatus = fn; }

  /**
   * Connect to a list of relay URLs.
   * @param {string[]} urls
   * @param {string} ourPubkey — hex public key
   */
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

  /** Publish a signed event to all connected relays. */
  publish(signedEvent) {
    for (const conn of this._connections.values()) {
      conn.send(signedEvent);
    }
  }

  /** Disconnect all relays. */
  disconnectAll() {
    for (const [url, conn] of this._connections) {
      conn.disconnect();
      log.info(`Disconnected from ${url}`);
    }
    this._connections.clear();
  }

  /** Get the number of active connections. */
  get size() {
    return this._connections.size;
  }

  /** Get status summary: Map<url, status> */
  getStatuses() {
    const result = new Map();
    for (const [url, conn] of this._connections) {
      const ready = conn.ws?.readyState;
      let status = 'closed';
      if (ready === WebSocket.OPEN) status = 'open';
      else if (ready === WebSocket.CONNECTING) status = 'connecting';
      result.set(url, status);
    }
    return result;
  }
}
