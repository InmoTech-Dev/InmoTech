/**
 * @fileoverview Context de React para gestión global de citas
 * @module shared/contexts/AppointmentContext
 * @description Provee estado y funciones para manejar citas en toda la aplicación
 * @author InmoTech Development Team
 * @version 5.0.0 - Adaptado a estructura con id_cita del backend
 */

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import citaApiService, { actualizarEstadoCita } from '../services/citaApiService';
import { useAuth } from './AuthContext';

const AppointmentContext = createContext(undefined);

export const AppointmentProvider = ({ children }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated, user, hasPermission } = useAuth();

  /**
   * Carga las citas desde la API
   */
  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🌐 Cargando citas desde API...");
      const citas = await citaApiService.obtenerCitas();
      console.log(`✅ ${citas?.length || 0} citas cargadas desde API`);
      setAppointments(citas || []);
    } catch (err) {
      console.error("❌ Error al cargar citas:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar citas solo si hay autenticación y es un administrativo
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
      console.log("➕ Creando nueva cita en el backend...");
      const citaCreada = await citaApiService.crearCita(appointmentData, user?.id);
      console.log("✅ Cita creada con ID:", citaCreada.id);

      setAppointments((prev) => [...prev, citaCreada]);
      return citaCreada;
    } catch (err) {
      console.error("❌ Error al crear cita:", err.message);
      throw err;
    }
  };

  /**
   * Agrega una cita ya existente al estado local
   */
  const addExistingAppointment = (appointment) => {
    // ✅ Aceptar tanto 'id' como 'id_cita'
    const appointmentId = appointment.id || appointment.id_cita;

    if (!appointmentId) {
      console.error("❌ Error: Se intentó agregar una cita sin ID");
      throw new Error("La cita debe tener un ID para ser agregada al estado");
    }

    const yaExiste = appointments.some((apt) =>
      (apt.id === appointmentId) || (apt.id_cita === appointmentId)
    );

    if (yaExiste) {
      console.warn("⚠️ La cita con ID", appointmentId, "ya existe en el estado");
      return appointment;
    }

    console.log("➕ Agregando cita existente al estado (ID:", appointmentId, ")");
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

      console.log("✅ Cita actualizada");
      return citaActualizada;
    } catch (err) {
      console.error("❌ Error al actualizar cita:", err.message);
      throw err;
    }
  };

  /**
   * Elimina una cita (la marca como cancelada)
   */
  const deleteAppointment = async (id) => {
    try {
      console.log("🗑️ Cancelando cita:", id);
      const citaCancelada = await updateAppointmentStatus(id, 6); // 6 = cancelada
      console.log("✅ Cita cancelada");
      return citaCancelada;
    } catch (err) {
      console.error("❌ Error al cancelar cita:", err.message);
      throw err;
    }
  };

  /**
   * ✅ CORREGIDO: Cambia el estado de una cita
   */
  const updateAppointmentStatus = async (idCita, idEstadoCita) => {
    try {
      console.log(`🔄 Iniciando cambio de estado - Cita: ${idCita}, Nuevo estado: ${idEstadoCita}`);

      // Llamar al backend para actualizar el estado
      const citaActualizada = await actualizarEstadoCita(idCita, idEstadoCita);

      console.log("📥 Cita actualizada recibida del backend:", citaActualizada);

      // Verificar que la respuesta sea válida
      if (!citaActualizada || (!citaActualizada.id && !citaActualizada.id_cita)) {
        throw new Error("La respuesta del servidor no contiene datos válidos");
      }

      // Mapear el ID de estado a nombre de estado
      const nuevoEstado = citaApiService.mapIdToEstado(citaActualizada.id_estado_cita);
      console.log(`✅ Nuevo estado mapeado: "${nuevoEstado}" (ID: ${citaActualizada.id_estado_cita})`);

      // Actualizar el estado local
      setAppointments(prev => {
        const updated = prev.map(app => {
          const appId = app.id || app.id_cita;
          const citaId = citaActualizada.id || citaActualizada.id_cita;

          if (appId === citaId) {
            console.log("🔄 Actualizando cita en el estado local:", {
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

      console.log("✅ Estado local actualizado correctamente");
      return citaActualizada;
    } catch (error) {
      console.error("❌ Error en updateAppointmentStatus:", error);
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

  const value = {
    // Estado
    appointments,
    loading,
    error,

    // Funciones CRUD
    createAppointment,
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

