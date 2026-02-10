const reportesInmobiliariosService = require('../services/reportesInmobiliarios.service');
const logger = require('../utils/logger');

class ReportesInmobiliariosController {
  /**
   * Crear un nuevo reporte inmobiliario
   */
  async crearReporte(req, res, next) {
    try {
      const reporteData = req.validatedData;
      const userId = req.user?.id || req.user?.id_persona;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Agregar el ID del usuario que reporta
      reporteData.id_persona_reporta = userId;

      const result = await reportesInmobiliariosService.crearReporte(reporteData, userId);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      logger.error('Error creando reporte inmobiliario:', error);
      next(error);
    }
  }

  /**
   * Listar reportes inmobiliarios con filtros
   */
  async listarReportes(req, res, next) {
    try {
      const filtros = req.query;
      const result = await reportesInmobiliariosService.listarReportes(filtros);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Error listando reportes inmobiliarios:', error);
      next(error);
    }
  }

  /**
   * Obtener reporte inmobiliario por ID
   */
  async obtenerReporte(req, res, next) {
    try {
      const { id } = req.params;
      const result = await reportesInmobiliariosService.obtenerReporte(parseInt(id));

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      logger.error('Error obteniendo reporte inmobiliario:', error);
      next(error);
    }
  }

  /**
   * Actualizar reporte inmobiliario
   */
  async actualizarReporte(req, res, next) {
    try {
      const { id } = req.params;
      const reporteData = req.validatedData;
      const userId = req.user?.id || req.user?.id_persona;

      const result = await reportesInmobiliariosService.actualizarReporte(parseInt(id), reporteData, userId);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Error actualizando reporte inmobiliario:', error);
      next(error);
    }
  }

