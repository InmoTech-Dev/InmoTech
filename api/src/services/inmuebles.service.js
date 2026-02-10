const {
  Inmueble,
  Persona,
  PropiedadInmueble,
  Comodidad,
  InmuebleComodidad,
  InmuebleImagen
} = require('../models');

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const VALID_ORDER_COLUMNS = [
  'id_inmueble',
  'registro_inmobiliario',
  'ciudad',
  'categoria',
  'precio_venta',
  'precio_arriendo'
];

const buildEstadoCondition = (valor, column = 'Inmuebles.estado') => {
  if (valor === undefined || valor === null) {
    return null;
  }

  if (typeof valor === 'string' && valor.trim().toLowerCase() === 'todos') {
    return null;
  }

  const normalized = typeof valor === 'string'
    ? valor.trim().toLowerCase()
    : valor;

  const isActivo = normalized === true ||
    normalized === 1 ||
    normalized === '1' ||
    normalized === 'true' ||
    normalized === 'disponible' ||
    normalized === 'activo';

  const isInactivo = normalized === false ||
    normalized === 0 ||
    normalized === '0' ||
    normalized === 'false' ||
    normalized === 'no disponible' ||
    normalized === 'inactivo';

  if (!isActivo && !isInactivo) {
    return null;
  }

  const expectedValues = isActivo
    ? ['1', 'true', 'disponible', 'activo']
    : ['0', 'false', 'no disponible', 'inactivo'];

  const columnReference = sequelize.col(column);

  return sequelize.where(
    sequelize.fn(
      'LOWER',
      sequelize.cast(columnReference, 'NVARCHAR(20)')
    ),
    {
      [Op.in]: expectedValues
    }
  );
};

const normalizeAmenityPayload = (comodidades = []) =>
  Array.isArray(comodidades)
    ? comodidades
        .map((amenidad) => {
          if (!amenidad || (!amenidad.nombre && !amenidad.id_comodidad)) {
            return null;
          }
          return {
            id_comodidad: amenidad.id_comodidad,
            nombre: (amenidad.nombre || '').trim(),
            cantidad: amenidad.cantidad ?? 1,
            seleccionada: amenidad.seleccionada ?? true,
            custom: amenidad.custom ?? false
          };
        })
        .filter((item) => item && item.nombre.length > 0)
    : [];

const mapComodidadesFromInstance = (comodidades = []) =>
  comodidades.map((comodidad) => ({
    id_comodidad: comodidad.id_comodidad,
    nombre: comodidad.nombre,
    descripcion: comodidad.descripcion,
    cantidad: (comodidad.InmuebleComodidad || comodidad.Inmueble_Comodidades)?.cantidad ?? 1,
    seleccionada: (comodidad.InmuebleComodidad || comodidad.Inmueble_Comodidades)?.seleccionada ?? true,
    custom: comodidad.es_personalizada ?? false
  }));

const mapInmuebleResponse = (inmueble) => {
  if (!inmueble) return null;
  const plain = typeof inmueble.get === 'function' ? inmueble.get({ plain: true }) : inmueble;

  if (plain.comodidades) {
    plain.comodidades = mapComodidadesFromInstance(plain.comodidades);
  }

  if (plain.propietarios) {
    plain.propietarios = plain.propietarios.map((owner) => {
      const persona = owner.propietario || owner;
      return {
        id_persona: persona.id_persona,
        nombre_completo: persona.nombre_completo,
        apellido_completo: persona.apellido_completo,
        correo: persona.correo,
        telefono: persona.telefono,
        documento: persona.tipo_documento
          ? `${persona.tipo_documento} ${persona.numero_documento || ''}`.trim()
          : persona.numero_documento
      };
    });
  }

  if (plain.imagenes) {
    plain.imagenes = plain.imagenes
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map((img) => img.ruta_archivo || img.url || img.secure_url)
      .filter(Boolean);
  }

  return plain;
};

const resolveOwnerIdFromPayload = (payload = {}) => {
  return (
    payload.propietario_id ||
    payload.propietarioId ||
    payload.propietario?.id ||
    payload.propietario?.id_persona ||
    payload.propietario?.idPersona ||
    null
  );
};

