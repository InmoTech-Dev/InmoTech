const { Buyer, Persona, Sale, Inmueble } = require('../models');
const { sequelize } = require('../config/database');
const { Sequelize, Op } = require('sequelize');
const logger = require('../utils/logger');
const { buildPaginationMeta } = require('../utils/pagination');

const PERSONA_ATTRS = [
  'id_persona',
  'nombre_completo',
  'apellido_completo',
  'tipo_documento',
  'numero_documento',
  'correo',
  'telefono',
  'fecha_registro',
  'estado'
];

const BUYER_ATTRS = [
  'id_comprador',
  'id_persona',
  'registro_comprador',
  'fecha_registro_comprador',
  'tipo_comprador',
  'ciudad_residencia',
  'direccion_anterior',
  'estado',
  'observaciones',
  'fecha_creacion',
  'fecha_actualizacion'
];

class BuyerService {
  async generateBuyerCode(transaction) {
    const total = await Buyer.count({ transaction });
    // Intento secuencial primero
    const baseNumber = total + 1;
    let attempt = 0;

    while (attempt < 5) {
      const code = `COMP-${String(baseNumber + attempt).padStart(4, '0')}`;
      const exists = await Buyer.findOne({
        where: { registro_comprador: code },
        transaction
      });
      if (!exists) return code;
      attempt += 1;
    }

    // Fallback: usar marca de tiempo + aleatorio para garantizar unicidad
    const ts = Date.now().toString().slice(-6);
    const rand = String(Math.floor(Math.random() * 90) + 10);
    return `COMP-${ts}${rand}`;
  }

  personaQuery(where = {}) {
    return {
      where,
      attributes: PERSONA_ATTRS,
      include: [
        {
          association: 'buyer',
          attributes: BUYER_ATTRS,
          required: false
        }
      ]
    };
  }

  normalizePersonaRecord(personaInstance) {
    if (!personaInstance) return null;
    const buyer = personaInstance.buyer || null;
    if (!buyer) return null;

    return {
      id_buyer: buyer ? buyer.id_comprador : null,
      id_persona: personaInstance.id_persona,
      registro_comprador: buyer?.registro_comprador || null,
      tipo_comprador: buyer?.tipo_comprador || null,
      ciudad_residencia: buyer?.ciudad_residencia || null,
      direccion_anterior: buyer?.direccion_anterior || null,
      estado: buyer?.estado || (personaInstance.estado ? 'Activo' : 'Inactivo'),
      observaciones: buyer?.observaciones || null,
      fecha_registro_comprador: buyer?.fecha_registro_comprador || personaInstance.fecha_registro,
      persona: {
        id_persona: personaInstance.id_persona,
        nombre_completo: personaInstance.nombre_completo,
        apellido_completo: personaInstance.apellido_completo,
        tipo_documento: personaInstance.tipo_documento,
        numero_documento: personaInstance.numero_documento,
        correo: personaInstance.correo,
        telefono: personaInstance.telefono
      }
    };
  }

  async _getLatestSalesByBuyerIds(buyerIds = []) {
    if (!buyerIds.length) return {};

    const sales = await Sale.findAll({
      where: { id_comprador: { [Op.in]: buyerIds } },
      include: [
        {
          association: 'inmueble',
          attributes: [
            'id_inmueble',
            'registro_inmobiliario',
            'titulo',
            'direccion',
            'ciudad',
            'departamento',
            'categoria',
            'precio_venta',
            'precio_arriendo'
          ],
          include: [
            {
              association: 'imagenes',
              attributes: ['id_imagen', 'ruta_archivo', 'nombre_archivo', 'es_principal', 'orden'],
              required: false
            }
          ]
        }
      ],
      order: [
        ['id_comprador', 'ASC'],
        ['fecha_venta', 'DESC'],
        ['id_venta', 'DESC']
      ]
    });

    return sales.reduce((acc, sale) => {
      if (!acc[sale.id_comprador]) acc[sale.id_comprador] = sale;
      return acc;
    }, {});
  }

