const { Op } = require('sequelize');
const {
  Lease,
  Payment,
  Receipt,
  Inmueble,
  Persona,
  Renant,
  SeguimientoArrendamiento
} = require('../models');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const { buildPaginationMeta } = require('../utils/pagination');

class LeaseService {
  getFixedChargeDay() {
    return 5;
  }

  normalizeFilterValue(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  normalizeLeaseStatusFilter(value) {
    const normalized = this.normalizeFilterValue(value);
    const map = {
      activo: 'Activo',
      'al dia': 'Al día',
      pendiente: 'Pendiente',
      debe: 'Debe',
      finalizado: 'Finalizado'
    };

    return map[normalized] || value;
  }

  normalizePropertyTypeFilter(value) {
    const normalized = this.normalizeFilterValue(value);
    const map = {
      casa: 'Casa',
      apartamento: 'Apartamento',
      apartaestudio: 'Apartaestudio',
      oficina: 'Oficina',
      finca: 'Finca',
      lote: 'Lote',
      local: 'Local',
      bodega: 'Bodega'
    };

    return map[normalized] || value;
  }

  normalizeStatus(value) {
    return String(value ?? '').trim().toLowerCase();
  }

  addUtcMonths(date, months) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    const result = new Date(date.getTime());
    result.setUTCMonth(result.getUTCMonth() + months);
    return result;
  }

  isDateBefore(dateA, dateB) {
    if (!(dateA instanceof Date) || !(dateB instanceof Date)) return false;
    return dateA.getTime() < dateB.getTime();
  }

  ensureMinimumLeaseTerm(startDateInput, endDateInput) {
    const startDate = this.parseDateFlexible(startDateInput);
    const endDate = this.parseDateFlexible(endDateInput);

    if (!startDate || !endDate) {
      const error = new Error('Las fechas del arrendamiento no son válidas.');
      error.status = 400;
      throw error;
    }

    const minimumEndDate = this.addUtcMonths(startDate, 1);
    if (!minimumEndDate || endDate < minimumEndDate) {
      const error = new Error('La duración mínima del contrato de arriendo es de un mes.');
      error.status = 400;
      throw error;
    }

    return { startDate, endDate, minimumEndDate };
  }

  isInactiveRenant(renant) {
    if (!renant) return true;

    const renantStatus = this.normalizeStatus(renant.estado);
    if (renantStatus === 'inactivo') return true;

    const personaStatus = renant.persona?.estado;
    if (personaStatus === false || personaStatus === 0) return true;

    return false;
  }

  getAutomaticTrackingComments() {
    return [
      'Cobros vencidos o exigibles sin pagar',
      'Todos los cobros pagados',
      'Estado restaurado automáticamente tras saldar cobros pendientes'
    ];
  }

  async getLatestTrackingEntry(leaseId, transaction = null) {
    return SeguimientoArrendamiento.findOne({
      where: { id_arrendamiento: leaseId },
      order: [['fecha_creacion', 'DESC'], ['id_seguimiento', 'DESC']],
      transaction
    });
  }

  async hasPendingPayments(leaseId, transaction = null) {
    const pendingCount = await Payment.count({
      where: {
        id_arrendamiento: leaseId,
        estado: {
          [Op.ne]: 'Pagado'
        }
      },
      transaction
    });

    return pendingCount > 0;
  }

  async getLatestManualTrackingEntry(leaseId, transaction = null) {
    const rows = await SeguimientoArrendamiento.findAll({
      where: {
        id_arrendamiento: leaseId,
        [Op.or]: [
          { comentario: null },
          {
            comentario: {
              [Op.notIn]: this.getAutomaticTrackingComments()
            }
          }
        ]
      },
      order: [['fecha_creacion', 'DESC'], ['id_seguimiento', 'DESC']],
      limit: 5,
      transaction
    });

    return rows.find((row) => row?.estado && row.estado !== 'Debe') || null;
  }

  parsePreNoticeTracking(comment = '') {
    const text = String(comment || '');
    if (!text.toLowerCase().includes('preaviso registrado por el arrendatario')) {
      return null;
    }

    const observationMatch = text.match(/Observación:\s*(.*?)(?:\s+Soporte:\s*https?:\/\/\S+)?$/i);
    const supportMatch = text.match(/Soporte:\s*(https?:\/\/\S+)/i);

    return {
      observacion: observationMatch?.[1]?.trim() || '',
      url_soporte: supportMatch?.[1]?.trim() || ''
    };
  }

  parsePreNoticeDecisionTracking(comment = '') {
    const text = String(comment || '');
    if (!text.toLowerCase().includes('decision:')) {
      return null;
    }

    const decisionMatch = text.match(/Decision:\s*(Aceptado|Rechazado)/i);
    const observationMatch = text.match(/Observacion(?: decision)?:\s*(.*)$/i);

    return {
      decision: decisionMatch?.[1]
        ? `${decisionMatch[1].charAt(0).toUpperCase()}${decisionMatch[1].slice(1).toLowerCase()}`
        : null,
      observacion_decision: observationMatch?.[1]?.trim() || ''
    };
  }

  parseExtensionTracking(comment = '') {
    const text = String(comment || '');
    const normalized = this.normalizeFilterValue(text);
    if (!normalized.includes('prorroga aplicada')) {
      return null;
    }

    const fromMatch = text.match(/desde\s*(\d{4}-\d{2}-\d{2})/i);
    const toMatch = text.match(/hasta\s*(\d{4}-\d{2}-\d{2})/i);
    if (!fromMatch || !toMatch) {
      return null;
    }

    const startDate = this.parseDateOnly(fromMatch[1]);
    const endDate = this.parseDateOnly(toMatch[1]);
    if (!startDate || !endDate || endDate <= startDate) {
      return null;
    }

    return {
      startDate,
      endDate,
      months: Math.max(this.diffMonths(startDate, endDate), 1)
    };
  }