const syncPropietario = async (inmuebleId, propietarioId, transaction) => {
  if (!propietarioId) return;

  await PropiedadInmueble.update(
    {
      estado: 'Inactivo',
      es_propietario_actual: false,
      fecha_final: new Date()
    },
    {
      where: { id_inmueble: inmuebleId, es_propietario_actual: true },
      transaction
    }
  );

  const existing = await PropiedadInmueble.findOne({
    where: { id_inmueble: inmuebleId, id_persona: propietarioId },
    transaction
  });

  if (existing) {
    await existing.update(
      {
        estado: 'Activo',
        es_propietario_actual: true,
        fecha_final: null
      },
      { transaction }
    );
  } else {
    await PropiedadInmueble.create(
      {
        id_inmueble: inmuebleId,
        id_persona: propietarioId,
        fecha_inicio: new Date(),
        estado: 'Activo',
        es_propietario_actual: true,
        porcentaje_propiedad: 100
      },
      { transaction }
    );
  }
};

const syncComodidades = async (inmuebleId, comodidades = [], transaction) => {
  const amenities = normalizeAmenityPayload(comodidades);
  await InmuebleComodidad.destroy({
    where: { id_inmueble: inmuebleId },
    transaction
  });

  for (const amenidad of amenities) {
    const [comodidadRecord] = await Comodidad.findOrCreate({
      where: { nombre: amenidad.nombre },
      defaults: {
        descripcion: amenidad.descripcion || null,
        tipo_inmueble: amenidad.tipo_inmueble || null,
        estado: true,
        es_personalizada: amenidad.custom ?? false
      },
      transaction
    });

    await InmuebleComodidad.create(
      {
        id_inmueble: inmuebleId,
        id_comodidad: comodidadRecord.id_comodidad,
        cantidad: amenidad.cantidad ?? 1,
        seleccionada: amenidad.seleccionada ?? true
      },
      { transaction }
    );
  }
};

const syncImagenes = async (inmuebleId, imagenes = [], transaction) => {
  if (!Array.isArray(imagenes)) return;

  await InmuebleImagen.destroy({
    where: { id_inmueble: inmuebleId },
    transaction
  });

  const prepared = imagenes
    .map((src, index) => {
      if (!src) return null;
      return {
        id_inmueble: inmuebleId,
        ruta_archivo: src,
        nombre_archivo: src.split('/').pop() || `inmueble-${inmuebleId}-${index + 1}`,
        es_principal: index === 0,
        orden: index,
        titulo: null,
        descripcion: null
      };
    })
    .filter(Boolean);

  if (prepared.length) {
    await InmuebleImagen.bulkCreate(prepared, { transaction });
  }
};

class InmueblesService {
  /**
   * Crear un nuevo inmueble
   * @param {Object} inmuebleData - Datos del inmueble
   * @param {number} userId - ID del usuario que crea
   * @returns {Promise<Object>} Inmueble creado
   */
  async crearInmueble(inmuebleData, userId) {
    const result = await sequelize.transaction(async (t) => {
      try {
        const {
          comodidades,
          propietario,
          propietario_id,
          propietarioId,
          imagenes,
          ...payload
        } = inmuebleData;
        const ownerId = resolveOwnerIdFromPayload({
          propietario,
          propietario_id,
          propietarioId
        });

        // Crear inmueble
        const inmueble = await Inmueble.create({
          ...payload,
          estado: payload.estado ?? true
        }, { transaction: t });

        await syncPropietario(inmueble.id_inmueble, ownerId, t);
        await syncComodidades(inmueble.id_inmueble, comodidades, t);
        await syncImagenes(inmueble.id_inmueble, imagenes, t);

        // Si el usuario no es propietario, asignar rol de propietario
        const persona = await Persona.findByPk(userId, { transaction: t });
        if (persona && !persona.tiene_cuenta) {
          // Aquí podríamos actualizar el rol, pero por simplicidad asumimos que se maneja en otro lugar
        }

        logger.info(`Inmueble creado: ${inmueble.registro_inmobiliario} por usuario ${userId}`);

        return await this.obtenerPorId(inmueble.id_inmueble, t);
      } catch (error) {
        logger.error('Error creando inmueble:', error);
        throw error;
      }
    });

    return result;
  }

