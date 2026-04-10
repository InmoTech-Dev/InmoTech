
/**
 * SSE client service.
 * Keeps backward compatibility with legacy security events and adds
 * standardized realtime events for appointments/notifications.
 */

import { getApiBaseUrl } from '../config/runtime';

const parseRetryAfterMs = (rawValue) => {
  if (!rawValue) return null;

  const seconds = Number.parseInt(rawValue, 10);
  if (Number.isInteger(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryAt = Date.parse(rawValue);
  if (!Number.isFinite(retryAt)) return null;

  return Math.max(0, retryAt - Date.now());
};

class SSEService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this._isConnected = false;
    this.isConnecting = false;
    this.forcedDisconnect = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.reconnectTimer = null;
    this.verifySessionInFlight = false;
    this.verifySessionCooldownUntil = 0;
    this.verifySessionFailures = 0;
  }

  getApiBaseUrl() {
    return getApiBaseUrl();
  }

  parseEventData(event) {
    try {
      return JSON.parse(event.data);
    } catch {
      return null;
    }
  }

  emitConnectionState(extra = {}) {
    this.emit('connection_state', {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      forcedDisconnect: this.forcedDisconnect,
      ...extra,
    });
  }

  emitForcedLogout(payload = {}) {
    const reason = payload?.reason || payload?.action || 'session_revoked';
    const message = payload?.message || '¡Hasta luego! Vuelva pronto. La sesión se ha cerrado correctamente.';
    const occurredAt = payload?.occurred_at || payload?.timestamp || new Date().toISOString();

    const normalizedPayload = {
      reason,
      message,
      occurred_at: occurredAt,
    };

    this.emit('session.force_logout', normalizedPayload);
    // Backward compatibility for legacy subscribers.
    this.emit('user_disabled', {
      message,
      action: 'logout',
      timestamp: occurredAt,
      reason,
    });
  }

  async verifySessionAfterError() {
    const now = Date.now();
    if (this.verifySessionInFlight) {
      return { forceLogout: false, payload: null };
    }
    if (now < this.verifySessionCooldownUntil) {
      return { forceLogout: false, payload: null };
    }

    this.verifySessionInFlight = true;

    try {
      const response = await fetch(`${this.getApiBaseUrl()}/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 429) {
        this.verifySessionFailures += 1;
        const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
        const exponentialCooldown = 30000 * Math.min(2 ** (this.verifySessionFailures - 1), 8);
        const cooldownMs = Math.min(300000, Math.max(retryAfterMs || 0, exponentialCooldown));
        this.verifySessionCooldownUntil = Date.now() + cooldownMs;
        return { forceLogout: false, payload: null };
      }

      if (response.status === 401 || response.status === 403 || response.status === 423) {
        let payload = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        return {
          forceLogout: true,
          payload: {
            reason: payload?.reason || 'session_revoked',
            message: payload?.message || '¡Hasta luego! Vuelva pronto. La sesión se ha cerrado correctamente.',
            occurred_at: new Date().toISOString(),
          },
        };
      }

      if (response.ok) {
        this.verifySessionFailures = 0;
        this.verifySessionCooldownUntil = 0;
        return { forceLogout: false, payload: null };
      }

      this.verifySessionFailures += 1;
      const cooldownMs = Math.min(180000, 10000 * Math.min(2 ** (this.verifySessionFailures - 1), 8));
      this.verifySessionCooldownUntil = Date.now() + cooldownMs;

      return { forceLogout: false, payload: null };
    } catch (error) {
      this.verifySessionFailures += 1;
      const cooldownMs = Math.min(180000, 10000 * Math.min(2 ** (this.verifySessionFailures - 1), 8));
      this.verifySessionCooldownUntil = Date.now() + cooldownMs;
      console.warn('[SSE] Could not verify session after error:', error.message);
      return { forceLogout: false, payload: null };
    } finally {
      this.verifySessionInFlight = false;
    }
  }

  async connect() {
    if (this.forcedDisconnect) {
      return;
    }

    if (this.isConnected || this.isConnecting) {
      return;
    }

    if (this.eventSource && this.eventSource.readyState === EventSource.CONNECTING) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.disconnect();
    }

    try {
      this.isConnecting = true;
      const url = `${this.getApiBaseUrl()}/sse/connect?credentials=include`;
      this.eventSource = new EventSource(url, { withCredentials: true });

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        this._isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.emit('connected', { occurred_at: new Date().toISOString() });
        this.emitConnectionState({ source: 'onopen' });
      };

      this.eventSource.onmessage = (event) => {
        const data = this.parseEventData(event);
        if (!data) return;
        this.emit(event.type || 'message', data);
      };

      this.eventSource.onerror = async () => {
        const previousSource = this.eventSource;
        if (previousSource) {
          previousSource.close();
          if (this.eventSource === previousSource) {
            this.eventSource = null;
          }
        }

        this.isConnecting = false;
        this._isConnected = false;
        this.emit('disconnected', { occurred_at: new Date().toISOString() });
        this.emitConnectionState({ source: 'onerror' });

        const { forceLogout, payload } = await this.verifySessionAfterError();
        if (forceLogout) {
          this.setForcedDisconnect();
          this.emitForcedLogout(payload);
          return;
        }

        if (!this.forcedDisconnect) {
          this.handleReconnect();
        }
      };

      this.setupEventListeners();
    } catch (error) {
      this.isConnecting = false;
      console.error('[SSE] Error creating connection:', error);
      this.handleReconnect();
    }
  }

  setupEventListeners() {
    if (!this.eventSource) return;

    const bind = (eventName, callback) => {
      this.eventSource.addEventListener(eventName, (event) => {
        const data = this.parseEventData(event);
        if (!data) return;
        callback(data);
      });
    };

    bind('connected', (data) => this.emit('connected', data));

    bind('user_disabled', (data) => this.emit('user_disabled', data));
    bind('password_changed', (data) => this.emit('password_changed', data));
    bind('admin_access_revoked', (data) => this.emit('admin_access_revoked', data));

    bind('session.force_logout', (data) => this.emitForcedLogout(data));

    bind('appointment.changed', (data) => this.emit('appointment.changed', data));
    bind('notification.changed', (data) => this.emit('notification.changed', data));
    bind('user.changed', (data) => this.emit('user.changed', data));
    bind('report.changed', (data) => this.emit('report.changed', data));
    bind('role.changed', (data) => this.emit('role.changed', data));
    bind('access.changed', (data) => this.emit('access.changed', data));
    bind('presence.changed', (data) => this.emit('presence.changed', data));

    bind('heartbeat', (data) => this.emit('heartbeat', data));
  }

  handleReconnect() {
    if (this.forcedDisconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('max_reconnect_attempts_reached', {
        occurred_at: new Date().toISOString(),
      });
      this.emitConnectionState({ source: 'max_reconnect' });
      return;
    }

    this.reconnectAttempts += 1;
    this.emit('reconnect_scheduled', {
      attempt: this.reconnectAttempts,
      delay_ms: this.reconnectDelay,
      occurred_at: new Date().toISOString(),
    });

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  disconnect() {
    this.isConnecting = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this._isConnected = false;
      this.emitConnectionState({ source: 'disconnect' });
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (!callbacks || callbacks.size === 0) return;
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[SSE] Listener error for "${event}":`, error);
      }
    });
  }

  get isConnected() {
    return this._isConnected && this.eventSource && this.eventSource.readyState === EventSource.OPEN;
  }

  setForcedDisconnect() {
    this.forcedDisconnect = true;
  }

  resetForcedDisconnect() {
    this.forcedDisconnect = false;
    this.isConnecting = false;
    this.verifySessionFailures = 0;
    this.verifySessionCooldownUntil = 0;
  }

  getStats() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      readyState: this.eventSource ? this.eventSource.readyState : -1,
      listenersCount: this.listeners.size,
      forcedDisconnect: this.forcedDisconnect,
    };
  }
}

export default new SSEService();
