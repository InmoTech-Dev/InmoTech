const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

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
        html: this.generarTemplateInvitacion(nombre_completo, codigo_6d, expira_en, activationLink, email, rol_asignado, es_administrativo)
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

  _buildResetPasswordUrl(token, email = '') {
    const frontendBase =
      process.env.PASSWORD_RESET_FRONTEND_URL ||
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      "http://localhost:3000";

    const normalizedBase = String(frontendBase).replace(/\/+$/, "");
    const params = new URLSearchParams({ token: String(token) });
    if (email) {
      params.set('email', String(email).trim().toLowerCase());
    }
    return `${normalizedBase}/reset-password?${params.toString()}`;
  }

  async sendPasswordResetEmail({ to, token }) {
    if (!to || !token) {
      const error = new Error("Parametros invalidos para recuperacion de contrasena");
      error.code = "INVALID_PASSWORD_RESET_EMAIL_PAYLOAD";
      throw error;
    }

    const resetUrl = this._buildResetPasswordUrl(token, to);
    const mailOptions = {
      from: `"Matriz Inmobiliaria" <${process.env.EMAIL_FROM}>`,
      to,
      subject: "Recuperacion de contrasena",
      html: this.generarTemplateRecuperacionContrasena({ resetUrl }),
    };

    const { info, intentos_envio } = await this._enviarConReintentos(mailOptions, {
      logContext: "PASSWORD_RESET",
      metadata: { to },
    });

    logger.info(`[EMAIL][PASSWORD_RESET] Correo enviado a ${to}`, {
      messageId: info.messageId,
      intentos_envio,
    });

    return { success: true, messageId: info.messageId, intentos_envio };
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
        })
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
        })
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`[EMAIL][CITA] Cancelacion enviada a ${ctx.correo}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('[EMAIL][CITA] Error enviando correo de cita cancelada:', error);
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
        })
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
        })
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
          mostrarDatosCliente: true
        })
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`[EMAIL][CITA] Confirmacion enviada al agente ${correoAgente}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('[EMAIL][CITA] Error enviando correo de confirmacion para agente:', error);
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

  _formatearFechaHumana(fecha, hora, timezone) {
    if (!fecha) return '';
    const [year, month, day] = (fecha.split('T')[0] || fecha).split('-').map(Number);
    const [hour, minute] = this._normalizarHora(hora).split(':').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute));

    return date.toLocaleString('es-ES', {
      timeZone: timezone || 'America/Bogota',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

    const fechaHumana = this._formatearFechaHumana(fecha, horaInicio, zona);
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
    const primerNombre = nombreCompleto.trim().split(" ")[0] || "Hola";
    const logoUrl = process.env.EMAIL_LOGO_URL || "https://matrizinmobiliaria.com/images/logo-matriz-sin-fondo.png";

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a Matriz Inmobiliaria</title>
        <style>
          body { margin:0; padding:0; background:#f3f7fb; font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; color:#1f2d3d; }
          .preheader { display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; height:0; width:0; }
          .wrapper { width:100%; table-layout:fixed; background:#f3f7fb; padding:28px 0; }
          .container { max-width:720px; margin:0 auto; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 24px 60px rgba(15,43,70,0.16); }
          .hero { background:linear-gradient(135deg,#0f2b46,#1b5f8c); padding:36px 42px 26px; color:#e9f2fb; }
          .hero h1 { margin:12px 0 6px; font-size:26px; letter-spacing:0.3px; }
          .hero p { margin:6px 0 0; color:#d9e6f3; font-size:15px; line-height:1.5; }
          .logo { width:200px; max-width:60%; }
          .content { padding:36px 42px 42px; }
          h2 { margin:0 0 12px; font-size:22px; color:#0f2b46; }
          p { margin:0 0 14px; line-height:1.6; color:#4a5566; }
          .card { border:1px solid #e6edf5; border-radius:14px; padding:18px; background:linear-gradient(135deg,rgba(27,95,140,0.06),rgba(15,43,70,0.02)); margin:26px 0; }
          .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; }
          .feature { background:#ffffff; border:1px solid #e6edf5; border-radius:12px; padding:16px 14px; box-shadow:0 10px 24px rgba(15,43,70,0.05); }
          .feature-number { display:inline-block; background:#f4b223; color:#0f2b46; font-weight:800; padding:6px 10px; border-radius:10px; font-size:12px; letter-spacing:0.4px; }
          .feature-title { margin:10px 0 6px; font-weight:700; color:#0f2b46; font-size:16px; }
          .feature-desc { margin:0; color:#556273; line-height:1.5; font-size:14px; }
          .cta-wrap { text-align:center; margin:30px 0 8px; }
          .cta { display:inline-block; padding:14px 32px; background:linear-gradient(135deg,#f4b223,#f7c85c); color:#0f2b46; font-weight:800; text-decoration:none; border-radius:12px; box-shadow:0 14px 32px rgba(244,178,35,0.35); letter-spacing:0.4px; }
          .tips { background:#f6f9fc; border:1px solid #e6edf5; border-radius:12px; padding:16px 18px; margin:24px 0 12px; color:#4a5566; }
          .tips ul { padding-left:18px; margin:10px 0 0; }
          .footer { background:#0f2034; color:#c9d5e5; text-align:center; padding:22px 18px; font-size:13px; }
          .footer a { color:#c9d5e5; text-decoration:none; }
          .footer .contact { margin:8px 0 4px; }
          @media (max-width:640px) { .content { padding:28px 22px 32px; } .hero { padding:28px 24px 22px; } }
        </style>
      </head>
      <body>
        <span class="preheader">Tu nueva cuenta ya esta lista. Explora propiedades, agenda visitas y recibe acompanamiento.</span>
        <table class="wrapper" role="presentation" cellspacing="0" cellpadding="0" width="100%">
          <tr>
            <td align="center">
              <table class="container" role="presentation" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td class="hero">
                    <img class="logo" src="${logoUrl}" alt="Matriz Inmobiliaria" />
                    <h1>Bienvenido a bordo</h1>
                    <p>Tu nuevo espacio para explorar, gestionar y hacer realidad cada proyecto inmobiliario con acompanamiento experto.</p>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    <h2>Hola ${primerNombre}, nos alegra tenerte aqui.</h2>
                    <p>Creamos este espacio para que puedas encontrar propiedades, agendar visitas y avanzar tus planes sin friccion. Desde hoy cuentas con las herramientas y el acompanamiento de nuestro equipo.</p>
                    <p>Aqui un vistazo rapido a lo que puedes hacer desde ya:</p>

                    <div class="card">
                      <div class="grid">
                        <div class="feature">
                          <span class="feature-number">01</span>
                          <div class="feature-title">Explora el catalogo</div>
                          <p class="feature-desc">Filtra por ubicacion, precio y tipo. Guarda tus favoritas y comparalas cuando quieras.</p>
                        </div>
                        <div class="feature">
                          <span class="feature-number">02</span>
                          <div class="feature-title">Agenda visitas en linea</div>
                          <p class="feature-desc">Elige horarios en tiempo real y recibe confirmaciones inmediatas sin llamadas ni esperas.</p>
                        </div>
                        <div class="feature">
                          <span class="feature-number">03</span>
                          <div class="feature-title">Acompanamiento experto</div>
                          <p class="feature-desc">Un asesor te guiara paso a paso: documentacion, negociacion y estado de cada proceso.</p>
                        </div>
                        <div class="feature">
                          <span class="feature-number">04</span>
                          <div class="feature-title">Gestiona en un solo lugar</div>
                          <p class="feature-desc">Historial, notificaciones y recordatorios centralizados para avanzar sin perder detalle.</p>
                        </div>
                      </div>
                    </div>

                    <div class="cta-wrap">
                      <a class="cta" href="http://localhost:3000/" target="_blank" rel="noopener noreferrer">Empezar ahora</a>
                    </div>

                    <div class="tips">
                      <strong>Para aprovechar al maximo:</strong>
                      <ul>
                        <li>Completa tu perfil para recibir recomendaciones personalizadas.</li>
                        <li>Activa notificaciones para enterarte de nuevas propiedades en tu zona.</li>
                        <li>Comparte tus favoritos con tu asesor para avanzar mas rapido.</li>
                      </ul>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="footer">
                    <div class="contact">Si tienes preguntas, estamos listos para ayudarte.</div>
                    <div class="contact"><a href="mailto:hola@matrizinmobiliaria.com">hola@matrizinmobiliaria.com</a> | +57 300 123 4567 | <a href="https://matrizinmobiliaria.com" target="_blank" rel="noreferrer">matrizinmobiliaria.com</a></div>
                    <div style="margin-top:8px;">&copy; 2025 Matriz Inmobiliaria. Todos los derechos reservados.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
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
    intro = 'Tu cita esta registrada como solicitada. Te contactaremos para confirmarla o informarte si necesitamos ajustar algo.',
    note = 'El evento se crea con el estado actual de la cita. Si se confirma o cambia, te enviaremos un nuevo correo.',
    ctaLabel = 'Agregar en Google Calendar',
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
    mensajeExtra = ''
  }) {
    const logoUrl = process.env.EMAIL_LOGO_URL || "https://matrizinmobiliaria.com/images/logo-matriz-sin-fondo.png";
    const estadoTexto = estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'Solicitada';
    const estadoKey = (estadoTexto || '').toLowerCase();
    const statusStyles = {
      solicitada: { bg: '#E0E7FF', color: '#3730A3', border: '#C7D2FE' },
      confirmada: { bg: '#E8F8EF', color: '#1B7B4A', border: '#34D399' },
      cancelada: { bg: '#FEECEC', color: '#B42318', border: '#F97373' },
      reagendada: { bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD' },
      programada: { bg: '#EEF2FF', color: '#4F46E5', border: '#A5B4FC' },
      default: { bg: '#EEF2FF', color: '#1F2937', border: '#CBD5E1' }
    };
    const statusStyle = statusStyles[estadoKey] || statusStyles.default;
    const agenteAsignado = (agente || agenteNombre || '').trim();
    const agenteIniciales = agenteAsignado
      ? agenteAsignado.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
      : '';
    const zona = timezone || 'America/Bogota';
    const format24to12 = (time) => {
      if (!time) return '';
      const [h, m] = String(time).split(':').map(Number);
      if (Number.isNaN(h)) return time;
      const isPM = h >= 12;
      const hh = h % 12 || 12;
      const mm = Number.isNaN(m) ? '00' : String(m).padStart(2, '0');
      return `${String(hh).padStart(2, '0')}:${mm} ${isPM ? 'pm' : 'am'}`;
    };
    const horaRango12 = horaRango
      ? horaRango
        .split('-')
        .map(part => format24to12(part.trim()))
        .join(' - ')
      : '';
    const fechaSinHora = fechaHumana
      ? (() => {
        const parts = fechaHumana.split(',');
        return parts.length > 1 ? parts.slice(0, -1).join(',').trim() : fechaHumana;
      })()
      : '';

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${titulo}</title>
        <style>
          body { margin:0; padding:0; background:#f5f7fb; font-family:'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif; color:#1b2838; }
          .wrapper { width:100%; padding:26px 0; }
          .container { max-width:720px; margin:0 auto; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 16px 48px rgba(12,37,63,0.12); }
          .hero { padding:26px 26px 20px; background:#0f2741; color:#eef3fb; }
          .hero-top { display:flex; align-items:center; justify-content:space-between; gap:10px; }
          .logo { width:170px; max-width:70%; }
          .pill { display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border-radius:999px; font-weight:800; font-size:12px; border:1px solid ${statusStyle.border}; background:${statusStyle.bg}; color:${statusStyle.color}; }
          .dot { width:8px; height:8px; border-radius:50%; background:${statusStyle.color}; display:inline-block; }
          .eyebrow { margin:14px 0 4px; letter-spacing:0.8px; text-transform:uppercase; font-weight:700; opacity:0.9; font-size:12px; }
          .headline { font-size:24px; font-weight:900; margin:0 0 6px; color:#fff; }
          .lead { margin:0; color:#d9e4f2; line-height:1.65; font-size:14px; }
          .agent-card { margin:16px 0 0; padding:14px 14px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); border-radius:14px; display:flex; align-items:center; gap:10px; }
          .agent-avatar { width:44px; height:44px; border-radius:12px; background:#f4c542; color:#0f2741; font-weight:900; display:flex; align-items:center; justify-content:center; font-size:16px; }
          .agent-meta { color:#e7edf8; font-size:13px; font-weight:700; }
          .section { padding:26px 26px 30px; background:#fbfcff; }
          .card { border:1px solid #e5eaf1; border-radius:14px; padding:20px 22px; background:#ffffff; box-shadow:0 10px 28px rgba(12,37,63,0.08); margin-bottom:18px; }
          .card-title { margin:0 0 12px; font-weight:900; color:#0f2741; letter-spacing:0.25px; font-size:14px; text-transform:uppercase; }
          .info-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px 16px; }
          .label { color:#6b7280; font-size:11px; text-transform:uppercase; letter-spacing:0.65px; margin-bottom:4px; }
          .value { color:#0f1f33; font-weight:900; font-size:16px; line-height:1.4; }
          .value-secondary { color:#3b4656; font-weight:700; font-size:13px; }
          .cta { display:inline-block; padding:12px 20px; background:linear-gradient(135deg,#2cb67d,#38d996); color:#0f1f33; font-weight:900; text-decoration:none; border-radius:12px; box-shadow:0 12px 26px rgba(44,182,125,0.35); margin:8px 0 12px; letter-spacing:0.15px; }
          .note { font-size:12px; color:#4c5564; margin-bottom:10px; line-height:1.55; }
          .section-title { margin:14px 0 8px; font-weight:900; font-size:12px; letter-spacing:0.3px; color:#0f2741; text-transform:uppercase; }
          .bullet { display:flex; align-items:flex-start; gap:10px; margin:6px 0; color:#3f4b5c; line-height:1.5; font-size:13px; }
          .bullet-dot { width:8px; height:8px; margin-top:7px; background:#2cb67d; border-radius:50%; flex-shrink:0; box-shadow:0 6px 12px rgba(44,182,125,0.35); }
          .footer { background:#0d1b2c; color:#cfd8e3; text-align:center; padding:18px; font-size:12px; }
          .footer a { color:#cfd8e3; text-decoration:none; }
          @media (max-width:620px) { .hero-top { flex-direction:column; align-items:flex-start; } .section { padding:22px 18px 26px; } }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="hero">
              <div class="hero-top">
                <img class="logo" src="${logoUrl}" alt="Matriz Inmobiliaria" />
                <span class="pill"><span class="dot"></span>${estadoTexto}</span>
              </div>
              <div class="eyebrow">${titulo}</div>
              <div class="headline">Hola ${nombre},</div>
              <div class="lead">${intro}</div>
              ${agenteAsignado ? `
                <div class="agent-card">
                  <div class="agent-avatar">${agenteIniciales}</div>
                  <div>
                    <div class="agent-meta">Agente asignado</div>
                    <div class="value" style="color:#fff; font-size:15px;">${agenteAsignado}</div>
                    ${agenteDocumento ? `<div class="agent-meta" style="margin-top:2px;">Documento: ${agenteDocumento}</div>` : ''}
                  </div>
                </div>
              ` : ''}
            </div>
            <div class="section">
              <div class="card">
                <div class="card-title">Detalles de la cita</div>
                <div class="info-grid">
                  <div>
                    <div class="label">Fecha y hora</div>
                    <div class="value">${fechaSinHora || fechaHumana || ''}</div>
                    <div class="value-secondary">${horaRango12 || horaRango || ''} (${zona})</div>
                  </div>
                  <div>
                    <div class="label">Servicio</div>
                    <div class="value">${servicio || 'Cita de servicio'}</div>
                    ${agenteAsignado ? `<div class="value-secondary">A cargo de: ${agenteAsignado}${agenteDocumento ? ` · Doc: ${agenteDocumento}` : ''}</div>` : ''}
                  </div>
                  <div>
                    <div class="label">Ubicacion</div>
                    <div class="value">${direccion || 'Pendiente por confirmar'}</div>
                  </div>
                  ${observaciones ? `
                    <div>
                      <div class="label">Notas que compartiste</div>
                      <div class="value-secondary" style="font-weight:700;">${observaciones}</div>
                    </div>
                  ` : ''}
                </div>
              </div>

              ${mostrarDatosCliente ? `
                <div class="card">
                  <div class="card-title">Datos del cliente</div>
                  <div class="info-grid">
                    <div>
                      <div class="label">Nombre</div>
                      <div class="value">${clienteNombreCompleto || ''}</div>
                    </div>
                    ${clienteTipoDocumento || clienteNumeroDocumento ? `
                      <div>
                        <div class="label">Documento</div>
                        <div class="value-secondary">${clienteTipoDocumento || ''} ${clienteNumeroDocumento || ''}</div>
                      </div>
                    ` : ''}
                    ${clienteCorreo ? `
                      <div>
                        <div class="label">Correo</div>
                        <div class="value-secondary">${clienteCorreo}</div>
                      </div>
                    ` : ''}
                    ${clienteTelefono ? `
                      <div>
                        <div class="label">Teléfono</div>
                        <div class="value-secondary">${clienteTelefono}</div>
                      </div>
                    ` : ''}
                  </div>
                </div>
              ` : ''}

              ${calendarLink ? `<a class="cta" href="${calendarLink}" target="_blank" rel="noopener noreferrer">${ctaLabel || 'Agregar en Google Calendar'}</a>` : ''}
              ${note ? `<p class="note">${note}</p>` : ''}

              <div class="section-title">Que sigue</div>
              <div class="bullet"><span class="bullet-dot"></span><span>Revisa tu correo: enviamos esta confirmacion con los detalles de la cita.</span></div>
              <div class="bullet"><span class="bullet-dot"></span><span>Espera nuestra llamada o correo para confirmar la hora definitiva.</span></div>
              <div class="bullet"><span class="bullet-dot"></span><span>Si necesitas ajustar algo, responde este correo y lo coordinamos.</span></div>

              ${mensajeExtra ? `<div class="note" style="font-weight:800; margin-top:12px;">${mensajeExtra}</div>` : ''}
            </div>
            <div class="footer">
              <div>Si necesitas ayuda, escribenos a <a href="mailto:hola@matrizinmobiliaria.com">hola@matrizinmobiliaria.com</a></div>
              <div style="margin-top:6px;">&copy; 2025 Matriz Inmobiliaria. Todos los derechos reservados.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generarTemplateRecuperacionContrasena({ resetUrl }) {
    const logoUrl = process.env.EMAIL_LOGO_URL || "https://matrizinmobiliaria.com/images/logo-matriz-sin-fondo.png";

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperacion de contrasena</title>
        <style>
          body { margin:0; padding:0; background:#f5f7fb; font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; color:#1f2d3d; }
          .wrapper { width:100%; padding:24px 0; }
          .container { max-width:640px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 18px 46px rgba(15,43,70,0.12); }
          .header { padding:28px; background:linear-gradient(135deg,#0f2b46,#1b5f8c); color:#fff; }
          .logo { width:180px; max-width:70%; }
          .content { padding:30px 28px 34px; }
          h1 { margin:0 0 14px; font-size:24px; color:#0f2b46; }
          p { margin:0 0 14px; line-height:1.6; color:#4a5566; }
          .cta { display:inline-block; padding:14px 28px; background:linear-gradient(135deg,#2f6fed,#2a5fd1); color:#ffffff; font-weight:800; text-decoration:none; border-radius:12px; margin:18px 0; }
          .url { word-break:break-all; color:#0f2b46; font-size:13px; }
          .footer { background:#0f2034; color:#c9d5e5; text-align:center; padding:18px; font-size:13px; }
          .footer a { color:#c9d5e5; text-decoration:none; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <img class="logo" src="${logoUrl}" alt="Matriz Inmobiliaria" />
              <p style="margin:12px 0 0; opacity:0.95; color:#f7f9ff; font-weight:700;">Solicitud de cambio de contrasena</p>
            </div>
            <div class="content">
              <h1>Restablece tu contrasena</h1>
              <p>Recibimos una solicitud para cambiar la contrasena de tu cuenta.</p>
              <p>Haz clic en el siguiente boton para continuar. El enlace expira en 1 hora.</p>
              <a class="cta" href="${resetUrl}" target="_blank" rel="noopener noreferrer">Restablecer contrasena</a>
              <p>Si el boton no funciona, copia y pega este enlace en tu navegador:</p>
              <p class="url">${resetUrl}</p>
              <p style="font-size:13px; color:#6b7280;">Si no solicitaste este cambio, ignora este correo.</p>
            </div>
            <div class="footer">
              <div>Si necesitas ayuda, escribenos a <a href="mailto:hola@matrizinmobiliaria.com">hola@matrizinmobiliaria.com</a></div>
              <div style="margin-top:8px;">&copy; 2025 Matriz Inmobiliaria. Todos los derechos reservados.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }


  generarTemplateAuditoriaAdministrativo({ administrador, cita, accion, resumen = [] }) {
    const logoUrl = process.env.EMAIL_LOGO_URL || "https://matrizinmobiliaria.com/images/logo-matriz-sin-fondo.png";
    const fecha = new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' });

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
          .header { background: #0f2b46; color: #fff; padding: 15px; border-radius: 6px 6px 0 0; text-align: center; }
          .content { padding: 20px; }
          .field { margin-bottom: 10px; border-bottom: 1px solid #f9f9f9; padding-bottom: 5px; }
          .label { font-weight: bold; color: #666; width: 140px; display: inline-block; }
          .value { color: #000; }
          .footer { font-size: 12px; color: #999; text-align: center; margin-top: 20px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; text-transform: uppercase; }
          .badge-info { background: #e3f2fd; color: #1976d2; }
          .badge-warning { background: #fff3e0; color: #f57c00; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${logoUrl}" alt="Logo" style="width: 120px;">
            <h2>Auditoría de Actividad</h2>
          </div>
          <div class="content">
            <p>Se ha registrado una acción administrativa en el sistema:</p>
            <div class="field">
              <span class="label">Administrador:</span>
              <span class="value">${administrador.nombre_completo || administrador.nombre || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="label">Acción:</span>
              <span class="badge badge-info">${accion}</span>
            </div>
            <div class="field">
              <span class="label">Fecha:</span>
              <span class="value">${fecha}</span>
            </div>
            <h3>Detalles de la Cita</h3>
            ${resumen.map(f => `
              <div class="field">
                <span class="label">${f.label}:</span>
                <span class="value">${f.value}</span>
              </div>
            `).join('')}
          </div>
          <div class="footer">
            Este es un correo automático de auditoría.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async enviarEmailAuditoriaAdministrativo({ cita, administrador, accion }) {
    try {
      if (!process.env.EMAIL_AUDITORIA_DESTINO) {
        logger.warn('[EMAIL][AUDIT] No se ha configurado EMAIL_AUDITORIA_DESTINO, se omite envio');
        return;
      }

      // Reutilizar lógica de construcción de resumen del controlador o implementar algo local
      const resumen = [
        { label: 'Cita ID', value: cita?.id_cita || cita?.id || 'N/A' },
        { label: 'Cliente', value: cita?.cliente?.nombre_completo || 'N/A' },
        { label: 'Fecha Cita', value: cita?.fecha_cita || 'N/A' },
        { label: 'Estado', value: cita?.id_estado_cita || 'N/A' }
      ];

      const mailOptions = {
        from: `"Auditoría Matriz" <${process.env.EMAIL_FROM}>`,
        to: process.env.EMAIL_AUDITORIA_DESTINO,
        subject: `[AUDIT] ${accion} - Cita #${cita?.id_cita || cita?.id}`,
        html: this.generarTemplateAuditoriaAdministrativo({ administrador, cita, accion, resumen })
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`[EMAIL][AUDIT] Correo de auditoría por ${accion} enviado a ${process.env.EMAIL_AUDITORIA_DESTINO}`);
    } catch (error) {
      logger.error('[EMAIL][AUDIT] Error enviando correo de auditoría:', error);
    }
  }

  generarTemplateInvitacion(nombreCompleto = "", codigo6d, expiraEn, activationLink, correo, rolAsignado = null, esAdministrativo = false) {
    const primerNombre = nombreCompleto.trim().split(" ")[0] || "Hola";
    const logoUrl = process.env.EMAIL_LOGO_URL || "https://matrizinmobiliaria.com/images/logo-matriz-sin-fondo.png";
    const expiraTexto = expiraEn ? new Date(expiraEn).toLocaleString() : '';
    const rolTexto = rolAsignado || (esAdministrativo ? 'Administrativo' : 'Usuario');
    const badge = esAdministrativo ? 'Acceso administrativo' : 'Acceso a la plataforma';

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Activa tu cuenta</title>
        <style>
          body { margin:0; padding:0; background:#f5f7fb; font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; color:#1f2d3d; }
          .wrapper { width:100%; padding:24px 0; }
          .container { max-width:640px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 18px 46px rgba(15,43,70,0.12); }
          .header { padding:28px; background:linear-gradient(135deg,#0f2b46,#1b5f8c); color:#fff; }
          .logo { width:180px; max-width:70%; }
          .content { padding:32px 28px 36px; }
          h1 { margin:0 0 14px; font-size:24px; color:#0f2b46; }
          p { margin:0 0 14px; line-height:1.6; color:#4a5566; }
          .code { font-size:28px; font-weight:800; letter-spacing:6px; color:#0f2b46; text-align:center; padding:16px; border:1px dashed #cfd8e3; border-radius:12px; background:#f6f9fc; }
          .cta { display:inline-block; padding:14px 28px; background:linear-gradient(135deg,#f4b223,#f7c85c); color:#0f2b46; font-weight:800; text-decoration:none; border-radius:12px; box-shadow:0 12px 28px rgba(244,178,35,0.35); margin:18px 0; }
          .badge { display:inline-block; padding:8px 12px; background:rgba(27,95,140,0.1); color:#1b5f8c; font-weight:700; border-radius:10px; margin-top:8px; }
          .role { padding:12px 14px; background:#f6f9fc; border:1px solid #e4ebf3; border-radius:12px; margin:12px 0; color:#0f2b46; font-weight:700; }
          .footer { background:#0f2034; color:#c9d5e5; text-align:center; padding:18px; font-size:13px; }
          .footer a { color:#c9d5e5; text-decoration:none; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <img class="logo" src="${logoUrl}" alt="Matriz Inmobiliaria" />
              <p style="margin:12px 0 0; opacity:0.95; color:#f7f9ff; font-weight:700;">Activa tu cuenta y establece tu contrasena</p>
            </div>
            <div class="content">
              <h1>Hola ${primerNombre},</h1>
              <p>${esAdministrativo ? 'Fuiste asignado como parte del equipo administrativo. Necesitamos que actives tu acceso y definas tu contraseña.' : 'Hemos creado una cuenta para ti en Matriz Inmobiliaria. Para comenzar, activa tu cuenta y define tu contraseña.'}</p>
              <p><strong>Tu correo de acceso:</strong> ${correo || ''}</p>
              <div class="badge">${badge}</div>
              <div class="role">Rol asignado: ${rolTexto}</div>
              <p>Usa este código para validar que tienes acceso a esta bandeja:</p>
              <div class="code">${codigo6d}</div>
              <p>Pulsa el botón y completa tu contraseña. El enlace vence el <strong>${expiraTexto}</strong>.</p>
              <a class="cta" href="${activationLink}" target="_blank" rel="noopener noreferrer">Activar mi cuenta</a>
              <p style="margin-top:18px;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
              <p style="word-break:break-all; color:#0f2b46;">${activationLink}</p>
              <p style="font-size:13px; color:#6b7280;">Si no solicitaste esta invitación, puedes ignorar este correo.</p>
            </div>
            <div class="footer">
              <div>¿Necesitas ayuda? Escríbenos a <a href="mailto:hola@matrizinmobiliaria.com">hola@matrizinmobiliaria.com</a></div>
              <div style="margin-top:8px;">&copy; 2025 Matriz Inmobiliaria. Todos los derechos reservados.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();