  /**
   * Listar inmuebles con filtros
   * @param {Object} filtros - Filtros de búsqueda
   * @param {Object} opciones - Opciones de paginación
   * @returns {Promise<Object>} Lista paginada de inmuebles
   */
  async listarInmuebles(filtros = {}, opciones = {}) {
    try {
      const {
        ciudad,
        precio_min,
        precio_max,
        area_min,
        categoria,
        estado
      } = filtros;

      const {
        pagina = 1,
        limite = 20,
        ordenarPor = 'id_inmueble',
        orden = 'DESC'
      } = opciones;

      const orderColumn = VALID_ORDER_COLUMNS.includes(ordenarPor)
        ? ordenarPor
        : 'id_inmueble';

      const offset = (pagina - 1) * limite;

      const whereClause = {};
      const estadoCondition = buildEstadoCondition(estado, 'Inmuebles.estado');
      if (estadoCondition) {
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push(estadoCondition);
      }

      if (ciudad) whereClause.ciudad = { [Op.iLike]: `%${ciudad}%` };
      if (categoria) whereClause.categoria = categoria;
      if (precio_min || precio_max) {
        whereClause.precio_venta = {};
        if (precio_min) whereClause.precio_venta[Op.gte] = precio_min;
        if (precio_max) whereClause.precio_venta[Op.lte] = precio_max;
      }
      if (area_min) whereClause.area_construida = { [Op.gte]: area_min };

      const { count, rows } = await Inmueble.findAndCountAll({
        where: whereClause,
        limit: limite,
        offset,
        order: [[orderColumn, orden]],
        include: [
          {
            model: PropiedadInmueble,
            as: 'propietarios',
            required: false,
            where: { es_propietario_actual: true },
            attributes: [
              'id_propiedad_inmueble',
              'fecha_inicio',
              'fecha_final',
              'estado',
              'porcentaje_propiedad',
              'es_propietario_actual'
            ],
            include: [
              {
                model: Persona,
                as: 'propietario',
                attributes: [
                  'id_persona',
                  'nombre_completo',
                  'apellido_completo',
                  'correo',
                  'telefono',
                  'tipo_documento',
                  'numero_documento'
                ]
              }
            ]
          },
          {
            model: Comodidad,
            as: 'comodidades',
            attributes: ['id_comodidad', 'nombre', 'descripcion', 'es_personalizada'],
            through: {
              model: InmuebleComodidad,
              attributes: ['cantidad', 'seleccionada']
            }
          },
          {
            model: InmuebleImagen,
            as: 'imagenes',
            attributes: ['id_imagen', 'ruta_archivo', 'nombre_archivo', 'es_principal', 'orden']
          }
        ]
      });

      return {
        inmuebles: rows.map(mapInmuebleResponse),
        paginacion: {
          total: count,
          pagina,
          limite,
          paginas_totales: Math.ceil(count / limite)
        }
      };
    } catch (error) {
      logger.error('Error listando inmuebles:', error);
      throw error;
    }
  }

  /**
   * Obtener inmueble por ID
   * @param {number} inmuebleId - ID del inmueble
   * @returns {Promise<Object>} Inmueble encontrado
   */
  async obtenerPorId(inmuebleId, transaction = null) {
    try {
      const inmueble = await Inmueble.findOne({
        where: { id_inmueble: inmuebleId },
        transaction,
        include: [
          {
            model: PropiedadInmueble,
            as: 'propietarios',
            required: false,
            where: { es_propietario_actual: true },
            attributes: [
              'id_propiedad_inmueble',
              'fecha_inicio',
              'fecha_final',
              'estado',
              'porcentaje_propiedad',
              'es_propietario_actual'
            ],
            include: [
              {
                model: Persona,
                as: 'propietario',
                attributes: [
                  'id_persona',
                  'nombre_completo',
                  'apellido_completo',
                  'correo',
                  'telefono',
                  'tipo_documento',
                  'numero_documento'
                ]
              }
            ]
          },
          {
            model: Comodidad,
            as: 'comodidades',
            attributes: ['id_comodidad', 'nombre', 'descripcion', 'es_personalizada'],
            through: {
              model: InmuebleComodidad,
              attributes: ['cantidad', 'seleccionada']
            }
          },
          {
            model: InmuebleImagen,
            as: 'imagenes',
            attributes: ['id_imagen', 'ruta_archivo', 'nombre_archivo', 'es_principal', 'orden']
          }
        ]
      });

      if (!inmueble) {
        throw new Error('Inmueble no encontrado');
      }

      return mapInmuebleResponse(inmueble);
    } catch (error) {
      logger.error('Error obteniendo inmueble:', error);
      throw error;
    }
  }

