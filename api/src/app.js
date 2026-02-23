require("express-async-errors");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");
const corsOptions = require("./config/cors");
const routes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler.middleware");
const { generalLimiter, sanitizeInput } = require("./middlewares/security.middleware");
const { csrfProtection } = require("./middlewares/csrf.middleware");
const logger = require("./utils/logger");
const opsConsoleLogger = require("./utils/opsConsoleLogger");

const app = express();

const parsePositiveInteger = (rawValue, fallbackValue) => {
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallbackValue;
};

const parseTrustProxy = (rawValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return false;
  }

  const normalized = String(rawValue).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;

  const hops = Number.parseInt(normalized, 10);
  if (Number.isInteger(hops) && hops >= 0) {
    return hops;
  }

  return rawValue;
};

const HTTP_LOG_STYLE = String(process.env.HTTP_LOG_STYLE || "ascii").toLowerCase();
const HTTP_LOG_SUPPRESS_AUTH_ME_304 =
  String(process.env.HTTP_LOG_SUPPRESS_AUTH_ME_304 || "true").toLowerCase() !== "false";
const HTTP_LOG_SUMMARY_WINDOW_MS = parsePositiveInteger(
  process.env.HTTP_LOG_SUMMARY_WINDOW_MS,
  60000
);

const suppressedHttpCounters = {
  authMe304: 0,
};

const formatResponseSize = (rawSize) => {
  const parsed = Number(rawSize);
  if (!Number.isFinite(parsed) || parsed <= 0) return "0 B";

  if (parsed >= 1024 * 1024) {
    return `${(parsed / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (parsed >= 1024) {
    return `${(parsed / 1024).toFixed(2)} KB`;
  }

  return `${parsed} B`;
};

const formatHttpLogLine = (tokens, req, res) => {
  const timestamp = tokens.date(req, res, "iso") || new Date().toISOString();
  const method = tokens.method(req, res) || "UNKNOWN";
  const url = tokens.url(req, res) || req.originalUrl || req.url || "/";
  const statusCode = Number(tokens.status(req, res) || 0);
  const responseTime = Number(tokens["response-time"](req, res) || 0);
  const contentLength = tokens.res(req, res, "content-length");
  const safeStatus = Number.isFinite(statusCode) && statusCode > 0 ? statusCode : "-";
  const safeTime = Number.isFinite(responseTime) ? responseTime.toFixed(2) : "0.00";
  const responseSize = formatResponseSize(contentLength);

  if (HTTP_LOG_STYLE === "ascii") {
    return `${timestamp} | ${method} | ${url} | ${safeStatus} | ${safeTime} ms | ${responseSize}`;
  }

  return `${timestamp} | ${method} | ${url} | ${safeStatus} | ${safeTime} ms | ${responseSize}`;
};

const resolveApiVersion = () => String(process.env.API_VERSION || "v1").toLowerCase();

const resolveAuthMePath = () => `/api/${resolveApiVersion()}/auth/me`;

const normalizePath = (value) => {
  const rawPath = String(value || "")
    .split("?")[0]
    .trim()
    .toLowerCase();
  const withoutTrailingSlash = rawPath.replace(/\/+$/, "");
  return withoutTrailingSlash || "/";
};

const isAuthMePath = (value) => {
  const normalized = normalizePath(value);
  return normalized === normalizePath(resolveAuthMePath()) || normalized === "/auth/me";
};

const isAuthMeRequest = (req) => {
  const method = String(req?.method || "").toUpperCase();
  const requestPath = req?.path || req?.originalUrl || req?.url || "";

  return method === "GET" && isAuthMePath(requestPath);
};

const isAuthMe304Response = (req, res) => {
  const statusCode = Number(res?.statusCode || 0);
  return isAuthMeRequest(req) && statusCode === 304;
};

const shouldSkipHttpLog = (req, res) => {
  if (!HTTP_LOG_SUPPRESS_AUTH_ME_304) {
    return false;
  }

  if (isAuthMe304Response(req, res)) {
    suppressedHttpCounters.authMe304 += 1;
    return true;
  }

  return false;
};

const flushSuppressedHttpSummary = () => {
  const suppressedAuthMe304 = suppressedHttpCounters.authMe304;
  suppressedHttpCounters.authMe304 = 0;

  if (suppressedAuthMe304 <= 0) {
    return;
  }

  const windowSeconds = Math.round(HTTP_LOG_SUMMARY_WINDOW_MS / 1000);
  opsConsoleLogger.info("HTTP", "SUMMARY", "INFO", {
    message: `suppressed GET ${resolveAuthMePath()} 304 x${suppressedAuthMe304} in ${windowSeconds}s`,
    path: resolveAuthMePath(),
    count: suppressedAuthMe304,
    window_ms: HTTP_LOG_SUMMARY_WINDOW_MS,
  });
};

if (HTTP_LOG_SUPPRESS_AUTH_ME_304) {
  const summaryInterval = setInterval(flushSuppressedHttpSummary, HTTP_LOG_SUMMARY_WINDOW_MS);
  if (typeof summaryInterval.unref === "function") {
    summaryInterval.unref();
  }
}

app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(cors(corsOptions));
app.use(
  compression({
    filter: (req, res) => {
      const acceptHeader = String(req.headers?.accept || "").toLowerCase();
      const pathValue = String(req.path || req.originalUrl || "").toLowerCase();
      const isSseRequest =
        pathValue.includes("/sse/") || acceptHeader.includes("text/event-stream");

      if (isSseRequest) {
        return false;
      }

      return compression.filter(req, res);
    },
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(
    morgan(formatHttpLogLine, {
      skip: shouldSkipHttpLog,
    })
  );
} else {
  app.use(
    morgan(formatHttpLogLine, {
      skip: shouldSkipHttpLog,
      stream: {
        write: (message) => {
          logger.info(message.trim());
        },
      },
    })
  );
}

app.use(sanitizeInput);
app.use(generalLimiter);
app.use(csrfProtection);

// Servir archivos estaticos de imagenes subidas
app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Inmotech - Modulo de Citas",
    version: process.env.API_VERSION || "v1",
    documentation: "/api/v1/health",
  });
});

app.use(`/api/${process.env.API_VERSION || "v1"}`, routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
