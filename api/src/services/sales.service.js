const { Op } = require('sequelize');
const { Sale, Buyer, Inmueble, Persona, SeguimientoVenta, EstadosVenta, VentaAdjunto } = require('../models');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

class SaleService {
  _normalizeFilterValue(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  _normalizeTipoCompra(value) {
    const normalized = this._normalizeFilterValue(value);
    const map = {
      directa: 'Directa',
      financiada: 'Financiada',
      mixta: 'Mixta'
    };

    return map[normalized] || value;
  }

  _buildEstadoFilterCondition(value) {
    const normalized = this._normalizeFilterValue(value);
    if (!normalized || normalized === 'todos') return null;

    const detailMap = {
      pagado: 'Pagado',
      debe: 'Debe',
      'en espera': 'En espera',
      cancelado: 'Cancelado',
      'en negociacion': 'En negociación',
      completada: 'Completada'
    };

    const generalFallbackMap = {
      cancelado: 'Cancelada',
      completada: 'Finalizada'
    };

    const detailStatus = detailMap[normalized];
    if (!detailStatus) {
      return { estado: value };
    }

    const generalFallback = generalFallbackMap[normalized];
    if (!generalFallback) {
      return { estado_seguimiento: detailStatus };
    }

    return {
      [Op.or]: [
        { estado_seguimiento: detailStatus },
        { estado: generalFallback }
      ]
    };
  }

  _normalizeStatus(value) {
    return String(value ?? '').trim().toLowerCase();
  }

  _isInactiveBuyer(buyer) {
    if (!buyer) return true;

    const buyerStatus = this._normalizeStatus(buyer.estado);
    if (buyerStatus === 'inactivo') return true;

    const personaStatus = buyer.persona?.estado;
    if (personaStatus === false || personaStatus === 0) return true;

    return false;
  }

  _normalizeSaleDate(value) {
    const now = new Date();
    const isDateOnly = (input) => /^\d{4}-\d{2}-\d{2}$/.test(String(input || '').trim());
    const toLocalMidnight = (date) =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

    if (!value) return toLocalMidnight(now);

    const raw = String(value).trim();

    if (isDateOnly(raw)) {
      const [y, m, d] = raw.split('-').map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }

    if (raw.includes('T')) {
      const [datePart] = raw.split('T');
      if (isDateOnly(datePart)) {
        const [y, m, d] = datePart.split('-').map(Number);
        return new Date(y, m - 1, d, 0, 0, 0, 0);
      }
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return toLocalMidnight(parsed);
    }

    return toLocalMidnight(now);
  }

  _isMissingVentaAdjuntosTable(error) {
    const message = String(error?.original?.message || error?.message || '').toLowerCase();
    return message.includes('invalid object name') && message.includes('ventaadjuntos');
  }

  _buildSaleIncludeOptions(includeAdjuntos = true) {
    const includeOptions = [
      {
        association: 'inmueble',
        attributes: [
          'id_inmueble',
          'registro_inmobiliario',
          'direccion',
          'ciudad',
          'departamento',
          'categoria',
          'titulo',
          'barrio',
          'pais',
          'precio_venta',
          'precio_arriendo',
          'area_construida'
        ],
        include: [
          {
            association: 'comodidades',
            attributes: ['id_comodidad', 'nombre'],
            through: { attributes: ['cantidad', 'seleccionada'] }
          }
        ]
      },
      {
        association: 'comprador',
        attributes: ['id_comprador', 'registro_comprador'],
        include: [
          {
            association: 'persona',
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
      }
    ];

    if (includeAdjuntos) {
      includeOptions.push({
        association: 'adjuntos',
        attributes: [
          'id_adjunto',
          'tipo',
          'nombre_archivo',
          'url',
          'mime_type',
          'tamano_bytes',
          'fecha_creacion'
        ]
      });
    }

    return includeOptions;
  }

  _mapEstadoToDb(estadoEntrada, estadoActual = 'Activa') {
    if (!estadoEntrada) return estadoActual;
    const normalized = String(estadoEntrada).trim().toLowerCase();
    const mapEstado = {
      activa: 'Activa',
      pendiente: 'Activa',
      'en espera': 'Activa',
      debe: 'Activa',
      pagado: 'Finalizada',
      pagada: 'Finalizada',
      completada: 'Finalizada',
      finalizada: 'Finalizada'
    };
    return mapEstado[normalized] || estadoActual || 'Activa';
  }

  _mapEstadoDetalleToGeneral(estadoDetalle) {
    if (!estadoDetalle) return 'Activa';
    const nombre = (estadoDetalle.nombre_estado || '').toLowerCase();
    if (nombre === 'cancelado') return 'Cancelada';
    if (estadoDetalle.es_estado_final) return 'Finalizada';
    if (['pagado', 'pagada', 'completada', 'completado', 'finalizada'].includes(nombre)) return 'Finalizada';
    return 'Activa';
  }

  _buildSaleListQuery(filters = {}) {
    const whereClause = {};
    const andConditions = [];
    const includeOptions = [
      {
        association: 'inmueble',
        attributes: [],
        required: false
      },
      {
        association: 'comprador',
        attributes: [],
        required: false,
        include: [
          {
            association: 'persona',
            attributes: [],
            required: false
          }
        ]
      }
    ];

    const estadoFilter = this._buildEstadoFilterCondition(filters.estado);
    if (estadoFilter) andConditions.push(estadoFilter);
    if (filters.id_persona) whereClause.id_comprador = filters.id_persona;
    if (filters.id_comprador) whereClause.id_comprador = filters.id_comprador;
    if (filters.tipo_compra) {
      whereClause.tipo_compra = this._normalizeTipoCompra(filters.tipo_compra);
    }
    if (filters.fecha_inicio && filters.fecha_fin) {
      whereClause.fecha_venta = { [Op.between]: [filters.fecha_inicio, filters.fecha_fin] };
    }

    const rawSearch = String(filters.search || '').trim();
    if (rawSearch) {
      const search = `%${rawSearch}%`;
      andConditions.push({
        [Op.or]: [
          { medio_pago: { [Op.like]: search } },
          { estado: { [Op.like]: search } },
          { estado_seguimiento: { [Op.like]: search } },
          { nombre_vendedor: { [Op.like]: search } },
          { correo_vendedor: { [Op.like]: search } },
          { telefono_vendedor: { [Op.like]: search } },
          { numero_doc_vendedor: { [Op.like]: search } },
          { '$inmueble.registro_inmobiliario$': { [Op.like]: search } },
          { '$inmueble.titulo$': { [Op.like]: search } },
          { '$inmueble.direccion$': { [Op.like]: search } },
          { '$inmueble.ciudad$': { [Op.like]: search } },
          { '$inmueble.departamento$': { [Op.like]: search } },
          { '$comprador.registro_comprador$': { [Op.like]: search } },
          { '$comprador.persona.nombre_completo$': { [Op.like]: search } },
          { '$comprador.persona.apellido_completo$': { [Op.like]: search } },
          { '$comprador.persona.numero_documento$': { [Op.like]: search } },
          { '$comprador.persona.correo$': { [Op.like]: search } },
          { '$comprador.persona.telefono$': { [Op.like]: search } }
        ]
      });
    }

    if (andConditions.length) {
      whereClause[Op.and] = andConditions;
    }

    return { whereClause, includeOptions };
  }

  async _getEstadoVentaActivo(idEstadoVenta, transaction) {
    const estadoVenta = await EstadosVenta.findOne({
      where: { id_estado_venta: idEstadoVenta, estado: true },
      transaction
    });
    if (!estadoVenta) throw new Error('Estado de venta no valido o inactivo');
    return estadoVenta;
  }

  async _applyEstadoVenta(idVenta, trackingData, usuarioContexto = {}, transaction = null) {
    let sale = await this.getSaleById(idVenta, transaction);
    if (!sale) throw new Error('Venta no encontrada');
    // Protección: si getSaleById devolvió un objeto plano (sin métodos de instancia),
    // vuelve a cargar la venta como instancia de Sequelize para poder usar update.
    if (typeof sale.update !== 'function') {
      sale = await Sale.findByPk(idVenta, { transaction });
      if (!sale) throw new Error('Venta no encontrada');
    }

    const estadoVenta = await this._getEstadoVentaActivo(trackingData.id_estado_venta, transaction);
    const estadoVentaNormalizado = this._normalizeFilterValue(estadoVenta.nombre_estado);

    if (estadoVentaNormalizado === 'completada') {
      const adjuntos = Array.isArray(sale.adjuntos) ? sale.adjuntos : [];
      const hasComprobante = adjuntos.some((adj) => String(adj.tipo || '').trim().toLowerCase() === 'comprobante');
      const hasContrato = adjuntos.some((adj) => String(adj.tipo || '').trim().toLowerCase() === 'contrato');

      if (!hasComprobante || !hasContrato) {
        const error = new Error('Debes cargar contrato y comprobante antes de marcar la venta como Completada.');
        error.status = 400;
        throw error;
      }
    }

    const personaId =
      trackingData.id_persona ||
      usuarioContexto.id_persona ||
      sale?.comprador?.persona?.id_persona ||
      sale?.comprador?.id_persona ||
      null;

    if (!personaId) throw new Error('No se pudo resolver la persona que realiza el cambio');

    const seguimiento = await SeguimientoVenta.create(
      {
        id_venta: idVenta,
        id_estado_venta: trackingData.id_estado_venta,
        id_persona: personaId,
        fecha_estado_seguimiento:
          trackingData.fecha_estado_seguimiento || new Date(),
        descripcion:
          (trackingData.descripcion ?? '').toString().trim() !== ''
            ? trackingData.descripcion
            : estadoVenta.descripcion || 'Actualizacion de estado'
      },
      { transaction }
    );

    const nuevoEstadoGeneral = this._mapEstadoDetalleToGeneral(estadoVenta);

    await sale.update(
      {
        // Estado general (Activa / Finalizada / Cancelada) para reportes
        estado: nuevoEstadoGeneral,
        // Estado detallado del catálogo (lo que debe ver el usuario)
        id_estado_venta: estadoVenta.id_estado_venta,
        estado_seguimiento: estadoVenta.nombre_estado
      },
      { transaction }
    );

    if (sale.id_inmueble) {
      const inmueble = await Inmueble.findByPk(sale.id_inmueble, { transaction });
      if (inmueble) {
        if (nuevoEstadoGeneral === 'Finalizada') {
          await inmueble.update(
            {
              estado: false,
              estado_frontend: 'Vendido',
              destacado: false
            },
            { transaction }
          );
        } else if (nuevoEstadoGeneral === 'Cancelada') {
          await inmueble.update(
            {
              estado: true,
              estado_frontend: 'Disponible'
            },
            { transaction }
          );
        } else {
          await inmueble.update(
            {
              estado: false,
              estado_frontend: 'En proceso de venta'
            },
            { transaction }
          );
        }
      }
    }

    return { seguimiento, estadoVenta };
  }

  async createSale(saleData) {
    logger.info(`createSale payload: ${JSON.stringify(saleData)}`);
    const result = await sequelize.transaction(async (t) => {
      try {
        const inmueble = await Inmueble.findByPk(saleData.id_inmueble, { transaction: t });
        if (!inmueble) throw new Error('Inmueble no encontrado');

        const compradorId = saleData.id_comprador || saleData.id_persona;
        const comprador = await Buyer.findByPk(compradorId, { transaction: t, include: ['persona'] });
        if (!comprador) throw new Error('Comprador no encontrado');
        if (this._isInactiveBuyer(comprador)) {
          const error = new Error('El comprador está inactivo y no puede registrarse en una venta.');
          error.status = 400;
          throw error;
        }

        const normalizedSaleDate = this._normalizeSaleDate(saleData.fecha_venta);

        const newSale = await Sale.create(
          {
            id_comprador: compradorId,
            id_inmueble: saleData.id_inmueble,
            fecha_venta: saleData.fecha_venta,
            valor_venta: saleData.valor_venta,
            medio_pago: saleData.medio_pago,
            tipo_doc_vendedor: saleData.tipo_doc_vendedor || saleData.vendedorTipoDocumento || saleData.tipo_documento_vendedor || null,
            numero_doc_vendedor: saleData.numero_doc_vendedor || saleData.vendedorDocumento || saleData.vendedor_numero_documento || null,
            nombre_vendedor: saleData.nombre_vendedor || saleData.vendedorNombreCompleto || saleData.vendedor_nombre || null,
            correo_vendedor: saleData.correo_vendedor || saleData.vendedorCorreo || null,
            telefono_vendedor: saleData.telefono_vendedor || saleData.vendedorTelefono || null,
            estado: this._mapEstadoToDb(saleData.estado, 'Activa')
          },
          { transaction: t }
        );

        await inmueble.update(
          {
            estado: false,
            estado_frontend: 'En proceso de venta',
            destacado: false
          },
          { transaction: t }
        );

        return await this.getSaleById(newSale.id_venta, t);
      } catch (error) {
        logger.error(`Error createSale: ${error.message}`);
        throw error;
      }
    });

    return result;
  }

  async getSaleById(id, transaction = null) {
    const sale = await Sale.findByPk(id, {
      include: [
        {
          association: 'inmueble',
          attributes: [
            'id_inmueble',
            'registro_inmobiliario',
            'direccion',
            'ciudad',
            'departamento',
            'categoria',
            'titulo',
            'barrio',
            'pais',
            'precio_venta',
            'precio_arriendo',
            'area_construida'
          ],
          include: [
            {
              association: 'comodidades',
              attributes: ['id_comodidad', 'nombre'],
              through: { attributes: ['cantidad', 'seleccionada'] }
            }
          ]
        },
        {
          association: 'comprador',
          attributes: ['id_comprador', 'registro_comprador'],
          include: [
            {
              association: 'persona',
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
          association: 'adjuntos',
          attributes: [
            'id_adjunto',
            'tipo',
            'nombre_archivo',
            'url',
            'mime_type',
            'tamano_bytes',
            'fecha_creacion'
          ]
        }
      ],
      transaction
    });

    if (!sale) throw new Error('Venta no encontrada');

    const ultimoSeguimiento = await SeguimientoVenta.findOne({
      where: { id_venta: id },
      attributes: ['id_seguimiento_venta', 'id_estado_venta', 'fecha_estado_seguimiento', 'descripcion'],
      include: [
        {
          model: EstadosVenta,
          as: 'estado',
          attributes: ['nombre_estado', 'descripcion', 'orden', 'es_estado_final']
        }
      ],
      order: [
        ['fecha_estado_seguimiento', 'DESC'],
        ['id_seguimiento_venta', 'DESC']
      ],
      transaction
    });

    // Exponer estado detallado como estado principal para el frontend
    if (sale.estado_seguimiento) {
      sale.estado = sale.estado_seguimiento;
    }

    if (ultimoSeguimiento) {
      const nombreEstado = ultimoSeguimiento.estado?.nombre_estado;
      if (!sale.estado_seguimiento && nombreEstado) {
        sale.estado_seguimiento = nombreEstado;
        sale.estado = nombreEstado;
      }
      if (!sale.id_estado_venta && ultimoSeguimiento.id_estado_venta) {
        sale.id_estado_venta = ultimoSeguimiento.id_estado_venta;
      }
      sale.setDataValue('descripcion_seguimiento', ultimoSeguimiento.descripcion || null);
      sale.setDataValue('ultimo_seguimiento', ultimoSeguimiento);
    }

    // Adjuntar bloque de vendedor en los dataValues sin perder la instancia (se usa en update)
    sale.setDataValue('vendedor', {
      tipo_documento: sale.tipo_doc_vendedor,
      numero_documento: sale.numero_doc_vendedor,
      nombre_completo: sale.nombre_vendedor,
      correo: sale.correo_vendedor,
      telefono: sale.telefono_vendedor
    });

    return sale;
  }

  async getAllSales(filters = {}) {
    try {
      const includeOptions = [
        {
          association: 'inmueble',
          attributes: [
            'id_inmueble',
            'registro_inmobiliario',
            'direccion',
            'ciudad',
            'departamento',
            'categoria',
            'titulo',
            'barrio',
            'pais',
            'precio_venta',
            'precio_arriendo',
            'area_construida'
          ],
          include: [
            {
              association: 'comodidades',
              attributes: ['id_comodidad', 'nombre'],
              through: { attributes: ['cantidad', 'seleccionada'] }
            }
          ]
        },
        {
          association: 'comprador',
          attributes: ['id_comprador', 'registro_comprador'],
          include: [
            {
              association: 'persona',
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
          association: 'adjuntos',
          attributes: [
            'id_adjunto',
            'tipo',
            'nombre_archivo',
            'url',
            'mime_type',
            'tamano_bytes',
            'fecha_creacion'
          ]
        }
      ];

      const whereClause = {};
      if (filters.estado) whereClause.estado = filters.estado;
      if (filters.id_persona) whereClause.id_comprador = filters.id_persona;
      if (filters.id_comprador) whereClause.id_comprador = filters.id_comprador;
      if (filters.fecha_inicio && filters.fecha_fin) {
        whereClause.fecha_venta = { [Op.between]: [filters.fecha_inicio, filters.fecha_fin] };
      }

      const sales = await Sale.findAll({
        where: whereClause,
        include: includeOptions,
        order: [['fecha_venta', 'DESC']],
        logging: false
      });

      const ventaIds = sales.map((s) => s.id_venta);
      let trackingMap = {};
      if (ventaIds.length) {
        const trackingRows = await SeguimientoVenta.findAll({
          where: { id_venta: { [Op.in]: ventaIds } },
          attributes: ['id_venta', 'id_estado_venta', 'fecha_estado_seguimiento', 'descripcion', 'id_seguimiento_venta'],
          include: [
            {
              model: EstadosVenta,
              as: 'estado',
              attributes: ['nombre_estado', 'orden', 'es_estado_final']
            }
          ],
          order: [
            ['id_venta', 'ASC'],
            ['fecha_estado_seguimiento', 'DESC'],
            ['id_seguimiento_venta', 'DESC']
          ],
          logging: false
        });

        trackingMap = trackingRows.reduce((acc, row) => {
          if (!acc[row.id_venta]) acc[row.id_venta] = row;
          return acc;
        }, {});
      }

      return sales.map((sale) => ({
        id_venta: sale.id_venta,
        id_estado_venta: sale.id_estado_venta,
        fecha_venta: sale.fecha_venta,
        valor_venta: sale.valor_venta,
        medio_pago: sale.medio_pago,
        // Datos del vendedor congelados al momento de la venta
        tipo_doc_vendedor: sale.tipo_doc_vendedor,
        numero_doc_vendedor: sale.numero_doc_vendedor,
        nombre_vendedor: sale.nombre_vendedor,
        correo_vendedor: sale.correo_vendedor,
        telefono_vendedor: sale.telefono_vendedor,
        vendedor: {
          tipo_documento: sale.tipo_doc_vendedor,
          numero_documento: sale.numero_doc_vendedor,
          nombre_completo: sale.nombre_vendedor,
          correo: sale.correo_vendedor,
          telefono: sale.telefono_vendedor
        },
        // Mostrar en el frontend el estado detallado si existe; de lo contrario, el general
        estado:
          sale.estado_seguimiento ||
          trackingMap[sale.id_venta]?.estado?.nombre_estado ||
          sale.estado,
        estado_seguimiento:
          sale.estado_seguimiento ||
          trackingMap[sale.id_venta]?.estado?.nombre_estado ||
          sale.estado,
        id_estado_seguimiento:
          sale.id_estado_venta ||
          trackingMap[sale.id_venta]?.id_estado_venta ||
          null,
        descripcion_seguimiento: trackingMap[sale.id_venta]?.descripcion || null,
        fecha_creacion: sale.fecha_creacion,
        inmueble: sale.inmueble
          ? {
            id_inmueble: sale.inmueble.id_inmueble,
            registro_inmobiliario: sale.inmueble.registro_inmobiliario,
            direccion: sale.inmueble.direccion,
            ciudad: sale.inmueble.ciudad,
            departamento: sale.inmueble.departamento,
            categoria: sale.inmueble.categoria,
            titulo: sale.inmueble.titulo,
            barrio: sale.inmueble.barrio,
            pais: sale.inmueble.pais,
            precio_venta: sale.inmueble.precio_venta,
            precio_arriendo: sale.inmueble.precio_arriendo,
            area_construida: sale.inmueble.area_construida,
            comodidades: sale.inmueble.comodidades
          }
          : null,
        comprador: sale.comprador
          ? {
            id_comprador: sale.comprador.id_comprador,
            registro_comprador: sale.comprador.registro_comprador,
            id_persona: sale.comprador.persona?.id_persona,
            tipo_documento: sale.comprador.persona?.tipo_documento,
            numero_documento: sale.comprador.persona?.numero_documento,
            nombre_completo: sale.comprador.persona?.nombre_completo,
            apellido_completo: sale.comprador.persona?.apellido_completo,
            correo: sale.comprador.persona?.correo,
            telefono: sale.comprador.persona?.telefono
          }
          : null,
        adjuntos: (sale.adjuntos || []).map((adj) => ({
          id_adjunto: adj.id_adjunto,
          tipo: adj.tipo,
          nombre_archivo: adj.nombre_archivo,
          url: adj.url,
          mime_type: adj.mime_type,
          tamano_bytes: adj.tamano_bytes,
          fecha_creacion: adj.fecha_creacion
        }))
      }));
    } catch (error) {
      const dbMsg = error.original?.message || error.message || 'Error consultando ventas';
      logger.error(`Error en getAllSales: ${dbMsg}`);
      const err = new Error(dbMsg);
      err.status = 500;
      throw err;
    }
  }

  async updateSale(id, updateData) {
    const sale = await this.getSaleById(id);
    if (!sale) throw new Error('Venta no encontrada');

    const payload = { ...updateData };
    payload.tipo_doc_vendedor =
      updateData.tipo_doc_vendedor ||
      updateData.vendedorTipoDocumento ||
      updateData.tipo_documento_vendedor ||
      payload.tipo_doc_vendedor;
    payload.numero_doc_vendedor =
      updateData.numero_doc_vendedor ||
      updateData.vendedorDocumento ||
      updateData.vendedor_numero_documento ||
      payload.numero_doc_vendedor;
    payload.nombre_vendedor =
      updateData.nombre_vendedor ||
      updateData.vendedorNombreCompleto ||
      updateData.vendedor_nombre ||
      payload.nombre_vendedor;
    payload.correo_vendedor =
      updateData.correo_vendedor || updateData.vendedorCorreo || payload.correo_vendedor;
    payload.telefono_vendedor =
      updateData.telefono_vendedor || updateData.vendedorTelefono || payload.telefono_vendedor;

    if (payload.estado) {
      payload.estado = this._mapEstadoToDb(payload.estado, sale.estado);
    }

    await sale.update(payload);
    return this.getSaleById(id);
  }

  async cancelSale(id) {
    const sale = await this.getSaleById(id);
    if (!sale) throw new Error('Venta no encontrada');

    await sale.update({ estado: 'Cancelada' });
    if (sale.inmueble) {
      await sale.inmueble.update({ estado: true, estado_frontend: 'Disponible' });
    }

    return this.getSaleById(id);
  }

  async finalizeSale(id) {
    const sale = await this.getSaleById(id);
    if (!sale) throw new Error('Venta no encontrada');
    await sale.update({ estado: 'Finalizada' });
    if (sale.inmueble) {
      await sale.inmueble.update({ estado: false, estado_frontend: 'Vendido', destacado: false });
    }
    return this.getSaleById(id);
  }

  async addTracking(idVenta, trackingData) {
    const { seguimiento } = await this.changeStatus(idVenta, trackingData);
    return seguimiento;
  }

  async getTracking(idVenta) {
    const tracking = await SeguimientoVenta.findAll({
      where: { id_venta: idVenta },
      include: [
        { model: EstadosVenta, as: 'estado', attributes: ['nombre_estado', 'descripcion'] },
        { model: Persona, as: 'persona', attributes: ['nombre_completo', 'apellido_completo'] }
      ],
      order: [['fecha_estado_seguimiento', 'DESC']]
    });

    return tracking;
  }

  async getSalesStatistics() {
    const statistics = await Sale.findAll({
      attributes: [
        'estado',
        [sequelize.fn('COUNT', '*'), 'total'],
        [sequelize.fn('SUM', sequelize.col('valor_venta')), 'total_ventas']
      ],
      group: ['estado'],
      raw: true
    });

    const totalVentas = await Sale.sum('valor_venta', { where: { estado: 'Finalizada' } });

    const ventasEsteMes = await Sale.sum('valor_venta', {
      where: {
        estado: 'Finalizada',
        fecha_venta: {
          [Op.between]: [
            new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          ]
        }
      }
    });

    return {
      por_estado: statistics,
      total_ventas: totalVentas || 0,
      ventas_este_mes: ventasEsteMes || 0
    };
  }

  async getStatusCatalog() {
    return EstadosVenta.findAll({
      where: { estado: true },
      order: [['orden', 'ASC']],
      attributes: ['id_estado_venta', 'nombre_estado', 'descripcion', 'orden', 'es_estado_final']
    });
  }

  async changeStatus(idVenta, trackingData = {}, usuarioContexto = {}) {
    return sequelize.transaction(async (t) => {
      const { seguimiento, estadoVenta } = await this._applyEstadoVenta(
        idVenta,
        trackingData,
        usuarioContexto,
        t
      );

      const ventaActualizada = await this.getSaleById(idVenta, t);

      return {
        venta: ventaActualizada,
        seguimiento,
        estado: estadoVenta
      };
    });
  }
}

module.exports = new SaleService();