  /**
   * Eliminar reporte inmobiliario
   */
  async eliminarReporte(req, res, next) {
    try {
      const { id } = req.params;

      await reportesInmobiliariosService.eliminarReporte(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Reporte eliminado exitosamente'
      });
    } catch (error) {
      logger.error('Error eliminando reporte inmobiliario:', error);
      next(error);
    }
  }

  /**
   * Crear seguimiento general
   */
  async crearSeguimientoGeneral(req, res, next) {
    try {
      const { id } = req.params;
      const seguimientoData = req.validatedData;
      const userId = req.user?.id || req.user?.id_persona;

      const result = await reportesInmobiliariosService.crearSeguimientoGeneral(parseInt(id), seguimientoData, userId);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      logger.error('Error creando seguimiento general:', error);
      next(error);
    }
  }

  /**
   * Listar seguimientos generales
   */
  async listarSeguimientosGenerales(req, res, next) {
    try {
      const { id } = req.params;
      const filtros = req.query;

      const result = await reportesInmobiliariosService.listarSeguimientosGenerales(parseInt(id), filtros);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Error listando seguimientos generales:', error);
      next(error);
    }
  }

  /**
   * Actualizar seguimiento general
   */
  async actualizarSeguimientoGeneral(req, res, next) {
    try {
      const { reporteId, seguimientoId } = req.params;
      const seguimientoData = req.validatedData;

      const result = await reportesInmobiliariosService.actualizarSeguimientoGeneral(parseInt(reporteId), parseInt(seguimientoId), seguimientoData);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Error actualizando seguimiento general:', error);
      next(error);
    }
  }

  /**
   * Eliminar seguimiento general
   */
  async eliminarSeguimientoGeneral(req, res, next) {
    try {
      const { reporteId, seguimientoId } = req.params;

      await reportesInmobiliariosService.eliminarSeguimientoGeneral(parseInt(reporteId), parseInt(seguimientoId));

      return res.status(200).json({
        success: true,
        message: 'Seguimiento general eliminado exitosamente'
      });
    } catch (error) {
      logger.error('Error eliminando seguimiento general:', error);
      next(error);
    }
  }

  /**
   * Agregar imagen al reporte
   */
  async agregarImagen(req, res, next) {
    try {
      const { id } = req.params;
      const imagenData = req.validatedData;

      const result = await reportesInmobiliariosService.agregarImagen(parseInt(id), imagenData);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      logger.error('Error agregando imagen:', error);
      next(error);
    }
  }

  /**
   * Eliminar imagen del reporte
   */
  async eliminarImagen(req, res, next) {
    try {
      const { id, imagenId } = req.params;

      await reportesInmobiliariosService.eliminarImagen(parseInt(id), parseInt(imagenId));

      return res.status(200).json({
        success: true,
        message: 'Imagen eliminada exitosamente'
      });
    } catch (error) {
      logger.error('Error eliminando imagen:', error);
      next(error);
    }
  }

  /**
   * Agregar archivo al reporte
   */
  async agregarArchivo(req, res, next) {
    try {
      const { id } = req.params;
      const archivoData = req.validatedData;

      const result = await reportesInmobiliariosService.agregarArchivo(parseInt(id), archivoData);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      logger.error('Error agregando archivo:', error);
      next(error);
    }
  }

  /**
   * Eliminar archivo del reporte
   */
  async eliminarArchivo(req, res, next) {
    try {
      const { id, archivoId } = req.params;

      await reportesInmobiliariosService.eliminarArchivo(parseInt(id), parseInt(archivoId));

      return res.status(200).json({
        success: true,
        message: 'Archivo eliminado exitosamente'
      });
    } catch (error) {
      logger.error('Error eliminando archivo:', error);
      next(error);
    }
  }

  /**
   * Crear rubro
   */
  async crearRubro(req, res, next) {
    try {
      const { id } = req.params;
      const rubroData = req.validatedData;

      const result = await reportesInmobiliariosService.crearRubro(parseInt(id), rubroData);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      logger.error('Error creando rubro:', error);
      next(error);
    }
  }

  /**
   * Listar rubros
   */
  async listarRubros(req, res, next) {
    try {
      const { id } = req.params;

      const result = await reportesInmobiliariosService.listarRubros(parseInt(id));

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Error listando rubros:', error);
      next(error);
    }
  }

  /**
   * Actualizar rubro
   */
  async actualizarRubro(req, res, next) {
    try {
      const { id, rubroId } = req.params;
      const rubroData = req.validatedData;

      const result = await reportesInmobiliariosService.actualizarRubro(parseInt(id), parseInt(rubroId), rubroData);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Error actualizando rubro:', error);
      next(error);
    }
  }

  /**
   * Eliminar rubro
   */
  async eliminarRubro(req, res, next) {
    try {
      const { id, rubroId } = req.params;

      await reportesInmobiliariosService.eliminarRubro(parseInt(id), parseInt(rubroId));

      return res.status(200).json({
        success: true,
        message: 'Rubro eliminado exitosamente'
      });
    } catch (error) {
      logger.error('Error eliminando rubro:', error);
      next(error);
    }
  }

  /**
   * Crear seguimiento de rubro
   */
  async crearSeguimientoRubro(req, res, next) {
    try {
      const { id, rubroId } = req.params;
      const seguimientoData = req.validatedData;
      const userId = req.user?.id || req.user?.id_persona;

      const result = await reportesInmobiliariosService.crearSeguimientoRubro(parseInt(id), parseInt(rubroId), seguimientoData, userId);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      logger.error('Error creando seguimiento de rubro:', error);
      next(error);
    }
  }

  /**
   * Listar seguimientos de rubro
   */
  async listarSeguimientosRubro(req, res, next) {
    try {
      const { id, rubroId } = req.params;
      const filtros = req.query;

      const result = await reportesInmobiliariosService.listarSeguimientosRubro(parseInt(id), parseInt(rubroId), filtros);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Error listando seguimientos de rubro:', error);
      next(error);
    }
  }

  /**
   * Actualizar seguimiento de rubro
   */
  async actualizarSeguimientoRubro(req, res, next) {
    try {
      const { id, rubroId, seguimientoId } = req.params;
      const seguimientoData = req.validatedData;

      const result = await reportesInmobiliariosService.actualizarSeguimientoRubro(parseInt(id), parseInt(rubroId), parseInt(seguimientoId), seguimientoData);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Error actualizando seguimiento de rubro:', error);
      next(error);
    }
  }

  /**
   * Autocomplete de inmuebles
   */
  async autocompleteInmuebles(req, res, next) {
    try {
      const { q, limit } = req.query;

      const result = await reportesInmobiliariosService.buscarInmueblesAutocomplete(q, parseInt(limit) || 10);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error en autocomplete de inmuebles:', error);
      next(error);
    }
  }

  /**
   * Obtener inmueble básico
   */
  async obtenerInmuebleBasico(req, res, next) {
    try {
      const { id } = req.params;

      const result = await reportesInmobiliariosService.obtenerInmuebleBasico(parseInt(id));

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      logger.error('Error obteniendo inmueble básico:', error);
      next(error);
    }
  }

  /**
   * Obtener estadísticas
   */
  async obtenerEstadisticas(req, res, next) {
    try {
      const filtros = req.query;

      const result = await reportesInmobiliariosService.obtenerEstadisticas(filtros);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error);
      next(error);
    }
  }

  /**
   * Exportar reportes
   */
  async exportarReportes(req, res, next) {
    try {
      const filtros = req.query;

      const csvData = await reportesInmobiliariosService.exportarReportes(filtros);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="reportes.csv"');

      return res.status(200).send(csvData);
    } catch (error) {
      logger.error('Error exportando reportes:', error);
      next(error);
    }
  }
}

module.exports = new ReportesInmobiliariosController();
