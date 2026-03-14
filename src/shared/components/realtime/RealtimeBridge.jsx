import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import sseService from '../../services/sseService';
import realtimeBus from '../../services/realtimeBus';

const parseIntervalMs = (rawValue, fallbackValue) => {
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isInteger(parsed) && parsed >= 3000 ? parsed : fallbackValue;
};

const REALTIME_ENABLED = import.meta.env.VITE_REALTIME_ENABLED !== 'false';
const FALLBACK_INTERVAL_MS = parseIntervalMs(
  import.meta.env.VITE_REALTIME_FALLBACK_INTERVAL_MS,
  15000
);
const WATCHDOG_INTERVAL_MS = parseIntervalMs(
  import.meta.env.VITE_REALTIME_SESSION_WATCHDOG_MS,
  60000
);
const WATCHDOG_RATE_LIMIT_COOLDOWN_MS = parseIntervalMs(
  import.meta.env.VITE_REALTIME_WATCHDOG_RATE_LIMIT_COOLDOWN_MS,
  60000
);
const WATCHDOG_ERROR_COOLDOWN_MS = parseIntervalMs(
  import.meta.env.VITE_REALTIME_WATCHDOG_ERROR_COOLDOWN_MS,
  15000
);
const WATCHDOG_VISIBILITY_MIN_GAP_MS = parseIntervalMs(
  import.meta.env.VITE_REALTIME_WATCHDOG_VISIBILITY_GAP_MS,
  10000
);
const WATCHDOG_MAX_COOLDOWN_MS = parseIntervalMs(
  import.meta.env.VITE_REALTIME_WATCHDOG_MAX_COOLDOWN_MS,
  300000
);
const WATCHDOG_INITIAL_DELAY_MS = parseIntervalMs(
  import.meta.env.VITE_REALTIME_WATCHDOG_INITIAL_DELAY_MS,
  15000
);

