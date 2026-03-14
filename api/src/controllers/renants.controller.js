const renantService = require('../services/renants.service');
const { normalizePagination } = require('../utils/pagination');

class RenantsController {
  async createRenant(req, res, next) {
    try {
      const data = await renantService.createRenant(req.body);
      return res.status(201).json({
        success: true,
        message: 'Arrendatario creado exitosamente',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllRenants(req, res, next) {
    try {
      const filters = { ...req.query };
      filters.pagination = normalizePagination(req.query);
      const result = await renantService.getAllRenants(filters);
      return res.status(200).json({
        success: true,
        message: 'Arrendatarios obtenidos exitosamente',
        data: result.data,
        total: result.pagination.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getRenantById(req, res, next) {
    try {
      const { id } = req.params;
      const renant = await renantService.getRenantById(parseInt(id, 10));

      if (!renant) {
        return res.status(404).json({
          success: false,
          message: 'Arrendatario no encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Arrendatario obtenido exitosamente',
        data: renant
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRenant(req, res, next) {
    try {
      const { id } = req.params;
      const renant = await renantService.updateRenant(parseInt(id, 10), req.body);
      return res.status(200).json({
        success: true,
        message: 'Arrendatario actualizado exitosamente',
        data: renant
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivateRenant(req, res, next) {
    try {
      const { id } = req.params;
      const renant = await renantService.deactivateRenant(parseInt(id, 10));
      return res.status(200).json({
        success: true,
        message: 'Arrendatario desactivado exitosamente',
        data: renant
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRenant(req, res, next) {
    try {
      const { id } = req.params;
      const result = await renantService.deleteRenant(parseInt(id, 10));
      return res.status(200).json({
        success: true,
        message: 'Arrendatario eliminado definitivamente',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async searchRenants(req, res, next) {
    try {
      const criteria = req.query;
      const renants = await renantService.searchRenants(criteria);
      return res.status(200).json({
        success: true,
        message: 'Búsqueda completada',
        data: renants,
        total: renants.length
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RenantsController();