  isPreNoticeDeletedTracking(comment = '') {
    return String(comment || '')
      .toLowerCase()
      .includes('preaviso eliminado del arrendamiento');
  }

  async getPreNoticeHistory(leaseId, transaction = null) {
    const rows = await SeguimientoArrendamiento.findAll({
      where: {
        id_arrendamiento: leaseId
      },
      order: [['fecha_creacion', 'ASC'], ['id_seguimiento', 'ASC']],
      limit: 100,
      transaction
    });

    const history = [];

    for (const row of rows) {
      if (this.isPreNoticeDeletedTracking(row?.comentario)) {
        continue;
      }

      const parsed = this.parsePreNoticeTracking(row?.comentario);
      const parsedDecision = this.parsePreNoticeDecisionTracking(row?.comentario);
      if (parsed) {
        const entryDate = row.fecha_creacion;
        const entryDateKey = entryDate ? this.formatDateOnly(entryDate) : '';
        const lastEntry = history[history.length - 1];
        const isDuplicateOfLastEntry =
          Boolean(lastEntry) &&
          String(lastEntry.observacion || '').trim() === String(parsed.observacion || '').trim() &&
          String(lastEntry.url_soporte || '').trim() === String(parsed.url_soporte || '').trim() &&
          String(lastEntry.fecha_creacion ? this.formatDateOnly(lastEntry.fecha_creacion) : '').trim() === entryDateKey;

        if (isDuplicateOfLastEntry) {
          continue;
        }

        history.push({
          observacion: parsed.observacion || '',
          url_soporte: parsed.url_soporte || '',
          fecha_creacion: entryDate,
          decision: parsedDecision?.decision || null,
          observacion_decision: parsedDecision?.observacion_decision || '',
          fecha_decision: parsedDecision?.decision ? row.fecha_creacion : null
        });
        continue;
      }

    }

    return history.filter((item) => Boolean(item.decision)).reverse();
  }

  async getLatestPreNoticeEntry(leaseId, transaction = null) {
    const history = await this.getPreNoticeHistory(leaseId, transaction);
    return history[0] || null;
  }

  async resolveStateAfterPaymentsAreUpToDate(lease, transaction = null) {
    if (!lease) return 'Al día';

    if (['Finalizado'].includes(lease.estado)) {
      return lease.estado;
    }

    const latestManualTracking = await this.getLatestManualTrackingEntry(
      lease.id_arrendamiento,
      transaction
    );

    if (latestManualTracking?.estado) {
      return latestManualTracking.estado;
    }

    if (lease.estado && lease.estado !== 'Debe') {
      return lease.estado;
    }

    return 'Al día';
  }
  // Recalcula el estado del arrendamiento según cobros pendientes/vencidos.
  async getDisplayedLeaseState(leaseId, lease = null, transaction = null) {
    const currentLease = lease || await this.getLeaseById(leaseId, transaction);
    if (!currentLease) return null;

    if (['Finalizado'].includes(currentLease.estado)) {
      return currentLease.estado;
    }

    const today = this.formatDateOnly(new Date());
    const pendingCount = await Payment.count({
      where: {
        id_arrendamiento: leaseId,
        [Op.or]: [
          { estado: 'Vencido' },
          {
            estado: 'Pendiente',
            fecha_cobro: { [Op.lte]: today }
          }
        ]
      },
      transaction
    });

    if (pendingCount > 0) {
      return 'Debe';
    }

    return this.resolveStateAfterPaymentsAreUpToDate(currentLease, transaction);
  }

  async syncLeaseStateFromPayments(leaseId, transaction = null) {
    const today = this.formatDateOnly(new Date());
    const pendingCount = await Payment.count({
      where: {
        id_arrendamiento: leaseId,
        [Op.or]: [
          { estado: 'Vencido' },
          {
            estado: 'Pendiente',
            fecha_cobro: { [Op.lte]: today }
          }
        ]
      },
      transaction
    });

    const lease = await this.getLeaseById(leaseId, transaction);
    if (!lease) return null;

    if (['Finalizado'].includes(lease.estado)) {
      return lease.estado;
    }

    const latestTracking = await this.getLatestTrackingEntry(leaseId, transaction);

    if (pendingCount === 0) {
      const resolvedState = await this.resolveStateAfterPaymentsAreUpToDate(lease, transaction);

      if (lease.estado !== resolvedState) {
        await lease.update({ estado: resolvedState }, { transaction });
      }

      const restoreComment =
        resolvedState === 'Al dÃ­a'
          ? 'Todos los cobros pagados'
          : 'Estado restaurado automÃ¡ticamente tras saldar cobros pendientes';

      if (
        latestTracking?.estado === 'Debe' &&
        latestTracking?.comentario === 'Cobros vencidos o exigibles sin pagar'
      ) {
        await this.logSeguimiento({
          id_arrendamiento: leaseId,
          estado: resolvedState,
          comentario: restoreComment,
          transaction
        });
      }

      return resolvedState;
    }

    if (
      latestTracking?.estado !== 'Debe' ||
      latestTracking?.comentario !== 'Cobros vencidos o exigibles sin pagar'
    ) {
      await this.logSeguimiento({
        id_arrendamiento: leaseId,
        estado: 'Debe',
        comentario: 'Cobros vencidos o exigibles sin pagar',
        transaction
      });
    }

    return 'Debe';

    /*
    if (pendingCount === 0) {
      await lease.update({ estado: 'Al día' }, { transaction });
      await this.logSeguimiento({
        id_arrendamiento: leaseId,
        estado: 'Al día',
        comentario: 'Todos los cobros pagados',
        transaction
      });
      return 'Al día';
    }

    await lease.update({ estado: 'Debe' }, { transaction });
    await this.logSeguimiento({
      id_arrendamiento: leaseId,
      estado: 'Debe',
      comentario: 'Cobros vencidos o exigibles sin pagar',
      transaction
    });
    return 'Debe';
    */
  }