  mapInmuebleSummary(inmueble) {
    if (!inmueble) return null;

    const imagenes = Array.isArray(inmueble.imagenes)
      ? [...inmueble.imagenes]
          .sort((a, b) => {
            if (Boolean(b?.es_principal) !== Boolean(a?.es_principal)) {
              return Number(Boolean(b?.es_principal)) - Number(Boolean(a?.es_principal));
            }
            return (a?.orden ?? Number.MAX_SAFE_INTEGER) - (b?.orden ?? Number.MAX_SAFE_INTEGER);
          })
          .map((img) => ({
            id_imagen: img.id_imagen,
            ruta_archivo: img.ruta_archivo,
            nombre_archivo: img.nombre_archivo,
            es_principal: Boolean(img.es_principal),
            orden: img.orden
          }))
      : [];

    const imagenPrincipal = imagenes.find((img) => img.es_principal)?.ruta_archivo || imagenes[0]?.ruta_archivo || null;

    return {
      id_inmueble: inmueble.id_inmueble,
      registro_inmobiliario: inmueble.registro_inmobiliario,
      titulo: inmueble.titulo,
      direccion: inmueble.direccion,
      ciudad: inmueble.ciudad,
      departamento: inmueble.departamento,
      categoria: inmueble.categoria,
      precio_venta: inmueble.precio_venta,
      precio_arriendo: inmueble.precio_arriendo,
      imagen_principal: imagenPrincipal,
      imagenes
    };
  }

  async upsertPersona(personaData, transaction) {
    const [persona, created] = await Persona.findOrCreate({
      where: {
        tipo_documento: personaData.tipo_documento,
        numero_documento: personaData.numero_documento
      },
      defaults: {
        tipo_documento: personaData.tipo_documento,
        numero_documento: personaData.numero_documento,
        nombre_completo: personaData.nombre_completo,
        apellido_completo: personaData.apellido_completo,
        correo: personaData.correo,
        telefono: personaData.telefono,
        tiene_cuenta: false,
        estado: true
      },
      transaction
    });

    if (!created) {
      await persona.update(
        {
          nombre_completo: personaData.nombre_completo ?? persona.nombre_completo,
          apellido_completo: personaData.apellido_completo ?? persona.apellido_completo,
          correo: personaData.correo ?? persona.correo,
          telefono: personaData.telefono ?? persona.telefono
        },
        { transaction }
      );
    }

    return persona;
  }

  buildBuyerPayload(data, existingBuyer) {
    return {
      registro_comprador:
        data.registro_comprador || existingBuyer?.registro_comprador || undefined,
      fecha_registro_comprador:
        data.fecha_registro_comprador || existingBuyer?.fecha_registro_comprador || undefined,
      tipo_comprador: data.tipo_comprador || existingBuyer?.tipo_comprador || 'Potencial',
      ciudad_residencia: data.ciudad_residencia ?? existingBuyer?.ciudad_residencia ?? null,
      direccion_anterior: data.direccion_anterior ?? existingBuyer?.direccion_anterior ?? null,
      estado: data.estado || existingBuyer?.estado || 'Activo',
      observaciones: data.observaciones ?? existingBuyer?.observaciones ?? null
    };
  }

  async createBuyer(buyerData) {
    const transaction = await sequelize.transaction();
    try {
      const persona = await this.upsertPersona(buyerData, transaction);

      const existingBuyer = await Buyer.findOne({
        where: { id_persona: persona.id_persona },
        transaction
      });

      const payload = this.buildBuyerPayload(buyerData, existingBuyer);
      if (!payload.registro_comprador) {
        payload.registro_comprador = await this.generateBuyerCode(transaction);
      }
      payload.id_persona = persona.id_persona;

      let buyer;
      if (existingBuyer) {
        await existingBuyer.update(payload, { transaction });
        buyer = existingBuyer;
      } else {
        let created = null;
        let createAttempts = 0;
        while (!created && createAttempts < 4) {
          try {
            created = await Buyer.create(payload, { transaction });
          } catch (err) {
            const isUniqueRegistro =
              err instanceof Sequelize.UniqueConstraintError &&
              (err.fields?.registro_comprador ||
                err.errors?.some((e) => `${e.path}`.includes('registro_comprador')));
            if (isUniqueRegistro) {
              // Regenerar y reintentar
              payload.registro_comprador = await this.generateBuyerCode(transaction);
              createAttempts += 1;
              continue;
            }
            throw err;
          }
        }
        if (!created) {
          throw new Error('No fue posible generar un registro_comprador único después de varios intentos.');
        }
        buyer = created;
      }

      await transaction.commit();

      const personaRecord = await Persona.findByPk(persona.id_persona, this.personaQuery());
      return this.normalizePersonaRecord(personaRecord);
    } catch (error) {
      await transaction.rollback();

      if (error instanceof Sequelize.UniqueConstraintError) {
        // Intentamos deducir el campo/conflicto con más señales
        const fieldFromErrors = error.errors?.[0]?.path;
        const fieldsFromPayload = error.fields ? Object.keys(error.fields) : [];
        const constraint = error.original?.constraint || error.original?.index;
        const allHints = [fieldFromErrors, ...fieldsFromPayload, constraint].filter(Boolean);
        const hintsString = allHints.join(' | ') || 'sin_detalle';

        // Log detallado para depuración
        logger.error('Conflicto de unicidad creando comprador', {
          hints: hintsString,
          fieldsFromPayload,
          constraint
        });

        if (hintsString.includes('registro_comprador') || hintsString.includes('Comprado')) {
          const err = new Error('El registro de comprador ya existe. Actualiza el existente o intenta de nuevo.');
          err.status = 409;
          throw err;
        }
        if (hintsString.includes('UQ_Persona_Documento') || hintsString.includes('numero_documento') || hintsString.includes('tipo_documento')) {
          const err = new Error('Ya existe una persona con este documento. Búscala y edítala desde la lista de compradores.');
          err.status = 409;
          throw err;
        }
        if (hintsString.includes('correo')) {
          const err = new Error('Ya existe una persona con este correo. Usa otro correo o edita el comprador existente.');
          err.status = 409;
          throw err;
        }

        // Como último recurso, devolvemos un mensaje genérico pero informando qué pista recibimos
        const err = new Error(`El registro ya existe (conflicto de unicidad: ${hintsString}).`);
        err.status = 409;
        throw err;
      }

      logger.error('Error creando comprador', { error: error.message });
      throw error;
    }
  }

