const { Op } = require('sequelize');
const { Lease } = require('../models');
const { Payment } = require('../models');
const { Receipt } = require('../models');
const { Inmueble } = require('../models');
const { Persona, Renant } = require('../models');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

class LeaseService {
  async createLease(leaseData) {
    const result = await sequelize.transaction(async (t) => {
      try {
        const isDisponible = (estado, estadoFrontend) => {
          const normalized = (value) => {
            if (value === undefined || value === null) return '';
            if (typeof value === 'boolean') return value ? 'true' : 'false';
            return String(value).trim().toLowerCase();
          };

          const estadoFrontNorm = normalized(estadoFrontend);
          const estadoNorm = normalized(estado);

          // Si no hay valor de estado_frontend, no bloqueamos (tratamos como disponible)
          if (!estadoFrontNorm) {
            if (estado === true || estado === 1) return true;
            if (!estado || estado === '') return true;
          }

          // Disponible o en proceso de arrendamiento se permiten
          if (['disponible', 'available', 'en proceso de arrendamiento'].includes(estadoFrontNorm)) return true;

          // Si el booleano/estado textual indica disponibilidad
          if (estado === true || estado === 1) return true;
          if (['true', '1', 'disponible', 'available'].includes(estadoNorm)) return true;

          // Bloquear estados explícitos de no disponibilidad
          if (['arrendado', 'vendido', 'no disponible'].includes(estadoFrontNorm)) return false;

          // Por defecto, permitir
          return true;
        };

        // 1. Validar que el inmueble existe y está disponible
        const inmueble = await Inmueble.findByPk(leaseData.id_inmueble, { transaction: t });
        if (!inmueble) {
          throw new Error('Inmueble no encontrado');
        }

        const disponible = isDisponible(inmueble.estado, inmueble.estado_frontend);
        if (!disponible) {
          logger.warn(`Inmueble ${inmueble.id_inmueble} marcado como NO disponible (estado=${inmueble.estado}, estado_frontend=${inmueble.estado_frontend}). Se continúa bajo override.`);
        }

        // 2. Validar que el arrendatario existe (tabla arrendatarios)
        const arrendatario = await Renant.findByPk(leaseData.id_cliente, { transaction: t });
        if (!arrendatario) {
          throw new Error('Arrendatario no encontrado');
        }

        // 2.1. Resolver codeudor (Persona) si viene en el payload
        // Nota: la tabla Arrendamientos no tiene columna de codeudor; omitimos esta lógica por ahora
        let codeudorId = null;

        // 3. Crear el arrendamiento
        const newLease = await Lease.create({
          id_cliente: leaseData.id_cliente,
          id_inmueble: leaseData.id_inmueble,
          fecha_inicio: leaseData.fecha_inicio,
          fecha_finalizacion: leaseData.fecha_finalizacion,
          valor_mensual: leaseData.valor_mensual,
          estado: 'Activo'
        }, { transaction: t });

        // 4. Actualizar estado del inmueble a "Arrendado"
        await inmueble.update({
          estado: false,
          estado_frontend: 'Arrendado'
        }, { transaction: t });

        // 5. Generar cobros mensuales automáticamente
        await this.generateMonthlyPayments(newLease.id_arrendamiento, t);

        return await this.getLeaseById(newLease.id_arrendamiento, t);

      } catch (error) {
        throw error;
      }
    });

    return result;
  }

  async generateMonthlyPayments(leaseId, transaction = null) {
    try {
      const lease = await this.getLeaseById(leaseId, transaction);
      
      const startDate = new Date(lease.fecha_inicio);
      const endDate = new Date(lease.fecha_finalizacion);
      
      const payments = [];
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const paymentDate = new Date(currentDate);
        const dueDate = new Date(currentDate);
        dueDate.setDate(dueDate.getDate() + 10); // 10 días para pagar
        
        payments.push({
          id_arrendamiento: leaseId,
          fecha_cobro: paymentDate,
          fecha_limite: dueDate,
          valor_pago: lease.valor_mensual,
          estado: 'Pendiente'
        });
        
        // Siguiente mes
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      await Payment.bulkCreate(payments, { transaction });
      logger.info(`✅ ${payments.length} cobros generados para arrendamiento ${leaseId}`);
      
    } catch (error) {
      logger.error(`❌ Error generando cobros: ${error.message}`);
      throw error;
    }
  }

