const dashboardService = require('../services/dashboard.service');
const logger = require('../utils/logger');

class DashboardController {
  async getOverview(req, res, next) {
    try {
      const range = req.validatedQuery?.range || req.query?.range;
      const data = await dashboardService.getOverview({
        user: req.user,
        range
      });

      return res.status(200).json({
        success: true,
        message: 'Dashboard obtenido exitosamente',
        data
      });
    } catch (error) {
      logger.error(`[Dashboard] Error obteniendo overview: ${error.message}`);
      return next(error);
    }
  }
}

module.exports = new DashboardController();
