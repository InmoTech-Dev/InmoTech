const citaService = require('../services/cita.service');
const personaService = require('../services/persona.service');
const { isSuperAdministrator } = require('../middlewares/auth.middleware');
const logger = require('../utils/logger');
const { Persona } = require('../models');
const emailService = require('../services/email.service');
const sseService = require('../services/sse.service');
const realtimeAudienceService = require('../services/realtimeAudience.service');
const opsConsoleLogger = require('../utils/opsConsoleLogger');

class CitaController {
  normalizarIdsUsuarios = (values = []) => {
    return Array.from(
      new Set(
        (Array.isArray(values) ? values : [values])
          .map((value) => Number.parseInt(value, 10))
          .filter((value) => Number.isInteger(value) && value > 0)
      )
    );
  }

  extraerIdsUsuariosAfectados = (cita = {}, extras = []) => {
    const baseIds = [
      cita?.id_persona,
      cita?.id_usuario_creador,
      cita?.id_agente_asignado,
      ...(Array.isArray(extras) ? extras : []),
    ];
    return this.normalizarIdsUsuarios(baseIds);
  }

  construirResumenCita = (cita = {}, fallbackData = {}) => {
    const clienteNombre = [
      cita?.cliente?.nombre_completo,
      cita?.cliente?.apellido_completo,
    ].filter(Boolean).join(' ').trim()
      || [fallbackData?.nombre_completo, fallbackData?.apellido_completo]
        .filter(Boolean)
        .join(' ')
        .trim()
      || 'N/A';

    const fecha = cita?.fecha_cita || fallbackData?.fecha_cita || 'N/A';
    const horaInicio = cita?.hora_inicio || fallbackData?.hora_inicio || 'N/A';
    const horaFin = cita?.hora_fin || fallbackData?.hora_fin || 'N/A';
    const servicio = cita?.servicio?.nombre_servicio || fallbackData?.id_servicio || 'N/A';
    const estado = cita?.estado?.nombre_estado || cita?.id_estado_cita || fallbackData?.id_estado_cita || 'N/A';
    const creador = [cita?.creador?.nombre_completo, cita?.creador?.apellido_completo]
      .filter(Boolean)
      .join(' ')
      .trim() || fallbackData?.id_usuario_creador || 'N/A';

    const inmuebleDireccion = cita?.inmueble?.direccion || 'N/A';
    const inmuebleCiudad = cita?.inmueble?.ciudad || '';
    const inmuebleRegistro = cita?.inmueble?.registro_inmobiliario || fallbackData?.id_inmueble || 'N/A';
    const inmueble = `${inmuebleDireccion}${inmuebleCiudad ? ` (${inmuebleCiudad})` : ''}`;

    return [
      { label: 'id-cita', value: cita?.id_cita || cita?.id || 'N/A' },
      { label: 'cliente', value: clienteNombre },
      { label: 'fecha', value: fecha },
      { label: 'hora-inicio', value: horaInicio },
      { label: 'hora-fin', value: horaFin },
      { label: 'inmueble', value: inmueble },
      { label: 'registro-inmueble', value: inmuebleRegistro },
      { label: 'servicio', value: servicio },
      { label: 'estado', value: estado },
      { label: 'creado-por', value: creador },
    ];
  }

  emitirEventosTiempoRealCita = async ({ action, cita = null, appointmentId = null, extraAffectedUserIds = [] }) => {
    try {
      const adminIds = await realtimeAudienceService.obtenerAdministrativosActivosIds();
      const affectedUserIds = this.extraerIdsUsuariosAfectados(cita || {}, extraAffectedUserIds);
      const citaId = Number.parseInt(appointmentId || cita?.id_cita || cita?.id, 10);

      sseService.emitAppointmentChanged({
        action,
        appointmentId: Number.isInteger(citaId) && citaId > 0 ? citaId : null,
        affectedUserIds,
        audienceUserIds: adminIds,
      });

      if (adminIds.length > 0) {
        sseService.emitNotificationChanged({
          userIds: adminIds,
          scope: 'citas',
        });
      }
    } catch (error) {
      logger.error('[REALTIME][CITA] No se pudieron emitir eventos SSE', {
        action,
        appointmentId,
        error: error.message,
      });
    }
  }

