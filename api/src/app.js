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
const logger = require("./utils/logger");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
}

app.use(sanitizeInput);
app.use(generalLimiter);

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