  async logSeguimiento({ id_arrendamiento, estado, comentario = null, id_persona = null, transaction = null }) {
    try {
      await SeguimientoArrendamiento.create({
        id_arrendamiento,
        estado,
        comentario,
        id_persona
      }, { transaction });
    } catch (error) {
      logger.error(`❌ No se pudo registrar seguimiento de arrendamiento ${id_arrendamiento}: ${error.message}`);
    }
  }

  async resolveCodeudor(codeudorPayload, transaction) {
    if (!codeudorPayload) return null;
    const {
      tipo_documento,
      numero_documento,
      nombre_completo,
      apellido_completo,
      correo,
      telefono,
      actividad_economica
    } = codeudorPayload;
    if (!tipo_documento || !numero_documento) {
      throw new Error('Faltan datos del codeudor (tipo o número de documento)');
    }

    // Buscar si ya existe
    let persona = await Persona.findOne({
      where: { tipo_documento, numero_documento },
      transaction
    });

    if (!persona) {
      try {
        persona = await Persona.create({
          tipo_documento,
          numero_documento,
          nombre_completo: nombre_completo || '',
          apellido_completo: apellido_completo || '',
          correo: correo || `${numero_documento}@placeholder.com`,
          telefono: telefono || null,
          actividad_economica: actividad_economica || null,
          tiene_cuenta: false,
          estado: true
        }, { transaction });
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          persona = await Persona.findOne({
            where: { tipo_documento, numero_documento },
            transaction
          });
        } else {
          throw error;
        }
      }
    } else {
      // Actualizar datos básicos si vienen
      await persona.update({
        nombre_completo: nombre_completo || persona.nombre_completo,
        apellido_completo: apellido_completo || persona.apellido_completo,
        correo: correo || persona.correo,
        telefono: telefono || persona.telefono,
        actividad_economica: actividad_economica || persona.actividad_economica || null
      }, { transaction });
    }