  async getBuyerById(id) {
    const persona = await Persona.findOne(
      this.personaQuery({
        '$buyer.id_comprador$': id
      })
    );
    const normalized = this.normalizePersonaRecord(persona);
    if (!normalized) return null;

    const salesMap = await this._getLatestSalesByBuyerIds([normalized.id_buyer]);
    const sale = salesMap[normalized.id_buyer];

    return {
      ...normalized,
      ultima_venta: sale
        ? {
            id_venta: sale.id_venta,
            fecha_venta: sale.fecha_venta,
            valor_venta: sale.valor_venta,
            estado: sale.estado
          }
        : null,
      inmueble: this.mapInmuebleSummary(sale?.inmueble)
    };
  }

  async getAllBuyers(filters = {}) {
    const buyerWhere = {};
    if (filters.status) buyerWhere.estado = filters.status;
    if (filters.tipo_comprador || filters.tipo_compra) {
      buyerWhere.tipo_comprador = filters.tipo_comprador || filters.tipo_compra;
    }
    const buyerHasFilters = Object.keys(buyerWhere).length > 0;

    const andConditions = [];
    if (filters.nombre) {
      const byName = `%${String(filters.nombre).trim()}%`;
      andConditions.push({
        [Op.or]: [
          { nombre_completo: { [Op.like]: byName } },
          { apellido_completo: { [Op.like]: byName } }
        ]
      });
    }

    if (filters.tipo_documento) {
      andConditions.push({ tipo_documento: filters.tipo_documento });
    }

    if (filters.numero_documento) {
      andConditions.push({ numero_documento: filters.numero_documento });
    }

    if (filters.search) {
      const search = `%${String(filters.search).trim()}%`;
      andConditions.push({
        [Op.or]: [
          { nombre_completo: { [Op.like]: search } },
          { apellido_completo: { [Op.like]: search } },
          { numero_documento: { [Op.like]: search } },
          { correo: { [Op.like]: search } },
          { telefono: { [Op.like]: search } },
          { '$buyer.registro_comprador$': { [Op.like]: search } },
          { '$buyer.tipo_comprador$': { [Op.like]: search } },
          { '$buyer.ciudad_residencia$': { [Op.like]: search } },
          { '$buyer.direccion_anterior$': { [Op.like]: search } },
          { '$buyer.observaciones$': { [Op.like]: search } }
        ]
      });
    }

    const personaWhere = andConditions.length ? { [Op.and]: andConditions } : {};
    const pagination = {
      enabled: Boolean(filters.pagination?.enabled),
      page: filters.pagination?.page || 1,
      limit: filters.pagination?.limit || null,
      offset: filters.pagination?.offset || 0
    };

    const query = {
      ...this.personaQuery(personaWhere),
      include: [
        {
          association: 'buyer',
          attributes: BUYER_ATTRS,
          where: buyerHasFilters ? buyerWhere : undefined,
          required: true
        }
      ],
      distinct: true,
      col: 'id_persona'
    };

    if (pagination.enabled) {
      query.limit = pagination.limit;
      query.offset = pagination.offset;
    }

    const { count, rows: personas } = await Persona.findAndCountAll(query);

    const buyerIds = personas
      .map((p) => p?.buyer?.id_comprador)
      .filter(Boolean);

    const salesMap = await this._getLatestSalesByBuyerIds(buyerIds);

    const data = personas
      .map((p) => {
        const base = this.normalizePersonaRecord(p);
        if (!base) return null;
        const sale = salesMap[base.id_buyer];
        return {
          ...base,
          ultima_venta: sale
            ? {
                id_venta: sale.id_venta,
                fecha_venta: sale.fecha_venta,
                valor_venta: sale.valor_venta,
                estado: sale.estado
              }
            : null,
          inmueble: this.mapInmuebleSummary(sale?.inmueble)
        };
      })
      .filter(Boolean);

    return {
      data,
      pagination: buildPaginationMeta({
        total: count,
        page: pagination.page,
        limit: pagination.limit,
        enabled: pagination.enabled
      })
    };
  }

