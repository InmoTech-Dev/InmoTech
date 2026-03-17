const nodemailer = require("nodemailer");
const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs");

const EMAIL_SEND_RETRY_ATTEMPTS = Math.max(1, Number(process.env.EMAIL_SEND_RETRY_ATTEMPTS || 3));
const EMAIL_SEND_RETRY_BASE_DELAY_MS = Math.max(0, Number(process.env.EMAIL_SEND_RETRY_BASE_DELAY_MS || 2000));

class EmailService {
  constructor() {
    const port = Number(process.env.EMAIL_PORT) || 587;

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    this.logoPath = path.join(__dirname, "..", "assets", "images", "logo-matriz-sin-fondo.png");
  }

  _getLogoAttachment() {
    if (fs.existsSync(this.logoPath)) {
      return [{
        filename: 'logo.png',
        path: this.logoPath,
        cid: 'logo'
      }];
    }
    return [];
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  _buildDeliveryError(originalError, { intentos, contexto, to }) {
    const message = originalError?.message || "No se pudo enviar el correo";
    const deliveryError = new Error(message);

    deliveryError.code = "EMAIL_DELIVERY_FAILED";
    deliveryError.intentos_envio = intentos;
    deliveryError.contexto = contexto || null;
    deliveryError.to = to || null;
    deliveryError.host = originalError?.host || null;
    deliveryError.reason = originalError?.reason || null;
    deliveryError.command = originalError?.command || null;
    deliveryError.originalError = originalError || null;

    return deliveryError;
  }

  async _enviarConReintentos(mailOptions, { logContext = "EMAIL", metadata = {} } = {}) {
    let ultimoError = null;

    for (let intento = 1; intento <= EMAIL_SEND_RETRY_ATTEMPTS; intento += 1) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        return { info, intentos_envio: intento };
      } catch (error) {
        ultimoError = error;
        const reintentara = intento < EMAIL_SEND_RETRY_ATTEMPTS;
        const waitMs = EMAIL_SEND_RETRY_BASE_DELAY_MS * (2 ** (intento - 1));

        logger.warn("[EMAIL][RETRY] Fallo de envio", {
          contexto: logContext,
          to: mailOptions?.to || null,
          intento,
          max_intentos: EMAIL_SEND_RETRY_ATTEMPTS,
          reintentara,
          espera_ms: reintentara ? waitMs : 0,
          metadata,
          error
        });

        if (reintentara && waitMs > 0) {
          await this._sleep(waitMs);
        }
      }
    }

