const buyerService = require('../services/buyers.service');
const logger = require('../utils/logger');
const { normalizePagination } = require('../utils/pagination');

class BuyersController {
  async createBuyer(req, res, next) {
    try {
      const data = req.body;
      const newBuyer = await buyerService.createBuyer(data);
      return res.status(201).json({ 
        success: true, 
        message: 'Comprador creado exitosamente',
        data: newBuyer 
      });
    } catch (error) {
      const status =
        error.status ||
        (error.message && error.message.includes('ya está registrado') ? 400 : null);

      if (status) {
        return res.status(status).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  async getAllBuyers(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        tipo_compra: req.query.tipo_compra,
        tipo_comprador: req.query.tipo_comprador,
        id_inmueble: req.query.id_inmueble ? parseInt(req.query.id_inmueble, 10) : undefined,
        tipo_documento: req.query.tipo_documento,
        numero_documento: req.query.numero_documento,
        search: req.query.search
      };

      Object.keys(filters).forEach((key) => {
        if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
          delete filters[key];
        }
      });

      filters.pagination = normalizePagination(req.query);
      const result = await buyerService.getAllBuyers(filters);

      return res.status(200).json({
        success: true,
        message: 'Compradores obtenidos exitosamente',
        data: result.data,
        total: result.pagination.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getBuyerById(req, res, next) {
    try {
      const { id } = req.params;
      const buyer = await buyerService.getBuyerById(parseInt(id));

      if (!buyer) {
        return res.status(404).json({
          success: false,
          message: 'Comprador no encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Comprador obtenido exitosamente',
        data: buyer
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBuyer(req, res, next) {
    try {
      const { id } = req.params;
      const buyer = await buyerService.updateBuyer(parseInt(id), req.body);

      return res.status(200).json({
        success: true,
        message: 'Comprador actualizado exitosamente',
        data: buyer
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivateBuyer(req, res, next) {
    try {
      const { id } = req.params;
      const buyer = await buyerService.deactivateBuyer(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Comprador desactivado exitosamente',
        data: buyer
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBuyer(req, res, next) {
    try {
      const { id } = req.params;
      const buyer = await buyerService.deleteBuyer(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Comprador eliminado definitivamente',
        data: buyer
      });
    } catch (error) {
      next(error);
    }
  }

  async searchBuyers(req, res, next) {
    try {
      const { criterio } = req.params;
      const criteria = req.query;

      const buyers = await buyerService.searchBuyers(criteria);

      return res.status(200).json({
        success: true,
        message: 'Búsqueda completada',
        data: buyers,
        total: buyers.length
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BuyersController();
