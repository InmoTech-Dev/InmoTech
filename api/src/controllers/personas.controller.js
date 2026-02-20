const personasService = require('../services/persona.service');
const invitacionService = require('../services/invitacion.service');
const logger = require('../utils/logger');

class PersonasController {
  /**
   * Buscar personas por documento
   */
  async buscarPorDocumento(req, res, next) {
    try {
      const { tipo_documento, numero_documento } = req.query;

      if (!tipo_documento || !numero_documento) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de documento y número son requeridos'
        });
      }

      const personas = await personasService.buscarPorDocumento(tipo_documento, numero_documento);

      return res.status(200).json({
        success: true,
        message: 'Personas encontradas exitosamente',
        data: personas
      });
    } catch (error) {
      logger.error('Error buscando personas por documento:', error);
      next(error);
    }
  }

  /**
   * Obtener perfil de la persona autenticada
   */
  async obtenerPerfil(req, res, next) {
    try {
      const personaId = req.user.id;
      const perfil = await personasService.obtenerPerfil(personaId);

      return res.status(200).json({
        success: true,
        message: 'Perfil obtenido exitosamente',
        data: perfil
      });
    } catch (error) {
      logger.error('Error obteniendo perfil:', error);
      next(error);
    }
  }

  /**
   * Obtener inmuebles/arriendos del propietario autenticado
   */
  async obtenerResumenPropietario(req, res, next) {
    try {
      const personaId = req.user.id;
      const resumen = await personasService.obtenerResumenPropietario(personaId);

      return res.status(200).json({
        success: true,
        message: 'Resumen de propietario obtenido exitosamente',
        data: resumen
      });
    } catch (error) {
      logger.error('Error obteniendo resumen de propietario:', error);
      next(error);
    }
  }

  /**
   * Actualizar perfil de la persona autenticada
   */
  async actualizarPerfil(req, res, next) {
    try {
      const personaId = req.user.id;
      const updateData = req.validatedData;

      const perfilActualizado = await personasService.actualizarPerfil(personaId, updateData, req.user?.id || null);

      return res.status(200).json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: perfilActualizado
      });
    } catch (error) {
      logger.error('Error actualizando perfil:', error);
      next(error);
    }
  }

  /**
   * Verificar si existe un correo electrónico
   */
  async verificarCorreo(req, res, next) {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Correo electrónico es requerido'
        });
      }

      const existe = await personasService.verificarCorreoExistente(email);

      return res.status(200).json({
        success: true,
        message: existe ? 'Correo electrónico ya existe' : 'Correo electrónico disponible',
        data: { existe }
      });
    } catch (error) {
      logger.error('Error verificando correo:', error);
      next(error);
    }
  }

  /**
   * Verificar si existe un número de documento
   */
  async verificarDocumento(req, res, next) {
    try {
      const { tipo, numero } = req.params;

      if (!tipo || !numero) {
        return res.status(400).json({
          success: false,
          message: 'Tipo y número de documento son requeridos'
        });
      }

      const existe = await personasService.verificarDocumentoExistente(tipo, numero);

      return res.status(200).json({
        success: true,
        message: existe ? 'Documento ya existe' : 'Documento disponible',
        data: { existe }
      });
    } catch (error) {
      logger.error('Error verificando documento:', error);
      next(error);
    }
  }

  /**
   * Listar personas con filtros (solo para administradores)
   */
  async listarPersonas(req, res, next) {
    try {
      const filtros = req.query;
      const opciones = {
        pagina: parseInt(req.query.pagina) || 1,
        limite: parseInt(req.query.limite) || 20,
        ordenarPor: req.query.ordenar_por || 'nombre_completo',
        orden: req.query.orden || 'ASC'
      };

      const resultado = await personasService.listarPersonas(filtros, opciones);

      return res.status(200).json({
        success: true,
        message: 'Personas listadas exitosamente',
        data: resultado
      });
    } catch (error) {
      logger.error('Error listando personas:', error);
      next(error);
    }
  }

  /**
   * Crear persona (solo para administradores)
   */
  async crearPersona(req, res, next) {
    try {
      const personaData = req.validatedData;
      const { password, confirmPassword, ...personaDataSinPassword } = personaData;
      let invitationWarning = null;

      const persona = await personasService.crearPersonaAdmin(personaDataSinPassword, password);

      // Si no se proporciona contraseña, enviar invitación para definir acceso por enlace.
      if (!password) {
        if (!persona?.id_persona) {
          const inviteRefError = new Error('No se pudo generar la invitacion porque la persona no fue creada correctamente.');
          inviteRefError.status = 500;
          throw inviteRefError;
        }

        if (!persona?.correo) {
          const inviteEmailError = new Error('El propietario debe tener un correo para recibir el enlace de activacion.');
          inviteEmailError.status = 400;
          throw inviteEmailError;
        }

        const rolAsignado = personaDataSinPassword.rol || 'Usuario';
        const esAdministrativo =
          rolAsignado === 'Administrador' ||
          rolAsignado === 'Super Administrador' ||
          rolAsignado === 'Empleado';

        try {
          await invitacionService.crearInvitacion({
            id_persona: persona.id_persona,
            creado_por: req.user?.id || null,
            tipo: 'admin_invite',
            rol_asignado: rolAsignado,
            es_administrativo: esAdministrativo
          });
        } catch (inviteError) {
          invitationWarning = 'Persona creada, pero no se pudo enviar el correo de activacion.';
          logger.warn('No se pudo enviar invitacion al crear persona:', inviteError.message);
        }
      }

      return res.status(201).json({
        success: true,
        message: invitationWarning || 'Persona creada exitosamente',
        data: persona,
        ...(invitationWarning ? { warning: invitationWarning } : {})
      });
    } catch (error) {
      logger.error('Error creando persona:', error);
      next(error);
    }
  }

  /**
   * Actualizar persona (solo para administradores)
   */
  async actualizarPersona(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.validatedData;

      const personaActualizada = await personasService.actualizarPerfil(parseInt(id), updateData, req.user?.id || null);

      return res.status(200).json({
        success: true,
        message: 'Persona actualizada exitosamente',
        data: personaActualizada
      });
    } catch (error) {
      logger.error('Error actualizando persona:', error);
      next(error);
    }
  }

  /**
   * Cambiar estado de una persona (solo para administradores)
   */
  async cambiarEstado(req, res, next) {
    try {
      const { id } = req.params;
      const { estado } = req.body;  // El frontend debería enviar { estado: true/false }

      if (typeof estado !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'El campo estado debe ser un valor booleano'
        });
      }

      const personaActualizada = await personasService.cambiarEstadoPersona(parseInt(id), estado);

      return res.status(200).json({
        success: true,
        message: 'Estado de persona actualizado exitosamente',
        data: personaActualizada
      });
    } catch (error) {
      logger.error('Error cambiando estado de persona:', error);
      next(error);
    }
  }

  /**
   * Obtener persona por ID (solo para administradores)
   */
  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      const persona = await personasService.obtenerPorId(parseInt(id));

      if (!persona) {
        return res.status(404).json({
          success: false,
          message: 'Persona no encontrada'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Persona obtenida exitosamente',
        data: persona
      });
    } catch (error) {
      logger.error('Error obteniendo persona:', error);
      next(error);
    }
  }
}

module.exports = new PersonasController();
