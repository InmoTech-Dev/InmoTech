const { Op } = require('sequelize');
const { Sale, Buyer, Inmueble, Persona, SeguimientoVenta, EstadosVenta } = require('../models');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

class SaleService {
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

  async createSale(saleData) {
    logger.info(`createSale payload: ${JSON.stringify(saleData)}`);
    const result = await sequelize.transaction(async (t) => {
      try {
        const inmueble = await Inmueble.findByPk(saleData.id_inmueble, { transaction: t });
        if (!inmueble) throw new Error('Inmueble no encontrado');

        const compradorId = saleData.id_comprador || saleData.id_persona;
        const comprador = await Buyer.findByPk(compradorId, { transaction: t, include: ['persona'] });
        if (!comprador) throw new Error('Comprador no encontrado');

        const newSale = await Sale.create(
          {
            id_comprador: compradorId,
            id_inmueble: saleData.id_inmueble,
            fecha_venta: saleData.fecha_venta,
            valor_venta: saleData.valor_venta,
            medio_pago: saleData.medio_pago,
            estado: this._mapEstadoToDb(saleData.estado, 'Activa')
          },
          { transaction: t }
        );

        await inmueble.update(
          {
            estado: false,
            estado_frontend: 'Vendido'
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
            'area_construida'
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
      ],
      transaction
    });

    if (!sale) throw new Error('Venta no encontrada');
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
            'area_construida'
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

      return sales.map((sale) => ({
        id_venta: sale.id_venta,
        fecha_venta: sale.fecha_venta,
        valor_venta: sale.valor_venta,
        medio_pago: sale.medio_pago,
        estado: sale.estado,
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
              area_construida: sale.inmueble.area_construida
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
          : null
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
      await sale.inmueble.update({ estado: 'Disponible' });
    }

    return this.getSaleById(id);
  }

  async finalizeSale(id) {
    const sale = await this.getSaleById(id);
    if (!sale) throw new Error('Venta no encontrada');
    await sale.update({ estado: 'Finalizada' });
    return this.getSaleById(id);
  }

  async addTracking(idVenta, trackingData) {
    const sale = await this.getSaleById(idVenta);
    if (!sale) throw new Error('Venta no encontrada');

    const buyerId = trackingData.id_comprador || sale.id_comprador;
    const buyer = buyerId ? await Buyer.findByPk(buyerId, { include: ['persona'] }) : null;
    if (!buyer) throw new Error('Comprador no encontrado para el seguimiento');

    const personaId =
      buyer?.persona?.id_persona ||
      buyer?.id_persona ||
      sale?.comprador?.persona?.id_persona ||
      null;

    if (!personaId) throw new Error('No se pudo resolver la persona del comprador para el seguimiento');

    const newTracking = await SeguimientoVenta.create({
      id_venta: idVenta,
      id_estado_venta: trackingData.id_estado_venta,
      id_persona: personaId,
      fecha_estado_seguimiento: trackingData.fecha_estado_seguimiento,
      descripcion: trackingData.descripcion
    });

    return newTracking;
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
}

module.exports = new SaleService();
