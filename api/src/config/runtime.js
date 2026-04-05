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
const DEFAULT_PRODUCTION_API_URL = 'https://inmotech-api.duckdns.org';

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

const parseOriginPattern = (value) => {
  const normalizedValue = normalizeUrl(value);
  if (!normalizedValue) return null;

  try {
    const parsed = new URL(normalizedValue);
    const wildcardPrefix = '*.';
    const isWildcardHost = parsed.hostname.startsWith(wildcardPrefix);

    return {
      raw: normalizedValue,
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      isWildcardHost,
      hostnameSuffix: isWildcardHost ? parsed.hostname.slice(wildcardPrefix.length).toLowerCase() : null,
    };
  } catch {
    return {
      raw: normalizedValue,
      protocol: '',
      hostname: '',
      port: '',
      isWildcardHost: false,
      hostnameSuffix: null,
    };
  }
};

const doesOriginMatchPattern = (origin, pattern) => {
  if (!origin || !pattern) return false;
  if (!pattern.isWildcardHost) {
    return origin === pattern.raw;
  }

  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }

  if (pattern.protocol && parsedOrigin.protocol !== pattern.protocol) return false;
  if (pattern.port && parsedOrigin.port !== pattern.port) return false;

  const candidateHost = parsedOrigin.hostname.toLowerCase();
  const suffix = pattern.hostnameSuffix;
  if (!suffix || candidateHost === suffix) return false;

  return candidateHost.endsWith(`.${suffix}`);
};

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
    return configuredOrigins
      .map((origin) => parseOriginPattern(origin))
      .filter(Boolean)
      .filter((pattern, index, patterns) => patterns.findIndex((item) => item.raw === pattern.raw) === index);
  }

  if (isProduction) {
    return frontendUrl ? [parseOriginPattern(frontendUrl)] : [];
  }

  return DEFAULT_LOCAL_ORIGINS.map((origin) => parseOriginPattern(origin));
})();

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = normalizeUrl(origin);
  if (!normalizedOrigin) return true;
  if (allowedOrigins.some((pattern) => doesOriginMatchPattern(normalizedOrigin, pattern))) return true;
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



