const reportesService = require('../services/reportes.service');
const logger = require('../utils/logger');

class ReportesController {
  /**
   * Crear un nuevo reporte
   */
  async crearReporte(req, res, next) {
    try {
      const reporteData = req.validatedData;
      const userId = req.user.id;

      const reporte = await reportesService.crearReporte(reporteData, userId);

      return res.status(201).json({
        success: true,
        message: 'Reporte creado exitosamente',
        data: reporte
      });
    } catch (error) {
      logger.error('Error creando reporte:', error);
      next(error);
    }
  }

  /**
   * Listar reportes con filtros
   */
  async listarReportes(req, res, next) {
    try {
      const filtros = req.query;
      const opciones = {
        pagina: parseInt(req.query.pagina) || 1,
        limite: parseInt(req.query.limite) || 20,
        ordenarPor: req.query.ordenar_por || 'fecha_generacion',
        orden: req.query.orden || 'DESC'
      };

      const resultado = await reportesService.listarReportes(filtros, opciones);

      return res.status(200).json({
        success: true,
        message: 'Reportes listados exitosamente',
        data: resultado
      });
    } catch (error) {
      logger.error('Error listando reportes:', error);
      next(error);
    }
  }

  /**
   * Obtener reporte por ID
   */
  async obtenerReporte(req, res, next) {
    try {
      const { id } = req.params;
      const reporte = await reportesService.obtenerPorId(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Reporte obtenido exitosamente',
        data: reporte
      });
    } catch (error) {
      logger.error('Error obteniendo reporte:', error);
      next(error);
    }
  }

  /**
   * Generar reporte de citas
   */
  async generarReporteCitas(req, res, next) {
    try {
      const parametros = req.validatedData;
      const userId = req.user.id;

      const resultado = await reportesService.generarReporteCitas(parametros, userId);

      return res.status(201).json({
        success: true,
        message: 'Reporte de citas generado exitosamente',
        data: resultado
      });
    } catch (error) {
      logger.error('Error generando reporte de citas:', error);
      next(error);
    }
  }

  /**
   * Generar reporte de inmuebles
   */
  async generarReporteInmuebles(req, res, next) {
    try {
      const parametros = req.validatedData;
      const userId = req.user.id;

      const resultado = await reportesService.generarReporteInmuebles(parametros, userId);

      return res.status(201).json({
        success: true,
        message: 'Reporte de inmuebles generado exitosamente',
        data: resultado
      });
    } catch (error) {
      logger.error('Error generando reporte de inmuebles:', error);
      next(error);
    }
  }

  /**
   * Actualizar estado del reporte
   */
  async actualizarEstado(req, res, next) {
    try {
      const { id } = req.params;
      const { estado } = req.validatedData;

      const reporte = await reportesService.actualizarEstado(parseInt(id), estado);

      return res.status(200).json({
        success: true,
        message: 'Estado del reporte actualizado exitosamente',
        data: reporte
      });
    } catch (error) {
      logger.error('Error actualizando estado del reporte:', error);
      next(error);
    }
  }

  /**
   * Eliminar reporte
   */
  async eliminarReporte(req, res, next) {
    try {
      const { id } = req.params;

      await reportesService.eliminarReporte(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Reporte eliminado exitosamente'
      });
    } catch (error) {
      logger.error('Error eliminando reporte:', error);
      next(error);
    }
  }

  /**
   * Descargar reporte en formato PDF/Excel
   */
  async descargarReporte(req, res, next) {
    try {
      const { id } = req.params;
      const { formato = 'json' } = req.query;

      const reporte = await reportesService.obtenerPorId(parseInt(id));

      // Aquí se implementaría la lógica para generar PDF o Excel
      // Por ahora devolvemos los datos en JSON
      const datos = JSON.parse(reporte.datos);

      if (formato === 'json') {
        return res.status(200).json({
          success: true,
          message: 'Datos del reporte obtenidos exitosamente',
          data: {
            reporte: {
              titulo: reporte.titulo,
              descripcion: reporte.descripcion,
              fecha_generacion: reporte.fecha_generacion,
              generado_por: reporte.generadoPor
            },
            datos: datos
          }
        });
      } else {
        // Placeholder para otros formatos
        return res.status(400).json({
          success: false,
          message: `Formato ${formato} no implementado aún`
        });
      }
    } catch (error) {
      logger.error('Error descargando reporte:', error);
      next(error);
    }
  }

  /**
   * Obtener estadísticas del dashboard
   */
  async obtenerEstadisticasDashboard(req, res, next) {
    try {
      // Implementar lógica para obtener estadísticas del dashboard
      // Por ahora devolver datos de ejemplo
      const estadisticas = {
        total_reportes: 0,
        reportes_mes_actual: 0,
        reportes_por_tipo: {},
        reportes_por_estado: {}
      };

      return res.status(200).json({
        success: true,
        message: 'Estadísticas del dashboard obtenidas exitosamente',
        data: estadisticas
      });
    } catch (error) {
      logger.error('Error obteniendo estadísticas del dashboard:', error);
      next(error);
    }
  }
}

module.exports = new ReportesController();
