const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createLimiter, strictLimiter } = require('../middlewares/security.middleware');
const { authenticateToken, authorizePermissions } = require('../middlewares/auth.middleware');

const {
  createSaleSchema,
  updateSaleSchema,
  createTrackingSchema
} = require('../validators/sales.validator');

router.use(authenticateToken);

// POST /api/v1/sales - Crear venta
router.post(
  '/',
  authorizePermissions('ventas', 'crear'),
  createLimiter,
  validate(createSaleSchema),
  salesController.createSale
);

// GET /api/v1/sales - Obtener todas las ventas
router.get(
  '/',
  authorizePermissions('ventas', 'ver'),
  salesController.getAllSales
);

// GET /api/v1/sales/dashboard/statistics - Obtener estadísticas
router.get(
  '/dashboard/statistics',
  authorizePermissions('ventas', 'ver'),
  salesController.getStatistics
);

// GET /api/v1/sales/:id - Obtener venta por ID
router.get(
  '/:id',
  authorizePermissions('ventas', 'ver'),
  salesController.getSaleById
);

// PUT /api/v1/sales/:id - Actualizar venta
router.put(
  '/:id',
  authorizePermissions('ventas', 'editar'),
  strictLimiter,
  validate(updateSaleSchema),
  salesController.updateSale
);

// PATCH /api/v1/sales/:id - Actualizar venta (alternativa)
router.patch(
  '/:id',
  authorizePermissions('ventas', 'editar'),
  strictLimiter,
  validate(updateSaleSchema),
  salesController.updateSale
);

// PATCH /api/v1/sales/:id/cancel - Cancelar venta
router.patch(
  '/:id/cancel',
  authorizePermissions('ventas', 'editar'),
  strictLimiter,
  salesController.cancelSale
);

// PATCH /api/v1/sales/:id/finalize - Finalizar venta
router.patch(
  '/:id/finalize',
  authorizePermissions('ventas', 'editar'),
  strictLimiter,
  salesController.finalizeSale
);

// POST /api/v1/sales/:id/tracking - Agregar seguimiento
router.post(
  '/:id/tracking',
  authorizePermissions('ventas', 'editar'),
  strictLimiter,
  validate(createTrackingSchema),
  salesController.addTracking
);

// GET /api/v1/sales/:id/tracking - Obtener seguimientos
router.get(
  '/:id/tracking',
  authorizePermissions('ventas', 'ver'),
  salesController.getTracking
);

module.exports = router;
