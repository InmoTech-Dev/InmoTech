/**
 * @fileoverview Servicio frontend para interactuar con el endpoint de Citas
 * @module shared/services/citaApiService
 * @description Cliente HTTP que consume la API REST de citas del backend
 * @author InmoTech Development Team
 * @version 5.0.0 - Adaptado a estructura real del backend con id_cita
 */

import { apiClient } from "./api.config";
import axios from 'axios';
import { formatTimeTo12Hour, formatTimeTo24Hour } from "../utils/time";

const SERVICIO_MAP = {
  "Visita a Propiedad": 1,
  "AvalÃºos": 2,
  "GestiÃ³n de Alquileres": 3,
  "AsesorÃ­a Legal": 4,
};

const ESTADO_TO_ID_MAP = {
  "solicitada": 1,
  "confirmada": 2,
  "programada": 3,
  "re agendada": 4,
  "reagendada": 4,
  "completada": 5,
  "cancelada": 6,
};

const ID_TO_ESTADO_MAP = {
  1: "solicitada",
  2: "confirmada",
  3: "programada",
  4: "re agendada",
  5: "completada",
  6: "cancelada",
};

class CitaApiService {
  async obtenerCitas(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.estado) params.append("estado", filtros.estado);
      if (filtros.fecha) params.append("fecha", filtros.fecha);
      if (filtros.agente) params.append("agente", filtros.agente);
      // Cache-bust para evitar datos obsoletos (como motivos de cancelación)
      params.append("_ts", Date.now());

