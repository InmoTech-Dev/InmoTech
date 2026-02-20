const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { validateQuery } = require('../middlewares/validate.middleware');
const { dashboardOverviewQuerySchema } = require('../validators/dashboard.validator');

router.use(authenticateToken);

router.get(
  '/overview',
  validateQuery(dashboardOverviewQuerySchema),
  dashboardController.getOverview
);

module.exports = router;
