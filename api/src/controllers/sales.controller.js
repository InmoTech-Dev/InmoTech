const saleService = require('../services/sales.service');
const logger = require('../utils/logger');

class SalesController {
  async createSale(req, res, next) {
    try {
      const data = req.validatedData || req.body;
      const newSale = await saleService.createSale(data);
      return res.status(201).json({ 
        success: true, 
        message: 'Venta creada exitosamente',
        data: newSale 
      });
    } catch (error) {
      if (error.message.includes('no encontrado')) {
        return res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      }
      next(error);
    }
  }

  async getAllSales(req, res, next) {
    try {
      const filters = {};

      if (req.query.estado) {
        filters.estado = req.query.estado;
      }

      if (req.query.id_persona) {
        filters.id_persona = parseInt(req.query.id_persona);
      }

      if (req.query.fecha_inicio && req.query.fecha_fin) {
        filters.fecha_inicio = req.query.fecha_inicio;
        filters.fecha_fin = req.query.fecha_fin;
      }

      const sales = await saleService.getAllSales(filters);

      return res.status(200).json({
        success: true,
        message: 'Ventas obtenidas exitosamente',
        data: sales,
        total: sales.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getSaleById(req, res, next) {
    try {
      const { id } = req.params;
      const sale = await saleService.getSaleById(parseInt(id));

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Venta obtenida exitosamente',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSale(req, res, next) {
    try {
      const { id } = req.params;
      const sale = await saleService.updateSale(parseInt(id), req.validatedData || req.body);

      return res.status(200).json({
        success: true,
        message: 'Venta actualizada exitosamente',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelSale(req, res, next) {
    try {
      const { id } = req.params;
      const sale = await saleService.cancelSale(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Venta cancelada exitosamente',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  }

  async changeStatus(req, res, next) {
    try {
      const { id } = req.params;
      const result = await saleService.changeStatus(
        parseInt(id),
        req.validatedData || req.body,
        req.user || {}
      );

      return res.status(200).json({
        success: true,
        message: 'Estado de venta actualizado exitosamente',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async finalizeSale(req, res, next) {
    try {
      const { id } = req.params;
      const sale = await saleService.finalizeSale(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Venta finalizada exitosamente',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  }

  async addTracking(req, res, next) {
    try {
      const { id } = req.params;
      const trackingData = req.validatedData || req.body;
      const tracking = await saleService.addTracking(parseInt(id), trackingData);

      return res.status(201).json({
        success: true,
        message: 'Seguimiento agregado exitosamente',
        data: tracking
      });
    } catch (error) {
      next(error);
    }
  }

  async getTracking(req, res, next) {
    try {
      const { id } = req.params;
      const tracking = await saleService.getTracking(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Seguimientos obtenidos exitosamente',
        data: tracking,
        total: tracking.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatusCatalog(req, res, next) {
    try {
      const estados = await saleService.getStatusCatalog();
      return res.status(200).json({
        success: true,
        message: 'Estados de venta obtenidos exitosamente',
        data: estados
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req, res, next) {
    try {
      const statistics = await saleService.getSalesStatistics();

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

module.exports = new SalesController();
