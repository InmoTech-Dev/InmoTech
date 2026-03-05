const app = require('./app');
const { testConnection } = require('./config/database');
const { runPermissionsBackfill } = require('./startup/backfillPermissions');
const { runVentaAdjuntosBackfill } = require('./startup/backfillVentaAdjuntos');

const PORT = process.env.PORT || 5000;
const API_VERSION = String(process.env.API_VERSION || 'v1').toLowerCase();
const BASE_URL = `http://localhost:${PORT}`;
const STARTUP_BANNER_STYLE = String(process.env.STARTUP_BANNER_STYLE || 'emoji').toLowerCase();
const BANNER_ICONS =
  STARTUP_BANNER_STYLE === 'ascii'
    ? {
        start: '[START]',
        ok: '[OK]',
        env: '[ENV]',
        url: '[URL]',
        api: '[API]',
        health: '[HEALTH]'
      }
    : {
        start: '🚀',
        ok: '✅',
        env: '🛠',
        url: '🌐',
        api: '📡',
        health: '💚'
      };

// Configuración de reintentos para la conexión a BD
const MAX_DB_RETRIES = parseInt(process.env.DB_MAX_RETRIES || '2', 10);
const DB_RETRY_DELAY_MS = parseInt(process.env.DB_RETRY_DELAY_MS || '5000', 10);
const PERMISSIONS_BACKFILL_FAIL_HARD = process.env.PERMISSIONS_BACKFILL_FAIL_HARD === 'true';
const VENTA_ADJUNTOS_BACKFILL_FAIL_HARD = process.env.VENTA_ADJUNTOS_BACKFILL_FAIL_HARD === 'true';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectWithRetries = async () => {
  for (let attempt = 0; attempt <= MAX_DB_RETRIES; attempt++) {
    const ok = await testConnection();
    if (ok) return true;

    if (attempt < MAX_DB_RETRIES) {
      console.warn(
        `Reintento de conexion a BD en ${DB_RETRY_DELAY_MS}ms (intento ${attempt + 2}/${MAX_DB_RETRIES + 1})`
      );
      await delay(DB_RETRY_DELAY_MS);
    }
  }
  return false;
};

const startServer = async () => {
  try {
    console.log(`${BANNER_ICONS.start} Iniciando servidor...`);

    const dbConnected = await connectWithRetries();
    if (!dbConnected) {
      const failHard = process.env.FAIL_ON_DB_ERROR === 'true';
      console.error('No se pudo conectar a la base de datos.');
      if (failHard) {
        console.error('Abortando inicio del servidor por configuracion FAIL_ON_DB_ERROR=true.');
        process.exit(1);
      } else {
        console.warn('Arrancando sin conexion a BD (modo degradado). Configura FAIL_ON_DB_ERROR=true para forzar salida.');
      }
    }

    if (dbConnected) {
      try {
        await runPermissionsBackfill();
      } catch (error) {
        console.error('Error ejecutando backfill de permisos:', error);
        if (PERMISSIONS_BACKFILL_FAIL_HARD) {
          console.error('Abortando inicio por PERMISSIONS_BACKFILL_FAIL_HARD=true.');
          process.exit(1);
        }
      }

      try {
        await runVentaAdjuntosBackfill();
      } catch (error) {
        console.error('Error ejecutando backfill de VentaAdjuntos:', error);
        if (VENTA_ADJUNTOS_BACKFILL_FAIL_HARD) {
          console.error('Abortando inicio por VENTA_ADJUNTOS_BACKFILL_FAIL_HARD=true.');
          process.exit(1);
        }
      }
    } else {
      console.warn('Backfill de permisos omitido por falta de conexión a BD.');
    }

    const server = app.listen(PORT, () => {
      console.log('=================================================');
      console.log(`${BANNER_ICONS.ok} Servidor corriendo en puerto ${PORT}`);
      console.log(`${BANNER_ICONS.env} Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`${BANNER_ICONS.url} URL: ${BASE_URL}`);
      console.log(`${BANNER_ICONS.api} API: ${BASE_URL}/api/${API_VERSION}`);
      console.log(`${BANNER_ICONS.health} Health: ${BASE_URL}/api/${API_VERSION}/health`);
      console.log('=================================================');
    });

    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} recibido. Cerrando servidor gracefully...`);
      server.close(() => {
        console.log('Servidor cerrado.');
        process.exit(0);
      });

      setTimeout(() => {
        console.log('No se pudo cerrar el servidor gracefully, forzando cierre...');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      console.error('Excepcion no capturada:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Promesa rechazada no manejada:', { reason, promise });
      process.exit(1);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