      const endpoint = `/citas${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await apiClient.get(endpoint, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // El GET all puede retornar array directamente o en data
      const citas = Array.isArray(response.data) ? response.data : response.data.data;

      if (!citas || !Array.isArray(citas)) {
        throw new Error("Formato de respuesta invÃ¡lido del servidor");
      }

      return citas.map(cita => this.transformarCitaDesdeAPI(cita));
    } catch (error) {
      console.error("â Error al obtener citas:", error);
      throw new Error(error.message || "Error al cargar las citas desde el servidor");
    }
  }

  async crearCita(citaData, userId) {
    try {
      this.validarDatosCita(citaData);

      const payload = {
        tipo_documento: citaData.cliente?.tipo_documento || citaData.tipo_documento,
        numero_documento: citaData.cliente?.numero_documento || citaData.numero_documento,
        nombre_completo: citaData.cliente?.nombre_completo || citaData.nombre_completo,
        apellido_completo: citaData.cliente?.apellido_completo || citaData.apellido_completo,
        email: citaData.cliente?.correo || citaData.email || null,
        telefono: citaData.cliente?.telefono || citaData.telefono,
        id_inmueble: citaData.inmueble?.id_inmueble ?? citaData.id_inmueble ?? null,
        id_servicio:
          citaData.servicio?.id_servicio ??
          citaData.id_servicio ??
          this.mapServicioToId(citaData.servicio),
        fecha_cita: citaData.fecha_cita,
        hora_inicio: this.formatHoraParaAPI(citaData.hora_inicio || '09:00'),
        hora_fin: this.formatHoraParaAPI(citaData.hora_fin || '10:00'),
        id_estado_cita: citaData.id_estado_cita || 1,
        id_agente_asignado: citaData.id_agente_asignado || null,
        observaciones: citaData.observaciones || null,
        id_usuario_creador: userId || citaData.id_usuario_creador // â Usar userId del contexto o el que viene en citaData
      };

      console.log("ð¤ Enviando nueva cita al backend:", payload);

      const response = await apiClient.post("/citas", payload);

      console.log("ð¥ Respuesta del backend al crear:", response.data);

      // Manejar estructura: { success, message, data: {...} }
      const citaCreada = response.data.data || response.data;
      return this.transformarCitaDesdeAPI(citaCreada);
    } catch (error) {
      console.error("â Error al crear cita:", error);
      throw new Error(error.message || "Error al crear la cita");
    }
  }

  async actualizarCita(id, citaData) {
    try {
      if (!id) throw new Error("ID de cita es requerido");

      const horaInicioNormalizada = this.formatHoraParaAPI(citaData.hora_inicio || '09:00');
      const horaFinNormalizada = this.ensureHoraFinValida(
        horaInicioNormalizada,
        citaData.hora_fin
      );

      const payload = {
        tipo_documento: citaData.cliente?.tipo_documento || citaData.tipo_documento,
        numero_documento: citaData.cliente?.numero_documento || citaData.numero_documento,
        nombre_completo: citaData.cliente?.nombre_completo || citaData.nombre_completo,
        apellido_completo: citaData.cliente?.apellido_completo || citaData.apellido_completo,
        email: citaData.cliente?.correo || citaData.email || null,
        telefono: citaData.cliente?.telefono || citaData.telefono,
        id_inmueble: citaData.inmueble?.id_inmueble ?? citaData.id_inmueble ?? null,
        id_servicio: citaData.servicio?.id_servicio ?? citaData.id_servicio,
        fecha_cita: citaData.fecha_cita,
        hora_inicio: horaInicioNormalizada,
        hora_fin: horaFinNormalizada,
        observaciones: citaData.observaciones || null,
        id_estado_cita: this.mapEstadoToId(citaData.estado) || citaData.id_estado_cita || 1
      };

      console.log("ð¤ Enviando actualizaciÃ³n al backend:", { id, payload });

      const response = await apiClient.put(`/citas/${id}`, payload);

      console.log("ð¥ Respuesta del backend:", response.data);

      // Estructura: { success, message, data: {...} }
      const citaActualizada = response.data.data || response.data;

      // â CORRECCIÃN CRÃTICA: usar id_cita en lugar de id
      if (!citaActualizada || (!citaActualizada.id_cita && !citaActualizada.id)) {
        console.error("â Respuesta invÃ¡lida del backend:", response.data);
        throw new Error("El servidor no retornÃ³ datos vÃ¡lidos de la cita actualizada");
      }

      console.log("â Cita actualizada correctamente:", citaActualizada);
      return this.transformarCitaDesdeAPI(citaActualizada);
    } catch (error) {
      console.error("â Error en actualizarCita:", error);
      throw new Error(error.message || "Error al actualizar la cita");
    }
  }

  async eliminarCita(id) {
    try {
      if (!id) {
        throw new Error("ID de cita es requerido");
      }

      await apiClient.delete(`/citas/${id}`);
      return true;
    } catch (error) {
      console.error("â Error al eliminar cita:", error);
      throw new Error(error.message || "Error al eliminar la cita");
    }
  }

  async confirmarCita(id, id_agente_asignado) {
    try {
      if (!id) throw new Error("ID de cita es requerido");
      if (!id_agente_asignado) throw new Error("ID de agente es requerido");

      console.log("ð¤ Confirmando cita:", { id, id_agente_asignado });

      const response = await apiClient.post(`/citas/${id}/confirmar`, {
        id_agente_asignado: id_agente_asignado
      });

      console.log("ð¥ Respuesta del backend al confirmar:", response.data);

      const citaConfirmada = response.data.data || response.data;
      return this.transformarCitaDesdeAPI(citaConfirmada);
    } catch (error) {
      console.error("â Error al confirmar cita:", error);
      throw new Error(error.message || "Error al confirmar la cita");
    }
  }

  async cancelarCita(id, motivo_cancelacion) {
    try {
      if (!id) throw new Error("ID de cita es requerido");
      if (!motivo_cancelacion || motivo_cancelacion.trim().length < 10) {
        throw new Error("El motivo de cancelaciÃ³n es requerido y debe tener al menos 10 caracteres");
      }

      console.log("ð¤ Cancelando cita:", { id, motivo_cancelacion });

      const response = await apiClient.post(`/citas/${id}/cancelar`, {
        motivo_cancelacion: motivo_cancelacion.trim()
      });

      console.log("ð¥ Respuesta del backend al cancelar:", response.data);

      const citaCancelada = response.data.data || response.data;
      return this.transformarCitaDesdeAPI(citaCancelada);
    } catch (error) {
      console.error("â Error al cancelar cita:", error);
      throw new Error(error.message || "Error al cancelar la cita");
    }
  }

  async cancelarMiCita(id, motivo_cancelacion) {
    try {
      if (!id) throw new Error("ID de cita es requerido");
      if (!motivo_cancelacion || motivo_cancelacion.trim().length < 10) {
        throw new Error("El motivo de cancelaci��n es requerido y debe tener al menos 10 caracteres");
      }

      const payload = { motivo_cancelacion: motivo_cancelacion.trim() };
      console.log("Cancelando mi cita:", { id, payload });

      let response;
      try {
        response = await apiClient.post(`/citas/user/${id}/cancelar`, payload);
      } catch (error) {
        const status = error?.response?.status;
        if (status === 404 || status === 405) {
          console.warn("Fallback a ruta general de cancelaci��n");
          response = await apiClient.post(`/citas/${id}/cancelar`, payload);
        } else {
          throw error;
        }
      }

      console.log("Respuesta del backend al cancelar mi cita:", response.data);

      const citaCancelada = response.data.data || response.data;
      return this.transformarCitaDesdeAPI(citaCancelada);
    } catch (error) {
      console.error("Error al cancelar mi cita:", error);
      throw new Error(error.message || "Error al cancelar la cita");
    }
  }

  async cancelarMiCitaUsuario(id, motivo_cancelacion) {
    try {
      if (!id) throw new Error("ID de cita es requerido");
      if (!motivo_cancelacion || motivo_cancelacion.trim().length < 10) {
        throw new Error("El motivo de cancelacion es requerido y debe tener al menos 10 caracteres");
      }

      const payload = { motivo_cancelacion: motivo_cancelacion.trim() };
      console.log("Cancelando mi cita (usuario):", { id, payload });

      const endpoints = [
        `/citas/mis-citas/${id}/cancelar`,
        `/citas/user/${id}/cancelar`,
        `/citas/${id}/cancelar`
      ];

      let lastError;
      for (const endpoint of endpoints) {
        try {
          const response = await apiClient.post(endpoint, payload);
          console.log("Respuesta del backend al cancelar mi cita:", response.data);
          const citaCancelada = response.data.data || response.data;
          return this.transformarCitaDesdeAPI(citaCancelada);
        } catch (error) {
          lastError = error;
          const status = error?.status || error?.response?.status;
          if (status === 404 || status === 405) {
            console.warn(`Endpoint ${endpoint} no disponible, intentando siguiente...`);
            continue;
          }
          break;
        }
      }

      throw lastError || new Error("No se pudo cancelar la cita");
    } catch (error) {
      console.error("Error al cancelar mi cita (usuario):", error);
      throw new Error(error.message || "Error al cancelar la cita");
    }
  }

  async reagendarCita(id, datosReagendamiento) {
    try {
      if (!id) throw new Error("ID de cita es requerido");
      this.validarDatosReagendamiento(datosReagendamiento);

      const payload = {
        fecha_cita: datosReagendamiento.fecha_cita,
        hora_inicio: this.formatHoraParaAPI(datosReagendamiento.hora_inicio || '09:00'),
        hora_fin: this.formatHoraParaAPI(datosReagendamiento.hora_fin || '10:00'),
        motivo_reagendamiento: datosReagendamiento.motivo_reagendamiento,
        id_agente_asignado: datosReagendamiento.id_agente_asignado
      };

      console.log("ð¤ Reagendando cita:", { id, payload });

      const response = await apiClient.put(`/citas/${id}/reagendar`, payload);

      console.log("ð¥ Respuesta del backend al reagendar:", response.data);

      const citaReagendada = response.data.data || response.data;
      return this.transformarCitaDesdeAPI(citaReagendada);
    } catch (error) {
      console.error("â Error al reagendar cita:", error);
      throw new Error(error.message || "Error al reagendar la cita");
    }
  }

  // ==========================================
  // VALIDACIONES
  // ==========================================

  validarDatosCita(citaData) {
    const camposRequeridos = {
      nombre_completo: "Nombre completo",
      apellido_completo: "Apellido completo",
      numero_documento: "NÃºmero de documento",
      telefono: "TelÃ©fono",
      fecha_cita: "Fecha de la cita",
      hora_inicio: "Hora de inicio"
    };

    for (const [campo, etiqueta] of Object.entries(camposRequeridos)) {
      if (!citaData[campo] || String(citaData[campo]).trim() === "") {
        throw new Error(`${etiqueta} es requerido`);
      }
    }

    if (citaData.numero_documento && !/^[0-9]+$/.test(citaData.numero_documento)) {
      throw new Error("El nÃºmero de documento debe contener solo nÃºmeros");
    }

    if (citaData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(citaData.email)) {
      throw new Error("El formato del correo electrÃ³nico es invÃ¡lido");
    }

    if (citaData.telefono) {
      const telefonoLimpio = citaData.telefono.replace(/\D/g, "");
      if (telefonoLimpio.length < 10) {
        throw new Error("El telÃ©fono debe tener al menos 10 dÃ­gitos");
      }
    }
  }

  validarDatosReagendamiento(datosReagendamiento) {
    if (!datosReagendamiento.fecha_cita) {
      throw new Error("La fecha de la cita es obligatoria");
    }

    if (!datosReagendamiento.hora_inicio) {
      throw new Error("La hora de inicio es obligatoria");
    }

    if (!datosReagendamiento.motivo_reagendamiento || datosReagendamiento.motivo_reagendamiento.trim().length < 10) {
      throw new Error("El motivo de reagendamiento es obligatorio y debe tener al menos 10 caracteres");
    }

    if (!datosReagendamiento.id_agente_asignado) {
      throw new Error("El agente asignado es obligatorio");
    }
  }

  // ==========================================
  // HELPERS - MAPEOS
  // ==========================================

  mapServicioToId(servicio) {
    return SERVICIO_MAP[servicio] || 1;
  }

  mapEstadoToId(estado) {
    return ESTADO_TO_ID_MAP[estado?.toLowerCase()] || 1;
  }

  mapIdToEstado(id) {
    return ID_TO_ESTADO_MAP[id] || 'solicitada';
  }

  mapTipoDocumentoToShort(tipo) {
    const map = {
      "CÃ©dula de CiudadanÃ­a": "CC",
      "CÃ©dula de ExtranjerÃ­a": "CE",
      "NIT": "NIT",
      "Pasaporte": "Pasaporte",
      "Tarjeta de Identidad": "TI",
    };
    return map[tipo] || tipo;
  }

  // ==========================================
  // HELPERS - TELÃFONO
  // ==========================================

  limpiarTelefono(telefono) {
    if (!telefono) return "";
    const limpio = telefono.replace(/\D/g, "");
    if (limpio.startsWith("57") && limpio.length === 12) {
      return limpio.slice(2);
    }
    return limpio;
  }

  formatearTelefono(telefono) {
    const limpio = telefono.replace(/\D/g, "");
    if (limpio.length === 10) {
      return `(${limpio.slice(0, 3)}) ${limpio.slice(3, 6)}-${limpio.slice(6)}`;
    }
    return telefono;
  }

  // ==========================================
  // HELPERS - HORAS
  // ==========================================

  formatHoraParaAPI(hora) {
    // Intentar primero con el normalizador centralizado (acepta ISO, 12h, 24h)
    const normalizada = formatTimeTo24Hour(hora);
    if (normalizada) {
      return normalizada;
    }

    if (!hora) return "09:00";

    const horaLimpia = String(hora).toLowerCase().replace(/\s+/g, "");
    const isPM = horaLimpia.includes("pm");
    const isAM = horaLimpia.includes("am");

    let [horas, minutos] = horaLimpia
      .replace(/am|pm/g, "")
      .split(":")
      .map(Number);

    if (isPM && horas !== 12) horas += 12;
    if (isAM && horas === 12) horas = 0;

    if (Number.isNaN(horas) || Number.isNaN(minutos)) {
      console.warn("formatHoraParaAPI: hora no parseable, usando fallback 09:00", hora);
      return "09:00";
    }

    return `${String(horas).padStart(2, "0")}:${String(minutos || 0).padStart(2, "0")}`;
  }

  calcularHoraFin(horaInicio) {
    const [horas, minutos] = horaInicio.split(':').map(Number);
    let horaFin = horas;
    let minutosFin = minutos + 30; // Citas de 30 minutos

    if (minutosFin >= 60) {
      horaFin += 1;
      minutosFin = 0;
    }

    return `${String(horaFin).padStart(2, '0')}:${String(minutosFin).padStart(2, '0')}`;
  }

  convertirHoraAMinutos(hora) {
    const horaNormalizada = this.formatHoraParaAPI(hora);
    if (!horaNormalizada || !horaNormalizada.includes(':')) {
      return null;
    }

    const [horas, minutos] = horaNormalizada.split(':').map(Number);
    if (Number.isNaN(horas) || Number.isNaN(minutos)) {
      return null;
    }

    return (horas * 60) + minutos;
  }

  ensureHoraFinValida(horaInicio, horaFin) {
    const inicioNormalizado = this.formatHoraParaAPI(horaInicio || '09:00');
    const finNormalizado = horaFin ? this.formatHoraParaAPI(horaFin) : null;

    const inicioMinutos = this.convertirHoraAMinutos(inicioNormalizado);
    const finMinutos = finNormalizado ? this.convertirHoraAMinutos(finNormalizado) : null;

    if (inicioMinutos === null) {
      return this.calcularHoraFin('09:00');
    }

    if (finMinutos === null || finMinutos <= inicioMinutos) {
      return this.calcularHoraFin(inicioNormalizado);
    }

    return finNormalizado;
  }

  /**
   * ✅ CORREGIDO: Función para zona horaria Colombia (UTC-5)
   * Los TIME fields de SQL Server son interpretados por Sequelize como UTC
   */
  formatHoraDesdeAPI(hora) {
    if (!hora || typeof hora !== 'string') {
      return '9:00 am';
    }

    try {
      const horaLimpia = hora.trim();
      console.log("🔍 Formateando hora:", horaLimpia);

      if (horaLimpia.includes('T')) {
        const fecha = new Date(horaLimpia);

        if (isNaN(fecha.getTime())) {
          console.warn("⚠️ Hora ISO inválida:", horaLimpia);
          return '9:00 am';
        }

        const colombia24 = formatTimeTo24Hour(horaLimpia);
        if (colombia24) {
          const [horasColombia, minutosColombia] = colombia24
            .split(':')
            .map((value) => parseInt(value, 10));
          console.log(`🔄 Hora UTC: ${fecha.getUTCHours()}:${fecha.getUTCMinutes()} → Hora Colombia: ${horasColombia}:${minutosColombia}`);
        }
      }

      const horaFormateada = formatTimeTo12Hour(horaLimpia);
      if (horaFormateada) {
        return horaFormateada;
      }

      console.warn("⚠️ Formato de hora no reconocido:", horaLimpia);
      return '9:00 am';
    } catch (error) {
      console.error("❌ Error crítico al formatear hora:", error, "Hora original:", hora);
      return '9:00 am';
    }
  }

  /**
   * â CORRECCIÃN CRÃTICA: Transformar correctamente la estructura del backend
   * Backend usa: id_cita, id_persona, id_inmueble, etc.
   * Frontend necesita: id como alias de id_cita
   */
  transformarCitaDesdeAPI(citaAPI) {
    return {
      // â Usar id_cita del backend, pero tambiÃ©n crear alias 'id' para el frontend
      id: citaAPI.id_cita || citaAPI.id,
      id_cita: citaAPI.id_cita || citaAPI.id,

      // Estado
      estado: citaAPI.estado?.nombre_estado?.toLowerCase() ||
        this.mapIdToEstado(citaAPI.id_estado_cita),
      id_estado_cita: citaAPI.id_estado_cita,

      // IDs de relaciones
      id_persona: citaAPI.id_persona,
      id_inmueble: citaAPI.id_inmueble,
      id_servicio: citaAPI.id_servicio,
      id_agente_asignado: citaAPI.id_agente_asignado,
      id_cita_original: citaAPI.id_cita_original,

      // Datos de la cita
      fecha_cita: citaAPI.fecha_cita,
      hora_inicio: citaAPI.hora_inicio,
      hora_fin: citaAPI.hora_fin,
      observaciones: citaAPI.observaciones,
      motivo_cancelacion: citaAPI.motivo_cancelacion || citaAPI.motivoCancelacion || null,
      motivo_reagendamiento: citaAPI.motivo_reagendamiento || citaAPI.motivoReagendamiento || null,
      comentario_edicion: citaAPI.comentario_edicion || citaAPI.comentario,
      comentario: citaAPI.comentario,

      // Fechas de auditorÃ­a
      fecha_creacion: citaAPI.fecha_creacion,
      fecha_actualizacion: citaAPI.fecha_actualizacion,

      // Contador de ediciones
      ediciones_realizadas: citaAPI.ediciones_realizadas || 0,
      ediciones_maximas: citaAPI.ediciones_maximas || 2,

      // Objetos relacionados
      cliente: citaAPI.cliente,
      inmueble: citaAPI.inmueble,
      servicio: citaAPI.servicio,
      agente: citaAPI.agente,
      creador: citaAPI.creador,
      estado_detalle: citaAPI.estado
    };
  }

  /**
   * Obtener lista de agentes disponibles para asignaciÃ³n
   * @returns {Promise<Array>} Lista de agentes disponibles
   */
  async obtenerAgentesDisponibles() {
    try {
      console.log("ð Obteniendo agentes disponibles para asignaciÃ³n");

      const response = await apiClient.get('/citas/agentes-disponibles');
      const agentes = response.data.data || response.data;

      if (!Array.isArray(agentes)) {
        throw new Error("Formato de respuesta invÃ¡lido para agentes disponibles");
      }

      console.log(`â ${agentes.length} agentes disponibles obtenidos`);
      return agentes;
    } catch (error) {
      console.error("â Error al obtener agentes disponibles:", error);
      throw new Error(error.message || "Error al cargar los agentes disponibles");
    }
  }

  /**
   * Asignar un agente a una cita
   * @param {number} idCita - ID de la cita
   * @param {number} idAgenteNuevo - ID del agente a asignar
   * @param {string} comentario - Comentario obligatorio para reasignaciones
   * @param {string|null} motivoReagendamiento - Motivo de reasignaci?n del agente
   * @returns {Promise<Object>} Cita actualizada con historial
   */
  async asignarAgente(idCita, idAgenteNuevo, comentario = null, motivoReagendamiento = null) {
    try {
      if (!idCita) throw new Error("ID de cita es requerido");
      if (!idAgenteNuevo) throw new Error("ID de agente es requerido");

      console.log(`Asignando agente ${idAgenteNuevo} a cita ${idCita}`);

      const payload = {
        id_agente_nuevo: idAgenteNuevo,
        comentario: comentario,
        motivo_reagendamiento: motivoReagendamiento || comentario || null
      };

      const response = await apiClient.post(`/citas/${idCita}/asignar-agente`, payload);

      console.log("Respuesta del backend al asignar agente:", response.data);

      const citaActualizada = response.data.data || response.data;
      return this.transformarCitaDesdeAPI(citaActualizada);
    } catch (error) {
      console.error("Error al asignar agente:", error);
      throw new Error(error.message || "Error al asignar el agente a la cita");
    }
  }

  /**
   * Obtener historial de asignaciones de una cita
   * @param {number} idCita - ID de la cita
   * @returns {Promise<Array>} Historial de asignaciones
   */
  async obtenerHistorialAsignaciones(idCita) {
    try {
      if (!idCita) throw new Error("ID de cita es requerido");

      console.log(`ð Obteniendo historial de asignaciones para cita ${idCita}`);

      const response = await apiClient.get(`/citas/${idCita}/historial-asignaciones`);
      const historial = response.data.data || response.data;

      if (!Array.isArray(historial)) {
        throw new Error("Formato de respuesta invÃ¡lido para historial de asignaciones");
      }

      console.log(`â Historial de asignaciones obtenido: ${historial.length} registros`);
      return historial;
    } catch (error) {
      console.error("â Error al obtener historial de asignaciones:", error);
      throw new Error(error.message || "Error al cargar el historial de asignaciones");
    }
  }

  /**
   * Obtener cita con historial completo de asignaciones
   * @param {number} idCita - ID de la cita
   * @returns {Promise<Object>} Cita con historial incluido
   */
  async obtenerCitaConHistorial(idCita) {
    try {
      if (!idCita) throw new Error("ID de cita es requerido");

      console.log(`ð Obteniendo cita ${idCita} con historial completo`);

      const response = await apiClient.get(`/citas/${idCita}/con-historial`);
      const citaCompleta = response.data.data || response.data;

      const citaTransformada = this.transformarCitaDesdeAPI(citaCompleta);
      citaTransformada.historial_asignaciones = citaCompleta.historial_asignaciones || [];

      console.log(` Cita con historial obtenida`);
      return citaTransformada;
    } catch (error) {
      console.error("Error al obtener cita con historial:", error);
      throw new Error(error.message || "Error al cargar la cita con historial");
    }
  }

  /**
   * Obtener horarios disponibles para una fecha, agente y servicio especÃ­ficos
   * CON LÃGICA ESPECIAL PARA VISITAS A INMUEBLES (servicio ID 1)
   * @param {Object} data - Objeto con fecha_cita, id_agente, id_servicio, id_inmueble (opcional)
   * @returns {Promise<Array>} Array de horarios disponibles en formato HH:mm
   */
  async obtenerHorariosDisponibles(data) {
    try {
      console.log(` Obteniendo horarios disponibles (admin):`, data);

      // ð¨ LÃGICA ESPECIAL: Si es servicio "Visita a Propiedad" (ID 1)
      if (data.id_servicio === 1 || data.servicio === 1) {
        console.log("Servicio 'Visita a Propiedad': Aplicando restricciones de bloqueo");

        // Obtener citas existentes para esa fecha y servicio de visitas a inmuebles
        const citasExistentes = await this.obtenerCitas({
          fecha: data.fecha_cita,
          servicio: 1 // Solo visitas a inmuebles
        });

        console.log(`Citas existentes para ${data.fecha_cita}:`, citasExistentes.length);

        // Generar todos los horarios disponibles inicialmente
        const todosHorarios = [];
        // Mañana: 8:00 AM - 1:00 PM (último inicio 12:30)
        for (let hora = 8; hora <= 12; hora++) {
          todosHorarios.push(`${hora.toString().padStart(2, '0')}:00`);
          if (hora !== 12) {
            todosHorarios.push(`${hora.toString().padStart(2, '0')}:30`);
          } else {
            todosHorarios.push(`12:30`);
          }
        }
        // Tarde: 2:00 PM - 5:00 PM (último inicio 16:30)
        for (let hora = 14; hora <= 16; hora++) {
          todosHorarios.push(`${hora.toString().padStart(2, '0')}:00`);
          todosHorarios.push(`${hora.toString().padStart(2, '0')}:30`);
        }

        // Filtrar horarios que NO estÃ¡n ocupados por citas confirmadas/programadas
        // Filtrar horarios que NO están ocupados por citas confirmadas/programadas
        const citasActivas = citasExistentes.filter(cita =>
          ['confirmada', 'programada', 'reagendada', 're agendada'].includes(cita.estado) &&
          cita.fecha_cita === data.fecha_cita
        );

        // Función interna rápida para normalizar hora (HH:mm)
        const formatTimeShort = (t) => {
          if (!t) return t;
          if (typeof t === 'string' && t.includes(':')) return t.substring(0, 5);
          return t;
        };

        // Extraer horarios ocupados por citas definitivas
        const horariosOcupados = new Set(
          citasActivas.map(cita => formatTimeShort(cita.hora_inicio))
        );

        // Contar solicitudes por horario
        const conteoSolicitudes = {};
        citasExistentes
          .filter(cita => cita.estado === 'solicitada' && cita.fecha_cita === data.fecha_cita)
          .forEach(cita => {
            const hora = formatTimeShort(cita.hora_inicio);
            conteoSolicitudes[hora] = (conteoSolicitudes[hora] || 0) + 1;
          });

        // Filtrar horarios disponibles: no ocupados Y con menos de 5 solicitudes
        const horariosDisponibles = todosHorarios.filter(hora => {
          const estaOcupado = horariosOcupados.has(hora);
          const tieneDemasiadasSolicitudes = (conteoSolicitudes[hora] || 0) >= 5;
          return !estaOcupado && !tieneDemasiadasSolicitudes;
        });

        console.log(`Horarios disponibles para visitas:`, horariosDisponibles.length, 'de', todosHorarios.length);

        return horariosDisponibles;

      } else {
        // ð PARA OTROS SERVICIOS: Sin restricciones, todos los horarios disponibles
        console.log("Otro servicio: Sin restricciones de bloqueo");

        const defaultHorarios = [];
        // Mañana: 8:00 AM - 1:00 PM (último inicio 12:30)
        for (let hora = 8; hora <= 12; hora++) {
          defaultHorarios.push(`${hora.toString().padStart(2, '0')}:00`);
          if (hora !== 12) {
            defaultHorarios.push(`${hora.toString().padStart(2, '0')}:30`);
          } else {
            defaultHorarios.push(`12:30`);
          }
        }
        // Tarde: 2:00 PM - 5:00 PM (último inicio 16:30)
        for (let hora = 14; hora <= 16; hora++) {
          defaultHorarios.push(`${hora.toString().padStart(2, '0')}:00`);
          defaultHorarios.push(`${hora.toString().padStart(2, '0')}:30`);
        }
        return defaultHorarios;
      }

    } catch (error) {
      console.error("Error en obtenerHorariosDisponibles:", error);

      // Fallback: retornar horarios predeterminados pero con bloqueo bÃ¡sico si no podemos consultar
      const defaultHorarios = [];
      for (let hora = 8; hora <= 17; hora++) {
        defaultHorarios.push(`${hora.toString().padStart(2, '0')}:00`);
        if (hora < 17) {
          defaultHorarios.push(`${hora.toString().padStart(2, '0')}:30`);
        }
      }
      return defaultHorarios;
    }
  }

  /**
   * Obtener horarios disponibles para reagendamiento (para usuarios normales)
   * Con lÃ³gica especial para visitas a inmuebles, sin necesidad de permisos de admin
   * @param {Object} data - Objeto con fecha_cita, id_servicio
   * @returns {Promise<Array>} Array de horarios disponibles en formato HH:mm
   */
  async obtenerHorariosDisponiblesUsuario(data) {
    try {
      console.log(`Usuario obteniendo horarios disponibles para reagendamiento:`, data);

      const params = new URLSearchParams();
      params.append("fecha_cita", data.fecha_cita);
      params.append("id_servicio", data.id_servicio);

      const response = await apiClient.get(`/citas/mis-citas/horarios-disponibles?${params.toString()}`);
      const result = response.data.data || response.data;

      if (!Array.isArray(result)) {
        console.error("Formato de respuesta invÃ¡lido para horarios disponibles de usuario:", response.data);
        throw new Error("Formato de respuesta invÃ¡lido del servidor");
      }

      console.log(`Horarios disponibles para reagendamiento obtenidos: ${result.length}`);
      return result;

    } catch (error) {
      console.error("Error en obtenerHorariosDisponiblesUsuario:", error);

      const defaultHorarios = [];
      // Mañana: 8:00 AM - 1:00 PM (último inicio 12:30)
      for (let hora = 8; hora <= 12; hora++) {
        defaultHorarios.push(`${hora.toString().padStart(2, '0')}:00`);
        if (hora !== 12) {
          defaultHorarios.push(`${hora.toString().padStart(2, '0')}:30`);
        } else {
          defaultHorarios.push(`12:30`);
        }
      }
      // Tarde: 2:00 PM - 5:00 PM (último inicio 16:30)
      for (let hora = 14; hora <= 16; hora++) {
        defaultHorarios.push(`${hora.toString().padStart(2, '0')}:00`);
        defaultHorarios.push(`${hora.toString().padStart(2, '0')}:30`);
      }
      return defaultHorarios;
    }
  }

  /**
   * Obtener horarios disponibles para visitantes (PÚBLICO)
   * @param {Object} data - Objeto con fecha_cita, id_servicio
   * @returns {Promise<Array>} Array de horarios disponibles en formato HH:mm
   */
  async obtenerHorariosDisponiblesPublico(data) {
    try {
      console.log(`Consulta PÚBLICA de horarios disponibles:`, data);

      const params = new URLSearchParams();
      params.append("fecha_cita", data.fecha_cita);
      params.append("id_servicio", data.id_servicio);
      if (data.id_inmueble) params.append("id_inmueble", data.id_inmueble);

      const response = await apiClient.get(`/citas/horarios-disponibles-publico?${params.toString()}`);
      const result = response.data.data || response.data;

      if (!Array.isArray(result)) {
        console.error("Formato de respuesta inválido del servidor para horarios públicos:", response.data);
        return [];
      }

      console.log(`Horarios públicos obtenidos: ${result.length}`);
      return result;

    } catch (error) {
      console.error("Error en obtenerHorariosDisponiblesPublico:", error);
      const defaultHorarios = [];
      for (let hora = 8; hora <= 12; hora++) {
        defaultHorarios.push(`${hora.toString().padStart(2, '0')}:00`);
        if (hora !== 12) {
          defaultHorarios.push(`${hora.toString().padStart(2, '0')}:30`);
        } else {
          defaultHorarios.push(`12:30`);
        }
      }
      for (let hora = 14; hora <= 16; hora++) {
        defaultHorarios.push(`${hora.toString().padStart(2, '0')}:00`);
        defaultHorarios.push(`${hora.toString().padStart(2, '0')}:30`);
      }
      return defaultHorarios;
    }
  }

  /**
   * Reagendar cita propia (para usuarios/clientes)
   * @param {number} id - ID de la cita
   * @param {Object} datosReagendamiento - Datos del reagendamiento
   * @returns {Promise<Object>} Cita reagendada
   */
  async reagendarMiCita(id, datosReagendamiento) {
    try {
      if (!id) throw new Error("ID de cita es requerido");

      // â ValidaciÃ³n especÃ­fica para usuarios (sin requerir id_agente_asignado)
      if (!datosReagendamiento.fecha_cita) {
        throw new Error("La fecha de la cita es obligatoria");
      }

      if (!datosReagendamiento.hora_inicio) {
        throw new Error("La hora de inicio es obligatoria");
      }

      if (!datosReagendamiento.motivo_reagendamiento || datosReagendamiento.motivo_reagendamiento.trim().length < 10) {
        throw new Error("El motivo de reagendamiento es obligatorio y debe tener al menos 10 caracteres");
      }

      const horaFinCalculada = datosReagendamiento.hora_fin || this.calcularHoraFin(datosReagendamiento.hora_inicio);

      const payload = {
        fecha_cita: datosReagendamiento.fecha_cita,
        hora_inicio: datosReagendamiento.hora_inicio,
        hora_fin: horaFinCalculada,
        motivo_reagendamiento: datosReagendamiento.motivo_reagendamiento
      };

      if (datosReagendamiento.id_servicio) {
        payload.id_servicio = datosReagendamiento.id_servicio;
      }

      if (typeof datosReagendamiento.id_agente_asignado !== 'undefined') {
        payload.id_agente_asignado = datosReagendamiento.id_agente_asignado;
      }

      if (typeof datosReagendamiento.observaciones !== 'undefined') {
        payload.observaciones = datosReagendamiento.observaciones;
      }

      console.log("Reagendando mi cita:", { id, payload });

      // â CAMBIO: usar nueva ruta /user/:id/reagendar para evitar conflictos
      const response = await apiClient.put(`/citas/user/${id}/reagendar`, payload);

      console.log("ð¥ Respuesta del backend al reagendar mi cita:", response.data);

      const citaReagendada = response.data.data || response.data;
      return this.transformarCitaDesdeAPI(citaReagendada);
    } catch (error) {
      console.error("Error al reagendar mi cita:", error);
      throw new Error(error.message || "Error al reagendar la cita");
    }
  }

  /**
   * Obtener citas del usuario autenticado como cliente
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Array>} Lista de citas del usuario
   */
  async obtenerMisCitas(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.estado) params.append("estado", filtros.estado);
      if (filtros.fecha) params.append("fecha", filtros.fecha);
      if (filtros.servicio) params.append("servicio", filtros.servicio);
      // Cache-bust para evitar respuestas 304 sin cuerpo
      params.append("_ts", Date.now());

      const endpoint = `/citas/mis-citas${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await apiClient.get(endpoint, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const data = response.data.data || response.data;

      if (!Array.isArray(data)) {
        console.error("Formato de respuesta invÃ¡lido del servidor para mis citas:", response.data);
        throw new Error("Formato de respuesta invÃ¡lido del servidor");
      }

      return data.map(cita => this.transformarCitaDesdeAPI(cita));
    } catch (error) {
      console.error("Error al obtener mis citas:", error);
      throw new Error(error.message || "Error al cargar tus citas desde el servidor");
    }
  }
}

const citaApiService = new CitaApiService();
export default citaApiService;

/**
 * â CORREGIDO: FunciÃ³n optimizada para cambiar solo el estado
 */
export const actualizarEstadoCita = async (idCita, idEstadoCita) => {
  try {
    console.log(` Actualizando estado de cita ${idCita} a estado ${idEstadoCita} (endpoint optimizado)`);

    const response = await apiClient.patch(`/citas/${idCita}/estado`, {
      id_estado_cita: idEstadoCita
    });

    console.log(" Respuesta del servidor:", response.data);

    // Estructura: { success, message, data: {...} }
    const citaActualizada = response.data.data || response.data;

    if (!citaActualizada || (!citaActualizada.id_cita && !citaActualizada.id)) {
      throw new Error("El servidor no retornÃ³ datos vÃ¡lidos de la cita actualizada");
    }

    console.log("â Estado actualizado correctamente");
    return citaApiService.transformarCitaDesdeAPI(citaActualizada);
  } catch (error) {
    console.error("â Error en actualizarEstadoCita:", error);
    throw error;
  }
};