  async updateBuyer(id, updateData) {
    const transaction = await sequelize.transaction();
    try {
      const persona = await Persona.findOne(
        this.personaQuery({
          '$buyer.id_comprador$': id
        })
      );

      if (!persona || !persona.buyer) {
        throw new Error('Comprador no encontrado');
      }

      const salesCount = await Sale.count({ where: { id_comprador: id }, transaction });
      if (salesCount > 0) {
        const err = new Error(
          'No puedes editar un comprador con ventas asociadas. Anula o elimina la venta antes de editar.'
        );
        err.status = 409;
        throw err;
      }

      await persona.update(
        {
          nombre_completo: updateData.nombre_completo ?? persona.nombre_completo,
          apellido_completo: updateData.apellido_completo ?? persona.apellido_completo,
          correo: updateData.correo ?? persona.correo,
          telefono: updateData.telefono ?? persona.telefono
        },
        { transaction }
      );

      const buyerPayload = this.buildBuyerPayload(updateData, persona.buyer);
      await persona.buyer.update(buyerPayload, { transaction });

      await transaction.commit();

      const refreshed = await this.getBuyerById(id);
      return refreshed;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error actualizando comprador', { error: error.message });
      throw error;
    }
  }

  async deactivateBuyer(id) {
    const transaction = await sequelize.transaction();
    try {
      const buyer = await Buyer.findByPk(id, { transaction });
      if (!buyer) throw new Error('Comprador no encontrado');
      await buyer.update({ estado: 'Inactivo' }, { transaction });
      await transaction.commit();
      return this.getBuyerById(id);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error desactivando comprador', { error: error.message });
      throw error;
    }
  }

  async deleteBuyer(id) {
    const transaction = await sequelize.transaction();
    try {
      const buyer = await Buyer.findByPk(id, { transaction });
      if (!buyer) throw new Error('Comprador no encontrado');
      const personaId = buyer.id_persona;
      await buyer.destroy({ transaction });
      await transaction.commit();
      return { id_comprador: id, id_persona: personaId };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error eliminando comprador', { error: error.message });
      throw error;
    }
  }

  async searchBuyers(criteria = {}) {
    const personaWhere = {};
    const buyerWhere = {};

    if (criteria.tipo_documento) personaWhere.tipo_documento = criteria.tipo_documento;
    if (criteria.numero_documento) personaWhere.numero_documento = criteria.numero_documento;
    if (criteria.nombre) {
      personaWhere[Op.or] = [
        { nombre_completo: { [Op.like]: `%${criteria.nombre}%` } },
        { apellido_completo: { [Op.like]: `%${criteria.nombre}%` } }
      ];
    }

    if (criteria.status) buyerWhere.estado = criteria.status;
    if (criteria.tipo_comprador) buyerWhere.tipo_comprador = criteria.tipo_comprador;

    const personas = await Persona.findAll({
      ...this.personaQuery(personaWhere),
      include: [
        {
          association: 'buyer',
          attributes: BUYER_ATTRS,
          where: Object.keys(buyerWhere).length ? buyerWhere : undefined,
          required: true
        }
      ]
    });

    return personas
      .map((p) => this.normalizePersonaRecord(p))
      .filter(Boolean);
  }
}

module.exports = new BuyerService();