    return persona.id_persona;
  }

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
        const arrendatario = await Renant.findByPk(leaseData.id_cliente, {
          transaction: t,
          include: [{ model: Persona, as: 'persona' }]
        });
        if (!arrendatario) {
          throw new Error('Arrendatario no encontrado');
        }
        if (this.isInactiveRenant(arrendatario)) {
          const error = new Error('El arrendatario está inactivo y no puede registrarse en un arriendo.');
          error.status = 400;
          throw error;
        }

        this.ensureMinimumLeaseTerm(leaseData.fecha_inicio, leaseData.fecha_finalizacion);

        // 2.1. Resolver codeudor (Persona) si viene en el payload
        let codeudorId = null;
        if (leaseData.id_codeudor) {
          const codeudor = await Persona.findByPk(leaseData.id_codeudor, { transaction: t });
          if (!codeudor) throw new Error('Codeudor no encontrado');
          codeudorId = leaseData.id_codeudor;
        } else if (leaseData.codeudor) {
          codeudorId = await this.resolveCodeudor(leaseData.codeudor, t);
        }

        // 3. Crear el arrendamiento
        const newLease = await Lease.create({
          id_cliente: leaseData.id_cliente,
          id_inmueble: leaseData.id_inmueble,
          id_codeudor: codeudorId,
          fecha_inicio: leaseData.fecha_inicio,
          fecha_finalizacion: leaseData.fecha_finalizacion,
          valor_mensual: leaseData.valor_mensual,
          estado: 'Activo'
        }, { transaction: t });

        // 4. Actualizar estado del inmueble a "Arrendado"
        await inmueble.update({
          estado: false,
          estado_frontend: 'Arrendado',
          destacado: false
        }, { transaction: t });

        // 5. Generar cobros mensuales automáticamente
        await this.generateMonthlyPayments(newLease.id_arrendamiento, t, {
          chargeDay: this.getFixedChargeDay()
        });

        return await this.getLeaseById(newLease.id_arrendamiento, t);

      } catch (error) {
        throw error;
      }
    });

    return result;
  }

  // Utilidades para fechas sin desfase de zona (DATEONLY)
  formatDateOnly(dateObj) {
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  parseDateOnly(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value)) {
      return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    }
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const [, y, m, d] = match.map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  // Acepta YYYY-MM-DD (ISO) y DD/MM/YYYY (formato usado en UI) y devuelve Date en UTC.
  parseDateFlexible(value) {
    if (!value) return null;

    // Si viene como Date, usamos su ISO (UTC) para conservar el día elegido en el cliente
    if (value instanceof Date && !Number.isNaN(value)) {
      const iso = value.toISOString().slice(0, 10); // YYYY-MM-DD
      return this.parseDateOnly(iso);
    }

    // Si es string o algo parseable por Date, usamos su ISO para quedarnos con YYYY-MM-DD
    const maybeDate = new Date(value);
    if (!Number.isNaN(maybeDate)) {
      const isoFromDate = maybeDate.toISOString().slice(0, 10);
      return this.parseDateOnly(isoFromDate);
    }

    const matchDMY = String(value).match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
    if (matchDMY) {
      const [, d, m, y] = matchDMY.map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    }

    return null;
  }

  diffMonths(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    return (
      (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
      (endDate.getUTCMonth() - startDate.getUTCMonth())
    );
  }

  async resolveLeaseTermMonths(lease, transaction = null) {
    const leaseId = lease?.id_arrendamiento;
    if (leaseId) {
      const trackingRows = await SeguimientoArrendamiento.findAll({
        where: { id_arrendamiento: leaseId },
        attributes: ['comentario'],
        order: [['fecha_creacion', 'ASC'], ['id_seguimiento', 'ASC']],
        transaction
      });

      for (const row of trackingRows) {
        const parsedExtension = this.parseExtensionTracking(row?.comentario);
        if (parsedExtension?.months) {
          return parsedExtension.months;
        }
      }
    }

    const parsedStartDate = this.parseDateOnly(lease?.fecha_inicio);
    const parsedEndDate = this.parseDateOnly(lease?.fecha_finalizacion);
    return Math.max(this.diffMonths(parsedStartDate, parsedEndDate), 1);
  }

  addMonthsClamped(date, monthsToAdd) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const targetMonthDate = new Date(Date.UTC(year, month + monthsToAdd, 1));
    const lastDay = new Date(
      Date.UTC(targetMonthDate.getUTCFullYear(), targetMonthDate.getUTCMonth() + 1, 0)
    ).getUTCDate();
    return new Date(
      Date.UTC(targetMonthDate.getUTCFullYear(), targetMonthDate.getUTCMonth(), Math.min(day, lastDay))
    );
  }

  buildMonthlyChargeDate(year, month, chargeDay = this.getFixedChargeDay()) {
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(chargeDay, lastDayOfMonth)));
  }

  getFirstChargeDate(startDate, chargeDay = this.getFixedChargeDay()) {
    if (!startDate) return null;

    const sameMonthChargeDate = this.buildMonthlyChargeDate(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      chargeDay
    );

    if (startDate.getUTCDate() <= chargeDay) {
      return sameMonthChargeDate;
    }

    return this.buildMonthlyChargeDate(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth() + 1,
      chargeDay
    );
  }

  diffDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
  }

  roundCurrency(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return 0;
    return Math.round((numericValue + Number.EPSILON) * 100) / 100;
  }

  calculateAdditionalChargeAmount(monthlyValue, startDate, chargeDate) {
    const canonicalMonthlyValue = Number(monthlyValue);
    if (!Number.isFinite(canonicalMonthlyValue)) {
      return 0;
    }

    if (!startDate || !chargeDate || chargeDate.getTime() <= startDate.getTime()) {
      return 0;
    }

    const daysToCharge = this.diffDays(startDate, chargeDate);
    if (daysToCharge <= 0) {
      return 0;
    }

    return this.roundCurrency((canonicalMonthlyValue / 30) * daysToCharge);
  }

  async generateExtensionPayments(leaseId, oldEndDate, newEndDate, transaction = null, options = {}) {
    const { graceDays = 10 } = options;
    const lease = await this.getLeaseById(leaseId, transaction);
    const payments = await Payment.findAll({
      where: { id_arrendamiento: leaseId },
      order: [['fecha_cobro', 'DESC']],
      limit: 1,
      transaction
    });

    const startDate = this.parseDateOnly(lease.fecha_inicio);
    const lastPayment = payments[0] || null;
    const chargeDay =
      this.parseDateOnly(lastPayment?.fecha_cobro)?.getUTCDate() ||
      this.getFixedChargeDay();

    let cursor = lastPayment
      ? this.addMonthsClamped(this.parseDateOnly(lastPayment.fecha_cobro), 1)
      : this.addMonthsClamped(oldEndDate, 0);

    const newPayments = [];
    while (cursor < newEndDate) {
      const lastDayOfMonth = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)
      ).getUTCDate();
      const chargeDate = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), Math.min(chargeDay, lastDayOfMonth))
      );
      const dueDate = new Date(chargeDate);
      dueDate.setUTCDate(dueDate.getUTCDate() + graceDays);

      const exists = await Payment.count({
        where: {
          id_arrendamiento: leaseId,
          fecha_cobro: this.formatDateOnly(chargeDate)
        },
        transaction
      });

      if (!exists) {
        newPayments.push({
          id_arrendamiento: leaseId,
          fecha_cobro: this.formatDateOnly(chargeDate),
          fecha_limite: this.formatDateOnly(dueDate),
          valor_pago: lease.valor_mensual,
          estado: 'Pendiente'
        });
      }

      cursor = this.addMonthsClamped(chargeDate, 1);
    }

    if (newPayments.length) {
      await Payment.bulkCreate(newPayments, { transaction });
    }

    return newPayments;
  }

  async generateMonthlyPayments(leaseId, transaction = null, options = {}) {
    try {
      const { chargeDay: requestedChargeDay = this.getFixedChargeDay(), graceDays = 10 } = options;

      const lease = await this.getLeaseById(leaseId, transaction);
      const startDate = this.parseDateOnly(lease.fecha_inicio);
      const endDate = this.parseDateOnly(lease.fecha_finalizacion);
      if (!startDate || !endDate) {
        throw new Error('Fechas de arrendamiento inválidas');
      }

      const payments = [];
      const chargeDay = requestedChargeDay || this.getFixedChargeDay();

      // Primer cobro: mes de inicio; si el día cae antes del inicio, se mueve al mes siguiente
      const firstChargeDate = this.getFirstChargeDate(startDate, chargeDay);
      const additionalChargeAmount = this.calculateAdditionalChargeAmount(
        lease.valor_mensual,
        startDate,
        firstChargeDate
      );

      if (firstChargeDate && additionalChargeAmount > 0) {
        payments.push({
          id_arrendamiento: leaseId,
          fecha_cobro: this.formatDateOnly(startDate),
          fecha_limite: this.formatDateOnly(firstChargeDate),
          valor_pago: additionalChargeAmount,
          estado: 'Pendiente'
        });
      }

      let cursor = firstChargeDate;

      while (cursor && cursor < endDate) {
        const chargeDate = this.buildMonthlyChargeDate(
          cursor.getUTCFullYear(),
          cursor.getUTCMonth(),
          chargeDay
        );

        const dueDate = new Date(chargeDate);
        dueDate.setUTCDate(dueDate.getUTCDate() + graceDays);

        payments.push({
          id_arrendamiento: leaseId,
          fecha_cobro: this.formatDateOnly(chargeDate),
          fecha_limite: this.formatDateOnly(dueDate),
          valor_pago: this.roundCurrency(lease.valor_mensual),
          estado: 'Pendiente'
        });

        cursor = this.buildMonthlyChargeDate(
          chargeDate.getUTCFullYear(),
          chargeDate.getUTCMonth() + 1,
          chargeDay
        );
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
      attributes: {
        include: [
          [
            sequelize.literal(`(SELECT COUNT(*) FROM Seguimiento_arrendamiento sa WHERE sa.id_arrendamiento = Lease.id_arrendamiento)`),
            'total_seguimientos'
          ]
        ]
      },
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
            'area_construida',
            'area_terreno',
            'precio_arriendo'
          ],
          include: [
            {
              association: 'comodidades',
              attributes: ['id_comodidad', 'nombre'],
              through: { attributes: ['cantidad'] }
            }
          ]
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
        {
          association: 'codeudor',
          attributes: ['id_persona', 'nombre_completo', 'apellido_completo', 'correo', 'telefono', 'tipo_documento', 'numero_documento', 'actividad_economica']
        },
        {
          association: 'seguimientos',
          separate: true,
          limit: 1,
          order: [['fecha_creacion', 'DESC'], ['id_seguimiento', 'DESC']],
          attributes: ['id_seguimiento', 'estado', 'comentario', 'fecha_creacion', 'id_persona']
        }
      ],
      transaction
    });

    if (!lease) throw new Error('Arrendamiento no encontrado');

    lease.setDataValue(
      'duracion_prorroga_meses',
      await this.resolveLeaseTermMonths(lease, transaction)
    );

    return lease;
  }

  async getAllLeases(filters = {}) {
    try {
      logger.info(`Consultando arrendamientos con filtros: ${JSON.stringify(filters)}`);

      const pagination = {
        enabled: Boolean(filters.pagination?.enabled),
        page: filters.pagination?.page || 1,
        limit: filters.pagination?.limit || null,
        offset: filters.pagination?.offset || 0
      };

      const attributes = {
        include: [
          [
            sequelize.literal(`(SELECT COUNT(*) FROM Seguimiento_arrendamiento sa WHERE sa.id_arrendamiento = Lease.id_arrendamiento)`),
            'total_seguimientos'
          ]
        ]
      };

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
            'area_construida',
            'area_terreno',
            'precio_arriendo'
          ],
          include: [
            {
              association: 'comodidades',
              attributes: ['id_comodidad', 'nombre'],
              through: { attributes: ['cantidad'] }
            }
          ]
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
        {
          association: 'codeudor',
          attributes: ['id_persona', 'nombre_completo', 'apellido_completo', 'correo', 'telefono', 'tipo_documento', 'numero_documento', 'actividad_economica']
        },
        {
          association: 'seguimientos',
          separate: true,
          limit: 1,
          order: [['fecha_creacion', 'DESC'], ['id_seguimiento', 'DESC']],
          attributes: ['id_seguimiento', 'estado', 'comentario', 'fecha_creacion', 'id_persona']
        }
      ];

      const searchIncludes = [
        {
          association: 'inmueble',
          attributes: [],
          required: false
        },
        {
          association: 'arrendatario',
          attributes: [],
          required: false,
          include: [
            {
              association: 'persona',
              attributes: [],
              required: false
            }
          ]
        },
        {
          association: 'codeudor',
          attributes: [],
          required: false
        }
      ];

      const whereClause = {};
      const normalizedEstado = this.normalizeLeaseStatusFilter(filters.estado);
      if (normalizedEstado) whereClause.estado = normalizedEstado;
      if (filters.id_cliente) whereClause.id_cliente = filters.id_cliente;
      if (filters.id_arrendatario) whereClause.id_cliente = filters.id_arrendatario;
      if (filters.tipo_inmueble || filters.tipoInmueble) {
        whereClause['$inmueble.categoria$'] = this.normalizePropertyTypeFilter(
          filters.tipo_inmueble || filters.tipoInmueble
        );
      }
      if (filters.fecha_inicio && filters.fecha_fin) {
        whereClause.fecha_inicio = {
          [Op.between]: [filters.fecha_inicio, filters.fecha_fin]
        };
      }

      const rawSearch = String(filters.search || '').trim();
      if (rawSearch) {
        const search = `%${rawSearch}%`;
        whereClause[Op.and] = [
          {
            [Op.or]: [
              { estado: { [Op.like]: search } },
              { '$inmueble.registro_inmobiliario$': { [Op.like]: search } },
              { '$inmueble.direccion$': { [Op.like]: search } },
              { '$inmueble.ciudad$': { [Op.like]: search } },
              { '$inmueble.departamento$': { [Op.like]: search } },
              { '$inmueble.categoria$': { [Op.like]: search } },
              { '$arrendatario.persona.nombre_completo$': { [Op.like]: search } },
              { '$arrendatario.persona.apellido_completo$': { [Op.like]: search } },
              { '$arrendatario.persona.numero_documento$': { [Op.like]: search } },
              { '$arrendatario.persona.correo$': { [Op.like]: search } },
              { '$arrendatario.persona.telefono$': { [Op.like]: search } },
              { '$codeudor.nombre_completo$': { [Op.like]: search } },
              { '$codeudor.apellido_completo$': { [Op.like]: search } },
              { '$codeudor.numero_documento$': { [Op.like]: search } },
              { '$codeudor.correo$': { [Op.like]: search } },
              { '$codeudor.telefono$': { [Op.like]: search } }
            ]
          }
        ];
      }

      const listQuery = {
        where: whereClause,
        attributes: ['id_arrendamiento', 'fecha_inicio'],
        include: searchIncludes,
        distinct: true,
        col: 'id_arrendamiento',
        order: [
          ['fecha_inicio', 'DESC'],
          ['id_arrendamiento', 'DESC']
        ],
        logging: false
      };

      if (pagination.enabled) {
        listQuery.limit = pagination.limit;
        listQuery.offset = pagination.offset;
      }

      const { count, rows } = await Lease.findAndCountAll(listQuery);
      const leaseIds = rows.map((lease) => lease.id_arrendamiento);

      if (!leaseIds.length) {
        return {
          data: [],
          pagination: buildPaginationMeta({
            total: count,
            page: pagination.page,
            limit: pagination.limit,
            enabled: pagination.enabled
          })
        };
      }

      const leases = await Lease.findAll({
        where: { id_arrendamiento: { [Op.in]: leaseIds } },
        attributes,
        include: includeOptions,
        order: [
          ['fecha_inicio', 'DESC'],
          ['id_arrendamiento', 'DESC']
        ],
        logging: false
      });

      const orderMap = new Map(leaseIds.map((id, index) => [id, index]));
      leases.sort((a, b) => orderMap.get(a.id_arrendamiento) - orderMap.get(b.id_arrendamiento));

      logger.info(`${leases.length} arrendamientos obtenidos exitosamente`);

      const data = await Promise.all(leases.map(async (lease) => {
        const latestPreNotice = await this.getLatestPreNoticeEntry(lease.id_arrendamiento);
        const preNoticeHistory = await this.getPreNoticeHistory(lease.id_arrendamiento);
        const leaseTermMonths = await this.resolveLeaseTermMonths(lease);

        return {
          id_arrendamiento: lease.id_arrendamiento,
          id_arrendatario: lease.id_cliente,
          id_codeudor: lease.id_codeudor,
          fecha_inicio: lease.fecha_inicio,
          fecha_finalizacion: lease.fecha_finalizacion,
          valor_mensual: lease.valor_mensual,
          estado: await this.getDisplayedLeaseState(lease.id_arrendamiento, lease),
          estado_base: lease.estado,
          duracion_meses: lease.duracion_meses,
          duracion_prorroga_meses: leaseTermMonths,
          fecha_creacion: lease.fecha_creacion,
          inmueble: lease.inmueble ? {
            id_inmueble: lease.inmueble.id_inmueble,
            registro_inmobiliario: lease.inmueble.registro_inmobiliario,
            direccion: lease.inmueble.direccion,
            ciudad: lease.inmueble.ciudad,
            departamento: lease.inmueble.departamento,
            categoria: lease.inmueble.categoria,
            area_construida: lease.inmueble.area_construida,
            area_terreno: lease.inmueble.area_terreno,
            precio_arriendo: lease.inmueble.precio_arriendo,
            comodidades: lease.inmueble.comodidades || []
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
          codeudor: lease.codeudor ? {
            id_persona: lease.codeudor.id_persona,
            nombre_completo: lease.codeudor.nombre_completo,
            apellido_completo: lease.codeudor.apellido_completo,
            correo: lease.codeudor.correo,
            telefono: lease.codeudor.telefono,
            tipo_documento: lease.codeudor.tipo_documento,
            numero_documento: lease.codeudor.numero_documento,
            actividad_economica: lease.codeudor.actividad_economica
          } : null,
          ultimo_seguimiento_estado: lease.seguimientos?.[0]?.estado || null,
          ultimo_seguimiento_comentario: lease.seguimientos?.[0]?.comentario ?? lease.seguimientos?.[0]?.descripcion ?? null,
          ultimo_seguimiento_descripcion: lease.seguimientos?.[0]?.descripcion ?? lease.seguimientos?.[0]?.comentario ?? null,
          ultimo_seguimiento_fecha: lease.seguimientos?.[0]?.fecha_creacion || null,
          preaviso_observacion: latestPreNotice?.observacion || null,
          preaviso_url_soporte: latestPreNotice?.url_soporte || null,
          preaviso_fecha: latestPreNotice?.fecha_creacion || null,
          preaviso_decision: latestPreNotice?.decision || null,
          preaviso_observacion_decision: latestPreNotice?.observacion_decision || null,
          preaviso_fecha_decision: latestPreNotice?.fecha_decision || null,
          preavisos_historial: preNoticeHistory,
          total_seguimientos: Number(lease.get('total_seguimientos')) || 0
        };
      }));

      return {
        data,
        pagination: buildPaginationMeta({
          total: count,
          page: pagination.page,
          limit: pagination.limit,
          enabled: pagination.enabled
        })
      };
    } catch (error) {
      logger.error(`Error en getAllLeases: ${error.message}`);
      throw error;
    }
  }

  async updateLease(id, updateData) {
    try {
      const lease = await this.getLeaseById(id);

      if (!lease) {
        throw new Error('Arrendamiento no encontrado');
      }

      // Validar codeudor si viene
      const payload = { ...updateData };
      if (updateData.id_codeudor) {
        const codeudor = await Persona.findByPk(updateData.id_codeudor);
        if (!codeudor) throw new Error('Codeudor no encontrado');
      } else if (updateData.codeudor) {
        const codeudorId = await this.resolveCodeudor(updateData.codeudor);
        payload.id_codeudor = codeudorId;
      }

      const nextStartDate = payload.fecha_inicio ?? lease.fecha_inicio;
      const nextEndDate = payload.fecha_finalizacion ?? lease.fecha_finalizacion;
      this.ensureMinimumLeaseTerm(nextStartDate, nextEndDate);

      await lease.update(payload);

      return await this.getLeaseById(id);
    } catch (error) {
      throw error;
    }
  }

  async adjustRent(id, payload = {}, userId = null) {
    return sequelize.transaction(async (t) => {
      const lease = await this.getLeaseById(id, t);
      if (!lease) {
        throw new Error('Arrendamiento no encontrado');
      }

      if (['Finalizado'].includes(lease.estado)) {
        throw new Error('No es posible reajustar el canon de un arrendamiento finalizado');
      }

      const adjustmentDate = this.parseDateFlexible(payload.fecha_reajuste);
      const startDate = this.parseDateOnly(lease.fecha_inicio);
      const endDate = this.parseDateOnly(lease.fecha_finalizacion);
      const newMonthlyValue = Number(payload.valor_mensual);

      if (!adjustmentDate || !startDate || !endDate) {
        throw new Error('Las fechas del reajuste no son válidas');
      }

      if (!Number.isFinite(newMonthlyValue) || newMonthlyValue <= 0) {
        throw new Error('El nuevo canon debe ser mayor a cero');
      }

      const minimumAdjustmentDate = this.addUtcMonths(startDate, 12);
      if (this.isDateBefore(adjustmentDate, minimumAdjustmentDate)) {
        throw new Error('El reajuste del canon solo puede aplicarse a partir del primer año del contrato');
      }

      if (adjustmentDate > endDate) {
        throw new Error('La fecha del reajuste no puede ser posterior a la fecha final del contrato');
      }

      await lease.update(
        { valor_mensual: this.roundCurrency(newMonthlyValue) },
        { transaction: t }
      );

      await Payment.update(
        { valor_pago: this.roundCurrency(newMonthlyValue) },
        {
          where: {
            id_arrendamiento: id,
            estado: { [Op.ne]: 'Pagado' },
            fecha_cobro: { [Op.gte]: this.formatDateOnly(adjustmentDate) }
          },
          transaction: t
        }
      );

      const comentarioReajuste =
        payload.comentario?.trim() ||
        `Reajuste de canon aplicado a ${this.roundCurrency(newMonthlyValue)} desde ${this.formatDateOnly(adjustmentDate)}`;

      await this.logSeguimiento({
        id_arrendamiento: id,
        estado: lease.estado,
        comentario: comentarioReajuste,
        id_persona: userId,
        transaction: t
      });

      return this.getLeaseById(id, t);
    });
  }

  async extendLease(id, fechaFinalizacion, comentario = null, userId = null) {
    return sequelize.transaction(async (t) => {
      const lease = await this.getLeaseById(id, t);
      if (!lease) {
        throw new Error('Arrendamiento no encontrado');
      }

      if (['Finalizado'].includes(lease.estado)) {
        throw new Error('No es posible prorrogar un arrendamiento finalizado');
      }

      const startDate = this.parseDateOnly(lease.fecha_inicio);
      const oldEndDate = this.parseDateOnly(lease.fecha_finalizacion);
      const requestedEndDate = this.parseDateFlexible(fechaFinalizacion);

      if (!startDate || !oldEndDate) {
        throw new Error('Las fechas del arrendamiento no son válidas para aplicar la prórroga');
      }

      const leaseTermMonths = await this.resolveLeaseTermMonths(lease, t);
      const newEndDate = this.addMonthsClamped(oldEndDate, leaseTermMonths);

      if (!newEndDate || newEndDate <= oldEndDate) {
        throw new Error('No fue posible calcular la nueva fecha de finalización de la prórroga');
      }

      if (requestedEndDate && this.formatDateOnly(requestedEndDate) !== this.formatDateOnly(newEndDate)) {
        logger.warn(
          `La fecha de prórroga solicitada (${this.formatDateOnly(requestedEndDate)}) no coincide con la duración original del contrato. Se aplicará ${this.formatDateOnly(newEndDate)} para el arrendamiento ${id}.`
        );
      }

      await lease.update(
        { fecha_finalizacion: this.formatDateOnly(newEndDate) },
        { transaction: t }
      );

      await this.generateExtensionPayments(id, oldEndDate, newEndDate, t);

      const comentarioProrroga =
        comentario?.trim() ||
        `Prórroga aplicada desde ${this.formatDateOnly(oldEndDate)} hasta ${this.formatDateOnly(newEndDate)} (${leaseTermMonths} ${leaseTermMonths === 1 ? 'mes' : 'meses'})`;

      await this.logSeguimiento({
        id_arrendamiento: id,
        estado: lease.estado,
        comentario: comentarioProrroga,
        id_persona: userId,
        transaction: t
      });

      return this.getLeaseById(id, t);
    });
  }

  async registerPreNotice(id, payload = {}, userId = null) {
    const lease = await this.getLeaseById(id);
    if (!lease) {
      throw new Error('Arrendamiento no encontrado');
    }

    const decision = payload.decision?.trim() || null;

    const observation = payload.comentario?.trim() || 'Sin observaciones adicionales';
    const attachmentUrl = payload.url_soporte?.trim() || null;
    const latestPreNotice = await this.getLatestPreNoticeEntry(id);
    const sameObservation = String(latestPreNotice?.observacion || '').trim() === observation;
    const sameSupport = String(latestPreNotice?.url_soporte || '').trim() === String(attachmentUrl || '').trim();
    const sameDecision = String(latestPreNotice?.decision || '').trim() === String(decision || '').trim();

    if (sameObservation && sameSupport && sameDecision) {
      const updatedLease = await this.getLeaseById(id);
      const preNoticeHistory = await this.getPreNoticeHistory(id);
      return {
        ...updatedLease.toJSON(),
        preaviso_observacion: latestPreNotice?.observacion || null,
        preaviso_url_soporte: latestPreNotice?.url_soporte || null,
        preaviso_fecha: latestPreNotice?.fecha_creacion || null,
        preaviso_decision: latestPreNotice?.decision || null,
        preaviso_observacion_decision: latestPreNotice?.observacion_decision || null,
        preaviso_fecha_decision: latestPreNotice?.fecha_decision || null,
        preavisos_historial: preNoticeHistory,
      };
    }
    const comentario = [
      'Preaviso registrado por el arrendatario.',
      `Decision: ${decision}`,
      `Observación: ${observation}`,
      attachmentUrl ? `Soporte: ${attachmentUrl}` : null
    ]
      .filter(Boolean)
      .join(' ');

    await this.logSeguimiento({
      id_arrendamiento: id,
      estado: lease.estado,
      comentario,
      id_persona: userId
    });

    const updatedLease = await this.getLeaseById(id);
    const latestRegisteredPreNotice = await this.getLatestPreNoticeEntry(id);
    const preNoticeHistory = await this.getPreNoticeHistory(id);
    return {
      ...updatedLease.toJSON(),
      preaviso_observacion: latestRegisteredPreNotice?.observacion || null,
      preaviso_url_soporte: latestRegisteredPreNotice?.url_soporte || null,
      preaviso_fecha: latestRegisteredPreNotice?.fecha_creacion || null,
      preaviso_decision: latestRegisteredPreNotice?.decision || null,
      preaviso_observacion_decision: latestRegisteredPreNotice?.observacion_decision || null,
      preaviso_fecha_decision: latestRegisteredPreNotice?.fecha_decision || null,
      preavisos_historial: preNoticeHistory,
    };
  }

  async deletePreNotice(id, userId = null) {
    const lease = await this.getLeaseById(id);
    if (!lease) {
      throw new Error('Arrendamiento no encontrado');
    }

    const currentPreNotice = await this.getLatestPreNoticeEntry(id);
    if (!currentPreNotice) {
      throw new Error('No hay un preaviso registrado para eliminar');
    }

    await this.logSeguimiento({
      id_arrendamiento: id,
      estado: lease.estado,
      comentario: 'Preaviso eliminado del arrendamiento.',
      id_persona: userId
    });

    return this.getLeaseById(id);
  }

  async updateLeaseStatus(id, estado, comentario = null, userId = null) {
    try {
      const allowedStatuses = ['Activo', 'Al d\u00eda', 'Pendiente', 'Debe', 'Finalizado'];
      if (!allowedStatuses.includes(estado)) {
        throw new Error('Estado de arrendamiento no válido');
      }

      let updatedLease;

      // Reutilizar l?gica existente para estado terminal
      if (estado === 'Finalizado') {
        updatedLease = await this.finalizeLease(id);
      } else {
        const lease = await this.getLeaseById(id);
        if (!lease) throw new Error('Arrendamiento no encontrado');
        await lease.update({ estado });
        updatedLease = await this.getLeaseById(id);
      }

      await this.logSeguimiento({
        id_arrendamiento: id,
        estado,
        comentario,
        id_persona: userId
      });

      // Nota: No tenemos tabla de historial; solo registramos en logs
      logger.info(`Estado de arrendamiento ${id} actualizado a ${estado}${comentario ? ` (comentario: ${comentario})` : ''}`);

      return await this.getLeaseById(id);
    } catch (error) {
      throw error;
    }
  }

  async cancelLease(id) {
    const error = new Error('El estado Cancelado ya no est\u00e1 disponible para arrendamientos. Usa Finalizado.');
    error.status = 400;
    throw error;
  }

  async finalizeLease(id) {
    try {
      const lease = await this.getLeaseById(id);

      if (!lease) {
        throw new Error('Arrendamiento no encontrado');
      }

      const hasPendingPayments = await this.hasPendingPayments(id);
      if (hasPendingPayments) {
        const error = new Error('No se puede finalizar el arriendo hasta que todos los pagos esten realizados.');
        error.status = 400;
        throw error;
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
        include: [{
          model: Receipt,
          as: 'comprobante',
          attributes: [
            'id_comprobante',
            'url_comprobante',
            'entidad_bancaria',
            'referencia_bancaria',
            'monto_pagado',
            'estado',
            'fecha_pago',
            'observaciones',
            'fecha_creacion'
          ]
        }],
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

      // Recalcular estado general del arrendamiento según cobros pendientes/vencidos
      const leaseState = await this.getDisplayedLeaseState(payment.id_arrendamiento);

      return { ...payment.get({ plain: true }), lease_estado: leaseState };
    } catch (error) {
      throw error;
    }
  }

  async createReceipt(receiptData) {
    try {
      const payment = await Payment.findByPk(receiptData.id_cobro);
      if (!payment) throw new Error('Cobro no encontrado');

      // Normalizar y validar fecha de pago (usar solo la porción de fecha para evitar desfases horario)
      const payDate = this.parseDateFlexible(receiptData.fecha_pago);
      if (!payDate) {
        throw new Error('Fecha de pago inválida. Usa formato YYYY-MM-DD o DD/MM/YYYY');
      }
      const payDateStr = this.formatDateOnly(payDate);

      const formattedPayDate = payDateStr;

      const newReceipt = await Receipt.create({
        id_cobro: receiptData.id_cobro,
        url_comprobante: receiptData.url_comprobante,
        entidad_bancaria: receiptData.entidad_bancaria,
        referencia_bancaria: receiptData.referencia_bancaria,
        monto_pagado: receiptData.monto_pagado,
        fecha_pago: formattedPayDate,
        // Default debe coincidir con el CHECK de la BD
        estado: receiptData.estado || 'En revisión',
        observaciones: receiptData.observaciones
      });

      // Al subir comprobante, marcar el cobro como pagado y registrar fecha de pago
      await Payment.update(
        { estado: 'Pagado', fecha_pago: formattedPayDate },
        { where: { id_cobro: receiptData.id_cobro } }
      );

      const leaseState = await this.getDisplayedLeaseState(payment.id_arrendamiento);
      return { ...newReceipt.get({ plain: true }), lease_estado: leaseState };
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
