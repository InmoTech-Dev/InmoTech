const DEFAULT_LOCAL_FRONTEND_URL = 'http://localhost:3000';
const DEFAULT_LOCAL_API_URL = 'http://localhost:5000';
const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'capacitor://localhost',
  'ionic://localhost',
];
const DEFAULT_PRODUCTION_FRONTEND_URL = 'https://inmotech-red.vercel.app';
const DEFAULT_PRODUCTION_API_URL = 'https://inmotech-api.azurewebsites.net';

const isProduction = process.env.NODE_ENV === 'production';

const normalizeUrl = (value, fallback = '') => {
  const candidate = String(value || fallback || '').trim();
  if (!candidate) return '';
  return candidate.replace(/\/+$/, '');
};

const splitCsv = (value = '') =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const toUniqueList = (values = []) => Array.from(new Set(values.filter(Boolean)));

const apiBaseUrl = normalizeUrl(
  process.env.PUBLIC_API_URL,
  isProduction ? DEFAULT_PRODUCTION_API_URL : DEFAULT_LOCAL_API_URL
);

const frontendUrl = normalizeUrl(
  process.env.FRONTEND_URL || process.env.CLIENT_URL,
  isProduction ? DEFAULT_PRODUCTION_FRONTEND_URL : DEFAULT_LOCAL_FRONTEND_URL
);

const invitationUrlBase = normalizeUrl(
  process.env.INVITATION_URL_BASE,
  frontendUrl ? `${frontendUrl}/activar` : ''
);

const emailVerificationUrlBase = normalizeUrl(
  process.env.EMAIL_VERIFICATION_URL_BASE,
  frontendUrl ? `${frontendUrl}/verificar-correo` : ''
);

const passwordResetFrontendUrl = normalizeUrl(
  process.env.PASSWORD_RESET_FRONTEND_URL || process.env.FRONTEND_URL || process.env.CLIENT_URL,
  frontendUrl
);

const isLocalOrigin = (origin = '') =>
  /^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/.test(String(origin || '').trim());

const allowedOrigins = (() => {
  const configuredOrigins = splitCsv(process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN);
  if (configuredOrigins.length > 0) {
    return toUniqueList(configuredOrigins.map((origin) => normalizeUrl(origin)));
  }

  if (isProduction) {
    return frontendUrl ? [frontendUrl] : [];
  }

  return DEFAULT_LOCAL_ORIGINS.slice();
})();

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = normalizeUrl(origin);
  if (!normalizedOrigin) return true;
  if (allowedOrigins.includes(normalizedOrigin)) return true;
  return !isProduction && isLocalOrigin(normalizedOrigin);
};

module.exports = {
  apiBaseUrl,
  frontendUrl,
  allowedOrigins,
  invitationUrlBase,
  emailVerificationUrlBase,
  passwordResetFrontendUrl,
  isProduction,
  isLocalOrigin,
  isAllowedOrigin,
};
