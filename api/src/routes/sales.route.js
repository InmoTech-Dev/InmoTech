const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createLimiter, strictLimiter } = require('../middlewares/security.middleware');
const { authenticateToken } = require('../middlewares/auth.middleware');

const {
  createSaleSchema,
  updateSaleSchema,
  createTrackingSchema,
  changeStatusSchema,
  createAttachmentSchema
} = require('../validators/sales.validator');

// POST /api/v1/sales - Crear venta
router.post(
  '/',
  createLimiter,
  validate(createSaleSchema),
  salesController.createSale
);

// GET /api/v1/sales - Obtener todas las ventas
router.get('/', salesController.getAllSales);

// GET /api/v1/sales/statuses - Catálogo de estados de venta
router.get('/statuses/catalog', salesController.getStatusCatalog);

// GET /api/v1/sales/:id - Obtener venta por ID
router.get('/:id', salesController.getSaleById);

// PUT /api/v1/sales/:id - Actualizar venta
router.put(
  '/:id',
  strictLimiter,
  validate(updateSaleSchema),
  salesController.updateSale
);

// PATCH /api/v1/sales/:id - Actualizar venta (alternativa)
router.patch(
  '/:id',
  strictLimiter,
  validate(updateSaleSchema),
  salesController.updateSale
);

// PATCH /api/v1/sales/:id/cancel - Cancelar venta
router.patch('/:id/cancel', strictLimiter, salesController.cancelSale);

// PATCH /api/v1/sales/:id/status - Cambiar estado usando catálogo
router.patch(
  '/:id/status',
  strictLimiter,
  validate(changeStatusSchema),
  salesController.changeStatus
);

// PATCH /api/v1/sales/:id/finalize - Finalizar venta
router.patch('/:id/finalize', strictLimiter, salesController.finalizeSale);

// POST /api/v1/sales/:id/tracking - Agregar seguimiento
router.post(
  '/:id/tracking',
  strictLimiter,
  validate(createTrackingSchema),
  salesController.addTracking
);

// GET /api/v1/sales/:id/tracking - Obtener seguimientos
router.get('/:id/tracking', salesController.getTracking);

// POST /api/v1/sales/:id/attachments - Subir comprobante/contrato
router.post(
  '/:id/attachments',
  authenticateToken,
  salesController.attachMiddleware(),
  validate(createAttachmentSchema),
  salesController.addAttachment
);

// GET /api/v1/sales/:id/attachments - Listar adjuntos
router.get('/:id/attachments', authenticateToken, salesController.listAttachments);

// DELETE /api/v1/sales/:id/attachments/:adjuntoId - Borrar adjunto
router.delete('/:id/attachments/:adjuntoId', authenticateToken, salesController.deleteAttachment);

// GET /api/v1/sales/dashboard/statistics - Obtener estadísticas
router.get('/dashboard/statistics', salesController.getStatistics);

module.exports = router;
