const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // 1 hour for development
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // Increased for development
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Límite de solicitudes excedido para esta operación'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Has alcanzado el límite de citas que puedes crear por hora'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Limita intentos de login y operaciones sensibles de invitaciones
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Demasiados intentos. Intenta de nuevo en unos minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const invitationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intenta nuevamente más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de recuperacion. Intenta nuevamente mas tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const identityLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: {
    success: false,
    message: 'Demasiadas consultas de documento. Intenta nuevamente en unos minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Demasiadas cargas de archivos. Intenta nuevamente mas tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Limite de solicitudes de setup excedido. Intenta nuevamente mas tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const sanitizeInput = (req, res, next) => {
  // Permitir saltar sanitización si está marcada
  if (req.skipSanitize) {
    return next();
  }

  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>]/g, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
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
  strictLimiter,
  createLimiter,
  loginLimiter,
  invitationLimiter,
  forgotPasswordLimiter,
  identityLookupLimiter,
  uploadLimiter,
  setupLimiter,
  sanitizeInput
};