  crearCita = async (req, res, next) => {
    try {
      const data = req.validatedData ? { ...req.validatedData } : { ...req.body };

      if (!data.id_usuario_creador && req.user) {
        data.id_usuario_creador = req.user.id_persona || req.user.id;
      }

      const nuevaCita = await citaService.crearCita(data);

      if (nuevaCita) {
        try {
          await emailService.enviarEmailCitaSolicitada({
            cita: nuevaCita,
            correoAlterno: data.email
          });
        } catch (emailError) {
          logger.error(`[EMAIL][CITA] No se pudo enviar el correo de cita solicitada para la cita ${nuevaCita.id_cita || ''}: ${emailError.message}`);
        }
      }

      this.emitirEventosTiempoRealCita({
        action: 'created',
        cita: nuevaCita,
      });

      opsConsoleLogger.eventBlock({
        scope: 'CITA',
        action: 'CREATE',
        outcome: 'OK',
        fields: this.construirResumenCita(nuevaCita, data),
        footer: '✅ cita creada exitosamente',
      });

      return res.status(201).json({ success: true, data: nuevaCita });
    } catch (error) {
      opsConsoleLogger.eventBlock({
        scope: 'CITA',
        action: 'CREATE',
        outcome: 'FAIL',
        method: 'warn',
        fields: this.construirResumenCita({}, req.validatedData ? { ...req.validatedData } : { ...req.body }),
        footer: `❌ cita no creada (${error.message || 'error desconocido'})`,
      });

      if (error.message.includes('Ya existe una cita')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    }
  }
  obtenerCitas = async (req, res, next) => {
    try {
      const filtros = {};

      if (req.query.estado) {
        const estadoParsed = parseInt(req.query.estado);
        if (!isNaN(estadoParsed)) {
          filtros.id_estado_cita = estadoParsed;
        }
      }

      if (req.query.fecha) {
        filtros.fecha_cita = req.query.fecha;
      }

      if (req.query.agente) {
        const agenteParsed = parseInt(req.query.agente);
        if (!isNaN(agenteParsed)) {
          filtros.id_agente_asignado = agenteParsed;
        }
      }

      // âœ… OPTIMIZACIÃ“N: Agregar paginaciÃ³n para listas grandes con validaciÃ³n
      const pageValue = req.query.page ? parseInt(req.query.page) : 1;
      const limitValue = req.query.limit ? parseInt(req.query.limit) : 50;
      const page = (!isNaN(pageValue) && pageValue > 0) ? pageValue : 1;
      const limit = (!isNaN(limitValue) && limitValue > 0) ? limitValue : 50;
      filtros.page = page;
      filtros.limit = limit;

      const result = await citaService.obtenerTodasLasCitas(filtros);

      return res.status(200).json({
        success: true,
        message: 'Citas obtenidas exitosamente',
        data: result.citas || result,
        total: Array.isArray(result) ? result.length : result.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  obtenerCitaPorId = async (req, res, next) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);

      // Validar que el ID sea un nÃºmero vÃ¡lido y no NaN
      if (!id || isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita invÃ¡lido'
        });
      }

      const cita = await citaService.obtenerCitaPorId(parsedId);

      if (!cita) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cita obtenida exitosamente',
        data: cita
      });
    } catch (error) {
      next(error);
    }
  }

  confirmarCita = async (req, res, next) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);

      if (!id || isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita invÃ¡lido'
        });
      }

      const { id_agente_asignado } = req.validatedData;

      const cita = await citaService.confirmarCita(parsedId, id_agente_asignado);

      try {
        const citaDetallada = await citaService.obtenerCitaPorId(parsedId);
        await emailService.enviarEmailCitaConfirmada({ cita: citaDetallada });
        await emailService.enviarEmailCitaConfirmadaAgente({ cita: citaDetallada });
      } catch (emailError) {
        logger.error(`[EMAIL][CITA] No se pudo enviar confirmacion de cita ${parsedId}: ${emailError.message}`);
      }

      this.emitirEventosTiempoRealCita({
        action: 'confirmed',
        cita,
        appointmentId: parsedId,
      });

      return res.status(200).json({
        success: true,
        message: 'Cita confirmada exitosamente',
        data: cita
      });
    } catch (error) {
      next(error);
    }
  }

  cancelarCita = async (req, res, next) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);

      if (!id || isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita invÃ¡lido'
        });
      }

      const { motivo_cancelacion } = req.validatedData;

      const cita = await citaService.cancelarCita(parsedId, motivo_cancelacion);

      try {
        await emailService.enviarEmailCitaCancelada({ cita, motivo: motivo_cancelacion });
      } catch (emailError) {
        logger.error(`[EMAIL][CITA] No se pudo enviar cancelacion de cita ${parsedId}: ${emailError.message}`);
      }

      this.emitirEventosTiempoRealCita({
        action: 'cancelled',
        cita,
        appointmentId: parsedId,
      });

      return res.status(200).json({
        success: true,
        message: 'Cita cancelada exitosamente',
        data: cita
      });
    } catch (error) {
      next(error);
    }
  }

  reagendarCita = async (req, res, next) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);

      if (!id || isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita invÃ¡lido'
        });
      }

      const { fecha_cita, hora_inicio, hora_fin, motivo_reagendamiento, id_agente_asignado } = req.validatedData;

      // Usar el ID del usuario autenticado como agente si no se especifica otro
      const idAgenteFinal = id_agente_asignado || req.user.id_persona;

      const cita = await citaService.reagendarCita(parsedId, {
        fecha_cita,
        hora_inicio,
        hora_fin,
        motivo_reagendamiento,
        id_agente_asignado: idAgenteFinal,
        id_usuario_realizo: req.user.id_persona
      });

      try {
        const citaDetallada = await citaService.obtenerCitaPorId(parsedId);
        await emailService.enviarEmailCitaReagendada({ cita: citaDetallada, motivo: motivo_reagendamiento });
      } catch (emailError) {
        logger.error(`[EMAIL][CITA] No se pudo enviar reagendamiento de cita ${parsedId}: ${emailError.message}`);
      }

      this.emitirEventosTiempoRealCita({
        action: 'rescheduled',
        cita,
        appointmentId: parsedId,
      });

      return res.status(200).json({
        success: true,
        message: 'Cita reagendada exitosamente',
        data: cita
      });
    } catch (error) {
      next(error);
    }
  }

  completarCita = async (req, res, next) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);

      if (!id || isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita invÃ¡lido'
        });
      }

      const cita = await citaService.completarCita(parsedId);

      return res.status(200).json({
        success: true,
        message: 'Cita completada exitosamente',
        data: cita
      });
    } catch (error) {
      next(error);
    }
  }

  actualizarCita = async (req, res, next) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);

      if (!id || isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita invÃ¡lido'
        });
      }

      // âœ… Verificar lÃ­mite de ediciones antes de actualizar
      const citaExistente = await citaService.obtenerCitaPorId(parsedId);
      if (citaExistente.ediciones_realizadas >= citaExistente.ediciones_maximas) {
        return res.status(400).json({
          success: false,
          message: `Esta cita ha alcanzado el lÃ­mite mÃ¡ximo de ${citaExistente.ediciones_maximas} ediciones permitidas`
        });
      }

      // âœ… Incrementar contador de ediciones antes de actualizar
      const cita = await citaService.incrementarContadorEdicionesActualizar(parsedId, req.validatedData);



      this.emitirEventosTiempoRealCita({
        action: 'updated',
        cita,
        appointmentId: parsedId,
      });

      return res.status(200).json({
        success: true,
        message: 'Cita actualizada exitosamente',
        data: cita
      });
    } catch (error) {
      next(error);
    }
  }

  eliminarCita = async (req, res, next) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);

      if (!id || isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita invÃ¡lido'
        });
      }

      const cita = await citaService.eliminarCita(parsedId);

      this.emitirEventosTiempoRealCita({
        action: 'deleted',
        cita,
        appointmentId: parsedId,
      });

      return res.status(200).json({
        success: true,
        message: 'Cita cancelada exitosamente',
        data: cita
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * âœ… ENDPOINT OPTIMIZADO: Actualizar solo el estado de la cita
   * Reduce el tiempo de respuesta de ~1 segundo a ~50-100ms
   */
  actualizarEstadoCita = async (req, res, next) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);

      if (!id || isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita invÃ¡lido'
        });
      }

      const { id_estado_cita } = req.validatedData;

      logger.info(`ðŸ”„ Actualizando estado de cita ${parsedId} a ${id_estado_cita} (endpoint optimizado)`);

      const resultado = await citaService.actualizarEstadoCitaOptimizado(parsedId, id_estado_cita);

      let citaDetallada = null;
      try {
        citaDetallada = await citaService.obtenerCitaPorId(parsedId);
      } catch {
        citaDetallada = resultado;
      }

      this.emitirEventosTiempoRealCita({
        action: 'status_changed',
        cita: citaDetallada,
        appointmentId: parsedId,
      });

      return res.status(200).json({
        success: true,
        message: 'Estado de cita actualizado exitosamente',
        data: resultado
      });
    } catch (error) {
      logger.error(`âŒ Error en actualizarEstadoCita: ${error.message}`);
      next(error);
    }
  }

  buscarPersonaPorDocumento = async (req, res, next) => {
    try {
      const { tipo_documento, numero_documento } = req.query;

      if (!tipo_documento || !numero_documento) {
        return res.status(400).json({
          success: false,
          message: 'Tipo y nÃºmero de documento son requeridos'
        });
      }

      opsConsoleLogger.info('CITA', 'PERSON_LOOKUP', 'QUERY', {
        tipo_documento: tipo_documento.toUpperCase(),
        numero_documento: numero_documento.replace(/[\s\-\.]/g, '')
      });

      const persona = await Persona.findOne({
        where: {
          tipo_documento: tipo_documento.toUpperCase(),
          numero_documento: numero_documento.replace(/[\s\-\.]/g, '')
        }
      });

      opsConsoleLogger.info('CITA', 'PERSON_LOOKUP', 'RESULT', persona ? {
        found: true,
        id_persona: persona.id_persona,
        nombre_completo: persona.nombre_completo,
        apellido_completo: persona.apellido_completo,
        telefono: persona.telefono,
        correo: persona.correo
      } : {
        found: false,
        result: 'No encontrado'
      });

      if (!persona) {
        return res.status(404).json({
          success: false,
          message: 'Persona no encontrada'
        });
      }

      // âœ… FORMATEAR RESPUESTA PARA AUTOCOMPLETADO DEL FORMULARIO
      // El formulario tiene separados: nombres (primer + segundo), apellidos (primer + segundo)
      const nombresPartes = persona.nombre_completo ? persona.nombre_completo.trim().split(' ') : [];
      const apellidosPartes = persona.apellido_completo ? persona.apellido_completo.trim().split(' ') : [];

      const responseData = {
        primer_nombre: nombresPartes[0] || '',
        segundo_nombre: nombresPartes.slice(1).join(' ') || '',
        primer_apellido: apellidosPartes[0] || '',
        segundo_apellido: apellidosPartes.slice(1).join(' ') || '',
        telefono: persona.telefono || '',
        correo: persona.correo || ''
      };

      opsConsoleLogger.info('CITA', 'PERSON_LOOKUP', 'RESPONSE', responseData);

      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      opsConsoleLogger.error('CITA', 'PERSON_LOOKUP', 'FAIL', {
        reason: error.message || 'Error desconocido'
      });
      next(error);
    }
  }

  /**
   * Asignar agente a una cita
   * Endpoint: POST /api/v1/citas/:id/asignar-agente
   */
  asignarAgente = async (req, res, next) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);

      if (!id || isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita invÃ¡lido'
        });
      }

      const { id_agente_nuevo, comentario, motivo_reagendamiento } = req.validatedData;
      const idUsuarioRealizo = req.user.id; // âœ… Corregido: usar req.user.id en lugar de req.user.id_persona

      // Capturar estado/agente previo para detectar reasignaciÃ³n de cita confirmada
      const citaAntes = await citaService.obtenerCitaPorId(parsedId);
      const esReasignacionConfirmada = Boolean(
        citaAntes &&
        citaAntes.id_estado_cita === 2 && // Confirmada
        citaAntes.id_agente_asignado &&
        citaAntes.id_agente_asignado !== id_agente_nuevo
      );
      const esPrimeraAsignacionSolicitada = Boolean(
        citaAntes &&
        citaAntes.id_estado_cita === 1 && // Solicitada
        !citaAntes.id_agente_asignado
      );

      logger.info(`ðŸ”„ Asignando agente ${id_agente_nuevo} a cita ${parsedId} por usuario ${idUsuarioRealizo}`);

      const citaActualizada = await citaService.asignarAgente(
        parsedId,
        id_agente_nuevo,
        idUsuarioRealizo,
        comentario,
        motivo_reagendamiento
      );

      try {
        const citaDetallada = await citaService.obtenerCitaPorId(parsedId);
        if (esReasignacionConfirmada) {
          await emailService.enviarEmailCitaAsignada({ cita: citaDetallada });
          await emailService.enviarEmailCitaConfirmadaAgente({ cita: citaDetallada });
        }
        if (esPrimeraAsignacionSolicitada) {
          await emailService.enviarEmailCitaConfirmadaAgente({ cita: citaDetallada });
        }
      } catch (emailError) {
        logger.error(`[EMAIL][CITA] No se pudo notificar asignacion de agente en cita ${parsedId}: ${emailError.message}`);
      }

      this.emitirEventosTiempoRealCita({
        action: 'assigned',
        cita: citaActualizada,
        appointmentId: parsedId,
      });

      return res.status(200).json({
        success: true,
        message: 'Agente asignado exitosamente',
        data: citaActualizada
      });
    } catch (error) {
      logger.error(`âŒ Error asignando agente a cita ${req.params.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Obtener agentes disponibles para asignaciÃ³n
   * Endpoint: GET /api/v1/citas/agentes-disponibles
   */
  obtenerAgentesDisponibles = async (req, res, next) => {
    try {
      logger.info(`ðŸ” Obteniendo agentes disponibles`);

      const agentes = await citaService.obtenerAgentesDisponibles();

      return res.status(200).json({
        success: true,
        message: 'Agentes disponibles obtenidos exitosamente',
        data: agentes
      });
    } catch (error) {
      logger.error(`âŒ Error obteniendo agentes disponibles: ${error.message}`);
      next(error);
    }
  }

  /**
   * Obtener historial de asignaciones de una cita
   * Endpoint: GET /api/v1/citas/:id/historial-asignaciones
   */
  obtenerHistorialAsignaciones = async (req, res, next) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);

      if (!id || isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita invÃ¡lido'
        });
      }

      const idUsuario = req.user.id; // âœ… Corregido: usar req.user.id en lugar de req.user.id_persona

      logger.info(`ðŸ” Obteniendo historial de asignaciones para cita ${parsedId}`);

      const historial = await citaService.obtenerHistorialAsignaciones(parsedId);

      return res.status(200).json({
        success: true,
        message: 'Historial de asignaciones obtenido exitosamente',
        data: historial
      });
    } catch (error) {
      logger.error(`âŒ Error obteniendo historial de cita ${req.params.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Obtener cita con historial completo
   * Endpoint: GET /api/v1/citas/:id/con-historial
   */
  obtenerCitaConHistorial = async (req, res, next) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);

      if (!id || isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita invÃ¡lido'
        });
      }

      const idUsuario = req.user.id; // âœ… Corregido: usar req.user.id en lugar de req.user.id_persona

      logger.info(`ðŸ” Obteniendo cita ${parsedId} con historial completo`);

      const cita = await citaService.obtenerCitaConHistorial(parsedId);

      return res.status(200).json({
        success: true,
        message: 'Cita con historial obtenida exitosamente',
        data: cita
      });
    } catch (error) {
      logger.error(`âŒ Error obteniendo cita con historial ${req.params.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Obtener citas del usuario autenticado como cliente
   * Endpoint: GET /api/v1/citas/mis-citas
   */
  obtenerMisCitas = async (req, res, next) => {
    try {
      const userId = req.user.id; // ID del usuario autenticado
      const filtros = req.query; // Filtros opcionales de query params

      logger.info(`ðŸ” Obteniendo citas del cliente ${userId}`);

      const citas = await citaService.obtenerCitasPorCliente(userId, filtros);

      return res.status(200).json({
        success: true,
        message: 'Citas obtenidas exitosamente',
        data: citas
      });
    } catch (error) {
      logger.error(`âŒ Error obteniendo citas del cliente ${req.user.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Cancelar cita por el usuario (cliente)
   * Endpoint: POST /api/v1/citas/mis-citas/:id/cancelar
   */
  cancelarMiCita = async (req, res, next) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);
      const userId = req.user.id;

      if (!id || isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita invÃ¡lido'
        });
      }

      const { motivo_cancelacion } = req.validatedData;

      // Verificar que la cita pertenece al usuario
      const cita = await citaService.obtenerCitaPorId(parsedId);
      if (!cita || cita.id_persona !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para cancelar esta cita'
        });
      }

      // Verificar que el estado permita cancelaciÃ³n
      const estadoRaw = typeof cita.estado === 'string'
        ? cita.estado
        : (cita.estado?.nombre_estado || cita.estado?.nombre || '');
      const estadoNormalizado = (estadoRaw || '').toLowerCase();
      const estadosPermitidos = ['solicitada', 'confirmada', 'programada', 're agendada'];
      if (!estadosPermitidos.includes(estadoNormalizado)) {
        return res.status(400).json({
          success: false,
          message: 'Esta cita no puede ser cancelada en su estado actual'
        });
      }

      const citaCancelada = await citaService.cancelarCita(parsedId, motivo_cancelacion);

      try {
        await emailService.enviarEmailCitaCancelada({ cita: citaCancelada, motivo: motivo_cancelacion });
      } catch (emailError) {
        logger.error(`[EMAIL][CITA] No se pudo notificar cancelacion de cita ${parsedId} al cliente: ${emailError.message}`);
      }

      this.emitirEventosTiempoRealCita({
        action: 'cancelled_by_user',
        cita: citaCancelada,
        appointmentId: parsedId,
        extraAffectedUserIds: [userId],
      });

      return res.status(200).json({
        success: true,
        message: 'Cita cancelada exitosamente',
        data: citaCancelada
      });
    } catch (error) {
      logger.error(`âŒ Error cancelando cita ${req.params.id} por usuario ${req.user.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Obtener horarios disponibles para reagendamiento (usuario normal)
   * Endpoint: GET /api/v1/citas/mis-citas/horarios-disponibles
   */
  obtenerHorariosDisponiblesReagendar = async (req, res, next) => {
    try {
      const { fecha_cita, id_servicio } = req.query;

      if (!fecha_cita || !id_servicio) {
        return res.status(400).json({
          success: false,
          message: 'fecha_cita e id_servicio son requeridos'
        });
      }

      const idServicioParsed = parseInt(id_servicio);
      if (isNaN(idServicioParsed) || idServicioParsed <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de servicio invÃ¡lido'
        });
      }

      logger.info(`ðŸ” Usuario obteniendo horarios disponibles para reagendamiento: fecha=${fecha_cita}, servicio=${idServicioParsed}`);

      // ðŸš¨ LÃ“GICA ESPECIAL: Si es servicio "Visita a Propiedad" (ID 1)
      if (idServicioParsed === 1) {
        logger.info("ðŸ  Servicio 'Visita a Propiedad': Aplicando restricciones de bloqueo para reagendamiento");

        // Obtener citas existentes para esa fecha y servicio de visitas a inmuebles
        // Solo citas confirmadas, programadas o reagendada (no canceladas ni completadas)
        const filtros = {
          fecha: fecha_cita,
          estado_in: "2,3,4" // confirmada, programada, re agendada
        };

        const result = await citaService.obtenerTodasLasCitas(filtros);
        const citasExistentes = Array.isArray(result) ? result : (result.citas || []);

        logger.info(`ðŸ“… Citas existentes activas para ${fecha_cita}:`, citasExistentes.length);

        // Generar todos los horarios disponibles inicialmente
        const todosHorarios = [];
        for (let hora = 8; hora <= 17; hora++) {
          todosHorarios.push(`${hora.toString().padStart(2, '0')}:00`);
          if (hora < 17) {
            todosHorarios.push(`${hora.toString().padStart(2, '0')}:30`);
          }
        }

        // Extraer horarios ocupados
        const horariosOcupados = new Set(
          citasExistentes.map(cita => cita.hora_inicio)
        );

        // Filtrar horarios disponibles (no ocupados)
        const horariosDisponibles = todosHorarios.filter(hora =>
          !horariosOcupados.has(hora)
        );

        logger.info(`âœ… Horarios disponibles para reagendamiento: ${horariosDisponibles.length} de ${todosHorarios.length}`);

        return res.status(200).json({
          success: true,
          message: 'Horarios disponibles obtenidos exitosamente',
          data: horariosDisponibles
        });

      } else {
        // ðŸ†“ PARA OTROS SERVICIOS: Sin restricciones, todos los horarios disponibles
        logger.info("ðŸ†“ Otro servicio: Sin restricciones de bloqueo para reagendamiento");

        const defaultHorarios = [];
        for (let hora = 8; hora <= 17; hora++) {
          defaultHorarios.push(`${hora.toString().padStart(2, '0')}:00`);
          if (hora < 17) {
            defaultHorarios.push(`${hora.toString().padStart(2, '0')}:30`);
          }
        }

        return res.status(200).json({
          success: true,
          message: 'Horarios disponibles obtenidos exitosamente',
          data: defaultHorarios
        });
      }

    } catch (error) {
      logger.error(`âŒ Error obteniendo horarios disponibles para reagendamiento: ${error.message}`);
      next(error);
    }
  }

  /**
   * Reagendar cita por el usuario (cliente)
   * Endpoint: PUT /api/v1/citas/user/:id/reagendar
   */
  reagendarMiCita = async (req, res, next) => {
    try {
      console.log(`ðŸš¨ðŸš¨ðŸš¨ [CONTROLLER] reagendarMiCita EJECUTADO!!! usuario ${req.user?.id} - cita ${req.params?.id}`);

      const { id } = req.params;
      const parsedId = parseInt(id);
      const userId = req.user.id;

      if (!id || isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita invÃ¡lido'
        });
      }

      const { fecha_cita, hora_inicio, hora_fin, motivo_reagendamiento, id_servicio, observaciones } = req.validatedData;
      console.log(`ðŸ“¥ [CONTROLLER] Datos recibidos: fecha=${fecha_cita}, hora=${hora_inicio}, user=${userId}, servicio=${id_servicio || 'sin cambio'}`);

      // Verificar que la cita pertenece al usuario
      const cita = await citaService.obtenerCitaPorId(parsedId);
      if (!cita || cita.id_persona !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para reagendar esta cita'
        });
      }

      console.log(`ðŸ“Š [CONTROLLER] Cita original: fecha=${cita.fecha_cita}, ediciones=${cita.ediciones_realizadas}/${cita.ediciones_maximas}`);

      // âœ… Verificar lÃ­mite de ediciones realizado
      if (cita.ediciones_realizadas >= cita.ediciones_maximas) {
        return res.status(400).json({
          success: false,
          message: `Esta cita ha alcanzado el lÃ­mite mÃ¡ximo de ${cita.ediciones_maximas} ediciones permitidas`
        });
      }

      // Usar el agente asignado actual o null si no hay
      const idAgenteFinal = cita.id_agente_asignado || null;
      // Mantener estado 'solicitada' si la cita aÃºn no ha avanzado en el flujo
      const estadoFinal = cita.id_estado_cita === 1 ? 1 : 4; // 1 = solicitada, 4 = re agendada

      console.log(`ðŸ”„ [CONTROLLER] Llamando mÃ©todo atÃ³mico...`);
      console.log(`ðŸ”„ [CONTROLLER] Datos para mÃ©todo atÃ³mico:`, { fecha_cita, hora_inicio, hora_fin, idAgenteFinal, userId, id_servicio, estadoFinal });

      // âœ… OPERACIÃ“N ATÃ“MICA: Incrementar contador y actualizar cita en una transacciÃ³n
      const citaReagendada = await citaService.incrementarContadorEdicionesActualizar(parsedId, {
        fecha_cita,
        hora_inicio,
        hora_fin,
        motivo_reagendamiento,
        id_servicio,
        observaciones,
        id_agente_asignado: idAgenteFinal,
        id_estado_cita: estadoFinal,
        id_usuario_realizo: userId
      });

      console.log(`âœ… [CONTROLLER] Cita reagendada exitosamente! Fecha nueva: ${citaReagendada.fecha_cita}, Ediciones: ${citaReagendada.ediciones_realizadas}`);

      // âœ… IMPORTANTE: El objeto citaReagendada YA incluye los includes completos, debe mostrar ediciones=1
      // Si muestra ediciones=0 es porque el mÃ©todo NO incrementÃ³, pero el mÃ©todo terminÃ³ sin error
      // Esto es el problema principal
      console.log(`ðŸ” [CONTROLLER] DETALLES de respuesta:`, {
        fecha: citaReagendada.fecha_cita,
        hora: citaReagendada.hora_inicio,
        ediciones: citaReagendada.ediciones_realizadas,
        ediciones_maximas: citaReagendada.ediciones_maximas
      });

      try {
        await emailService.enviarEmailCitaReagendada({ cita: citaReagendada, motivo: motivo_reagendamiento });
      } catch (emailError) {
        logger.error(`[EMAIL][CITA] No se pudo notificar reagendamiento de cita ${parsedId}: ${emailError.message}`);
      }

      this.emitirEventosTiempoRealCita({
        action: 'rescheduled_by_user',
        cita: citaReagendada,
        appointmentId: parsedId,
        extraAffectedUserIds: [userId],
      });

      return res.status(200).json({
        success: true,
        message: 'Cita reagendada exitosamente',
        data: citaReagendada
      });
    } catch (error) {
      logger.error(`âŒ Error reagendando cita ${req.params.id} por usuario ${req.user.id}: ${error.message}`);
      next(error);
    }
  }
}

module.exports = new CitaController();