  async getLeaseById(id, transaction = null) {
    const lease = await Lease.findByPk(id, {
      include: [
        {
          association: 'inmueble',
          attributes: ['id_inmueble', 'registro_inmobiliario', 'direccion', 'ciudad', 'departamento', 'categoria']
        },
        {
          association: 'arrendatario',
          attributes: ['id_arrendatario'],
          include: [
            {
              association: 'persona',
              attributes: ['id_persona', 'nombre_completo', 'apellido_completo', 'correo', 'telefono', 'tipo_documento', 'numero_documento']
            }
          ]
        }
      ],
      transaction
    });

    if (!lease) throw new Error('Arrendamiento no encontrado');

    return lease;
  }

  async getAllLeases(filters = {}) {
    try {
      logger.info(`🔍 Consultando arrendamientos con filtros: ${JSON.stringify(filters)}`);

      const includeOptions = [
        {
          association: 'inmueble',
          attributes: ['id_inmueble', 'registro_inmobiliario', 'direccion', 'ciudad', 'departamento', 'categoria']
        },
        {
          association: 'arrendatario',
          attributes: ['id_arrendatario'],
          include: [
            {
              association: 'persona',
              attributes: ['id_persona', 'nombre_completo', 'apellido_completo', 'correo', 'telefono', 'tipo_documento', 'numero_documento']
            }
          ]
        },
        // Sin codeudor: la columna no existe en la tabla
      ];

      const whereClause = {};
      if (filters.estado) whereClause.estado = filters.estado;
      if (filters.id_cliente) whereClause.id_cliente = filters.id_cliente;
      if (filters.id_arrendatario) whereClause.id_cliente = filters.id_arrendatario; // id_cliente mapea a id_arrendatario en la tabla
      if (filters.fecha_inicio && filters.fecha_fin) {
        whereClause.fecha_inicio = {
          [Op.between]: [filters.fecha_inicio, filters.fecha_fin]
        };
      }

        const leases = await Lease.findAll({
          where: whereClause,
          include: includeOptions,
          order: [['fecha_inicio', 'DESC']],
          logging: false
        });

      logger.info(`✅ ${leases.length} arrendamientos obtenidos exitosamente`);

      return leases.map(lease => ({
        id_arrendamiento: lease.id_arrendamiento,
        id_arrendatario: lease.id_cliente, // columna id_arrendatario en BD, mapeada como id_cliente en el modelo
        fecha_inicio: lease.fecha_inicio,
        fecha_finalizacion: lease.fecha_finalizacion,
        valor_mensual: lease.valor_mensual,
        estado: lease.estado,
        duracion_meses: lease.duracion_meses,
        fecha_creacion: lease.fecha_creacion,
        inmueble: lease.inmueble ? {
          id_inmueble: lease.inmueble.id_inmueble,
          registro_inmobiliario: lease.inmueble.registro_inmobiliario,
          direccion: lease.inmueble.direccion,
          ciudad: lease.inmueble.ciudad,
          departamento: lease.inmueble.departamento,
          categoria: lease.inmueble.categoria
        } : null,
        arrendatario: lease.arrendatario ? {
          id_arrendatario: lease.arrendatario.id_arrendatario,
          persona: lease.arrendatario.persona ? {
            id_persona: lease.arrendatario.persona.id_persona,
            nombre_completo: lease.arrendatario.persona.nombre_completo,
            apellido_completo: lease.arrendatario.persona.apellido_completo,
            correo: lease.arrendatario.persona.correo,
            telefono: lease.arrendatario.persona.telefono,
            tipo_documento: lease.arrendatario.persona.tipo_documento,
            numero_documento: lease.arrendatario.persona.numero_documento
          } : null
        } : null,
        codeudor: null
      }));

    } catch (error) {
      logger.error(`❌ Error en getAllLeases: ${error.message}`);
      throw error;
    }
  }

  async updateLease(id, updateData) {
    try {
      const lease = await this.getLeaseById(id);

      if (!lease) {
        throw new Error('Arrendamiento no encontrado');
      }

      await lease.update(updateData);

      return await this.getLeaseById(id);
    } catch (error) {
      throw error;
    }
  }

