const {
  Inmueble,
  Persona,
  PropiedadInmueble,
  Comodidad,
  InmuebleComodidad,
  InmuebleImagen,
  Lease
} = require('../models');

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const {
  buildDailySlots,
  isBusinessDay,
} = require('../constants/appointmentSchedule');

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

const isTruthyBoolean = (value) => {
  if (value === true) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  return value === 1;
};

const validateDestacadosLimit = async ({ transaction, excludeInmuebleId = null }) => {
  const where = { destacado: true };
  if (excludeInmuebleId) {
    where.id_inmueble = { [Op.ne]: excludeInmuebleId };
  }

  const totalDestacados = await Inmueble.count({
    where,
    transaction
  });

  if (totalDestacados >= MAX_DESTACADOS) {
    const error = new Error(`Solo se pueden destacar ${MAX_DESTACADOS} inmuebles.`);
    error.status = 400;
    throw error;
  }
};

const clearPropietarioActual = async (inmuebleId, transaction) => {
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
};

const countSelectedAmenitiesByInmueble = async (inmuebleId, transaction) => {
  return InmuebleComodidad.count({
    where: {
      id_inmueble: inmuebleId,
      seleccionada: true
    },
    transaction
  });
};

const normalizeEstadoFrontend = (value = '') =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const buildEstadoFrontendCondition = (valor, column = 'Inmuebles.estado_frontend') => {
  if (valor === undefined || valor === null) {
    return null;
  }

  if (typeof valor === 'string' && normalizeEstadoFrontend(valor) === 'todos') {
    return null;
  }

  const normalized = normalizeEstadoFrontend(valor);
  if (!normalized) return null;

  const columnReference = sequelize.col(column);
  return sequelize.where(
    sequelize.fn('LOWER', sequelize.cast(columnReference, 'NVARCHAR(100)')),
    normalized
  );
};

const buildEstadoFrontendExclusionCondition = (values = [], column = 'Inmuebles.estado_frontend') => {
  const normalizedValues = Array.isArray(values)
    ? values
        .map((value) => normalizeEstadoFrontend(value))
        .filter(Boolean)
    : [];

  if (!normalizedValues.length) return null;

  const columnReference = sequelize.col(column);
  return sequelize.where(
    sequelize.fn('LOWER', sequelize.cast(columnReference, 'NVARCHAR(100)')),
    {
      [Op.notIn]: normalizedValues
    }
  );
};

const shouldClearDestacadoByEstadoFrontend = (estadoFrontend) => {
  if (typeof estadoFrontend !== 'string') return false;
  const normalized = estadoFrontend.trim().toLowerCase();
  return normalized === 'vendido' || normalized === 'arrendado';
};

const isEstadoFrontendVendido = (value) => normalizeEstadoFrontend(value) === 'vendido';

const parseOwnerId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getCurrentOwnerIdForInmueble = async (inmuebleId, transaction) => {
  const ownerLink = await PropiedadInmueble.findOne({
    where: {
      id_inmueble: inmuebleId,
      es_propietario_actual: true
    },
    attributes: ['id_persona'],
    transaction
  });

  return parseOwnerId(ownerLink?.id_persona);
};

