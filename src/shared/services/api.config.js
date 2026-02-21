/**
 * Cliente API simplificado usando fetch con cookies httpOnly.
 */

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  TIMEOUT: 60000,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

const ACCESS_TOKEN_KEY = 'inmotech_access_token';
const REFRESH_TOKEN_KEY = 'inmotech_refresh_token';

class ApiClient {
  constructor() {
    this.maxRetries = 2;
    this.accessToken = null;
    this.refreshToken = null;
    this.loadTokensFromStorage();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Manejo simple de tokens para adjuntar Authorization en cada request
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
      // En entornos sin localStorage (SSR/tests), ignorar
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

  async request(endpoint, options = {}, retryCount = 0) {
    const url = new URL(`${API_CONFIG.BASE_URL}${endpoint}`);

    if (options.params && Object.keys(options.params).length > 0) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, value);
        }
      });
    }

    // Asegurar que tomamos el token más reciente almacenado
    const token = this.getAccessToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    const isFormData = options.body instanceof FormData;

    const config = {
      ...options,
      headers: {
        ...API_CONFIG.HEADERS,
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      signal: controller.signal,
    };

    // No forzar Content-Type en multipart
    if (isFormData) {
      delete config.headers['Content-Type'];
    } else if (options.body && typeof options.body !== 'string') {
      config.body = JSON.stringify(options.body);
    }

    // No reenviar params en fetch
    delete config.params;

    try {
      const response = await fetch(url.toString(), config);
      clearTimeout(timeoutId);

      if (response.status === 429) {
        if (retryCount < API_CONFIG.RETRY_ATTEMPTS + 2) {
          const waitTime = API_CONFIG.RETRY_DELAY * (retryCount + 1);
          await this.delay(waitTime);
          return this.request(endpoint, options, retryCount + 1);
        }
        throw new Error('Demasiadas peticiones. Por favor, espera e intenta nuevamente.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: response.statusText,
        }));
        const error = new Error(errorData.message || `Error ${response.status}`);
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      const data = await response.json();

      if (data?.success && data?.data?.accessToken) {
        this.setTokens(data.data.accessToken, data.data.refreshToken);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        if (retryCount < API_CONFIG.RETRY_ATTEMPTS) {
          await this.delay(API_CONFIG.RETRY_DELAY);
          return this.request(endpoint, options, retryCount + 1);
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
    // Allow passing either a plain params object or a full options object (with params, headers, etc.)
    const isOptionsObject =
      paramsOrOptions &&
      typeof paramsOrOptions === 'object' &&
      (Object.prototype.hasOwnProperty.call(paramsOrOptions, 'params') ||
        Object.prototype.hasOwnProperty.call(paramsOrOptions, 'headers') ||
        Object.prototype.hasOwnProperty.call(paramsOrOptions, 'method') ||
        Object.prototype.hasOwnProperty.call(paramsOrOptions, 'body') ||
        Object.prototype.hasOwnProperty.call(paramsOrOptions, 'cache') ||
        Object.prototype.hasOwnProperty.call(paramsOrOptions, 'credentials'));

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
      body,
    });
  }

  async put(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      headers,
      body,
    });
  }

  async patch(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      headers,
      body,
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
