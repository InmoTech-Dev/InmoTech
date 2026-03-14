const rateLimit = require('express-rate-limit');

const toPositiveInt = (rawValue, fallbackValue) => {
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallbackValue;
};

const createJsonLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({
        success: false,
        message,
      });
    },
  });

const generalWindowMs = toPositiveInt(
  process.env.RATE_LIMIT_GENERAL_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS,
  15 * 60 * 1000
);
const generalMaxRequests = toPositiveInt(
  process.env.RATE_LIMIT_GENERAL_MAX_REQUESTS || process.env.RATE_LIMIT_MAX_REQUESTS,
  600
);

const generalLimiter = createJsonLimiter({
  windowMs: generalWindowMs,
  max: generalMaxRequests,
  message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo mas tarde',
});

const strictLimiter = createJsonLimiter({
  windowMs: toPositiveInt(process.env.RATE_LIMIT_STRICT_WINDOW_MS, 15 * 60 * 1000),
  max: toPositiveInt(process.env.RATE_LIMIT_STRICT_MAX_REQUESTS, 100), // Subido de 30 a 100
  message: 'Limite de solicitudes excedido para esta operacion',
});

const createLimiter = createJsonLimiter({
  windowMs: toPositiveInt(process.env.RATE_LIMIT_CREATE_WINDOW_MS, 60 * 60 * 1000),
  max: toPositiveInt(process.env.RATE_LIMIT_CREATE_MAX_REQUESTS, 50), // Subido de 20 a 50
  message: 'Has alcanzado el limite de citas que puedes crear por hora',
});

// Límite específico para creación de arrendatarios (evita mensaje de "citas")
const renantsLimiter = createJsonLimiter({
  windowMs: toPositiveInt(process.env.RATE_LIMIT_RENANTS_WINDOW_MS, 60 * 60 * 1000),
  max: toPositiveInt(process.env.RATE_LIMIT_RENANTS_MAX_REQUESTS, 60),
  message: 'Has alcanzado el límite de arrendatarios que puedes crear por hora',
});

// Limita intentos de login y operaciones sensibles de invitaciones
const loginLimiter = createJsonLimiter({
  windowMs: toPositiveInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 15 * 60 * 1000),
  max: toPositiveInt(process.env.RATE_LIMIT_LOGIN_MAX_REQUESTS, 20), // Subido de 10 a 20
  message: 'Demasiados intentos. Intenta de nuevo en unos minutos.',
});

const invitationLimiter = createJsonLimiter({
  windowMs: toPositiveInt(process.env.RATE_LIMIT_INVITATION_WINDOW_MS, 60 * 60 * 1000),
  max: toPositiveInt(process.env.RATE_LIMIT_INVITATION_MAX_REQUESTS, 30), // Subido de 15 a 30
  message: 'Demasiadas solicitudes. Intenta nuevamente mas tarde.',
});

const forgotPasswordLimiter = createJsonLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Demasiadas solicitudes de recuperacion. Intenta nuevamente mas tarde.',
});

const identityLookupLimiter = createJsonLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: 'Demasiadas consultas de documento. Intenta nuevamente en unos minutos.',
});

const uploadLimiter = createJsonLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Demasiadas cargas de archivos. Intenta nuevamente mas tarde.',
});

const setupLimiter = createJsonLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Limite de solicitudes de setup excedido. Intenta nuevamente mas tarde.',
});

const authMeLimiter = createJsonLimiter({
  windowMs: toPositiveInt(process.env.RATE_LIMIT_AUTH_ME_WINDOW_MS, 15 * 60 * 1000),
  max: toPositiveInt(process.env.RATE_LIMIT_AUTH_ME_MAX_REQUESTS, 300),
  message: 'Demasiadas solicitudes de perfil. Intenta nuevamente en unos minutos.',
});

const sseConnectLimiter = createJsonLimiter({
  windowMs: toPositiveInt(process.env.RATE_LIMIT_SSE_CONNECT_WINDOW_MS, 5 * 60 * 1000),
  max: toPositiveInt(process.env.RATE_LIMIT_SSE_CONNECT_MAX_REQUESTS, 40),
  message: 'Demasiados intentos de reconexion en tiempo real. Intenta nuevamente en unos minutos.',
});

const sanitizeInput = (req, res, next) => {
  // Permitir saltar sanitizacion si esta marcada
  if (req.skipSanitize) {
    return next();
  }

  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>]/g, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach((key) => {
        obj[key] = sanitize(obj[key]);
      });
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

module.exports = {
  generalLimiter,
  authMeLimiter,
  sseConnectLimiter,
  strictLimiter,
  createLimiter,
  renantsLimiter,
  loginLimiter,
  invitationLimiter,
  forgotPasswordLimiter,
  identityLookupLimiter,
  uploadLimiter,
  setupLimiter,
  sanitizeInput,
};
