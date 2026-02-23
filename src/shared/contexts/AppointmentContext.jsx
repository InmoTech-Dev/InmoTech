/**
 * @fileoverview Context de React para gestiÃ³n global de citas
 * @module shared/contexts/AppointmentContext
 * @description Provee estado y funciones para manejar citas en toda la aplicaciÃ³n
 * @author InmoTech Development Team
 * @version 5.0.0 - Adaptado a estructura con id_cita del backend
 */

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import citaApiService, { actualizarEstadoCita } from '../services/citaApiService';
import { useAuth } from './AuthContext';
import realtimeBus from '../services/realtimeBus';

const AppointmentContext = createContext(undefined);
const REALTIME_REFRESH_DEBOUNCE_MS = 450;
const REALTIME_REFRESH_MIN_GAP_MS = 5000;

export const AppointmentProvider = ({ children }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated, user, hasPermission } = useAuth();
  const refreshDebounceRef = useRef(null);
  const loadAppointmentsInFlightRef = useRef(null);
  const lastRealtimeRefreshAtRef = useRef(0);

  /**
   * Carga las citas desde la API
   */
  const loadAppointments = useCallback(async () => {
    if (loadAppointmentsInFlightRef.current) {
      return loadAppointmentsInFlightRef.current;
    }

    const requestPromise = (async () => {
      try {
        setLoading(true);
        setError(null);
        const citas = await citaApiService.obtenerCitas();
        setAppointments(citas || []);
      } catch (err) {
        console.error('Error al cargar citas:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();

    loadAppointmentsInFlightRef.current = requestPromise.finally(() => {
      loadAppointmentsInFlightRef.current = null;
    });

    return loadAppointmentsInFlightRef.current;
  }, []);

  // Cargar citas solo si hay autenticaciÃ³n y es un administrativo
  useEffect(() => {
    if (isAuthenticated && user?.es_administrativo && hasPermission('citas', 'ver')) {
      loadAppointments();
    } else {
      setAppointments([]);
      setLoading(false);
    }
  }, [loadAppointments, isAuthenticated, user?.es_administrativo, hasPermission]);

  /**
   * Crea una nueva cita en el backend y la agrega al estado
   */
  const createAppointment = async (appointmentData) => {
    try {
      console.log("âž• Creando nueva cita en el backend...");
      const citaCreada = await citaApiService.crearCita(appointmentData, user?.id);
      console.log("âœ… Cita creada con ID:", citaCreada.id);

      setAppointments((prev) => [...prev, citaCreada]);
      return citaCreada;
    } catch (err) {
      console.error("âŒ Error al crear cita:", err.message);
      throw err;
    }
  };

  /**
   * Agrega una cita ya existente al estado local
   */
  const addExistingAppointment = (appointment) => {
    // âœ… Aceptar tanto 'id' como 'id_cita'
    const appointmentId = appointment.id || appointment.id_cita;

    if (!appointmentId) {
      console.error("âŒ Error: Se intentÃ³ agregar una cita sin ID");
      throw new Error("La cita debe tener un ID para ser agregada al estado");
    }

    const yaExiste = appointments.some((apt) =>
      (apt.id === appointmentId) || (apt.id_cita === appointmentId)
    );

    if (yaExiste) {
      console.warn("âš ï¸ La cita con ID", appointmentId, "ya existe en el estado");
      return appointment;
    }

    console.log("âž• Agregando cita existente al estado (ID:", appointmentId, ")");
    setAppointments((prev) => [...prev, appointment]);
    return appointment;
  };

  /**
   * Actualiza una cita existente
   */
  const updateAppointment = async (updatedData) => {
    try {
      const id = updatedData.id || updatedData.id_cita;
      if (updatedData._skipApi) {
        // Solo actualizar estado local sin llamar al backend (ya actualizado)
        setAppointments((prev) =>
          prev.map((apt) => {
            const aptId = apt.id || apt.id_cita;
            return aptId === id ? { ...apt, ...updatedData } : apt;
          })
        );
        return updatedData;
      }

      const response = await citaApiService.actualizarCita(id, {
        ...updatedData,
        estado: updatedData.estado
      });

      const citaActualizada = { ...response, estado: updatedData.estado };

      setAppointments((prev) =>
        prev.map((apt) => {
          const aptId = apt.id || apt.id_cita;
          const citaId = citaActualizada.id || citaActualizada.id_cita;
          return aptId === citaId ? citaActualizada : apt;
        })
      );

      console.log("âœ… Cita actualizada");
      return citaActualizada;
    } catch (err) {
      console.error("âŒ Error al actualizar cita:", err.message);
      throw err;
    }
  };

  /**
   * Elimina una cita (la marca como cancelada)
   */
  const deleteAppointment = async (id) => {
    try {
      console.log("ðŸ—‘ï¸ Cancelando cita:", id);
      const citaCancelada = await updateAppointmentStatus(id, 6); // 6 = cancelada
      console.log("âœ… Cita cancelada");
      return citaCancelada;
    } catch (err) {
      console.error("âŒ Error al cancelar cita:", err.message);
      throw err;
    }
  };

  /**
   * âœ… CORREGIDO: Cambia el estado de una cita
   */
  const updateAppointmentStatus = async (idCita, idEstadoCita) => {
    try {
      console.log(`🔄 Iniciando cambio de estado - Cita: ${idCita}, Nuevo estado: ${idEstadoCita}`);

      // Llamar al backend para actualizar el estado
      const citaActualizada = await actualizarEstadoCita(idCita, idEstadoCita);

      console.log("📥 Cita actualizada recibida del backend:", citaActualizada);

      // Verificar que la respuesta sea vÃ¡lida
      if (!citaActualizada || (!citaActualizada.id && !citaActualizada.id_cita)) {
        throw new Error("La respuesta del servidor no contiene datos vÃ¡lidos");
      }

      // Mapear el ID de estado a nombre de estado
      const nuevoEstado = citaApiService.mapIdToEstado(citaActualizada.id_estado_cita);
      console.log(`âœ… Nuevo estado mapeado: "${nuevoEstado}" (ID: ${citaActualizada.id_estado_cita})`);

      // Actualizar el estado local
      setAppointments(prev => {
        const updated = prev.map(app => {
          const appId = app.id || app.id_cita;
          const citaId = citaActualizada.id || citaActualizada.id_cita;

          if (appId === citaId) {
            console.log("ðŸ”„ Actualizando cita en el estado local:", {
              antes: app.estado,
              despues: nuevoEstado
            });

            return {
              ...app,
              estado: nuevoEstado,
              id_estado_cita: idEstadoCita,
              fecha_actualizacion: citaActualizada.fecha_actualizacion
            };
          }
          return app;
        });

        return updated;
      });

      console.log("âœ… Estado local actualizado correctamente");
      return citaActualizada;
    } catch (error) {
      console.error("âŒ Error en updateAppointmentStatus:", error);
      throw error;
    }
  };

  /**
   * Obtiene una cita por su ID
   */
  const getAppointmentById = useCallback(
    (id) => {
      return appointments.find((apt) =>
        (apt.id === id) || (apt.id_cita === id)
      );
    },
    [appointments]
  );

  /**
   * Refresca las citas desde la API
   */
  const refrescarCitas = useCallback(async () => {
    await loadAppointments();
  }, [loadAppointments]);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (!(isAuthenticated && user?.es_administrativo && hasPermission('citas', 'ver'))) {
      return;
    }

    if (loadAppointmentsInFlightRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastRealtimeRefreshAtRef.current < REALTIME_REFRESH_MIN_GAP_MS) {
      return;
    }
    lastRealtimeRefreshAtRef.current = now;

    if (refreshDebounceRef.current) {
      clearTimeout(refreshDebounceRef.current);
    }

    refreshDebounceRef.current = setTimeout(() => {
      refrescarCitas().catch((refreshError) => {
        console.warn('[REALTIME][APPOINTMENTS] No se pudo refrescar citas:', refreshError);
      });
    }, REALTIME_REFRESH_DEBOUNCE_MS);
  }, [hasPermission, isAuthenticated, refrescarCitas, user?.es_administrativo]);

  useEffect(() => {
    if (!(isAuthenticated && user?.es_administrativo && hasPermission('citas', 'ver'))) {
      return undefined;
    }

    const offChanged = realtimeBus.on('appointment.changed', () => {
      scheduleRealtimeRefresh();
    });
    const offFallbackTick = realtimeBus.on('realtime.fallback.tick', () => {
      scheduleRealtimeRefresh();
    });
    const offReconcile = realtimeBus.on('realtime.reconcile_requested', () => {
      scheduleRealtimeRefresh();
    });

    return () => {
      offChanged();
      offFallbackTick();
      offReconcile();
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
        refreshDebounceRef.current = null;
      }
      loadAppointmentsInFlightRef.current = null;
    };
  }, [hasPermission, isAuthenticated, scheduleRealtimeRefresh, user?.es_administrativo]);

  const value = {
    // Estado
    appointments,
    loading,
    error,

    // Funciones CRUD
    createAppointment,
    addAppointment: addExistingAppointment,
    addExistingAppointment,
    updateAppointment,
    deleteAppointment,
    updateAppointmentStatus,
    getAppointmentById,
    refrescarCitas,

    // Alias para compatibilidad
    cambiarEstadoCita: updateAppointmentStatus,
  };

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
};

/**
 * Hook personalizado para usar el contexto
 */
export const useAppointments = () => {
  const context = useContext(AppointmentContext);
  if (context === undefined) {
    throw new Error(
      "useAppointments debe usarse dentro de un AppointmentProvider"
    );
  }
  return context;
};

export default AppointmentContext;


