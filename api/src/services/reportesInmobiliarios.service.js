const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const {
  Reporte,
  Inmueble,
  Persona,
  ReporteImagen,
  ReporteArchivo,
  ReporteRubro,
  RubroSeguimiento,
  ReporteSeguimientoGeneral
} = require('../models');

class ReportesInmobiliariosService {
  // Utilidad para parámetros nombrados
  async query(sql, replacements, options = {}) {
    return sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT, ...options });
  }

  // Crear reporte usando Sequelize
  async crearReporte(data, userId) {
    const t = await sequelize.transaction();
    try {
      const {
        id_inmueble,
        tipo_reporte,
        titulo,
        descripcion,
        prioridad,
        estado = 'Pendiente'
      } = data;

      // Validar inmueble
      const inmueble = await Inmueble.findByPk(id_inmueble, { transaction: t });
      if (!inmueble) throw new Error('El inmueble indicado no existe');

      // Validar persona que reporta (userId del token)
      const reportador = await Persona.findByPk(userId, { transaction: t });
      if (!reportador) throw new Error('La persona que reporta no existe');

      // Crear el reporte en la nueva tabla
      const reporte = await Reporte.create({
        id_inmueble,
        tipo_reporte,
        titulo,
        descripcion,
        prioridad,
        estado,
        id_persona_reporta: userId
      }, { transaction: t });

      await t.commit();

      return {
        success: true,
        data: {
          id_reporte: reporte.id_reporte,
          id_inmueble: reporte.id_inmueble,
          tipo_reporte: reporte.tipo_reporte,
          titulo: reporte.titulo,
          descripcion: reporte.descripcion,
          prioridad: reporte.prioridad,
          estado: reporte.estado,
          id_persona_reporta: reporte.id_persona_reporta,
          fecha_creacion: reporte.fecha_creacion,
          fecha_resolucion: reporte.fecha_resolucion,
          observaciones_resolucion: reporte.observaciones_resolucion
        }
      };
    } catch (err) {
      if (!t.finished) await t.rollback();
      logger.error('Error crearReporte', err);
      throw err;
    }
  }

  // Listar reportes con filtros usando Sequelize
  async listarReportes(params) {
    const {
      estado,
      tipo_reporte,
      id_inmueble,
      pagina = 1,
      limite = 20,
      ordenar_por = 'fecha_creacion',
      orden = 'DESC'
    } = params || {};

    // Normalizar paginación
    const pageNum = Number.isFinite(+pagina) && +pagina > 0 ? +pagina : 1
    const pageSize = Number.isFinite(+limite) && +limite > 0 ? +limite : 20
    const offset = (pageNum - 1) * pageSize

    // Lista blanca de columnas para ORDER BY
    const ORDER_COLUMNS = {
      id_reporte: 'id_reporte',
      fecha_creacion: 'fecha_creacion',
      fecha_modificacion: 'fecha_modificacion',
      estado: 'estado',
      tipo_reporte: 'tipo_reporte'
    }
    const orderBy = ORDER_COLUMNS[ordenar_por] || ORDER_COLUMNS['fecha_creacion']
    const orderDir = String(orden).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    // Construir where clause
    const where = {}
    if (estado) where.estado = estado
    if (tipo_reporte) where.tipo_reporte = tipo_reporte
    if (id_inmueble) where.id_inmueble = id_inmueble

    try {
      // Consulta con JOIN para obtener el propietario real del inmueble
      const { rows: reports, count: total } = await Reporte.findAndCountAll({
        where,
        include: [
          {
            model: Inmueble,
            as: 'inmueble',
            attributes: ['id_inmueble', 'registro_inmobiliario', 'direccion', 'ciudad', 'categoria', 'titulo']
          },
          {
            model: Persona,
            as: 'reportadoPor',
            attributes: ['id_persona', 'nombre_completo', 'apellido_completo', 'correo']
          }
        ],
        order: [[orderBy, orderDir]],
        limit: pageSize,
        offset,
        distinct: true
      });

      // Para cada reporte, obtener el propietario del inmueble via Propiedad_inmueble
      const reportIds = reports.map(r => r.id_inmueble).filter(Boolean);
      let propietariosPorInmueble = {};
      if (reportIds.length > 0) {
        const propietariosRows = await sequelize.query(`
          SELECT pi.id_inmueble, 
                 TRIM(ISNULL(p.nombre_completo, '') + ' ' + ISNULL(p.apellido_completo, '')) AS propietario_nombre
          FROM Propiedad_inmueble pi
          LEFT JOIN Personas p ON p.id_persona = pi.id_persona
          WHERE pi.id_inmueble IN (:ids) AND pi.estado = 'Activo'
        `, { replacements: { ids: reportIds }, type: sequelize.QueryTypes.SELECT });
        propietariosRows.forEach(row => {
          propietariosPorInmueble[row.id_inmueble] = row.propietario_nombre || '';
        });
      }

      const mapped = reports.map(r => ({
        id_reporte: r.id_reporte,
        id_inmueble: r.id_inmueble,
        tipo_reporte: r.tipo_reporte,
        titulo: r.titulo,
        descripcion: r.descripcion,
        prioridad: r.prioridad,
        estado: r.estado,
        fecha_creacion: r.fecha_creacion,
        fecha_resolucion: r.fecha_resolucion,
        observaciones_resolucion: r.observaciones_resolucion,
        inmueble_ciudad: r.inmueble?.ciudad,
        inmueble_categoria: r.inmueble?.categoria,
        inmueble_titulo: r.inmueble?.titulo,
        inmueble_direccion: r.inmueble?.direccion,
        inmueble_referencia: r.inmueble?.registro_inmobiliario,
        // Propietario real del inmueble (no quien creó el reporte)
        propietario_nombre: propietariosPorInmueble[r.id_inmueble] || '',
        reporta_nombre: r.reportadoPor?.nombre_completo
      }));

      return { success: true, data: mapped, paginacion: { total, pagina: pageNum, limite: pageSize, paginas_totales: Math.ceil(total / pageSize) } };
    } catch (err) {
      logger.error('Error en listarReportes', err);
      throw err;
    }
  }

  // Obtener reporte por ID usando Sequelize
  async obtenerReporte(id) {
    try {
      const reporte = await Reporte.findByPk(id, {
        include: [
          {
            model: Inmueble,
            as: 'inmueble',
            attributes: ['id_inmueble', 'registro_inmobiliario', 'direccion', 'ciudad', 'categoria', 'titulo']
          },
          {
            model: Persona,
            as: 'reportadoPor',
            attributes: ['id_persona', 'nombre_completo', 'apellido_completo', 'correo']
          },
          {
            model: ReporteImagen,
            as: 'imagenes',
            attributes: ['id_imagen', 'url', 'fecha_creacion']
          },
          {
            model: ReporteArchivo,
            as: 'archivos',
            attributes: ['id_archivo', 'nombre', 'url', 'fecha_creacion']
          },
          {
            model: ReporteRubro,
            as: 'rubros',
            attributes: ['id_rubro', 'nombre', 'descripcion', 'estado', 'progreso', 'fecha_creacion'],
            include: [
              {
                model: RubroSeguimiento,
                as: 'seguimientos',
                attributes: ['id_seguimiento_rubro', 'id_persona', 'descripcion', 'estado', 'fecha_creacion'],
                include: [
                  {
                    model: Persona,
                    as: 'responsable',
                    attributes: ['id_persona', 'nombre_completo', 'apellido_completo']
                  }
                ]
              }
            ]
          },
          {
            model: ReporteSeguimientoGeneral,
            as: 'seguimientosGenerales',
            attributes: ['id_seguimiento', 'id_persona', 'descripcion', 'estado', 'fecha_creacion'],
            include: [
              {
                model: Persona,
                as: 'responsable',
                attributes: ['id_persona', 'nombre_completo', 'apellido_completo']
              }
            ]
          }
        ]
      });

      if (!reporte) throw new Error('Reporte no encontrado');

      return { success: true, data: reporte };
    } catch (err) {
      logger.error('Error obtenerReporte', err);
      throw err;
    }
  }

  // Actualizar reporte usando Sequelize
  async actualizarReporte(id, data, userId) {
    const {
      estado,
      descripcion,
      id_responsable,
      seguimiento_general
    } = data;

    const updateData = {};
    if (estado) updateData.estado = estado;
    if (descripcion) updateData.descripcion = descripcion;
    if (typeof id_responsable === 'number') updateData.id_responsable = id_responsable;
    if (typeof seguimiento_general === 'string') updateData.seguimiento_general = seguimiento_general;
    updateData.fecha_modificacion = new Date();

    if (Object.keys(updateData).length === 0) {
      return await this.obtenerReporte(id);
    }

    await Reporte.update(updateData, { where: { id_reporte: id } });
    logger.info(`Reporte ${id} actualizado por usuario ${userId}`);

    return await this.obtenerReporte(id);
  }

  // Eliminar reporte usando Sequelize
  async eliminarReporte(id) {
    const reporte = await Reporte.findByPk(id);
    if (!reporte) {
      throw new Error('Reporte no encontrado');
    }
    await reporte.destroy();
    return true;
  }

  // Seguimiento general usando Sequelize
  async crearSeguimientoGeneral(id_reporte, data, userId) {
    const { descripcion, estado = 'Pendiente' } = data;
    const seguimiento = await ReporteSeguimientoGeneral.create({
      id_reporte,
      id_persona: userId,
      descripcion,
      estado,
      fecha_creacion: new Date()
    });
    return { success: true, data: seguimiento };
  }

  async listarSeguimientosGenerales(id_reporte, filtros = {}) {
    const { estado } = filtros;
    const where = { id_reporte };
    if (estado) where.estado = estado;

    const seguimientos = await ReporteSeguimientoGeneral.findAll({
      where,
      include: [{ model: Persona, as: 'responsable', attributes: ['id_persona', 'nombre_completo', 'apellido_completo'] }],
      order: [['fecha_creacion', 'DESC']]
    });

    return { success: true, data: seguimientos };
  }

  async actualizarSeguimientoGeneral(reporteId, seguimientoId, data) {
    const { estado } = data;
    await ReporteSeguimientoGeneral.update(
      { estado },
      { where: { id_seguimiento: seguimientoId, id_reporte: reporteId } }
    );

    const seguimiento = await ReporteSeguimientoGeneral.findByPk(seguimientoId, {
      include: [{ model: Persona, as: 'responsable', attributes: ['id_persona', 'nombre_completo', 'apellido_completo'] }]
    });

    return { success: true, data: seguimiento };
  }

  async eliminarSeguimientoGeneral(reporteId, seguimientoId) {
    const seguimiento = await ReporteSeguimientoGeneral.findOne({
      where: { id_seguimiento: seguimientoId, id_reporte: reporteId }
    });
    if (!seguimiento) throw new Error('Seguimiento general no encontrado');
    await seguimiento.destroy();
    return true;
  }

  // Imágenes usando Sequelize
  async agregarImagen(id_reporte, data) {
    const { url } = data;
    const imagen = await ReporteImagen.create({ id_reporte, url });
    return { success: true, data: imagen };
  }

  async eliminarImagen(id_reporte, imagenId) {
    await ReporteImagen.destroy({ where: { id_imagen: imagenId, id_reporte } });
    return true;
  }

  // Archivos usando Sequelize
  async agregarArchivo(id_reporte, data) {
    const { nombre, url } = data;
    const archivo = await ReporteArchivo.create({ id_reporte, nombre, url });
    return { success: true, data: archivo };
  }

  async eliminarArchivo(id_reporte, archivoId) {
    await ReporteArchivo.destroy({ where: { id_archivo: archivoId, id_reporte } });
    return true;
  }

  // Rubros usando Sequelize
  async crearRubro(id_reporte, data) {
    const { nombre, descripcion, estado = 'Pendiente', progreso = null } = data;
    const rubro = await ReporteRubro.create({ id_reporte, nombre, descripcion, estado, progreso });
    return { success: true, data: rubro };
  }

  async listarRubros(id_reporte) {
    const rubros = await ReporteRubro.findAll({ where: { id_reporte } });
    return { success: true, data: rubros };
  }

  async actualizarRubro(id_reporte, rubroId, data) {
    const { nombre, descripcion, estado, progreso } = data;
    await ReporteRubro.update(
      { nombre, descripcion, estado, progreso },
      { where: { id_rubro: rubroId, id_reporte } }
    );
    const rubro = await ReporteRubro.findByPk(rubroId);
    return { success: true, data: rubro };
  }

  async eliminarRubro(id_reporte, rubroId) {
    await ReporteRubro.destroy({ where: { id_rubro: rubroId, id_reporte } });
    return true;
  }

  // Seguimiento por rubro usando Sequelize
  async crearSeguimientoRubro(id_reporte, rubroId, data, userId) {
    const { descripcion, estado } = data;
    const seguimiento = await RubroSeguimiento.create({
      id_rubro: rubroId,
      id_persona: userId,
      descripcion,
      estado,
      fecha_creacion: new Date()
    });
    return { success: true, data: seguimiento };
  }

  async listarSeguimientosRubro(id_reporte, rubroId, filtros = {}) {
    const { estado } = filtros;
    const where = { id_rubro: rubroId };
    if (estado) where.estado = estado;

    const seguimientos = await RubroSeguimiento.findAll({
      where,
      include: [{ model: Persona, as: 'responsable', attributes: ['id_persona', 'nombre_completo', 'apellido_completo'] }],
      order: [['fecha_creacion', 'DESC']]
    });
    return { success: true, data: seguimientos };
  }

  async actualizarSeguimientoRubro(id_reporte, rubroId, seguimientoId, data) {
    const { estado, descripcion } = data;
    await RubroSeguimiento.update(
      { estado, descripcion },
      { where: { id_seguimiento_rubro: seguimientoId, id_rubro: rubroId } }
    );
    const seguimiento = await RubroSeguimiento.findByPk(seguimientoId, {
      include: [{ model: Persona, as: 'responsable', attributes: ['id_persona', 'nombre_completo', 'apellido_completo'] }]
    });
    return { success: true, data: seguimiento };
  }

  // Estadísticas: conteos básicos por estado y tipo
  async obtenerEstadisticas(filtros = {}) {
    const estado = await this.query(`
      SELECT estado, COUNT(*) AS cantidad FROM Reportes GROUP BY estado
    `, {});
    const tipos = await this.query(`
      SELECT tipo_reporte, COUNT(*) AS cantidad FROM Reportes GROUP BY tipo_reporte
    `, {});
    return { success: true, data: { por_estado: estado, por_tipo: tipos } };
  }

  // Exportación: CSV sencillo con columnas clave
  async exportarReportes(filtros = {}) {
    const rows = await this.query(`
      SELECT r.id_reporte, r.tipo_reporte, r.estado, r.fecha_creacion, i.ciudad, i.direccion, r.descripcion
      FROM Reportes r
      LEFT JOIN Inmuebles i ON i.id_inmueble = r.id_inmueble
      ORDER BY r.fecha_creacion DESC
    `, {});
    const header = 'id_reporte,tipo_reporte,estado,fecha_creacion,ciudad,direccion,descripcion';
    const csvRows = rows.map(r =>
      [r.id_reporte, r.tipo_reporte, r.estado, r.fecha_creacion?.toISOString?.() || r.fecha_creacion, r.ciudad, r.direccion, (r.descripcion || '').replace(/\r?\n/g, ' ')].join(',')
    );
    return [header, ...csvRows].join('\n');
  }

  // Buscar inmuebles (autocompletado) usando SQL Server
  async buscarInmueblesAutocomplete(q, limit = 10) {
    const term = (q || '').toString().trim();
    const safeLimit = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    const pattern = `%${term}%`;
    const where = term ? `
        WHERE (
          i.registro_inmobiliario LIKE :pattern
          OR i.direccion LIKE :pattern
        )
      ` : '';

    const [rows] = await sequelize.query(`
        SELECT TOP (${safeLimit})
          i.id_inmueble,
          i.registro_inmobiliario,
          i.direccion,
          i.ciudad,
          i.categoria,
          COALESCE(p.nombre_completo, '') AS propietario
        FROM Inmuebles i
        LEFT JOIN Propiedad_inmueble pi
          ON pi.id_inmueble = i.id_inmueble
          AND pi.estado = 'Activo'
        LEFT JOIN Personas p
          ON p.id_persona = pi.id_persona
        ${where}
        ORDER BY i.registro_inmobiliario
      `, term ? { replacements: { pattern } } : undefined);

    return rows.map(r => ({
      id_inmueble: r.id_inmueble,
      referencia: r.registro_inmobiliario,
      nombre: r.titulo || r.direccion,
      direccion: r.direccion,
      ciudad: r.ciudad,
      categoria: r.categoria,
      propietario: r.propietario || ''
    }));
  }

  // Crear inmueble básico y (opcional) asociar propietario actual
  async crearInmuebleBasico(data, userId) {
    const t = await sequelize.transaction();
    try {
      const {
        registro_inmobiliario,
        pais,
        departamento,
        ciudad,
        direccion,
        barrio = null,
        categoria = null,
        precio_venta = null,
        precio_arriendo = null,
        area_construida = null,
        area_terreno = null,
        descripcion = null,
        estado = 'Disponible',
        id_persona_propietario
      } = data;

      const [row] = await sequelize.query(`
            INSERT INTO Inmuebles (
              registro_inmobiliario, pais, departamento, ciudad, barrio, direccion,
              categoria, precio_venta, precio_arriendo, area_construida, area_terreno,
              descripcion, estado
            )
            VALUES (
              :registro_inmobiliario, :pais, :departamento, :ciudad, :barrio, :direccion,
              :categoria, :precio_venta, :precio_arriendo, :area_construida, :area_terreno,
              :descripcion, :estado
            );
            SELECT SCOPE_IDENTITY() AS id_inmueble;
          `, {
        transaction: t,
        replacements: {
          registro_inmobiliario, pais, departamento, ciudad, barrio, direccion,
          categoria, precio_venta, precio_arriendo, area_construida, area_terreno,
          descripcion, estado
        }
      });

      const id_inmueble = row[0]?.id_inmueble || row?.id_inmueble;

      if (id_persona_propietario) {
        await sequelize.query(`
              INSERT INTO Propiedad_inmueble (id_inmueble, id_persona, fecha_inicio, fecha_final, estado)
              VALUES (:id_inmueble, :id_persona_propietario, CONVERT(date, GETDATE()), NULL, 'Activo')
            `, {
          transaction: t,
          replacements: { id_inmueble, id_persona_propietario }
        });
      }

      await t.commit();

      const [inmueble] = await sequelize.query(`
            SELECT 
              i.id_inmueble, i.registro_inmobiliario, i.pais, i.departamento, i.ciudad, i.barrio, i.direccion,
              i.categoria, i.precio_venta, i.precio_arriendo, i.area_construida, i.area_terreno,
              i.descripcion, i.estado, i.fecha_registro
            FROM Inmuebles i
            WHERE i.id_inmueble = :id_inmueble
          `, { replacements: { id_inmueble } });

      return { success: true, data: (Array.isArray(inmueble) ? inmueble[0] : inmueble) };
    } catch (err) {
      await t.rollback();
      if (err?.original?.number === 2601 || err?.original?.number === 2627) {
        return { success: false, message: 'El registro inmobiliario ya existe' };
      }
      logger.error('Error crearInmuebleBasico', err);
      throw err;
    }
  }

  // Obtener datos básicos de un inmueble
  async obtenerInmuebleBasico(id_inmueble) {
    const [rows] = await sequelize.query(`
        SELECT 
          i.id_inmueble,
          i.registro_inmobiliario,
          i.direccion,
          i.barrio,
          i.ciudad,
          i.departamento,
          i.categoria,
          i.estado
        FROM Inmuebles i
        WHERE i.id_inmueble = :id
      `, { replacements: { id: id_inmueble } });
    if (!rows || rows.length === 0) {
      return { success: false, message: 'Inmueble no encontrado' };
    }
    return { success: true, data: rows[0] };
  }
}

module.exports = new ReportesInmobiliariosService();