    throw this._buildDeliveryError(ultimoError, {
      intentos: EMAIL_SEND_RETRY_ATTEMPTS,
      contexto: logContext,
      to: mailOptions?.to || null
    });
  }

  async enviarEmailBienvenida(userData) {
    try {
      const { email, nombre_completo } = userData;

      const mailOptions = {
        from: `"Matriz Inmobiliaria" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: "Bienvenido a Matriz Inmobiliaria",
        html: this.generarTemplateBienvenida(nombre_completo),
        attachments: this._getLogoAttachment()
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Email de bienvenida enviado exitosamente a: ${email}`, {
        messageId: info.messageId,
        response: info.response,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error("Error enviando email de bienvenida:", error);
      throw error;
    }
  }

  async enviarEmailInvitacion(data) {
    try {
      const { email, nombre_completo, token, codigo_6d, expira_en, activationLink, rol_asignado, es_administrativo } = data;
      const mailOptions = {
        from: `"Matriz Inmobiliaria" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: es_administrativo ? 'Activa tu acceso administrativo' : 'Activa tu cuenta en Matriz Inmobiliaria',
        html: this.generarTemplateInvitacion(nombre_completo, codigo_6d, expira_en, activationLink, email, rol_asignado, es_administrativo),
        attachments: this._getLogoAttachment()
      };
      const { info, intentos_envio } = await this._enviarConReintentos(mailOptions, {
        logContext: 'INVITACION',
        metadata: { es_administrativo: Boolean(es_administrativo), email }
      });
      logger.info(`Invitacion enviada a: ${email}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId, token, intentos_envio };
    } catch (error) {
      logger.error('Error enviando invitacion:', {
        email: data?.email || null,
        code: error?.code || null,
        intentos_envio: error?.intentos_envio || null,
        error
      });
      throw error;
    }
  }

  async enviarEmailCitaSolicitada({ cita, correoAlterno, timezone } = {}) {
    try {
      const ctx = this._buildCitaContexto(cita, { timezone, correoAlterno });

      if (!ctx.correo) {
        logger.warn('[EMAIL][CITA] Se omitio el envio porque la cita no tiene correo asociado');
        return { success: false, skipped: true, reason: 'sin_correo' };
      }

      const mailOptions = {
        from: `"Matriz Inmobiliaria" <${process.env.EMAIL_FROM}>`,
        to: ctx.correo,
        subject: `Solicitud de cita para ${ctx.fechaHumana}`,
        html: this.generarTemplateCitaSolicitada({
          ...ctx,
          estado: ctx.estadoTexto,
          titulo: 'Recibimos tu solicitud de cita',
          intro: `Tu cita esta registrada como ${ctx.estadoTexto.toLowerCase() || 'solicitada'}. Te contactaremos para confirmarla o avisarte si debemos ajustar algo.`,
          note: 'El evento se crea con el estado actual de la cita. Si se confirma o cambia, te enviaremos un nuevo correo.',
          mensajeExtra: '✨ No faltes: estamos listos para ayudarte a encontrar tu inmueble soñado. Prepárate para una experiencia especial.',
        }),
        attachments: this._getLogoAttachment()
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`[EMAIL][CITA] Correo de cita solicitada enviado a ${ctx.correo}`, {
        messageId: info.messageId,
        response: info.response,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('[EMAIL][CITA] Error enviando correo de cita solicitada:', error);
      throw error;
    }
  }

  async enviarEmailCitaConfirmada({ cita, plazoHoras, timezone } = {}) {
    try {
      const ctx = this._buildCitaContexto(cita, { timezone });
      if (!ctx.correo) {
        logger.warn('[EMAIL][CITA] Confirmacion omitida: cita sin correo');
        return { success: false, skipped: true, reason: 'sin_correo' };
      }

      const limiteHoras = plazoHoras ?? (Number(process.env.CITA_CHANGE_DEADLINE_HOURS) || 24);

      const mailOptions = {
        from: `"Matriz Inmobiliaria" <${process.env.EMAIL_FROM}>`,
        to: ctx.correo,
        subject: `Cita confirmada para ${ctx.fechaHumana}`,
        html: this.generarTemplateCitaSolicitada({
          ...ctx,
          estado: 'Confirmada',
          titulo: 'Tu cita fue confirmada',
          intro: `La cita fue confirmada para ${ctx.fechaHumana}. Tu agente asignado es ${ctx.agenteNombre || 'nuestro equipo'}.`,
          note: `Si necesitas cambiar o cancelar, hazlo hasta ${limiteHoras} horas antes para garantizar disponibilidad.`,
          ctaLabel: 'Agregar en Google Calendar',
          mensajeExtra: '✨ No faltes: estamos listos para acompañarte a conseguir tu lugar ideal.'
        }),
        attachments: this._getLogoAttachment()
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`[EMAIL][CITA] Confirmacion enviada a ${ctx.correo}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('[EMAIL][CITA] Error enviando correo de cita confirmada:', error);
      throw error;
    }
  }

  async enviarEmailCitaCancelada({ cita, motivo, timezone } = {}) {
    try {
      const ctx = this._buildCitaContexto(cita, { timezone });
      if (!ctx.correo) {
        logger.warn('[EMAIL][CITA] Cancelacion omitida: cita sin correo');
        return { success: false, skipped: true, reason: 'sin_correo' };
      }

      const motivoTexto = motivo || cita?.motivo_cancelacion || 'No especificado';

      const mailOptions = {
        from: `"Matriz Inmobiliaria" <${process.env.EMAIL_FROM}>`,
        to: ctx.correo,
        subject: `Tu cita fue cancelada (${ctx.fechaHumana})`,
        html: this.generarTemplateCitaSolicitada({
          ...ctx,
          estado: 'Cancelada',
          titulo: 'Hemos cancelado tu cita',
          intro: 'Queremos que estes al tanto: la cita fue cancelada.',
          calendarLink: '',
          ctaLabel: '',
          note: `Motivo: ${motivoTexto}`
        }),
        attachments: this._getLogoAttachment()
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`[EMAIL][CITA] Cancelacion enviada a ${ctx.correo}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('[EMAIL][CITA] Error enviando correo de cita cancelada:', error);
      throw error;
    }
  }

  async enviarEmailCitaCanceladaPorDisponibilidad({ cita, timezone } = {}) {
    try {
      const ctx = this._buildCitaContexto(cita, { timezone });
      if (!ctx.correo) {
        logger.warn('[EMAIL][CITA] Cancelacion por disponibilidad omitida: cita sin correo');
        return { success: false, skipped: true, reason: 'sin_correo' };
      }

      const propertyId = ctx.idInmueble;
      const rescheduleLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/inmuebles/${propertyId}?reschedule=true`;

      const mailOptions = {
        from: `"Matriz Inmobiliaria" <${process.env.EMAIL_FROM}>`,
        to: ctx.correo,
        subject: `Actualización sobre tu solicitud de cita (${ctx.fechaHumana})`,
        html: this.generarTemplateCitaCanceladaDisponibilidad({
          ...ctx,
          rescheduleLink
        }),
        attachments: this._getLogoAttachment()
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`[EMAIL][CITA] Cancelacion por disponibilidad enviada a ${ctx.correo}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('[EMAIL][CITA] Error enviando correo de cancelacion por disponibilidad:', error);
      throw error;
    }
  }

  async enviarEmailCitaReagendada({ cita, motivo, timezone } = {}) {
    try {
      const ctx = this._buildCitaContexto(cita, { timezone });
      if (!ctx.correo) {
        logger.warn('[EMAIL][CITA] Reagendamiento omitido: cita sin correo');
        return { success: false, skipped: true, reason: 'sin_correo' };
      }

      const mailOptions = {
        from: `"Matriz Inmobiliaria" <${process.env.EMAIL_FROM}>`,
        to: ctx.correo,
        subject: `Reprogramamos tu cita a ${ctx.fechaHumana}`,
        html: this.generarTemplateCitaSolicitada({
          ...ctx,
          estado: 'Reagendada',
          titulo: 'Tu cita fue reprogramada',
          intro: 'Actualizamos la fecha y hora de tu cita. Aqui estan los nuevos detalles.',
          note: motivo ? `Motivo del cambio: ${motivo}` : 'Si necesitas otro horario, responde este correo y te ayudaremos.',
          ctaLabel: 'Actualizar en Google Calendar'
        }),
        attachments: this._getLogoAttachment()
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`[EMAIL][CITA] Reagendamiento enviado a ${ctx.correo}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('[EMAIL][CITA] Error enviando correo de cita reagendada:', error);
      throw error;
    }
  }

  async enviarEmailCitaAsignada({ cita, timezone } = {}) {
    try {
      const ctx = this._buildCitaContexto(cita, { timezone });
      if (!ctx.correo) {
        logger.warn('[EMAIL][CITA] Asignacion omitida: cita sin correo');
        return { success: false, skipped: true, reason: 'sin_correo' };
      }

      const mailOptions = {
        from: `"Matriz Inmobiliaria" <${process.env.EMAIL_FROM}>`,
        to: ctx.correo,
        subject: `Tu cita ahora la atiende ${ctx.agenteNombre || 'nuestro equipo'}`,
        html: this.generarTemplateCitaSolicitada({
          ...ctx,
          estado: ctx.estadoTexto || 'Programada',
          titulo: 'Actualizamos tu agente',
          intro: `Asignamos a ${ctx.agenteNombre || 'nuestro equipo'} para acompanarte en tu cita.`,
          note: 'Si el horario ya no te sirve, responde este correo y coordinamos otro.',
          ctaLabel: 'Ver en Google Calendar'
        }),
        attachments: this._getLogoAttachment()
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`[EMAIL][CITA] Asignacion enviada a ${ctx.correo}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('[EMAIL][CITA] Error enviando correo de asignacion de agente:', error);
      throw error;
    }
  }

  async enviarEmailCitaConfirmadaAgente({ cita, timezone } = {}) {
    try {
      const ctx = this._buildCitaContexto(cita, { timezone });
      const correoAgente = cita?.agente?.correo
        || cita?.agente?.email
        || cita?.agente?.correo_empresa
        || cita?.agente?.contacto_correo
        || null;
      const nombreAgente = cita?.agente
        ? `${cita.agente.nombre_completo || ''} ${cita.agente.apellido_completo || ''}`.trim()
        : 'Agente';

      if (!correoAgente) {
        logger.warn('[EMAIL][CITA] Confirmacion a agente omitida: agente sin correo');
        return { success: false, skipped: true, reason: 'sin_correo' };
      }

      const mailOptions = {
        from: `"Matriz Inmobiliaria" <${process.env.EMAIL_FROM}>`,
        to: correoAgente,
        subject: `Tienes una cita programada el ${ctx.fechaHumana}`,
        html: this.generarTemplateCitaSolicitada({
          ...ctx,
          estado: 'Confirmada',
          titulo: 'Nueva cita asignada',
          intro: `Tienes una cita confirmada con ${ctx.clienteNombreCompleto || 'un cliente'} para ${ctx.fechaHumana}.`,
          note: 'Llega con unos minutos de anticipacion. Si necesitas reagendar, avisa al cliente o al administrador.',
          ctaLabel: 'Agregar en Google Calendar',
          nombre: nombreAgente,
          mensajeExtra: '',
          mostrarDatosCliente: true,
          esAdmin: true,
          idCita: ctx.idCita,
          idInmueble: ctx.idInmueble,
          registroInmobiliario: ctx.registroInmobiliario
        }),
        attachments: this._getLogoAttachment()
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`[EMAIL][CITA] Confirmacion enviada al agente ${correoAgente}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('[EMAIL][CITA] Error enviando correo de confirmacion para agente:', error);
      throw error;
    }
  }

  /**
   * Envia un correo de auditoría al administrativo que realizó una acción
   * @param {Object} params - Parámetros: cita, administrador (ejecutor), accion
   */
  async enviarEmailAuditoriaAdministrativo({ cita, administrador, accion, timezone } = {}) {
    try {
      const ctx = this._buildCitaContexto(cita, { timezone });
      const correoAdmin = administrador?.correo || administrador?.email || null;
      const nombreAdmin = administrador
        ? `${administrador.nombre_completo || ''} ${administrador.apellido_completo || ''}`.trim()
        : 'Administrativo';

      if (!correoAdmin) {
        logger.warn('[EMAIL][AUDIT] Auditoria omitida: administrativo sin correo');
        return { success: false, skipped: true, reason: 'sin_correo' };
      }

      const configAccion = {
        'CREACION': {
          subject: 'Confirmación: Has creado una nueva cita',
          titulo: 'Cita creada exitosamente',
          intro: `Has registrado correctamente una nueva cita para ${ctx.clienteNombreCompleto} para el día ${ctx.fechaHumana}.`,
          estado: 'Solicitada'
        },
        'CONFIRMACION': {
          subject: 'Confirmación: Has aprobado una cita',
          titulo: 'Cita aprobada exitosamente',
          intro: `Acabas de confirmar la cita de ${ctx.clienteNombreCompleto} programada para ${ctx.fechaHumana}.`,
          estado: 'Confirmada'
        },
        'CANCELACION': {
          subject: 'Confirmación: Has cancelado una cita',
          titulo: 'Cita cancelada correctamente',
          intro: `Has realizado la cancelación de la cita de ${ctx.clienteNombreCompleto} que estaba pactada para ${ctx.fechaHumana}.`,
          estado: 'Cancelada'
        },
        'ASIGNACION': {
          subject: 'Confirmación: Has asignado un agente',
          titulo: 'Asignación de agente exitosa',
          intro: `Has asignado correctamente a ${ctx.agenteNombre || 'un agente'} para atender la cita de ${ctx.clienteNombreCompleto}.`,
          estado: ctx.estadoTexto
        },
        'REAGENDAMIENTO': {
          subject: 'Confirmación: Has reagendado una cita',
          titulo: 'Cita reagendada exitosamente',
          intro: `Has modificado el horario de la cita de ${ctx.clienteNombreCompleto} para el nuevo bloque de ${ctx.fechaHumana}.`,
          estado: 'Reagendada'
        }
      };

      const config = configAccion[accion] || configAccion.CREACION;

      const mailOptions = {
        from: `"Matriz Inmobiliaria - Auditoría" <${process.env.EMAIL_FROM}>`,
        to: correoAdmin,
        subject: config.subject,
        html: this.generarTemplateCitaSolicitada({
          ...ctx,
          estado: config.estado,
          titulo: config.titulo,
          intro: config.intro,
          nombre: nombreAdmin,
          mensajeExtra: 'Este es un correo automático de auditoría para tu registro personal.',
          mostrarDatosCliente: true,
          esAdmin: true,
          idCita: ctx.idCita,
          idInmueble: ctx.idInmueble,
          registroInmobiliario: ctx.registroInmobiliario,
          note: 'Puedes revisar los detalles completos en tu panel administrativo.'
        }),
        attachments: this._getLogoAttachment()
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`[EMAIL][AUDIT] Auditoria enviada a ${correoAdmin} (${accion})`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`[EMAIL][AUDIT] Error enviando auditoria (${accion}):`, error);
      throw error;
    }
  }

  _normalizarHora(hora) {
    if (!hora) return '00:00';

    // Si viene como Date, convertir
    if (hora instanceof Date) {
      const hh = hora.getHours().toString().padStart(2, '0');
      const mm = hora.getMinutes().toString().padStart(2, '0');
      return `${hh}:${mm}`;
    }

    // Si viene como numero (hora entera), asumir HH:00
    if (typeof hora === 'number') {
      const hh = Math.floor(hora).toString().padStart(2, '0');
      return `${hh}:00`;
    }

    const raw = String(hora).trim();

    // Si viene en formato ISO
    if (raw.includes('T')) {
      const date = new Date(raw);
      if (!isNaN(date.getTime())) {
        const hh = date.getHours().toString().padStart(2, '0');
        const mm = date.getMinutes().toString().padStart(2, '0');
        return `${hh}:${mm}`;
      }
    }

    const partes = raw.split(':');
    const hh = (partes[0] || '00').padStart(2, '0');
    const mm = (partes[1] || '00').padStart(2, '0');
    return `${hh}:${mm}`;
  }

  _formatearHoraRango(inicio, fin) {
    const horaInicio = this._normalizarHora(inicio);
    const horaFin = this._normalizarHora(fin);
    return `${horaInicio} - ${horaFin}`;
  }

  _formatearFechaHumana(fecha, timezone) {
    if (!fecha) return '';
    const [year, month, day] = (fecha.split('T')[0] || fecha).split('-').map(Number);
    
    // Usar constructor local para evitar desplazamientos de zona horaria al formatear solo la fecha
    const date = new Date(year, month - 1, day);

    return date.toLocaleString('es-ES', {
      timeZone: timezone || 'America/Bogota',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  _buildCalendarDateTime(fecha, hora) {
    if (!fecha) return '';
    const [year, month, day] = (fecha.split('T')[0] || fecha).split('-');
    const [hour, minute] = this._normalizarHora(hora).split(':');
    const mm = (month || '').padStart(2, '0');
    const dd = (day || '').padStart(2, '0');
    return `${year}${mm}${dd}T${hour}${minute}00`;
  }

  _generarEnlaceGoogleCalendar({ fechaInicio, fechaFin, horaInicio, horaFin, titulo, descripcion, ubicacion, timezone }) {
    const inicio = this._buildCalendarDateTime(fechaInicio, horaInicio);
    const fin = this._buildCalendarDateTime(fechaFin || fechaInicio, horaFin || horaInicio);

    if (!inicio) return '';

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: titulo || 'Cita Matriz Inmobiliaria',
      dates: inicio && fin ? `${inicio}/${fin}` : inicio,
      details: descripcion || '',
      location: ubicacion || '',
      ctz: timezone || 'America/Bogota'
    });

    return `https://www.google.com/calendar/render?${params.toString()}`;
  }

  _buildCitaContexto(cita, { timezone, correoAlterno } = {}) {
    if (!cita) throw new Error('Datos de la cita son requeridos');

    const zona = timezone || process.env.CALENDAR_TIMEZONE || 'America/Bogota';
    const correo = cita?.cliente?.correo || cita?.correo || cita?.email || correoAlterno;
    const clienteNombreCompleto = cita?.cliente
      ? `${cita.cliente.nombre_completo || ''} ${cita.cliente.apellido_completo || ''}`.trim()
      : (cita?.nombre_completo || 'Cliente');
    const clienteCorreo = cita?.cliente?.correo || cita?.correo || cita?.email || null;
    const clienteTelefono = cita?.cliente?.telefono || cita?.telefono || null;
    const clienteTipoDocumento = cita?.cliente?.tipo_documento || cita?.tipo_documento || null;
    const clienteNumeroDocumento = cita?.cliente?.numero_documento || cita?.numero_documento || null;
    const nombreCliente = (clienteNombreCompleto || 'Cliente').split(' ')[0];
    const fecha = cita?.fecha_cita || cita?.fecha;
    const horaInicio = this._normalizarHora(cita?.hora_inicio);
    const horaFin = this._normalizarHora(cita?.hora_fin || cita?.hora_inicio);
    const servicio = cita?.servicio?.nombre_servicio || 'Cita de servicio';
    const estadoTexto = cita?.estado?.nombre_estado || cita?.estado || 'Solicitada';

    const direccion = [
      cita?.inmueble?.direccion,
      cita?.inmueble?.ciudad,
      cita?.inmueble?.departamento,
      cita?.inmueble?.pais
    ].filter(Boolean).join(', ');

    const agenteNombre = cita?.agente
      ? `${cita.agente.nombre_completo || ''} ${cita.agente.apellido_completo || ''}`.trim()
      : null;
    const agenteDocumento = cita?.agente?.numero_documento || cita?.agente?.documento || null;
    const agenteCorreo = cita?.agente?.correo || null;
    const agenteTelefono = cita?.agente?.telefono || null;

    const fechaHumana = this._formatearFechaHumana(fecha, zona);
    const horaRango = this._formatearHoraRango(horaInicio, horaFin);
    const calendarLink = this._generarEnlaceGoogleCalendar({
      fechaInicio: fecha,
      fechaFin: fecha,
      horaInicio,
      horaFin,
      titulo: `Cita - ${servicio}`,
      descripcion: `Estado: ${estadoTexto}`,
      ubicacion: direccion,
      timezone: zona
    });

    return {
      correo,
      nombre: nombreCliente,
      servicio,
      fechaHumana,
      horaRango,
      direccion: direccion || 'Se confirmara la ubicacion contigo',
      estadoTexto,
      observaciones: cita?.observaciones,
      calendarLink,
      timezone: zona,
      idCita: cita?.id_cita || cita?.id || null,
      idInmueble: cita?.id_inmueble || (cita?.inmueble?.id_inmueble) || null,
      registroInmobiliario: cita?.inmueble?.registro_inmobiliario || null,
      agenteNombre,
      agenteDocumento,
      agenteCorreo,
      agenteTelefono,
      clienteNombreCompleto,
      clienteCorreo,
      clienteTelefono,
      clienteTipoDocumento,
      clienteNumeroDocumento
    };
  }

  generarTemplateBienvenida(nombreCompleto = "") {
    const primerNombre = (nombreCompleto.trim().split(" ")[0] || "Cliente");

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a Matriz Inmobiliaria</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
          body { 
            margin: 0; padding: 0; background-color: #F1F5F9; 
            font-family: 'Outfit', 'Segoe UI', sans-serif; 
            color: #1E293B; -webkit-font-smoothing: antialiased;
          }
          .wrapper { width: 100%; padding: 40px 0; }
          .container { 
            max-width: 600px; margin: 0 auto; background-color: #ffffff; 
            border-radius: 24px; overflow: hidden; 
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.1); 
          }
          .header { 
            padding: 50px 40px; background: linear-gradient(135deg, #0F172A 0%, #172554 100%); 
            text-align: center; color: #FFFFFF;
          }
          .logo { max-height: 160px; width: auto; margin-bottom: 30px; }
          .headline { font-size: 32px; font-weight: 800; margin: 0; line-height: 1.2; letter-spacing: -0.02em; }
          .content { padding: 40px; }
          .welcome-text { font-size: 18px; color: #475569; line-height: 1.6; margin-bottom: 30px; }
          
          .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .feature-card {
            background-color: #F8FAFC; border: 1px solid #E2E8F0; 
            border-radius: 20px; padding: 20px;
          }
          .feature-icon { font-size: 24px; margin-bottom: 12px; }
          .feature-title { font-weight: 700; color: #0F172A; margin-bottom: 8px; font-size: 16px; }
          .feature-desc { font-size: 13px; color: #64748B; line-height: 1.5; }

          .cta-button {
            display: block; width: 100%; text-align: center;
            background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
            color: #FFFFFF !important; padding: 18px; border-radius: 16px;
            text-decoration: none; font-weight: 700; font-size: 16px;
            box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
            margin-top: 20px; box-sizing: border-box;
          }

          .footer {
            padding: 40px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;
            text-align: center; font-size: 13px; color: #64748B;
          }
          @media (max-width: 480px) {
            .feature-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <img class="logo" src="cid:logo" alt="Matriz Inmobiliaria" />
              <h1 class="headline">¡Bienvenido, ${primerNombre}!</h1>
            </div>
            <div class="content">
              <p class="welcome-text">Nos emociona acompañarte en el proceso de encontrar tu próximo espacio. Tu cuenta ya está lista para que explores las mejores propiedades.</p>
              
              <div class="feature-grid">
                <div class="feature-card">
                  <div class="feature-icon">🔍</div>
                  <div class="feature-title">Explora</div>
                  <div class="feature-desc">Acceso a un catálogo curado de inmuebles con fotos y detalles de alta calidad.</div>
                </div>
                <div class="feature-card">
                  <div class="feature-icon">📅</div>
                  <div class="feature-title">Agenda</div>
                  <div class="feature-desc">Reserva visitas a propiedades en tiempo real desde la plataforma.</div>
                </div>
                <div class="feature-card">
                  <div class="feature-icon">⭐</div>
                  <div class="feature-title">Favoritos</div>
                  <div class="feature-desc">Guarda y organiza las propiedades que más te gustan.</div>
                </div>
                <div class="feature-card">
                  <div class="feature-icon">🏠</div>
                  <div class="feature-title">Asesoría</div>
                  <div class="feature-desc">Un equipo de expertos listo para guiarte en cada paso.</div>
                </div>
              </div>

              <a href="http://localhost:3000/" class="cta-button">Empezar a explorar</a>
            </div>
            <div class="footer">
              <p>Matriz Inmobiliaria © 2026. Todos los derechos reservados.</p>
              <p><a href="mailto:hola@matrizinmobiliaria.com" style="color: #3B82F6; text-decoration: none;">hola@matrizinmobiliaria.com</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generarTemplateCitaSolicitada({
    nombre = 'Cliente',
    servicio,
    fechaHumana,
    horaRango,
    direccion,
    estado,
    observaciones,
    calendarLink,
    timezone,
    titulo = 'Recibimos tu solicitud de cita',
    intro = 'Tu cita está registrada como solicitada. Te contactaremos pronto para confirmarla.',
    note = 'Este correo confirma la recepción de tu solicitud.',
    ctaLabel = 'Agendar en mi calendario',
    agente,
    agenteNombre,
    agenteDocumento,
    agenteCorreo,
    agenteTelefono,
    clienteNombreCompleto,
    clienteCorreo,
    clienteTelefono,
    clienteTipoDocumento,
    clienteNumeroDocumento,
    mostrarDatosCliente = false,
    mensajeExtra = '',
    esAdmin = false,
    idCita = null,
    idInmueble = null,
    registroInmobiliario = null
  }) {
    const estadoKey = (estado || 'solicitada').toLowerCase();
    
    const statusStyles = {
      solicitada: { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA', icon: '⏳' },
      confirmada: { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0', icon: '✅' },
      cancelada: { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', icon: '❌' },
      reagendada: { bg: '#EFF6FF', color: '#1E40AF', border: '#DBEAFE', icon: '🔄' },
      programada: { bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE', icon: '📅' },
      default: { bg: '#F8FAFC', color: '#1E293B', border: '#E2E8F0', icon: '📋' }
    };
    
    const style = statusStyles[estadoKey] || statusStyles.default;
    
    const format24to12 = (time) => {
      if (!time) return '';
      const [h, m] = String(time).split(':').map(Number);
      if (isNaN(h)) return time;
      const isPM = h >= 12;
      const hh = h % 12 || 12;
      const mm = isNaN(m) ? '00' : String(m).padStart(2, '0');
      return `${hh}:${mm} ${isPM ? 'pm' : 'am'}`;
    };

    const horaRangoFormatted = horaRango
      ? horaRango.split('-').map(p => format24to12(p.trim())).join(' - ')
      : '';

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${titulo}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
          body { 
            margin: 0; padding: 0; background-color: #F1F5F9; 
            font-family: 'Outfit', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            color: #1E293B; -webkit-font-smoothing: antialiased;
          }
          .wrapper { width: 100%; padding: 40px 0; }
          .container { 
            max-width: 600px; margin: 0 auto; background-color: #ffffff; 
            border-radius: 24px; overflow: hidden; 
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.1); 
          }
          .header { 
            padding: 40px; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); 
            text-align: center; color: #FFFFFF;
          }
          .logo-container { margin-bottom: 30px; }
          .logo { 
            max-height: 140px; width: auto; 
            display: inline-block;
          }
          .status-badge {
            display: inline-flex; align-items: center; 
            padding: 8px 16px; border-radius: 100px; 
            background-color: ${style.bg}; border: 1px solid ${style.border}; 
            color: ${style.color}; font-weight: 700; font-size: 13px;
            text-transform: uppercase; letter-spacing: 0.05em;
          }
          .hero-content { margin-top: 24px; }
          .headline { font-size: 28px; font-weight: 800; margin: 0 0 12px; line-height: 1.2; }
          .lead { font-size: 16px; color: #94A3B8; margin: 0; line-height: 1.6; }
          
          .content { padding: 40px; }
          
          /* Status Clarification Box */
          ${estadoKey === 'solicitada' ? `
          .clarification-box {
            background-color: #FFFBEB; border: 1px solid #FEF3C7; 
            border-radius: 16px; padding: 20px; margin-bottom: 30px;
            display: flex; gap: 15px; align-items: flex-start;
          }
          .clarification-icon { font-size: 24px; }
          .clarification-text { font-size: 14px; color: #92400E; font-weight: 500; line-height: 1.5; }
          .clarification-text strong { color: #78350F; font-weight: 800; }
          ` : ''}

          .info-card {
            background-color: #ffffff; border: 1px solid #E2E8F0; 
            border-radius: 20px; padding: 24px; margin-bottom: 30px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .card-title {
            font-size: 11px; font-weight: 800; color: #94A3B8; 
            text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 24px;
            display: flex; align-items: center; gap: 8px;
          }
          .detail-row {
            display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px;
          }
          .detail-row:last-child { margin-bottom: 0; }
          .detail-icon {
            width: 44px; height: 44px; border-radius: 14px;
            background-color: #F8FAFC; border: 1px solid #F1F5F9;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; flex-shrink: 0;
          }
          .detail-content { flex: 1; }
          .detail-label { font-size: 10px; color: #94A3B8; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
          .detail-value { font-size: 16px; color: #0F172A; font-weight: 700; line-height: 1.4; }
          .sub-value { font-size: 13px; color: #64748B; margin-top: 2px; }

          /* Instructions Banner */
          .instruction-banner {
            background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
            border-radius: 20px; padding: 24px; margin: 30px 0;
            border-left: 4px solid #3B82F6;
          }
          .instruction-title {
            font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 12px;
            display: flex; align-items: center; gap: 10px;
          }
          .instruction-list { margin: 0; padding: 0; list-style: none; }
          .instruction-item {
            font-size: 14px; color: #475569; margin-bottom: 8px;
            display: flex; gap: 10px; line-height: 1.5;
          }
          .instruction-item:last-child { margin-bottom: 0; }
          .dot { color: #3B82F6; font-weight: bold; }

          .agent-preview {
            display: flex; align-items: center; gap: 12px; 
            margin-top: 20px; padding-top: 20px; border-top: 1px solid #F1F5F9;
          }
          .agent-avatar {
            width: 44px; height: 44px; border-radius: 12px;
            background-color: #3B82F6; color: #ffffff;
            display: flex; align-items: center; justify-content:center;
            font-weight: 800; font-size: 16px;
          }

          .cta-button {
            display: block; width: 100%; text-align: center;
            background: linear-gradient(135deg, #0F172A 0%, #334155 100%);
            color: #FFFFFF !important; padding: 18px; border-radius: 16px;
            text-decoration: none; font-weight: 700; font-size: 16px;
            box-shadow: 0 10px 20px rgba(15, 23, 42, 0.15);
            margin: 30px 0;
          }

          .footer {
            padding: 40px; text-align: center; font-size: 13px; color: #94A3B8;
          }
          .footer a { color: #3B82F6; text-decoration: none; font-weight: 600; }
          
          @media (max-width: 480px) {
            .wrapper { padding: 20px 0; }
            .content { padding: 24px; }
            .headline { font-size: 24px; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-container">
                <img class="logo" src="cid:logo" alt="Matriz Inmobiliaria" />
              </div>
              <div class="status-badge">
                <span>${style.icon} ${estado.toUpperCase()}</span>
              </div>
              <div class="hero-content">
                <h1 class="headline">Hola, ${nombre}</h1>
                <p class="lead">${intro}</p>
              </div>
            </div>
            
            <div class="content">
              ${mensajeExtra ? `<div style="background-color: #F8FAFC; border-left: 4px solid #3B82F6; padding: 15px; margin-bottom: 25px; font-size: 14px; color: #475569; font-style: italic;">${mensajeExtra}</div>` : ''}

              ${esAdmin ? `
              <div class="info-card" style="border: 1px dashed #3B82F6; background-color: #F0F9FF;">
                <div class="card-title" style="color: #0369A1;">📋 Referencias Administrativas</div>
                <div class="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                  <div class="grid-item">
                    <div class="detail-label" style="font-size: 10px;">ID Cita</div>
                    <div class="detail-value" style="font-size: 14px; font-family: monospace;">#${idCita || 'N/A'}</div>
                  </div>
                  <div class="grid-item">
                    <div class="detail-label" style="font-size: 10px;">ID Inmueble</div>
                    <div class="detail-value" style="font-size: 14px; font-family: monospace;">#${idInmueble || 'N/A'}</div>
                  </div>
                  <div class="grid-item">
                    <div class="detail-label" style="font-size: 10px;">Registro Inmobiliario</div>
                    <div class="detail-value" style="font-size: 14px;">${registroInmobiliario || 'N/A'}</div>
                  </div>
                  <div class="grid-item">
                    <div class="detail-label" style="font-size: 10px;">Documento Cliente</div>
                    <div class="detail-value" style="font-size: 14px;">${clienteTipoDocumento || ''} ${clienteNumeroDocumento || 'N/A'}</div>
                  </div>
                </div>
              </div>
              ` : ''}

              ${estadoKey === 'solicitada' && !mensajeExtra && !esAdmin ? `
              <div class="clarification-box">
                <div class="clarification-icon">âš ï¸ </div>
                <div class="clarification-text">
                  <strong>AVISO IMPORTANTE:</strong> Tu cita se encuentra actualmente en estado <strong>SOLICITADA</strong>. Esto significa que recibimos tu peticiÃ³n, pero aÃºn <strong>NO ha sido aprobada oficialmente</strong>. <br><br> Por favor, espera un segundo correo de confirmaciÃ³n antes de dirigirte al inmueble. No asistir sin la aprobaciÃ³n definitiva.
                </div>
              </div>
              ` : ''}

              <div class="info-card">
                <div class="card-title">📝 Detalles de la Cita</div>
                
                <div class="detail-row">
                  <div class="detail-icon">📅</div>
                  <div class="detail-content">
                    <div class="detail-label">Cuándo</div>
                    <div class="detail-value">${fechaHumana}</div>
                    <div class="sub-value">${horaRangoFormatted}</div>
                  </div>
                </div>

                <div class="detail-row">
                  <div class="detail-icon">🏷️</div>
                  <div class="detail-content">
                    <div class="detail-label">Servicio</div>
                    <div class="detail-value">${servicio || 'Visita a Propiedad'}</div>
                  </div>
                </div>

                <div class="detail-row">
                  <div class="detail-icon">📍</div>
                  <div class="detail-content">
                    <div class="detail-label">Ubicación</div>
                    <div class="detail-value">${direccion || 'Dirección por confirmar'}</div>
                  </div>
                </div>

                ${observaciones ? `
                <div class="detail-row">
                  <div class="detail-icon">💬</div>
                  <div class="detail-content">
                    <div class="detail-label">Notas/Observaciones</div>
                    <div class="detail-value" style="font-weight: 400; font-size: 14px;">${observaciones}</div>
                  </div>
                </div>
                ` : ''}
                
                ${agenteNombre ? `
                <div class="agent-preview">
                  <div class="agent-avatar">${agenteNombre.charAt(0)}</div>
                  <div class="agent-info">
                    <div class="detail-label" style="margin:0">Agente asignado</div>
                    <div class="detail-value" style="font-size: 15px;">${agenteNombre}</div>
                  </div>
                </div>
                ` : ''}
              </div>

              ${!mensajeExtra && !esAdmin ? `
              <div class="instruction-banner">
                <div class="instruction-title">🚀 Próximos pasos</div>
                <ul class="instruction-list">
                  <li class="instruction-item"><span class="dot">●</span> Un agente revisará tu solicitud y te enviará un <strong>segundo correo de confirmación</strong>.</li>
                  <li class="instruction-item"><span class="dot">●</span> En ese correo recibirás las coordenadas exactas y puntos de referencia.</li>
                  <li class="instruction-item"><span class="dot">●</span> <strong>Importante:</strong> Debes llevar tu documento de identidad original para la visita.</li>
                  <li class="instruction-item"><span class="dot">●</span> Recomendamos llegar 5 minutos antes para aprovechar al máximo el tiempo.</li>
                </ul>
              </div>
              ` : ''}

              ${esAdmin ? `
              <div class="instruction-banner" style="background-color: #F8FAFC; border-color: #E2E8F0;">
                <div class="instruction-title" style="color: #475569;">⚙️ Tips de Gestión Administrativa</div>
                <ul class="instruction-list">
                  <li class="instruction-item" style="color: #64748B;"><span class="dot">●</span> <strong>Disponibilidad:</strong> Verifica que las llaves estén disponibles en oficina o con el conserje.</li>
                  <li class="instruction-item" style="color: #64748B;"><span class="dot">●</span> <strong>Coordinación:</strong> Asegúrate de que el agente tenga el número del cliente guardado.</li>
                  <li class="instruction-item" style="color: #64748B;"><span class="dot">●</span> <strong>Estado:</strong> Confirma que el inmueble se encuentra aseado y listo para ser mostrado.</li>
                  <li class="instruction-item" style="color: #64748B;"><span class="dot">●</span> <strong>Puntualidad:</strong> Recomienda al agente llegar 10 minutos antes para ventilar el inmueble.</li>
                </ul>
              </div>
              ` : ''}

              ${mostrarDatosCliente ? `
              <div class="info-card" style="margin-top: -15px;">
                <div class="card-title">Información del Cliente</div>
                <div class="grid">
                  <div class="grid-item">
                    <div class="label">Nombre completo</div>
                    <div class="value" style="font-size: 15px;">${clienteNombreCompleto || ''}</div>
                  </div>
                  <div class="grid-item">
                    <div class="label">Teléfono</div>
                    <div class="value" style="font-size: 15px;">${clienteTelefono || 'N/A'}</div>
                  </div>
                   <div class="grid-item">
                    <div class="label">Correo Electrónico</div>
                    <div class="value" style="font-size: 15px;">${clienteCorreo || 'N/A'}</div>
                  </div>
                </div>
              </div>
              ` : ''}

              ${calendarLink ? `
                <a href="${calendarLink}" class="cta-button">${ctaLabel}</a>
              ` : ''}
              
              ${note ? `<p style="text-align: center; font-size: 12px; color: #94A3B8; margin-top: 20px;">${note}</p>` : ''}
            </div>
            
            <div class="footer">
              <p>¿Tienes alguna duda o necesitas cambiar algo?</p>
              <p>Escríbenos a <a href="mailto:hola@matrizinmobiliaria.com">hola@matrizinmobiliaria.com</a></p>
              <div style="margin-top: 30px; opacity: 0.5; font-size: 11px;">
                © 2026 Matriz Inmobiliaria. Todos los derechos reservados.<br>
                Este es un mensaje automático, por favor no respondas directamente.
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generarTemplateInvitacion(nombreCompleto = "", codigo6d, expiraEn, activationLink, correo, rolAsignado = null, esAdministrativo = false) {
    const primerNombre = (nombreCompleto.trim().split(" ")[0] || "Hola");
    const rolTexto = rolAsignado || (esAdministrativo ? 'Administrativo' : 'Usuario');

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Activa tu cuenta</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
          body { 
            margin: 0; padding: 0; background-color: #F1F5F9; 
            font-family: 'Outfit', sans-serif; 
            color: #1E293B; -webkit-font-smoothing: antialiased;
          }
          .wrapper { width: 100%; padding: 40px 0; }
          .container { 
            max-width: 550px; margin: 0 auto; background-color: #ffffff; 
            border-radius: 24px; overflow: hidden; 
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.1); 
          }
          .header { 
            padding: 40px; background: linear-gradient(135deg, #0F172A 0%, #172554 100%); 
            text-align: center; color: #FFFFFF;
          }
          .logo { max-height: 120px; width: auto; margin-bottom: 24px; }
          .headline { font-size: 26px; font-weight: 800; margin: 0; }
          .content { padding: 40px; }
          .intro { font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
          
          .info-box {
            background-color: #F8FAFC; border: 1px solid #E2E8F0; 
            border-radius: 20px; padding: 24px; margin-bottom: 24px;
          }
          .info-row { margin-bottom: 15px; }
          .info-row:last-child { margin-bottom: 0; }
          .label { font-size: 12px; color: #94A3B8; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 16px; color: #0F172A; font-weight: 700; }

          .code-container {
            text-align: center; margin: 30px 0;
            padding: 24px; background-color: #F1F5F9;
            border-radius: 16px; border: 2px dashed #CBD5E1;
          }
          .code {
            font-size: 36px; font-weight: 800; color: #0F172A;
            letter-spacing: 0.2em; font-family: 'Courier New', monospace;
          }

          .cta-button {
            display: block; width: 100%; text-align: center;
            background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
            color: #FFFFFF !important; padding: 18px; border-radius: 16px;
            text-decoration: none; font-weight: 700; font-size: 16px;
            box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
            box-sizing: border-box;
          }

          .footer {
            padding: 30px; text-align: center; font-size: 13px; color: #94A3B8;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <img class="logo" src="cid:logo" alt="Matriz Inmobiliaria" />
              <h1 class="headline">Activa tu cuenta</h1>
            </div>
            <div class="content">
              <p class="intro">Hola ${primerNombre}, se ha creado una cuenta para ti en Matriz Inmobiliaria. Para comenzar, es necesario validar tu correo y establecer tu contraseña.</p>
              
              <div class="info-box">
                <div class="info-row">
                  <div class="label">Correo de acceso</div>
                  <div class="value">${correo}</div>
                </div>
                <div class="info-row">
                  <div class="label">Rol asignado</div>
                  <div class="value">${rolTexto}</div>
                </div>
              </div>

              <p class="intro" style="font-size: 14px; text-align: center;">Ingresa este código en la plataforma para verificar tu identidad:</p>
              <div class="code-container">
                <div class="code">${codigo6d}</div>
              </div>

              <a href="${activationLink}" class="cta-button">Confirmar y Activar</a>
            </div>
            <div class="footer">
              <p>© 2026 Matriz Inmobiliaria. Si no reconoces esta solicitud, puedes ignorar este correo.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  async enviarEmailContacto(contactData) {
    try {
      const { email, name, phone, subject, message, targetEmails } = contactData;

      const mailOptions = {
        from: `"Matriz Inmobiliaria - Contacto" <${process.env.EMAIL_FROM}>`,
        to: targetEmails.join(','),
        subject: `Nuevo mensaje de contacto: ${subject}`,
        html: this.generarTemplateContacto({ name, email, phone, subject, message }),
        attachments: this._getLogoAttachment()
      };

      const { info, intentos_envio } = await this._enviarConReintentos(mailOptions, {
        logContext: 'CONTACTO',
        metadata: { from_email: email, subject }
      });

      logger.info(`Email de contacto enviado exitosamente de ${email} a ${targetEmails.length} administradores`, {
        messageId: info.messageId,
        intentos_envio
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Error enviando email de contacto:', error);
      throw error;
    }
  }

  generarTemplateContacto({ name, email, phone, subject, message }) {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuevo Mensaje de Contacto</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
          body { 
            margin: 0; padding: 0; background-color: #F8FAFC; 
            font-family: 'Outfit', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            color: #1E293B; -webkit-font-smoothing: antialiased;
          }
          .wrapper { width: 100%; padding: 40px 0; }
          .container { 
            max-width: 600px; margin: 0 auto; background-color: #ffffff; 
            border-radius: 24px; overflow: hidden; 
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.1); 
          }
          .header { 
            padding: 40px; background: linear-gradient(135deg, #0F172A 0%, #172554 100%); 
            text-align: center; color: #FFFFFF;
          }
          .logo { max-height: 120px; width: auto; margin-bottom: 20px; }
          .headline { font-size: 28px; font-weight: 800; margin: 0; line-height: 1.2; letter-spacing: -0.02em; }
          .content { padding: 40px; }
          .section-title { 
            font-size: 14px; font-weight: 700; color: #64748B; 
            text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px;
            padding-bottom: 8px; border-bottom: 1px solid #E2E8F0;
          }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-item { background-color: #F1F5F9; padding: 16px; border-radius: 12px; }
          .label { font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 15px; color: #0F172A; font-weight: 700; word-break: break-all; }
          .message-box { 
            background-color: #F8FAFC; padding: 24px; border-radius: 16px; 
            border-left: 4px solid #3B82F6; margin-bottom: 30px;
          }
          .message-text { font-size: 16px; line-height: 1.6; color: #334155; white-space: pre-wrap; }
          .footer {
            padding: 30px; background-color: #F1F5F9; text-align: center; 
            font-size: 13px; color: #64748B;
          }
          @media (max-width: 480px) {
            .info-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <img class="logo" src="cid:logo" alt="Matriz Inmobiliaria" />
              <h1 class="headline">Nuevo Mensaje de Contacto</h1>
            </div>
            <div class="content">
              <div class="section-title">Información del Remitente</div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="label">Nombre</div>
                  <div class="value">\${name}</div>
                </div>
                <div class="info-item">
                  <div class="label">Correo Electrónico</div>
                  <div class="value">\${email}</div>
                </div>
                <div class="info-item">
                  <div class="label">Teléfono</div>
                  <div class="value">\${phone || 'No proporcionado'}</div>
                </div>
                <div class="info-item">
                  <div class="label">Asunto</div>
                  <div class="value">\${subject}</div>
                </div>
              </div>

              <div class="section-title">Mensaje</div>
              <div class="message-box">
                <div class="message-text">\${message}</div>
              </div>

              <div style="text-align: center; color: #94A3B8; font-size: 12px;">
                Este mensaje fue enviado desde el formulario de contacto del sitio web.
              </div>
            </div>
            <div class="footer">
              <p>Matriz Inmobiliaria © 2026. Panel Administrativo.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generarTemplateCitaCanceladaDisponibilidad({
    nombre = 'Cliente',
    servicio,
    fechaHumana,
    horaRango,
    direccion,
    rescheduleLink
  }) {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Novedades sobre tu cita</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
          body { 
            margin: 0; padding: 0; background-color: #F8FAFC; 
            font-family: 'Outfit', sans-serif; 
            color: #1E293B;
          }
          .wrapper { width: 100%; padding: 40px 0; }
          .container { 
            max-width: 600px; margin: 0 auto; background-color: #ffffff; 
            border-radius: 24px; overflow: hidden; 
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08); 
          }
          .header { 
            padding: 40px; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); 
            text-align: center; color: #FFFFFF;
          }
          .status-badge {
            display: inline-flex; align-items: center; 
            padding: 8px 16px; border-radius: 100px; 
            background-color: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); 
            color: #FFFFFF; font-weight: 600; font-size: 13px;
          }
          .content { padding: 40px; text-align: center; }
          .headline { font-size: 24px; font-weight: 800; color: #0F172A; margin-bottom: 16px; }
          .message { font-size: 16px; color: #64748B; line-height: 1.6; margin-bottom: 30px; }
          .info-box {
            background-color: #F1F5F9; border-radius: 16px; padding: 20px; margin-bottom: 30px;
            text-align: left;
          }
          .info-item { margin-bottom: 12px; }
          .info-item:last-child { margin-bottom: 0; }
          .label { font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 15px; font-weight: 600; color: #1E293B; }
          .btn {
            display: inline-block; padding: 16px 32px; background-color: #3B82F6; 
            color: #FFFFFF; font-weight: 700; text-decoration: none; border-radius: 12px;
            box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
            text-align: center;
          }
          .footer { padding: 30px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #F1F5F9; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="status-badge">ACTUALIZACIÓN DE DISPONIBILIDAD</div>
            </div>
            <div class="content">
              <h1 class="headline">¡Hola \${nombre}!</h1>
              <p class="message">
                Te contactamos respecto a tu solicitud de cita para visitar una propiedad. 
                Debido a un cambio reciente en la disponibilidad de este horario, no hemos podido confirmar tu visita en el bloque seleccionado.
              </p>
              
              <div class="info-box">
                <div class="info-item">
                  <div class="label">Propiedad</div>
                  <div class="value">\${direccion}</div>
                </div>
                <div class="info-item">
                  <div class="label">Horario anterior</div>
                  <div class="value">\${fechaHumana} a las \${horaRango}</div>
                </div>
              </div>

              <p class="message" style="font-weight: 600; color: #0F172A;">
                ¡Aún queremos ayudarte a conocer este inmueble! Por favor, elige un nuevo horario que se ajuste a tu agenda.
              </p>

              <a href="\${rescheduleLink}" class="btn">Ver otros horarios disponibles</a>
            </div>
            <div class="footer">
              Matriz Inmobiliaria © 2026. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();



