const logger = require('../utils/logger');

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000', 'capacitor://localhost', 'ionic://localhost'];

const isDevelopment = process.env.NODE_ENV !== 'production';

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  if (
    isDevelopment &&
    (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))
  ) {
    return true;
  }

  return false;
};

const extractOrigin = (req) => {
  const originHeader = req.get('origin');
  if (originHeader) return originHeader;

  const refererHeader = req.get('referer');
  if (!refererHeader) return null;

  try {
    return new URL(refererHeader).origin;
  } catch {
    return null;
  }
};

const validateAuthOrigin = (req, res, next) => {
  if (process.env.AUTH_VALIDATE_ORIGIN !== 'true') {
    return next();
  }

  const origin = extractOrigin(req);
  if (isAllowedOrigin(origin)) {
    return next();
  }

  logger.warn('[AUTH] Origin validation blocked request', {
    method: req.method,
    path: req.originalUrl,
    origin,
  });

  return res.status(403).json({
    success: false,
    message: 'Origen no permitido',
    code: 'ORIGIN_NOT_ALLOWED',
  });
};

module.exports = {
  validateAuthOrigin,
};
