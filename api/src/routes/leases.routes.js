const express = require('express');
const router = express.Router();
const leasesController = require('../controllers/leases.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createLimiter, strictLimiter } = require('../middlewares/security.middleware');
const { authenticateToken, authorizePermissions } = require('../middlewares/auth.middleware');

const {
  createLeaseSchema,
  updateLeaseSchema,
  updatePaymentSchema,
  createReceiptSchema
} = require('../validators/leases.validator');

router.use(authenticateToken);

// POST /api/v1/leases - Crear arrendamiento
router.post(
  '/',
  authorizePermissions('arriendos', 'crear'),
  createLimiter,
  validate(createLeaseSchema),
  leasesController.createLease
);

// GET /api/v1/leases - Obtener todos los arrendamientos
router.get(
  '/',
  authorizePermissions('arriendos', 'ver'),
  leasesController.getAllLeases
);

// GET /api/v1/leases/dashboard/statistics - Obtener estadísticas
router.get(
  '/dashboard/statistics',
  authorizePermissions('arriendos', 'ver'),
  leasesController.getStatistics
);

// GET /api/v1/leases/:id - Obtener arrendamiento por ID
router.get(
  '/:id',
  authorizePermissions('arriendos', 'ver'),
  leasesController.getLeaseById
);

// PUT /api/v1/leases/:id - Actualizar arrendamiento
router.put(
  '/:id',
  authorizePermissions('arriendos', 'editar'),
  strictLimiter,
  validate(updateLeaseSchema),
  leasesController.updateLease
);

// PATCH /api/v1/leases/:id - Actualizar arrendamiento (alternativa)
router.patch(
  '/:id',
  authorizePermissions('arriendos', 'editar'),
  strictLimiter,
  validate(updateLeaseSchema),
  leasesController.updateLease
);

// PATCH /api/v1/leases/:id/cancel - Cancelar arrendamiento
router.patch(
  '/:id/cancel',
  authorizePermissions('arriendos', 'editar'),
  strictLimiter,
  leasesController.cancelLease
);

// PATCH /api/v1/leases/:id/finalize - Finalizar arrendamiento
router.patch(
  '/:id/finalize',
  authorizePermissions('arriendos', 'editar'),
  strictLimiter,
  leasesController.finalizeLease
);

// DELETE /api/v1/leases/:id - Eliminar arrendamiento definitivamente
router.delete(
  '/:id',
  authorizePermissions('arriendos', 'eliminar'),
  strictLimiter,
  leasesController.deleteLease
);

// GET /api/v1/leases/:id/payments - Obtener cobros del arrendamiento
router.get(
  '/:id/payments',
  authorizePermissions('arriendos', 'ver'),
  leasesController.getPayments
);

// PATCH /api/v1/leases/:id/payments/:paymentId - Actualizar estado de cobro
router.patch(
  '/:id/payments/:paymentId',
  authorizePermissions('arriendos', 'editar'),
  strictLimiter,
  validate(updatePaymentSchema),
  leasesController.updatePaymentStatus
);

// POST /api/v1/leases/:id/payments/:paymentId/receipt - Crear comprobante de pago
router.post(
  '/:id/payments/:paymentId/receipt',
  authorizePermissions('arriendos', 'crear'),
  createLimiter,
  validate(createReceiptSchema),
  leasesController.createReceipt
);

module.exports = router;
