/**
 * Cliente API usando fetch + cookies httpOnly.
 * Incluye refresh single-flight, retry unico en 401 y envio de CSRF para mutaciones.
 */

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  TIMEOUT: 60000,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
  CSRF_COOKIE_NAME: import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrfToken',
  CSRF_HEADER_NAME: import.meta.env.VITE_CSRF_HEADER_NAME || 'X-CSRF-Token',
};

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const REFRESH_ENDPOINT = '/auth/refresh';
const LOGOUT_ENDPOINT = '/auth/logout';
const PUBLIC_AUTH_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

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

class ApiClient {
  constructor() {
    this.maxRetries = API_CONFIG.RETRY_ATTEMPTS;
    this.onUnauthorized = null;
    this.refreshPromise = null;
    this.isHandlingUnauthorized = false;
    this.inFlightGetRequests = new Map();
  }

  registerUnauthorizedCallback(callback) {
    this.onUnauthorized = callback;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  normalizeEndpoint(endpoint) {
    if (!endpoint) return '/';
    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }

  shouldIncludeAuth(options = {}) {
    return options.skipAuth !== true;
  }

  isMutatingMethod(method = 'GET') {
    return MUTATING_METHODS.has(String(method).toUpperCase());
  }

  isRefreshEndpoint(endpoint = '') {
    return endpoint.startsWith(REFRESH_ENDPOINT);
  }

  isLogoutEndpoint(endpoint = '') {
    return endpoint.startsWith(LOGOUT_ENDPOINT);
  }

  isPublicAuthEndpoint(endpoint = '') {
    return PUBLIC_AUTH_ENDPOINTS.has(endpoint);
  }

  isSseEndpoint(endpoint = '') {
    return endpoint.startsWith('/sse');
  }

  getCookieValue(name) {
    if (typeof document === 'undefined' || !document.cookie) return null;
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  getCsrfToken() {
    return this.getCookieValue(API_CONFIG.CSRF_COOKIE_NAME);
  }

  setTokens() {
    // Cookies httpOnly gestionan sesion; no guardar tokens en JS storage.
  }

  clearTokens() {
    // Cookies httpOnly gestionan sesion; no limpiar tokens en JS storage.
  }

  getAccessToken() {
    return null;
  }

  getRefreshToken() {
    return null;
  }

  loadTokensFromStorage() {
    // Cookies httpOnly gestionan sesion; no leer tokens desde JS storage.
  }

  async parseResponsePayload(response) {
    return response.json().catch(() => null);
  }

  buildError(status, payload, fallbackMessage) {
    const error = new Error(payload?.message || fallbackMessage || `Error ${status}`);
    error.status = status;
    error.data = payload || null;
    return error;
  }

  shouldForceLogout(status, payload) {
    if (status === 401) return true;
    if (status !== 403 && status !== 423) return false;

    if (payload?.forceLogout === true) return true;

    const reason = String(payload?.reason || '').toLowerCase();
    return reason === 'account_disabled' || reason === 'admin_access_revoked' || reason === 'session_revoked';
  }

  getUnauthorizedReason(payload, fallback = 'unauthorized') {
    const reason = payload?.reason;
    return typeof reason === 'string' && reason.trim() ? reason : fallback;
  }

  async triggerUnauthorized(reason = 'unauthorized') {
    if (!this.onUnauthorized || this.isHandlingUnauthorized) return;

    this.isHandlingUnauthorized = true;
    try {
      await Promise.resolve(this.onUnauthorized(reason));
    } finally {
      this.isHandlingUnauthorized = false;
    }
  }

  async performRefresh() {
    const response = await fetch(`${API_CONFIG.BASE_URL}${REFRESH_ENDPOINT}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...API_CONFIG.HEADERS,
      },
      body: '{}',
    });

    if (!response.ok) {
      return false;
    }

    const payload = await this.parseResponsePayload(response);
    return payload?.success === true;
  }

  async refreshSessionSingleFlight() {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  buildRequestHeaders(endpoint, options = {}) {
    const headers = {
      ...API_CONFIG.HEADERS,
      ...(options.headers || {}),
    };

    const method = options.method || 'GET';
    if (this.isMutatingMethod(method)) {
      const csrfToken = this.getCsrfToken();
      if (csrfToken && !headers[API_CONFIG.CSRF_HEADER_NAME]) {
        headers[API_CONFIG.CSRF_HEADER_NAME] = csrfToken;
      }
    }

    return headers;
  }

  buildGetRequestKey(normalizedEndpoint, params = {}) {
    const entries = Object.entries(params || {})
      .filter(([, value]) => value !== null && value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

    return entries.length > 0 ? `${normalizedEndpoint}?${entries.join('&')}` : normalizedEndpoint;
  }

  async request(endpoint, options = {}, retryCount = 0) {
    const normalizedEndpoint = this.normalizeEndpoint(endpoint);
    const isRetryAfterRefresh = options.__isRetryAfterRefresh === true;
    const skipAuthRefresh = options.skipAuthRefresh === true || options.skipAuth === true;
    const skipDedup = options.__skipDedup === true || options.disableDedup === true;
    const method = String(options.method || 'GET').toUpperCase();
    const shouldDedup = method === 'GET' && !skipDedup;
    const requestKey = shouldDedup
      ? this.buildGetRequestKey(normalizedEndpoint, options.params || {})
      : null;

    const runRequest = async () => {
      const url = new URL(`${API_CONFIG.BASE_URL}${normalizedEndpoint}`);
      if (options.params && Object.keys(options.params).length > 0) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            url.searchParams.append(key, value);
          }
        });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const config = {
        ...options,
        method,
        headers: this.buildRequestHeaders(normalizedEndpoint, options),
        credentials: 'include',
        signal: controller.signal,
      };

      delete config.params;
      delete config.__isRetryAfterRefresh;
      delete config.skipAuthRefresh;
      delete config.skipAuth;
      delete config.__skipDedup;
      delete config.disableDedup;

      try {
        const response = await fetch(url.toString(), config);

        const isAuthEndpoint =
          this.isRefreshEndpoint(normalizedEndpoint) || this.isLogoutEndpoint(normalizedEndpoint);
        const isPublicAuthEndpoint = this.isPublicAuthEndpoint(normalizedEndpoint);

        if (response.status === 401) {
          if (!isAuthEndpoint && !isPublicAuthEndpoint && !isRetryAfterRefresh && !skipAuthRefresh) {
            const refreshed = await this.refreshSessionSingleFlight();
            if (refreshed) {
              return this.request(
                normalizedEndpoint,
                { ...options, __isRetryAfterRefresh: true, __skipDedup: true },
                retryCount
              );
            }
          }

          const payload = await this.parseResponsePayload(response);
          if (
            !isAuthEndpoint &&
            !isPublicAuthEndpoint &&
            !skipAuthRefresh &&
            this.shouldForceLogout(response.status, payload)
          ) {
            await this.triggerUnauthorized(this.getUnauthorizedReason(payload, 'unauthorized'));
          }
          throw this.buildError(response.status, payload, 'Sesion no autorizada');
        }

        if (response.status === 403 || response.status === 423) {
          const payload = await this.parseResponsePayload(response);

          if (
            !isAuthEndpoint &&
            !isPublicAuthEndpoint &&
            !skipAuthRefresh &&
            this.shouldForceLogout(response.status, payload)
          ) {
            await this.triggerUnauthorized(this.getUnauthorizedReason(payload, 'session_revoked'));
          }

          throw this.buildError(response.status, payload, payload?.message || response.statusText);
        }

        if (response.status === 429) {
          const payload = await this.parseResponsePayload(response);
          const canRetry =
            method === 'GET' &&
            !isAuthEndpoint &&
            !isPublicAuthEndpoint &&
            !this.isSseEndpoint(normalizedEndpoint) &&
            retryCount < 1;

          if (canRetry) {
            const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
            const waitTime = Math.min(
              30000,
              Math.max(retryAfterMs || API_CONFIG.RETRY_DELAY, API_CONFIG.RETRY_DELAY)
            );
            await this.delay(waitTime);
            return this.request(normalizedEndpoint, { ...options, __skipDedup: true }, retryCount + 1);
          }

          throw this.buildError(
            429,
            payload,
            'Demasiadas peticiones. Por favor, espera e intenta nuevamente.'
          );
        }

        if (!response.ok) {
          const errorPayload = await this.parseResponsePayload(response);
          throw this.buildError(response.status, errorPayload, response.statusText);
        }

        return await this.parseResponsePayload(response);
      } catch (error) {
        if (error.name === 'AbortError') {
          const canRetryTimeout =
            retryCount < API_CONFIG.RETRY_ATTEMPTS &&
            method === 'GET' &&
            !this.isRefreshEndpoint(normalizedEndpoint) &&
            !this.isLogoutEndpoint(normalizedEndpoint) &&
            !this.isSseEndpoint(normalizedEndpoint);

          if (canRetryTimeout) {
            await this.delay(API_CONFIG.RETRY_DELAY);
            return this.request(normalizedEndpoint, { ...options, __skipDedup: true }, retryCount + 1);
          }

          const timeoutError = new Error('La peticion tardo demasiado tiempo.');
          timeoutError.code = 'TIMEOUT';
          throw timeoutError;
        }

        if (error.message === 'Failed to fetch') {
          const networkError = new Error('No se pudo conectar con el servidor.');
          networkError.code = 'NETWORK_ERROR';
          throw networkError;
        }

        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    if (!shouldDedup) {
      return runRequest();
    }

    const inFlight = this.inFlightGetRequests.get(requestKey);
    if (inFlight) {
      return inFlight;
    }

    const pendingRequest = runRequest().finally(() => {
      this.inFlightGetRequests.delete(requestKey);
    });
    this.inFlightGetRequests.set(requestKey, pendingRequest);
    return pendingRequest;
  }

  async get(endpoint, paramsOrOptions = {}) {
    const isOptionsObject =
      paramsOrOptions &&
      typeof paramsOrOptions === 'object' &&
      (Object.prototype.hasOwnProperty.call(paramsOrOptions, 'params') ||
        Object.prototype.hasOwnProperty.call(paramsOrOptions, 'headers') ||
        Object.prototype.hasOwnProperty.call(paramsOrOptions, 'method') ||
        Object.prototype.hasOwnProperty.call(paramsOrOptions, 'body') ||
        Object.prototype.hasOwnProperty.call(paramsOrOptions, 'cache') ||
        Object.prototype.hasOwnProperty.call(paramsOrOptions, 'credentials') ||
        Object.prototype.hasOwnProperty.call(paramsOrOptions, 'skipAuth') ||
        Object.prototype.hasOwnProperty.call(paramsOrOptions, 'skipAuthRefresh'));

    if (isOptionsObject) {
      const { params = {}, ...rest } = paramsOrOptions;
      return this.request(endpoint, {
        method: 'GET',
        params,
        ...rest,
      });
    }

    return this.request(endpoint, { method: 'GET', params: paramsOrOptions });
  }

  async post(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  async put(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
  }

  async patch(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
  }

  async delete(endpoint, headers = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      headers,
    });
  }
}

export const apiClient = new ApiClient();
export { API_CONFIG };
