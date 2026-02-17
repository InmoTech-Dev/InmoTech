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

const ACCESS_TOKEN_KEY = 'inmotech_access_token';
const REFRESH_TOKEN_KEY = 'inmotech_refresh_token';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const REFRESH_ENDPOINT = '/auth/refresh';
const LOGOUT_ENDPOINT = '/auth/logout';
const PUBLIC_AUTH_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/verify-code',
  '/auth/resend-code',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

class ApiClient {
  constructor() {
    this.maxRetries = API_CONFIG.RETRY_ATTEMPTS;
    this.accessToken = null;
    this.refreshToken = null;
    this.onUnauthorized = null;
    this.refreshPromise = null;
    this.isHandlingUnauthorized = false;
    this.loadTokensFromStorage();
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

  getCookieValue(name) {
    if (typeof document === 'undefined' || !document.cookie) return null;
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  getCsrfToken() {
    return this.getCookieValue(API_CONFIG.CSRF_COOKIE_NAME);
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken || null;
    this.refreshToken = refreshToken || null;

    try {
      if (accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      }

      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    } catch {
      // noop
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // noop
    }
  }

  getAccessToken() {
    if (this.accessToken) return this.accessToken;
    try {
      const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
      this.accessToken = stored || null;
      return this.accessToken;
    } catch {
      return null;
    }
  }

  getRefreshToken() {
    if (this.refreshToken) return this.refreshToken;
    try {
      const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
      this.refreshToken = stored || null;
      return this.refreshToken;
    } catch {
      return null;
    }
  }

  loadTokensFromStorage() {
    try {
      this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY) || null;
      this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || null;
    } catch {
      this.accessToken = null;
      this.refreshToken = null;
    }
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
    const refreshToken = this.getRefreshToken();
    const body = refreshToken ? JSON.stringify({ refreshToken }) : '{}';

    const response = await fetch(`${API_CONFIG.BASE_URL}${REFRESH_ENDPOINT}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...API_CONFIG.HEADERS,
      },
      body,
    });

    if (!response.ok) {
      return false;
    }

    const payload = await this.parseResponsePayload(response);
    if (payload?.success && payload?.data?.accessToken) {
      this.setTokens(payload.data.accessToken, payload.data.refreshToken);
      return true;
    }

    return false;
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

    if (this.shouldIncludeAuth(options)) {
      const accessToken = this.getAccessToken();
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    const method = options.method || 'GET';
    if (this.isMutatingMethod(method)) {
      const csrfToken = this.getCsrfToken();
      if (csrfToken && !headers[API_CONFIG.CSRF_HEADER_NAME]) {
        headers[API_CONFIG.CSRF_HEADER_NAME] = csrfToken;
      }
    }

    return headers;
  }

  async request(endpoint, options = {}, retryCount = 0) {
    const normalizedEndpoint = this.normalizeEndpoint(endpoint);
    const isRetryAfterRefresh = options.__isRetryAfterRefresh === true;
    const skipAuthRefresh = options.skipAuthRefresh === true || options.skipAuth === true;

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
      headers: this.buildRequestHeaders(normalizedEndpoint, options),
      credentials: 'include',
      signal: controller.signal,
    };

    delete config.params;
    delete config.__isRetryAfterRefresh;
    delete config.skipAuthRefresh;
    delete config.skipAuth;

    try {
      const response = await fetch(url.toString(), config);
      clearTimeout(timeoutId);

      if (response.status === 401) {
        const isAuthEndpoint =
          this.isRefreshEndpoint(normalizedEndpoint) || this.isLogoutEndpoint(normalizedEndpoint);
        const isPublicAuthEndpoint = this.isPublicAuthEndpoint(normalizedEndpoint);

        if (!isAuthEndpoint && !isPublicAuthEndpoint && !isRetryAfterRefresh && !skipAuthRefresh) {
          const refreshed = await this.refreshSessionSingleFlight();
          if (refreshed) {
            return this.request(
              normalizedEndpoint,
              { ...options, __isRetryAfterRefresh: true },
              retryCount
            );
          }
        }

        if (!isAuthEndpoint && !isPublicAuthEndpoint && !skipAuthRefresh) {
          await this.triggerUnauthorized('unauthorized');
        }

        const payload = await this.parseResponsePayload(response);
        throw this.buildError(response.status, payload, 'Sesion no autorizada');
      }

      if (response.status === 429) {
        if (retryCount < API_CONFIG.RETRY_ATTEMPTS + 2) {
          const waitTime = API_CONFIG.RETRY_DELAY * (retryCount + 1);
          await this.delay(waitTime);
          return this.request(normalizedEndpoint, options, retryCount + 1);
        }
        throw new Error('Demasiadas peticiones. Por favor, espera e intenta nuevamente.');
      }

      if (!response.ok) {
        const errorPayload = await this.parseResponsePayload(response);
        throw this.buildError(response.status, errorPayload, response.statusText);
      }

      const data = await this.parseResponsePayload(response);
      if (data?.success && data?.data?.accessToken) {
        this.setTokens(data.data.accessToken, data.data.refreshToken);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        if (retryCount < API_CONFIG.RETRY_ATTEMPTS) {
          await this.delay(API_CONFIG.RETRY_DELAY);
          return this.request(normalizedEndpoint, options, retryCount + 1);
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
    }
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
