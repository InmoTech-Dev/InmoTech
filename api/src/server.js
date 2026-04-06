const { apiBaseUrl } = require('./config/runtime');
const {
  applyConfigToProcessEnv,
  buildCandidatesFromEnv,
  testCandidateConnection,
} = require('./config/database.bootstrap');

const PORT = process.env.PORT || 5000;
const API_VERSION = String(process.env.API_VERSION || 'v1').toLowerCase();
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
const MAX_DB_RETRIES = parseInt(process.env.DB_MAX_RETRIES || '0', 10);
const DB_RETRY_DELAY_MS = parseInt(process.env.DB_RETRY_DELAY_MS || '1000', 10);
const PERMISSIONS_BACKFILL_FAIL_HARD = process.env.PERMISSIONS_BACKFILL_FAIL_HARD === 'true';
const VENTA_ADJUNTOS_BACKFILL_FAIL_HARD = process.env.VENTA_ADJUNTOS_BACKFILL_FAIL_HARD === 'true';
const LEASE_AUTO_FINALIZE_JOB_ENABLED =
  String(process.env.LEASE_AUTO_FINALIZE_JOB_ENABLED || 'true').toLowerCase() !== 'false';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const describeCandidate = (candidate) => {
  const instanceLabel = candidate.instanceName || '(por defecto)';
  const portLabel = candidate.port || '(dinamico/instancia)';
  return `${candidate.source}: ${candidate.host} | instancia=${instanceLabel} | puerto=${portLabel} | db=${candidate.database}`;
};

const resolveDatabaseConnection = async () => {
  const candidates = buildCandidatesFromEnv();

  if (candidates.length === 0) {
    console.error('No hay configuraciones de base de datos validas en variables de entorno.');
    return { ok: false, selected: null };
  }

  for (const candidate of candidates) {
    for (let attempt = 0; attempt <= MAX_DB_RETRIES; attempt++) {
      console.log(`[DB] Probando conexion ${describeCandidate(candidate)} (intento ${attempt + 1}/${MAX_DB_RETRIES + 1})`);
      const result = await testCandidateConnection(candidate);
      if (result.ok) {
        applyConfigToProcessEnv(candidate);
        console.log(
          `[DB] Conexion activa: ${candidate.source} -> ${result.meta.serverName} / ${result.meta.databaseName}`
        );
        process.env.DB_ACTIVE_SOURCE = candidate.source;
        return { ok: true, selected: candidate, meta: result.meta };
      }

      console.error(
        `[DB] Fallo ${candidate.source}: ${result.error?.message || 'Error desconocido'}`
      );

      if (attempt < MAX_DB_RETRIES) {
        console.warn(
          `Reintento de conexion a BD en ${DB_RETRY_DELAY_MS}ms (intento ${attempt + 2}/${MAX_DB_RETRIES + 1})`
        );
        await delay(DB_RETRY_DELAY_MS);
      }
    }
  }

  applyConfigToProcessEnv(candidates[0]);
  process.env.DB_ACTIVE_SOURCE = candidates[0].source;
  return { ok: false, selected: candidates[0] };
};

const startServer = async () => {
  try {
    console.log(`${BANNER_ICONS.start} Iniciando servidor...`);

    const dbResolution = await resolveDatabaseConnection();
    const app = require('./app');
    const { runPermissionsBackfill } = require('./startup/backfillPermissions');
    const { runVentaAdjuntosBackfill } = require('./startup/backfillVentaAdjuntos');
    const { scheduleDailyLeaseAutoFinalize } = require('./jobs/leasesAutoFinalize.job');
    const dbConnected = dbResolution.ok;
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

      if (LEASE_AUTO_FINALIZE_JOB_ENABLED) {
        scheduleDailyLeaseAutoFinalize();
      }
    } else {
      console.warn('Backfill de permisos omitido por falta de conexión a BD.');
    }

    const server = app.listen(PORT, () => {
      const runtimeBaseUrl = apiBaseUrl || `http://localhost:${PORT}`;
      console.log('=================================================');
      console.log(`${BANNER_ICONS.ok} Servidor corriendo en puerto ${PORT}`);
      console.log(`${BANNER_ICONS.env} Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`${BANNER_ICONS.env} DB activa: ${process.env.DB_ACTIVE_SOURCE || 'unknown'}`);
      console.log(`${BANNER_ICONS.url} URL: ${runtimeBaseUrl}`);
      console.log(`${BANNER_ICONS.api} API: ${runtimeBaseUrl}/api/${API_VERSION}`);
      console.log(`${BANNER_ICONS.health} Health: ${runtimeBaseUrl}/api/${API_VERSION}/health`);
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

