const leaseService = require('../services/leases.service');
const logger = require('../utils/logger');

class LeasesController {
  async createLease(req, res, next) {
    try {
      const lease = await leaseService.createLease(req.body);
      return res.status(201).json({
        success: true,
        message: 'Arrendamiento creado exitosamente',
        data: lease
      });
    } catch (error) {
      logger.error(`Error createLease: ${error.message}`);
      next(error);
    }
  }

  async getAllLeases(req, res, next) {
    try {
      const filters = { ...req.query };
      const leases = await leaseService.getAllLeases(filters);
      return res.status(200).json({
        success: true,
        message: 'Arrendamientos obtenidos exitosamente',
        data: leases,
        total: leases.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getLeaseById(req, res, next) {
    try {
      const { id } = req.params;
      const lease = await leaseService.getLeaseById(parseInt(id, 10));
      return res.status(200).json({
        success: true,
        message: 'Arrendamiento obtenido exitosamente',
        data: lease
      });
    } catch (error) {
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  async updateLease(req, res, next) {
    try {
      const { id } = req.params;
      const lease = await leaseService.updateLease(parseInt(id, 10), req.body);
      return res.status(200).json({
        success: true,
        message: 'Arrendamiento actualizado exitosamente',
        data: lease
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLeaseStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { estado, comentario } = req.validatedData || req.body;
      const lease = await leaseService.updateLeaseStatus(parseInt(id, 10), estado, comentario);
      return res.status(200).json({
        success: true,
        message: 'Estado del arrendamiento actualizado exitosamente',
        data: lease
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelLease(req, res, next) {
    try {
      const { id } = req.params;
      const lease = await leaseService.cancelLease(parseInt(id, 10));
      return res.status(200).json({
        success: true,
        message: 'Arrendamiento cancelado exitosamente',
        data: lease
      });
    } catch (error) {
      next(error);
    }
  }

  async finalizeLease(req, res, next) {
    try {
      const { id } = req.params;
      const lease = await leaseService.finalizeLease(parseInt(id, 10));
      return res.status(200).json({
        success: true,
        message: 'Arrendamiento finalizado exitosamente',
        data: lease
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteLease(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await leaseService.deleteLease(parseInt(id, 10));
      return res.status(200).json({
        success: true,
        message: 'Arrendamiento eliminado definitivamente',
        data: deleted
      });
    } catch (error) {
      next(error);
    }
  }

  async getPayments(req, res, next) {
    try {
      const { id } = req.params;
      const payments = await leaseService.getPayments(parseInt(id, 10));
      return res.status(200).json({
        success: true,
        message: 'Cobros obtenidos exitosamente',
        data: payments,
        total: payments.length
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePaymentStatus(req, res, next) {
    try {
      const { paymentId } = req.params;
      const { estado, fecha_pago } = req.validatedData || req.body;
      const payment = await leaseService.updatePaymentStatus(
        parseInt(paymentId, 10),
        estado,
        fecha_pago
      );
      return res.status(200).json({
        success: true,
        message: 'Cobro actualizado exitosamente',
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  async createReceipt(req, res, next) {
    try {
      const { paymentId } = req.params;
      const payload = {
        ...(req.validatedData || req.body),
        id_cobro: parseInt(paymentId, 10)
      };
      const receipt = await leaseService.createReceipt(payload);
      return res.status(201).json({
        success: true,
        message: 'Comprobante creado exitosamente',
        data: receipt
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req, res, next) {
    try {
      const statistics = await leaseService.getLeaseStatistics();
      return res.status(200).json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LeasesController();
