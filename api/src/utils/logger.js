const fs = require('fs');
const path = require('path');
const winston = require('winston');

const logDir = process.env.LOG_FILE_PATH || './logs';
const ANSI_REGEX = /\u001b\[[0-9;]*m/g;
const NUMERIC_KEY_REGEX = /^\d+$/;
const MAX_STRING_LENGTH = 4000;
const MAX_ARRAY_ITEMS = 40;
const MAX_OBJECT_KEYS = 40;
const MAX_DEPTH = 6;
const HEAVY_META_KEYS = new Set(['cert', 'raw', 'pubkey', 'issuerCertificate']);
const ERROR_SAFE_KEYS = new Set([
  'code',
  'errno',
  'syscall',
  'command',
  'host',
  'reason',
  'address',
  'port',
  'responseCode',
  'statusCode'
]);
const LOG_LEVEL_ICON = {
  error: 'E',
  warn: 'W',
  info: 'I',
  http: 'H',
  verbose: 'V',
  debug: 'D',
  silly: 'S'
};

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const truncateString = (value) => {
  const normalized = String(value);
  if (normalized.length <= MAX_STRING_LENGTH) return normalized;
  const remaining = normalized.length - MAX_STRING_LENGTH;
  return `${normalized.slice(0, MAX_STRING_LENGTH)}...[truncated ${remaining} chars]`;
};

const sanitizeCertificate = (cert) => {
  if (!cert || typeof cert !== 'object') return cert;

  return {
    subject: cert.subject || null,
    issuer: cert.issuer || null,
    subjectaltname: cert.subjectaltname || null,
    valid_from: cert.valid_from || null,
    valid_to: cert.valid_to || null,
    fingerprint256: cert.fingerprint256 || null
  };
};

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

const extractIndexedStringMeta = (meta) => {
  const numericKeys = Object.keys(meta).filter((key) => NUMERIC_KEY_REGEX.test(key));
  if (numericKeys.length === 0) return null;

  const pairs = numericKeys
    .map((key) => [Number(key), meta[key]])
    .sort((a, b) => a[0] - b[0]);

  const contiguous = pairs.every(([index], expected) => index === expected);
  const areChars = pairs.every(([, value]) => typeof value === 'string' && value.length <= 1);
  if (!contiguous || !areChars) return null;

  return pairs.map(([, value]) => value).join('');
};

const toSerializable = (value, context = {}) => {
  const depth = context.depth || 0;
  const keyHint = context.keyHint || '';
  const seen = context.seen || new WeakSet();

  if (value === undefined) return undefined;
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return truncateString(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;

  if (Buffer.isBuffer(value)) {
    return `[Buffer length=${value.length}]`;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    const payload = {
      name: value.name || 'Error',
      message: truncateString(value.message || 'Unknown error')
    };

    if (value.stack) payload.stack = truncateString(value.stack);

    ERROR_SAFE_KEYS.forEach((key) => {
      if (value[key] !== undefined) {
        payload[key] = toSerializable(value[key], { depth: depth + 1, keyHint: key, seen });
      }
    });

    Object.keys(value).forEach((key) => {
      if (payload[key] !== undefined) return;
      if (key === 'cert') {
        payload.cert = sanitizeCertificate(value.cert);
        return;
      }
      if (HEAVY_META_KEYS.has(key)) {
        payload[key] = `[Truncated ${key}]`;
        return;
      }
      payload[key] = toSerializable(value[key], { depth: depth + 1, keyHint: key, seen });
    });

    return payload;
  }

  if (HEAVY_META_KEYS.has(keyHint)) {
    if (keyHint === 'cert') return sanitizeCertificate(value);
    return `[Truncated ${keyHint}]`;
  }

  if (depth >= MAX_DEPTH) {
    return '[Truncated: max depth reached]';
  }

  if (typeof value !== 'object') {
    return truncateString(value);
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  try {
    if (Array.isArray(value)) {
      const subset = value.slice(0, MAX_ARRAY_ITEMS).map((item) =>
        toSerializable(item, { depth: depth + 1, keyHint: '', seen })
      );

      if (value.length > MAX_ARRAY_ITEMS) {
        subset.push(`[Truncated: +${value.length - MAX_ARRAY_ITEMS} items]`);
      }

      return subset;
    }

    if (!isPlainObject(value)) {
      return truncateString(String(value));
    }

    const entries = Object.entries(value);
    const output = {};

    entries.slice(0, MAX_OBJECT_KEYS).forEach(([key, nestedValue]) => {
      const serialized = toSerializable(nestedValue, { depth: depth + 1, keyHint: key, seen });
      if (serialized !== undefined) {
        output[key] = serialized;
      }
    });

    if (entries.length > MAX_OBJECT_KEYS) {
      output.__truncated_keys__ = entries.length - MAX_OBJECT_KEYS;
    }

    return output;
  } finally {
    seen.delete(value);
  }
};

const normalizeInfoObject = (rawInfo) => {
  if (!rawInfo || typeof rawInfo !== 'object') return rawInfo;

  const info = { ...rawInfo };
  const indexedMessage = extractIndexedStringMeta(info);

  if (indexedMessage) {
    Object.keys(info).forEach((key) => {
      if (NUMERIC_KEY_REGEX.test(key)) {
        delete info[key];
      }
    });

    const safeMeta = isPlainObject(info.meta) ? info.meta : {};
    info.meta = {
      ...safeMeta,
      indexed_message: truncateString(indexedMessage)
    };
  }

  const sharedSeen = new WeakSet();
  Object.keys(info).forEach((key) => {
    const serialized = toSerializable(info[key], { depth: 0, keyHint: key, seen: sharedSeen });

    if (serialized === undefined) {
      delete info[key];
      return;
    }

    info[key] = serialized;
  });

  return info;
};

const safeJSONStringify = (value, spaces = 2) => {
  try {
    return JSON.stringify(value, null, spaces);
  } catch (error) {
    return JSON.stringify(
      {
        message: 'Unable to serialize log payload',
        reason: error.message
      },
      null,
      spaces
    );
  }
};

const normalizeLogLevel = (value) => {
  if (!value) return 'info';
  return String(value).replace(ANSI_REGEX, '').trim().toLowerCase();
};

const resolveLevelIcon = (level) => {
  const normalizedLevel = normalizeLogLevel(level);
  return LOG_LEVEL_ICON[normalizedLevel] || '-';
};

const skipSuppressedConsoleLogs = winston.format((info) => {
  if (info?.suppressConsole === true) {
    return false;
  }

  return info;
});

const sanitizeLogInfoFormat = winston.format((info) => normalizeInfoObject(info));

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  sanitizeLogInfoFormat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    const icon = resolveLevelIcon(level);
    const normalizedLevel = normalizeLogLevel(level).toUpperCase();
    const resolvedMessage = typeof stack === 'string' ? stack : String(message);
    const baseLine = `${timestamp} ${icon} [${normalizedLevel}] ${resolvedMessage}`;

    const metaKeys = Object.keys(meta || {}).filter((key) => {
      if (NUMERIC_KEY_REGEX.test(key)) return false;
      return meta[key] !== undefined;
    });

    if (metaKeys.length === 0) return baseLine;

    const metaObject = metaKeys.reduce((acc, key) => {
      acc[key] = meta[key];
      return acc;
    }, {});

    return `${baseLine}\n${safeJSONStringify(metaObject, 2)}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(skipSuppressedConsoleLogs(), sanitizeLogInfoFormat(), consoleFormat)
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log')
    }),
    new winston.transports.Console({
      format: winston.format.combine(sanitizeLogInfoFormat(), consoleFormat)
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log')
    }),
    new winston.transports.Console({
      format: winston.format.combine(sanitizeLogInfoFormat(), consoleFormat)
    })
  ]
});

logger.__private = {
  extractIndexedStringMeta,
  normalizeInfoObject,
  toSerializable,
  sanitizeCertificate
};

module.exports = logger;