  async cancelLease(id) {
    try {
      const lease = await this.getLeaseById(id);

      if (!lease) {
        throw new Error('Arrendamiento no encontrado');
      }

      await lease.update({
        estado: 'Cancelado'
      });

      // Liberar el inmueble
      await lease.inmueble.update({
        estado: true,
        estado_frontend: 'Disponible'
      });

      // Cancelar cobros pendientes
      await Payment.update(
        { estado: 'Cancelado' },
        { 
          where: { 
            id_arrendamiento: id,
            estado: 'Pendiente'
          }
        }
      );

      return await this.getLeaseById(id);
    } catch (error) {
      throw error;
    }
  }

  async finalizeLease(id) {
    try {
      const lease = await this.getLeaseById(id);

      if (!lease) {
        throw new Error('Arrendamiento no encontrado');
      }

      await lease.update({
        estado: 'Finalizado'
      });

      // Liberar el inmueble
      await lease.inmueble.update({
        estado: true,
        estado_frontend: 'Disponible'
      });

      return await this.getLeaseById(id);
    } catch (error) {
      throw error;
    }
  }

  async deleteLease(id) {
    const transaction = await sequelize.transaction();
    try {
      const lease = await Lease.findByPk(id, { include: ['inmueble'], transaction });
      if (!lease) {
        throw new Error('Arrendamiento no encontrado');
      }

      // Borrar recibos asociados a los cobros de este arrendamiento
      const payments = await Payment.findAll({
        where: { id_arrendamiento: id },
        transaction
      });
      const paymentIds = payments.map((p) => p.id_cobro);
      if (paymentIds.length) {
        await Receipt.destroy({
          where: { id_cobro: paymentIds },
          transaction
        });
      }

      // Borrar cobros
      await Payment.destroy({
        where: { id_arrendamiento: id },
        transaction
      });

      // Liberar el inmueble
      if (lease.inmueble) {
        await lease.inmueble.update({ estado: true, estado_frontend: 'Disponible' }, { transaction });
      }

      // Borrar el arrendamiento
      await lease.destroy({ transaction });

      await transaction.commit();
      return { id_arrendamiento: id };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error eliminando arrendamiento ${id}: ${error.message}`);
      throw error;
    }
  }

  async getPayments(leaseId) {
    try {
      const payments = await Payment.findAll({
        where: { id_arrendamiento: leaseId },
        order: [['fecha_cobro', 'ASC']],
        logging: false
      });

      return payments;
    } catch (error) {
      throw error;
    }
  }

  async updatePaymentStatus(paymentId, status, fechaPago = null) {
    try {
      const payment = await Payment.findByPk(paymentId);

      if (!payment) {
        throw new Error('Cobro no encontrado');
      }

      const updateData = { estado: status };
      if (fechaPago) updateData.fecha_pago = fechaPago;

      await payment.update(updateData);

      // Si se marca como pagado, actualizar estado del arrendamiento a "Al día"
      if (status === 'Pagado') {
        const lease = await this.getLeaseById(payment.id_arrendamiento);
        if (lease.estado === 'Pendiente') {
          await lease.update({ estado: 'Al día' });
        }
      }

      return payment;
    } catch (error) {
      throw error;
    }
  }

  async createReceipt(receiptData) {
    try {
      const newReceipt = await Receipt.create({
        id_cobro: receiptData.id_cobro,
        url_comprobante: receiptData.url_comprobante,
        entidad_bancaria: receiptData.entidad_bancaria,
        referencia_bancaria: receiptData.referencia_bancaria,
        monto_pagado: receiptData.monto_pagado,
        fecha_pago: receiptData.fecha_pago,
        estado: receiptData.estado || 'En revisión',
        observaciones: receiptData.observaciones
      });

      return newReceipt;
    } catch (error) {
      throw error;
    }
  }

  async getLeaseStatistics() {
    try {
      const statistics = await Lease.findAll({
        attributes: [
          'estado',
          [sequelize.fn('COUNT', '*'), 'total'],
          [sequelize.fn('SUM', sequelize.col('valor_mensual')), 'total_mensual']
        ],
        group: ['estado'],
        raw: true
      });

      const totalActivos = await Lease.count({
        where: { estado: 'Activo' }
      });

      const ingresosEsteMes = await Payment.sum('valor_pago', {
        where: {
          estado: 'Pagado',
          fecha_pago: {
            [Op.between]: [
              new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
            ]
          }
        }
      });

      const cobrosPendientes = await Payment.count({
        where: { estado: 'Pendiente' }
      });

      return {
        por_estado: statistics,
        total_activos: totalActivos,
        ingresos_este_mes: ingresosEsteMes || 0,
        cobros_pendientes: cobrosPendientes
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new LeaseService();