const parseRetryAfterMs = (rawValue) => {
  if (!rawValue) return null;

  const seconds = Number.parseInt(rawValue, 10);
  if (Number.isInteger(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryAt = Date.parse(rawValue);
  if (!Number.isFinite(retryAt)) return null;

  return Math.max(0, retryAt - Date.now());
};

const RealtimeBridge = () => {
  const { isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fallbackIntervalRef = useRef(null);
  const watchdogIntervalRef = useRef(null);
  const watchdogStartTimeoutRef = useRef(null);
  const forcedLogoutHandledRef = useRef(false);
  const watchdogRequestInFlightRef = useRef(false);
  const watchdogCooldownUntilRef = useRef(0);
  const watchdogConsecutiveFailuresRef = useRef(0);
  const watchdogLastValidationAtRef = useRef(0);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
      realtimeBus.emit('realtime.fallback.stopped', {
        occurred_at: new Date().toISOString(),
      });
    }
  }, []);

  const startFallbackPolling = useCallback((reason = 'connection_lost') => {
    if (fallbackIntervalRef.current) return;

    realtimeBus.emit('realtime.fallback.started', {
      reason,
      occurred_at: new Date().toISOString(),
    });

    fallbackIntervalRef.current = setInterval(() => {
      realtimeBus.emit('realtime.fallback.tick', {
        reason,
        occurred_at: new Date().toISOString(),
      });
    }, FALLBACK_INTERVAL_MS);
  }, []);

  const handleForcedLogout = useCallback(
    async (payload = {}) => {
      if (forcedLogoutHandledRef.current) return;
      forcedLogoutHandledRef.current = true;

      stopFallbackPolling();
      if (watchdogIntervalRef.current) {
        clearInterval(watchdogIntervalRef.current);
        watchdogIntervalRef.current = null;
      }
      sseService.setForcedDisconnect();
      sseService.disconnect();

      toast({
        title: 'Sesion finalizada',
        description: payload?.message || '¡Hasta luego! Vuelva pronto. La sesión se ha cerrado correctamente.',
        variant: 'default',
      });

      try {
        await logout();
      } catch {
        // local cleanup is already handled by auth context callback
      }

      navigate('/login', { replace: true });
    },
    [logout, navigate, stopFallbackPolling, toast]
  );

  const stopSessionWatchdog = useCallback(() => {
    if (watchdogStartTimeoutRef.current) {
      clearTimeout(watchdogStartTimeoutRef.current);
      watchdogStartTimeoutRef.current = null;
    }

    if (watchdogIntervalRef.current) {
      clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = null;
    }
  }, []);

  const shouldForceLogoutFromPayload = useCallback((payload = {}) => {
    if (payload?.forceLogout === true) return true;
    const reason = String(payload?.reason || '').toLowerCase();
    return reason === 'account_disabled' || reason === 'admin_access_revoked';
  }, []);

  const validateSessionWithWatchdog = useCallback(async () => {
    if (!isAuthenticated || forcedLogoutHandledRef.current) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (sseService.isConnected) return;
    if (watchdogRequestInFlightRef.current) return;

    const now = Date.now();
    if (now < watchdogCooldownUntilRef.current) return;

    watchdogRequestInFlightRef.current = true;
    watchdogLastValidationAtRef.current = now;

    try {
      const response = await fetch(`${sseService.getApiBaseUrl()}/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 429) {
        watchdogConsecutiveFailuresRef.current += 1;

        const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
        const exponentialCooldown =
          WATCHDOG_RATE_LIMIT_COOLDOWN_MS *
          Math.min(2 ** (watchdogConsecutiveFailuresRef.current - 1), 8);
        const cooldownMs = Math.min(
          WATCHDOG_MAX_COOLDOWN_MS,
          Math.max(retryAfterMs || 0, exponentialCooldown)
        );

        watchdogCooldownUntilRef.current = Date.now() + cooldownMs;
        return;
      }

      if (response.ok) {
        watchdogConsecutiveFailuresRef.current = 0;
        watchdogCooldownUntilRef.current = 0;
      }

      if (response.status === 401) {
        await handleForcedLogout({
          reason: 'session_revoked',
          message: '¡Hasta luego! Vuelva pronto. La sesión se ha cerrado correctamente.',
          occurred_at: new Date().toISOString(),
        });
        return;
      }

      if (response.status === 403 || response.status === 423) {
        let payload = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (shouldForceLogoutFromPayload(payload)) {
          await handleForcedLogout({
            reason: payload?.reason || 'session_revoked',
            message: payload?.message || '¡Hasta luego! Vuelva pronto. La sesión se ha cerrado correctamente.',
            occurred_at: payload?.occurred_at || new Date().toISOString(),
          });
        }
      }

      if (!response.ok) {
        watchdogConsecutiveFailuresRef.current += 1;
        const cooldownMs = Math.min(
          WATCHDOG_MAX_COOLDOWN_MS,
          WATCHDOG_ERROR_COOLDOWN_MS * Math.min(2 ** (watchdogConsecutiveFailuresRef.current - 1), 8)
        );
        watchdogCooldownUntilRef.current = Date.now() + cooldownMs;
      }
    } catch (error) {
      watchdogConsecutiveFailuresRef.current += 1;
      const cooldownMs = Math.min(
        WATCHDOG_MAX_COOLDOWN_MS,
        WATCHDOG_ERROR_COOLDOWN_MS * Math.min(2 ** (watchdogConsecutiveFailuresRef.current - 1), 8)
      );
      watchdogCooldownUntilRef.current = Date.now() + cooldownMs;
      console.warn('[REALTIME][WATCHDOG] Session validation failed:', error.message);
    } finally {
      watchdogRequestInFlightRef.current = false;
    }
  }, [handleForcedLogout, isAuthenticated, shouldForceLogoutFromPayload]);

  const startSessionWatchdog = useCallback(() => {
    if (!REALTIME_ENABLED || !isAuthenticated || watchdogIntervalRef.current || watchdogStartTimeoutRef.current) {
      return;
    }

    watchdogStartTimeoutRef.current = setTimeout(() => {
      watchdogStartTimeoutRef.current = null;
      validateSessionWithWatchdog();
      watchdogIntervalRef.current = setInterval(() => {
        validateSessionWithWatchdog();
      }, WATCHDOG_INTERVAL_MS);
    }, WATCHDOG_INITIAL_DELAY_MS);
  }, [isAuthenticated, validateSessionWithWatchdog]);

  const listeners = useMemo(
    () => [
      ['connected', () => {
        stopFallbackPolling();
        realtimeBus.emit('realtime.reconcile_requested', {
          source: 'sse_connected',
          occurred_at: new Date().toISOString(),
        });
      }],
      ['disconnected', () => {
        startFallbackPolling('sse_disconnected');
      }],
      ['max_reconnect_attempts_reached', () => {
        startFallbackPolling('max_reconnect_attempts');
      }],
      ['connection_state', (payload) => {
        realtimeBus.emit('realtime.connection_state', payload);
      }],
      ['appointment.changed', (payload) => {
        realtimeBus.emit('appointment.changed', payload);
      }],
      ['notification.changed', (payload) => {
        realtimeBus.emit('notification.changed', payload);
      }],
      ['user.changed', (payload) => {
        // Normalizar para que AuthContext reciba id_persona
        realtimeBus.emit('user.changed', {
          ...payload,
          id_persona: payload.user_id || payload.id_persona,
        });
      }],
      ['role.changed', (payload) => {
        // Normalizar para que AuthContext y otros reciban roleId
        realtimeBus.emit('role.changed', {
          ...payload,
          roleId: payload.role_id || payload.roleId,
        });
      }],
      ['session.force_logout', handleForcedLogout],
      ['user_disabled', handleForcedLogout],
      ['password_changed', handleForcedLogout],
      ['admin_access_revoked', handleForcedLogout],
    ],
    [handleForcedLogout, startFallbackPolling, stopFallbackPolling]
  );

  useEffect(() => {
    const unsubs = listeners.map(([eventName, handler]) => sseService.on(eventName, handler));
    return () => {
      unsubs.forEach((off) => {
        if (typeof off === 'function') off();
      });
    };
  }, [listeners]);

  useEffect(() => {
    if (!REALTIME_ENABLED) {
      stopFallbackPolling();
      stopSessionWatchdog();
      sseService.setForcedDisconnect();
      sseService.disconnect();
      return;
    }

    if (isAuthenticated) {
      forcedLogoutHandledRef.current = false;
      watchdogRequestInFlightRef.current = false;
      watchdogCooldownUntilRef.current = 0;
      watchdogConsecutiveFailuresRef.current = 0;
      watchdogLastValidationAtRef.current = 0;
      sseService.resetForcedDisconnect();
      sseService.connect();
      startSessionWatchdog();
      realtimeBus.emit('realtime.reconcile_requested', {
        source: 'login',
        occurred_at: new Date().toISOString(),
      });
    } else {
      stopFallbackPolling();
      stopSessionWatchdog();
      watchdogRequestInFlightRef.current = false;
      watchdogCooldownUntilRef.current = 0;
      watchdogConsecutiveFailuresRef.current = 0;
      watchdogLastValidationAtRef.current = 0;
      sseService.setForcedDisconnect();
      sseService.disconnect();
    }
  }, [
    isAuthenticated,
    startSessionWatchdog,
    stopFallbackPolling,
    stopSessionWatchdog,
    validateSessionWithWatchdog,
  ]);

  useEffect(() => {
    if (!REALTIME_ENABLED || !isAuthenticated) return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startSessionWatchdog();
        const now = Date.now();
        if (now - watchdogLastValidationAtRef.current >= WATCHDOG_VISIBILITY_MIN_GAP_MS) {
          validateSessionWithWatchdog();
        }
      } else {
        stopSessionWatchdog();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, startSessionWatchdog, stopSessionWatchdog, validateSessionWithWatchdog]);

  useEffect(() => {
    return () => {
      stopFallbackPolling();
      stopSessionWatchdog();
      sseService.disconnect();
    };
  }, [stopFallbackPolling, stopSessionWatchdog]);

  return null;
};

export default RealtimeBridge;
