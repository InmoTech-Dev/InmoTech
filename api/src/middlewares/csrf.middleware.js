const crypto = require('crypto');
const logger = require('../utils/logger');

const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'csrfToken';
const CSRF_HEADER_NAME = (process.env.CSRF_HEADER_NAME || 'X-CSRF-Token').toLowerCase();
const CSRF_ENFORCED = () => process.env.CSRF_ENFORCED === 'true';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXCLUDED_PATHS = new Set([
  `${API_PREFIX}/auth/logout`,
  `${API_PREFIX}/auth/refresh`,
]);

const normalizePath = (req) => {
  const rawPath = req.originalUrl || req.url || '';
  return rawPath.split('?')[0];
};

const isMutatingRequest = (req) => MUTATING_METHODS.has((req.method || '').toUpperCase());

const isAuthenticatedMutation = (req) => {
  return !!req.cookies?.accessToken;
};

const csrfProtection = (req, res, next) => {
  if (!isMutatingRequest(req)) {
    return next();
  }

  const path = normalizePath(req);
  if (EXCLUDED_PATHS.has(path)) {
    return next();
  }

  // Solo mutaciones autenticadas.
  if (!isAuthenticatedMutation(req)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers?.[CSRF_HEADER_NAME];
  const isValid = !!cookieToken && cookieToken === headerToken;

  if (isValid) {
    return next();
  }

  const payload = {
    method: req.method,
    path,
    hasCookieToken: !!cookieToken,
    hasHeaderToken: !!headerToken,
    enforced: CSRF_ENFORCED(),
  };

  if (!CSRF_ENFORCED()) {
    logger.warn('[CSRF] Invalid token detected (observation mode)', payload);
    return next();
  }

  logger.warn('[CSRF] Invalid token blocked', payload);
  return res.status(403).json({
    success: false,
    message: 'Token CSRF invalido',
    code: 'CSRF_INVALID',
  });
};

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

module.exports = {
  csrfProtection,
  generateCsrfToken,
  CSRF_COOKIE_NAME,
};
