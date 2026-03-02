const personasService = require('../services/persona.service');
const invitacionService = require('../services/invitacion.service');
const logger = require('../utils/logger');

const normalizeTipoDoc = (value = '') => {
  const t = value.toString().trim().toUpperCase();
  if (t === 'PAS' || t === 'PASAPORTE') return 'Pasaporte';
  return t;
};

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

      const personas = await personasService.buscarPorDocumento(
        normalizeTipoDoc(tipo_documento),
        numero_documento
      );

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
   * Obtener resumen de inmuebles del propietario autenticado
   */
  async obtenerResumenPropietario(req, res, next) {
    try {
      const personaId = req.user.id;
      const perfil = await personasService.obtenerPerfil(personaId);
      const inmuebles = Array.isArray(perfil.inmuebles) ? perfil.inmuebles : [];

      const normalizar = (value = '') => String(value || '').trim().toLowerCase();
      const incluyeVenta = (operacion = '') => normalizar(operacion).includes('venta');
      const incluyeArriendo = (operacion = '') => normalizar(operacion).includes('arriendo');
      const esArrendado = (item = {}) => normalizar(item.estado_frontend) === 'arrendado';
      const canonSeguro = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const inmueblesVenta = inmuebles.filter((item) => incluyeVenta(item.operacion)).length;
      const inmueblesArriendo = inmuebles.filter((item) => incluyeArriendo(item.operacion)).length;
      const canonTotalEsperado = inmuebles.reduce((acc, item) => {
        if (!esArrendado(item)) return acc;
        return acc + canonSeguro(item.precio_arriendo);
      }, 0);

      return res.status(200).json({
        success: true,
        message: 'Resumen de inmuebles obtenido exitosamente',
        data: {
          id_persona: perfil.id_persona,
          propietario: {
            id_persona: perfil.id_persona,
            nombre_completo: perfil.nombre_completo,
            apellido_completo: perfil.apellido_completo,
            correo: perfil.correo,
            telefono: perfil.telefono
          },
          resumen: {
            total_inmuebles: inmuebles.length,
            inmuebles_venta: inmueblesVenta,
            inmuebles_arriendo: inmueblesArriendo,
            canon_total_esperado: canonTotalEsperado
          },
          inmuebles: inmuebles.map((item) => ({
            ...item,
            estado_inmueble: item.estado_frontend || (item.estado ? 'Disponible' : 'No disponible')
          }))
        }
      });
    } catch (error) {
      logger.error('Error obteniendo resumen de inmuebles:', error);
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
      const persona = await personasService.crearPersonaAdmin(personaData);

      try {
        const rolesAdministrativos = ['Administrador', 'Super Administrador', 'Empleado', 'Agente', 'Gerente', 'Supervisor']; // Roles administrativos actualizados
        const esAdmin = rolesAdministrativos.includes(personaData.rol);

        await invitacionService.crearInvitacion({
          id_persona: persona.id_persona,
          creado_por: req.user?.id || null,
          tipo: esAdmin ? 'admin_invite' : 'user_invite',
          rol_asignado: personaData.rol || (esAdmin ? 'Administrativo' : 'Usuario'),
          es_administrativo: esAdmin
        });
      } catch (inviteError) {
        logger.warn('No se pudo enviar invitacion al crear persona:', inviteError.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Persona creada exitosamente',
        data: persona
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
