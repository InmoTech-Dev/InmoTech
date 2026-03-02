const { Reporte, Persona } = require('../models');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const { normalizarFechaCita } = require('../utils/date');

class ReportesService {
  /**
   * Crear un nuevo reporte
   * @param {Object} reporteData - Datos del reporte
   * @param {number} userId - ID del usuario que crea
   * @returns {Promise<Object>} Reporte creado
   */
  async crearReporte(reporteData, userId) {
    const result = await sequelize.transaction(async (t) => {
      try {
        const reporte = await Reporte.create(
          {
            ...reporteData,
            id_persona_reporta: userId,
            estado: 'generado'
          },
          { transaction: t }
        );

        logger.info(`Reporte creado: ${reporte.titulo} por usuario ${userId}`);

        return reporte;
      } catch (error) {
        logger.error('Error creando reporte:', error);
        throw error;
      }
    });

    return result;
  }

  /**
   * Listar reportes con filtros
   * @param {Object} filtros - Filtros de búsqueda
   * @param {Object} opciones - Opciones de paginación
   * @returns {Promise<Object>} Lista paginada de reportes
   */
  async listarReportes(filtros = {}, opciones = {}) {
    try {
      const {
        tipo_reporte,
        estado,
        fecha_desde,
        fecha_hasta,
        id_persona_reporta
      } = filtros;

      const {
        pagina = 1,
        limite = 20,
        ordenarPor = 'fecha_generacion',
        orden = 'DESC'
      } = opciones;

      const offset = (pagina - 1) * limite;

      const whereClause = {};

      if (tipo_reporte) whereClause.tipo_reporte = tipo_reporte;
      if (estado) whereClause.estado = estado;
      if (id_persona_reporta) whereClause.id_responsable = id_persona_reporta;
      if (fecha_desde || fecha_hasta) {
        whereClause.fecha_generacion = {};
        if (fecha_desde) whereClause.fecha_generacion[sequelize.Op.gte] = fecha_desde;
        if (fecha_hasta) whereClause.fecha_generacion[sequelize.Op.lte] = fecha_hasta;
      }

      const { count, rows } = await Reporte.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Persona,
            as: 'reportadoPor',
            attributes: ['id_persona', 'primer_nombre', 'primer_apellido']
          }
        ],
        limit,
        offset,
        order: [[ordenarPor, orden]]
      });

      return {
        reportes: rows,
        paginacion: {
          total: count,
          pagina,
          limite,
          paginas_totales: Math.ceil(count / limite)
        }
      };
    } catch (error) {
      logger.error('Error listando reportes:', error);
      throw error;
    }
  }

  /**
   * Obtener reporte por ID
   * @param {number} reporteId - ID del reporte
   * @returns {Promise<Object>} Reporte encontrado
   */
  async obtenerPorId(reporteId) {
    try {
      const reporte = await Reporte.findOne({
        where: { id_reporte: reporteId },
        include: [
          {
            model: Persona,
            as: 'reportadoPor',
            attributes: ['id_persona', 'primer_nombre', 'primer_apellido', 'correo']
          }
        ]
      });

      if (!reporte) {
        throw new Error('Reporte no encontrado');
      }

      return reporte;
    } catch (error) {
      logger.error('Error obteniendo reporte:', error);
      throw error;
    }
  }

  /**
   * Generar reporte de citas
   * @param {Object} parametros - Parámetros del reporte
   * @param {number} userId - ID del usuario que genera
   * @returns {Promise<Object>} Reporte generado
   */
  async generarReporteCitas(parametros, userId) {
    const result = await sequelize.transaction(async (t) => {
      try {
        const {
          fecha_desde,
          fecha_hasta,
          id_estado_cita,
          id_servicio,
          id_agente
        } = parametros;

        // Construir consulta
        let query = `
          SELECT
            c.id_cita,
            c.fecha_cita,
            c.hora_inicio,
            c.hora_fin,
            ec.nombre_estado as estado_cita,
            sc.nombre_servicio,
            p.primer_nombre + ' ' + p.primer_apellido as cliente,
            p.correo as cliente_correo,
            p.telefono as cliente_telefono,
            i.direccion as inmueble_direccion,
            i.ciudad as inmueble_ciudad,
            ag.primer_nombre + ' ' + ag.primer_apellido as agente,
            c.observaciones,
            c.fecha_creacion
          FROM Citas c
          INNER JOIN Personas p ON c.id_persona = p.id_persona
          INNER JOIN Inmuebles i ON c.id_inmueble = i.id_inmueble
          INNER JOIN Estados_Cita ec ON c.id_estado_cita = ec.id_estado_cita
          INNER JOIN Servicios_Cita sc ON c.id_servicio = sc.id_servicio
          LEFT JOIN Personas ag ON c.id_agente_asignado = ag.id_persona
          WHERE c.fecha_cita BETWEEN :fecha_desde AND :fecha_hasta
        `;

        if (id_estado_cita) query += ` AND c.id_estado_cita = :id_estado_cita`;
        if (id_servicio) query += ` AND c.id_servicio = :id_servicio`;
        if (id_agente) query += ` AND c.id_agente_asignado = :id_agente`;

        query += ' ORDER BY c.fecha_cita, c.hora_inicio';

        const [results] = await sequelize.query(query, {
          replacements: {
            fecha_desde: normalizarFechaCita(fecha_desde),
            fecha_hasta: normalizarFechaCita(fecha_hasta),
            id_estado_cita,
            id_servicio,
            id_agente
          },
          transaction: t
        });

        // Crear reporte
        const reporte = await Reporte.create({
          tipo_reporte: 'citas',
          titulo: `Reporte de Citas (${fecha_desde} - ${fecha_hasta})`,
          descripcion: `Reporte detallado de citas en el período especificado`,
          parametros: JSON.stringify(parametros),
          datos: JSON.stringify(results),
          id_persona_reporta: userId
        }, { transaction: t });

        logger.info(`Reporte de citas generado por usuario ${userId}`);

        return {
          reporte,
          datos: results,
          resumen: {
            total_citas: results.length,
            citas_por_estado: this.contarPorCampo(results, 'estado_cita'),
            citas_por_servicio: this.contarPorCampo(results, 'nombre_servicio')
          }
        };
      } catch (error) {
        logger.error('Error generando reporte de citas:', error);
        throw error;
      }
    });

    return result;
  }

  /**
   * Generar reporte de inmuebles
   * @param {Object} parametros - Parámetros del reporte
   * @param {number} userId - ID del usuario que genera
   * @returns {Promise<Object>} Reporte generado
   */
  async generarReporteInmuebles(parametros, userId) {
    const result = await sequelize.transaction(async (t) => {
      try {
        const {
          ciudad,
          categoria,
          estado = true
        } = parametros;

        let query = `
          SELECT
            i.id_inmueble,
            i.registro_inmobiliario,
            i.direccion,
            i.barrio,
            i.ciudad,
            i.departamento,
            i.categoria,
            i.estado,
            COUNT(c.id_cita) as total_citas,
            MAX(c.fecha_cita) as ultima_cita
          FROM Inmuebles i
          LEFT JOIN Citas c ON i.id_inmueble = c.id_inmueble
          WHERE i.estado = ${estado ? 1 : 0}
        `;

        if (ciudad) query += ` AND i.ciudad = '${ciudad}'`;
        if (categoria) query += ` AND i.categoria = '${categoria}'`;

        query += `
          GROUP BY i.id_inmueble, i.registro_inmobiliario, i.direccion, i.barrio, i.ciudad, i.departamento, i.categoria, i.estado
          ORDER BY i.ciudad, i.direccion
        `;

        const [results] = await sequelize.query(query, { transaction: t });

        // Crear reporte
        const reporte = await Reporte.create({
          tipo_reporte: 'inmuebles',
          titulo: `Reporte de Inmuebles`,
          descripcion: `Reporte detallado de inmuebles disponibles`,
          parametros: JSON.stringify(parametros),
          datos: JSON.stringify(results),
          id_persona_reporta: userId
        }, { transaction: t });

        logger.info(`Reporte de inmuebles generado por usuario ${userId}`);

        return {
          reporte,
          datos: results,
          resumen: {
            total_inmuebles: results.length,
            inmuebles_por_ciudad: this.contarPorCampo(results, 'ciudad'),
            inmuebles_por_categoria: this.contarPorCampo(results, 'categoria')
          }
        };
      } catch (error) {
        logger.error('Error generando reporte de inmuebles:', error);
        throw error;
      }
    });

    return result;
  }

  /**
   * Actualizar estado del reporte
   * @param {number} reporteId - ID del reporte
   * @param {string} estado - Nuevo estado
   * @returns {Promise<Object>} Reporte actualizado
   */
  async actualizarEstado(reporteId, estado) {
    try {
      const reporte = await Reporte.findOne({
        where: { id_reporte: reporteId }
      });

      if (!reporte) {
        throw new Error('Reporte no encontrado');
      }

      await reporte.update({ estado });

      logger.info(`Estado del reporte ${reporteId} actualizado a ${estado}`);

      return reporte;
    } catch (error) {
      logger.error('Error actualizando estado del reporte:', error);
      throw error;
    }
  }

  /**
   * Eliminar reporte
   * @param {number} reporteId - ID del reporte
   * @returns {Promise<boolean>} True si se eliminó
   */
  async eliminarReporte(reporteId) {
    try {
      const reporte = await Reporte.findOne({
        where: { id_reporte: reporteId }
      });

      if (!reporte) {
        throw new Error('Reporte no encontrado');
      }

      await reporte.destroy();

      logger.info(`Reporte eliminado: ${reporteId}`);

      return true;
    } catch (error) {
      logger.error('Error eliminando reporte:', error);
      throw error;
    }
  }

  /**
   * Función auxiliar para contar elementos por campo
   * @param {Array} array - Array de objetos
   * @param {string} campo - Campo a contar
   * @returns {Object} Conteo por campo
   */
  contarPorCampo(array, campo) {
    return array.reduce((acc, item) => {
      const valor = item[campo] || 'Sin especificar';
      acc[valor] = (acc[valor] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = new ReportesService();