  /**
   * Obtener disponibilidad horaria de un inmueble
   * @param {number} inmuebleId - ID del inmueble
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   * @returns {Promise<Object>} Horarios disponibles
   */
  async obtenerDisponibilidad(inmuebleId, fecha) {
    try {
      // Verificar que el inmueble existe
      const inmueble = await this.obtenerPorId(inmuebleId);

      // Obtener citas del día
      const { Cita, ServicioCita } = require('../models');
      const citasDelDia = await Cita.findAll({
        where: {
          id_inmueble: inmuebleId,
          fecha_cita: fecha,
          id_estado_cita: { [Op.in]: [1, 2, 3] } // Solicitada, Confirmada, Programada
        },
        include: [
          {
            model: ServicioCita,
            as: 'servicio',
            attributes: ['duracion_estimada']
          }
        ]
      });

      // Horarios de trabajo (ejemplo: 8:00 - 18:00)
      const horaInicio = 8;
      const horaFin = 18;
      const intervalo = 30; // minutos

      const horariosDisponibles = [];
      let horaActual = horaInicio;

      while (horaActual < horaFin) {
        const horaInicioSlot = `${horaActual.toString().padStart(2, '0')}:00:00`;
        const horaFinSlot = `${(horaActual + intervalo / 60).toString().padStart(2, '0')}:00:00`;

        // Verificar si hay conflicto con citas existentes
        const conflicto = citasDelDia.some(cita => {
          const citaInicio = cita.hora_inicio;
          const citaFin = cita.hora_fin;
          return (horaInicioSlot < citaFin && horaFinSlot > citaInicio);
        });

        if (!conflicto) {
          horariosDisponibles.push({
            hora_inicio: horaInicioSlot,
            hora_fin: horaFinSlot,
            disponible: true
          });
        }

        horaActual += intervalo / 60;
      }

      return {
        inmueble: {
          id_inmueble: inmueble.id_inmueble,
          registro_inmobiliario: inmueble.registro_inmobiliario,
          direccion: inmueble.direccion
        },
        fecha,
        horarios_disponibles: horariosDisponibles
      };
    } catch (error) {
      logger.error('Error obteniendo disponibilidad:', error);
      throw error;
    }
  }

  /**
   * Actualizar inmueble
   * @param {number} inmuebleId - ID del inmueble
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Inmueble actualizado
   */
  async actualizarInmueble(inmuebleId, updateData) {
    const result = await sequelize.transaction(async (t) => {
      try {
        const {
          comodidades,
          propietario,
          propietario_id,
          propietarioId,
          imagenes,
          ...payload
        } = updateData;
        const ownerId = resolveOwnerIdFromPayload({
          propietario,
          propietario_id,
          propietarioId
        });

        const inmueble = await Inmueble.findOne({
          where: { id_inmueble: inmuebleId },
          transaction: t
        });

        if (!inmueble) {
          throw new Error('Inmueble no encontrado');
        }

        await inmueble.update(payload, { transaction: t });
        await syncPropietario(inmuebleId, ownerId, t);
        await syncComodidades(inmuebleId, comodidades, t);
        await syncImagenes(inmuebleId, imagenes, t);

        logger.info(`Inmueble actualizado: ${inmuebleId}`);

        return await this.obtenerPorId(inmuebleId, t);
      } catch (error) {
        logger.error('Error actualizando inmueble:', error);
        throw error;
      }
    });

    return result;
  }

  /**
   * Eliminar inmueble (lógicamente)
   * @param {number} inmuebleId - ID del inmueble
   * @returns {Promise<boolean>} True si se eliminó
   */
  async eliminarInmueble(inmuebleId) {
    const result = await sequelize.transaction(async (t) => {
      try {
        const inmueble = await Inmueble.findOne({
          where: { id_inmueble: inmuebleId },
          transaction: t
        });

        if (!inmueble) {
          throw new Error('Inmueble no encontrado');
        }

        await inmueble.update({ estado: false }, { transaction: t });

        logger.info(`Inmueble eliminado: ${inmuebleId}`);

        return true;
      } catch (error) {
        logger.error('Error eliminando inmueble:', error);
        throw error;
      }
    });

    return result;
  }
}

module.exports = new InmueblesService();
