const administrativoService = require('../services/administrativo.service');
const logger = require('../utils/logger');

class AdministrativosController {
  /**
   * Registra un nuevo administrativo
   */
  async registrarAdministrativo(req, res, next) {
    try {
      const adminData = req.body;  // ✅ Cambiar de req.validatedData
      const result = await administrativoService.registrarAdministrativo({ ...adminData, creado_por: req.user?.id || null });

      return res.status(201).json({
        success: true,
        message: 'Administrativo registrado exitosamente',
        data: result
      });
    } catch (error) {
      logger.error('Error en registro de administrativo:', error);
      next(error);
    }
  }

  /**
   * Obtiene todos los administrativos
   */
  async obtenerAdministrativos(req, res, next) {
    try {
      const { page = 1, limit = 10, estado } = req.query;
      const result = await administrativoService.obtenerAdministrativos({
        page: parseInt(page),
        limit: parseInt(limit),
        estado
      });

      return res.status(200).json({
        success: true,
        message: 'Administrativos obtenidos exitosamente',
        data: result
      });
    } catch (error) {
      logger.error('Error obteniendo administrativos:', error);
      next(error);
    }
  }

  async verificarCorreoExistente(req, res, next) {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Correo electronico es requerido'
        });
      }

      const existe = await administrativoService.verificarCorreoAdministrativoExistente(email);

      return res.status(200).json({
        success: true,
        message: existe ? 'Correo ya existe en administrativos' : 'Correo disponible en administrativos',
        data: { existe }
      });
    } catch (error) {
      logger.error('Error verificando correo de administrativo:', error);
      next(error);
    }
  }

  async verificarDocumentoExistente(req, res, next) {
    try {
      const { tipo, numero } = req.params;

      if (!tipo || !numero) {
        return res.status(400).json({
          success: false,
          message: 'Tipo y numero de documento son requeridos'
        });
      }

      const existe = await administrativoService.verificarDocumentoAdministrativoExistente(tipo, numero);

      return res.status(200).json({
        success: true,
        message: existe ? 'Documento ya existe en administrativos' : 'Documento disponible en administrativos',
        data: { existe }
      });
    } catch (error) {
      logger.error('Error verificando documento de administrativo:', error);
      next(error);
    }
  }

  /**
   * Obtiene un administrativo por ID
   */
  async obtenerAdministrativoPorId(req, res, next) {
    try {
      const { id } = req.params;
      const administrativo = await administrativoService.obtenerAdministrativoPorId(id);

      return res.status(200).json({
        success: true,
        message: 'Administrativo obtenido exitosamente',
        data: administrativo
      });
    } catch (error) {
      logger.error('Error obteniendo administrativo:', error);
      next(error);
    }
  }

  /**
   * Actualiza un administrativo
   */
  async actualizarAdministrativo(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;  // ✅ Cambiar de req.validatedData

      const result = await administrativoService.actualizarAdministrativo(id, { ...updateData, actualizado_por: req.user?.id || null });

      return res.status(200).json({
        success: true,
        message: 'Administrativo actualizado exitosamente',
        data: result
      });
    } catch (error) {
      logger.error('Error actualizando administrativo:', error);

      if (error.message.includes('No se puede editar')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      next(error);
    }
  }

  /**
   * Cambia el estado laboral de un administrativo
   */
  async cambiarEstadoLaboral(req, res, next) {
    try {
      const { id } = req.params;
      const { estado_laboral, fecha_retiro } = req.body;  // ✅ Cambiar de req.validatedData

      const result = await administrativoService.cambiarEstadoLaboral(id, estado_laboral, fecha_retiro);

      return res.status(200).json({
        success: true,
        message: 'Estado laboral actualizado exitosamente',
        data: result
      });
    } catch (error) {
      logger.error('Error cambiando estado laboral:', error);

      if (error.message.includes('No se puede cambiar')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      next(error);
    }
  }

  /**
   * Elimina un administrativo (desactivación lógica)
   */
  async eliminarAdministrativo(req, res, next) {
    try {
      const { id } = req.params;
      await administrativoService.eliminarAdministrativo(id);

      return res.status(200).json({
        success: true,
        message: 'Administrativo eliminado exitosamente'
      });
    } catch (error) {
      logger.error('Error eliminando administrativo:', error);

      if (error.message.includes('No se puede eliminar')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      next(error);
    }
  }
}

module.exports = new AdministrativosController();