const validateRegistroReuseRules = async ({
  registroInmobiliario,
  ownerId,
  excludeInmuebleId = null,
  transaction
}) => {
  const registro = typeof registroInmobiliario === 'string'
    ? registroInmobiliario.trim()
    : '';

  if (!registro) return;

  const where = {
    [Op.and]: [
      sequelize.where(
        sequelize.fn('LOWER', sequelize.cast(sequelize.col('registro_inmobiliario'), 'NVARCHAR(100)')),
        registro.toLowerCase()
      )
    ]
  };

  if (excludeInmuebleId) {
    where.id_inmueble = { [Op.ne]: excludeInmuebleId };
  }

  const duplicatedRecords = await Inmueble.findAll({
    where,
    attributes: ['id_inmueble', 'estado_frontend', 'registro_inmobiliario'],
    include: [
      {
        model: PropiedadInmueble,
        as: 'propietarios',
        required: false,
        where: { es_propietario_actual: true },
        attributes: ['id_persona']
      }
    ],
    transaction
  });

  if (!duplicatedRecords.length) return;

  const hasNonSoldRecord = duplicatedRecords.some(
    (record) => !isEstadoFrontendVendido(record.estado_frontend)
  );

  if (hasNonSoldRecord) {
    const error = new Error(
      'El registro inmobiliario ya existe y solo se puede reutilizar cuando el inmueble existente está en estado Vendido.'
    );
    error.status = 400;
    throw error;
  }

  const blockedOwnerIds = new Set();
  duplicatedRecords.forEach((record) => {
    (record.propietarios || []).forEach((ownerLink) => {
      const parsed = parseOwnerId(ownerLink.id_persona);
      if (parsed) blockedOwnerIds.add(parsed);
    });
  });

  const normalizedOwnerId = parseOwnerId(ownerId);
  if (normalizedOwnerId && blockedOwnerIds.has(normalizedOwnerId)) {
    const error = new Error(
      'No es posible asignar este registro al mismo propietario del inmueble vendido.'
    );
    error.status = 400;
    throw error;
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

        if (isTruthyBoolean(payload.destacado)) {
          await validateDestacadosLimit({ transaction: t });
        }

        validateRequiredAmenitiesForCategory({
          categoria: payload.categoria || payload.tipo,
          comodidades
        });

        await validateRegistroReuseRules({
          registroInmobiliario: payload.registro_inmobiliario,
          ownerId,
          transaction: t
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
        tipo,
        operacion,
        estado,
        estado_frontend,
        excluir_estados_frontend,
        destacado,
        propietario_id,
        registro,
        registro_inmobiliario,
        busqueda,
        search
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

      const categoriaFiltro = categoria || tipo;

      if (ciudad) whereClause.ciudad = { [Op.like]: `%${ciudad}%` };
      if (categoriaFiltro && String(categoriaFiltro).toLowerCase() !== 'todos') {
        whereClause.categoria = categoriaFiltro;
      }
      if (operacion && String(operacion).toLowerCase() !== 'todas') {
        whereClause.operacion = operacion;
      }
      const registroFiltro = registro_inmobiliario || registro;
      if (registroFiltro) {
        whereClause.registro_inmobiliario = { [Op.like]: `%${registroFiltro}%` };
      }
      const destacadoFilter = parseBooleanFilter(destacado);
      if (destacadoFilter !== undefined) {
        whereClause.destacado = destacadoFilter;
      }
      if (precio_min || precio_max) {
        whereClause.precio_venta = {};
        if (precio_min) whereClause.precio_venta[Op.gte] = precio_min;
        if (precio_max) whereClause.precio_venta[Op.lte] = precio_max;
      }
      if (area_min) whereClause.area_construida = { [Op.gte]: area_min };

      const searchQuery = String(busqueda || search || '').trim();
      if (searchQuery) {
        const searchTerms = searchQuery.split(/\s+/).filter(Boolean);
        const normalizedAnd = whereClause[Op.and] || [];

        searchTerms.forEach((term) => {
          const likeTerm = `%${term}%`;
          normalizedAnd.push({
            [Op.or]: [
              { direccion: { [Op.like]: likeTerm } },
              { registro_inmobiliario: { [Op.like]: likeTerm } },
              { categoria: { [Op.like]: likeTerm } },
              { titulo: { [Op.like]: likeTerm } },
              { ciudad: { [Op.like]: likeTerm } },
              { barrio: { [Op.like]: likeTerm } },
              { operacion: { [Op.like]: likeTerm } }
            ]
          });
        });

        whereClause[Op.and] = normalizedAnd;
      }

      const propietarioIdFilter = Number.parseInt(propietario_id, 10);
      const hasPropietarioFilter = Number.isInteger(propietarioIdFilter) && propietarioIdFilter > 0;

      const { count, rows } = await Inmueble.findAndCountAll({
        where: whereClause,
        limit: limite,
        offset,
        distinct: true,
        col: 'id_inmueble',
        subQuery: false,
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
      if (!isBusinessDay(fecha)) {
        return {
          inmueble: null,
          fecha,
          horarios_disponibles: []
        };
      }

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

      const horariosDisponibles = buildDailySlots()
        .map((slot) => ({
          hora_inicio: `${slot.hora_inicio}:00`,
          hora_fin: `${slot.hora_fin}:00`,
        }))
        .filter((slot) => {
          const conflicto = citasDelDia.some((cita) => (
            slot.hora_inicio < cita.hora_fin && slot.hora_fin > cita.hora_inicio
          ));

          return !conflicto;
        })
        .map((slot) => ({
          ...slot,
          disponible: true
        }));

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

          const hasRegistroUpdate = Object.prototype.hasOwnProperty.call(payload, 'registro_inmobiliario');
          const hasOwnerUpdate = Boolean(ownerId);

          if (hasRegistroUpdate || hasOwnerUpdate) {
            const targetOwnerId = ownerId || await getCurrentOwnerIdForInmueble(inmuebleId, t);
            const targetRegistro = payload.registro_inmobiliario || inmueble.registro_inmobiliario;

            await validateRegistroReuseRules({
              registroInmobiliario: targetRegistro,
              ownerId: targetOwnerId,
              excludeInmuebleId: inmuebleId,
              transaction: t
            });
          }

          const targetCategory = payload.categoria || payload.tipo || inmueble.categoria;
          const normalizedTargetCategory = normalizeCategory(targetCategory);
          const requiresAmenities = CATEGORIES_WITH_REQUIRED_AMENITIES.has(normalizedTargetCategory);

          if (hasComodidadesInPayload) {
            validateRequiredAmenitiesForCategory({
              categoria: targetCategory,
              comodidades
            });
          } else if (requiresAmenities) {
            const currentAmenitiesCount = await countSelectedAmenitiesByInmueble(inmuebleId, t);
            if (currentAmenitiesCount < 2) {
              const error = new Error('Casa y Apartamento requieren minimo 2 comodidades seleccionadas.');
              error.status = 400;
              throw error;
            }
          }

          if (shouldClearDestacadoByEstadoFrontend(payload.estado_frontend)) {
            payload.destacado = false;
          }

          const hasEstadoFrontendUpdate = Object.prototype.hasOwnProperty.call(payload, 'estado_frontend');
          const hasEstadoBoolUpdate = Object.prototype.hasOwnProperty.call(payload, 'estado');
          const currentEstadoFrontend = normalizeEstadoFrontend(inmueble.estado_frontend);
          const nextEstadoFrontend = normalizeEstadoFrontend(payload.estado_frontend);
          const currentEstadoBool = parseBooleanFilter(inmueble.estado);
          const nextEstadoBool = parseBooleanFilter(payload.estado);

          if (
            currentEstadoFrontend === 'vendido' &&
            (
              (hasEstadoFrontendUpdate && nextEstadoFrontend && nextEstadoFrontend !== 'vendido') ||
              (
                hasEstadoBoolUpdate &&
                currentEstadoBool !== undefined &&
                nextEstadoBool !== undefined &&
                nextEstadoBool !== currentEstadoBool
              )
            )
          ) {
            const error = new Error('El inmueble esta en estado Vendido y ese estado no se puede modificar.');
            error.status = 409;
            throw error;
          }

          if (
            (hasEstadoFrontendUpdate && currentEstadoFrontend === 'arrendado' && nextEstadoFrontend !== 'arrendado') ||
            (hasEstadoBoolUpdate && currentEstadoFrontend === 'arrendado' && isTruthyBoolean(payload.estado))
          ) {
            const today = new Date().toISOString().slice(0, 10);
            const activeLease = await Lease.findOne({
              where: {
                id_inmueble: inmuebleId,
                estado: { [Op.notIn]: ['Finalizado', 'Cancelado'] },
                fecha_finalizacion: { [Op.gte]: today }
              },
              attributes: ['id_arrendamiento'],
              transaction: t
            });

            if (activeLease) {
              const error = new Error(
                'No puedes cambiar el estado del inmueble mientras exista un arrendamiento vigente. Se actualizara automaticamente al finalizar el contrato.'
              );
              error.status = 409;
              throw error;
            }
          }

          const quiereDestacar = isTruthyBoolean(payload.destacado);
          const estabaDestacado = isTruthyBoolean(inmueble.destacado);

          if (quiereDestacar && !estabaDestacado) {
            await validateDestacadosLimit({
              transaction: t,
              excludeInmuebleId: inmuebleId
            });
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
