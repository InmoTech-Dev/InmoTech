const isDevelopment = process.env.NODE_ENV === "development";
const isOpsConsoleEnabled =
  String(process.env.OPS_CONSOLE_ENABLED || "true").toLowerCase() !== "false";
const isPlainPasswordEnabled =
  isDevelopment &&
  String(process.env.AUTH_CONSOLE_PLAINTEXT_PASSWORD || "true").toLowerCase() !== "false";
const BLOCK_SEPARATOR = "============================";
const MAX_FIELD_LENGTH = 220;
const pad2 = (value) => String(value).padStart(2, "0");

const formatTimestamp = (date = new Date()) => {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const cleanKey = (value) => String(value || "").trim().replace(/\s+/g, "_").toLowerCase();
const normalizeInlineText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const truncate = (value) => {
  const normalized = normalizeInlineText(value);
  if (normalized.length <= MAX_FIELD_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_FIELD_LENGTH - 3)}...`;
};

const formatMetaValue = (value) => {
  if (value === null) return "null";
  if (value === undefined) return null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (typeof value === "string") {
    const normalized = truncate(value);
    if (!normalized) return '""';
    if (/[\s=|"]/u.test(normalized)) {
      return JSON.stringify(normalized);
    }
    return normalized;
  }

  return JSON.stringify(value);
};

const formatMeta = (meta = {}) => {
  const parts = Object.entries(meta)
    .map(([rawKey, rawValue]) => {
      const key = cleanKey(rawKey);
      const value = formatMetaValue(rawValue);
      if (!key || value === null) return null;
      return `${key}=${value}`;
    })
    .filter(Boolean);

  return parts.length > 0 ? ` | ${parts.join(" ")}` : "";
};

const buildTag = (scope, action, outcome) => {
  const safeScope = String(scope || "APP").trim().toUpperCase();
  const safeAction = String(action || "EVENT").trim().toUpperCase();
  const safeOutcome = String(outcome || "INFO").trim().toUpperCase();
  return `[${safeScope}][${safeAction}][${safeOutcome}]`;
};

const resolveConsoleMethod = (method) => {
  if (method === "error") return "error";
  if (method === "warn") return "warn";
  return "log";
};

const printBlock = ({ method = "log", title, timestamp, fields = [], footer }) => {
  if (!isOpsConsoleEnabled) return;

  const lines = [
    BLOCK_SEPARATOR,
    `${title} ${timestamp}`,
    ...fields
      .filter((field) => field && field.label)
      .map((field) => `${field.label}: ${truncate(field.value) || "N/A"}`),
    BLOCK_SEPARATOR,
  ];

  if (footer) {
    lines.push(footer);
  }

  const consoleMethod = resolveConsoleMethod(method);
  console[consoleMethod](lines.join("\n"));
};

const authBlock = ({ action, outcome, fields = [], footer, method = "log" }) => {
  const timestamp = formatTimestamp();
  const title = buildTag("AUTH", action, outcome);
  printBlock({
    method,
    title,
    timestamp,
    fields,
    footer,
  });
};

const eventBlock = ({
  scope = "APP",
  action = "EVENT",
  outcome = "INFO",
  fields = [],
  footer,
  method = "log",
}) => {
  const timestamp = formatTimestamp();
  const title = buildTag(scope, action, outcome);
  printBlock({
    method,
    title,
    timestamp,
    fields,
    footer,
  });
};

const emit = (method, scope, action, outcome, meta = {}) => {
  if (!isOpsConsoleEnabled) return;

  const timestamp = formatTimestamp();
  const line = `${timestamp} | ${buildTag(scope, action, outcome)}${formatMeta(meta)}`;

  if (method === "error") {
    console.error(line);
    return;
  }

  if (method === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
};

module.exports = {
  isDevelopment,
  isPlainPasswordEnabled,
  info: (scope, action, outcome, meta) => emit("info", scope, action, outcome, meta),
  warn: (scope, action, outcome, meta) => emit("warn", scope, action, outcome, meta),
  error: (scope, action, outcome, meta) => emit("error", scope, action, outcome, meta),
  authBlock,
  eventBlock,
};
