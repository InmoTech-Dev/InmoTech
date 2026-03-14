const express = require('express');
const router = express.Router();
const leasesController = require('../controllers/leases.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createLimiter, strictLimiter } = require('../middlewares/security.middleware');

const {
  createLeaseSchema,
  updateLeaseSchema,
  updateLeaseStatusSchema,
  extendLeaseSchema,
  registerPreNoticeSchema,
  createPaymentSchema,
  updatePaymentSchema,
  createReceiptSchema
} = require('../validators/leases.validator');

// POST /api/v1/leases - Crear arrendamiento
router.post(
  '/',
  validate(createLeaseSchema),
  leasesController.createLease
);

// GET /api/v1/leases - Obtener todos los arrendamientos
router.get('/', leasesController.getAllLeases);
// GET /api/v1/leases/dashboard/statistics - Obtener estadísticas
router.get('/dashboard/statistics', leasesController.getStatistics);

// GET /api/v1/leases/:id - Obtener arrendamiento por ID
router.get('/:id', leasesController.getLeaseById);

// PUT /api/v1/leases/:id - Actualizar arrendamiento
router.put(
  '/:id',
  strictLimiter,
  validate(updateLeaseSchema),
  leasesController.updateLease
);

// PATCH /api/v1/leases/:id - Actualizar arrendamiento (alternativa)
router.patch(
  '/:id',
  strictLimiter,
  validate(updateLeaseSchema),
  leasesController.updateLease
);

// PATCH /api/v1/leases/:id/estado - Actualizar estado del arrendamiento
router.patch(
  '/:id/estado',
  strictLimiter,
  validate(updateLeaseStatusSchema),
  leasesController.updateLeaseStatus
);

// PATCH /api/v1/leases/:id/extend - Aplicar prórroga al arrendamiento
router.patch(
  '/:id/extend',
  strictLimiter,
  validate(extendLeaseSchema),
  leasesController.extendLease
);

// PATCH /api/v1/leases/:id/pre-notice - Registrar preaviso del arrendamiento
router.patch(
  '/:id/pre-notice',
  strictLimiter,
  validate(registerPreNoticeSchema),
  leasesController.registerPreNotice
);

// DELETE /api/v1/leases/:id/pre-notice - Eliminar preaviso del arrendamiento
router.delete(
  '/:id/pre-notice',
  strictLimiter,
  leasesController.deletePreNotice
);

// PATCH /api/v1/leases/:id/cancel - Cancelar arrendamiento
router.patch('/:id/cancel', strictLimiter, leasesController.cancelLease);

// PATCH /api/v1/leases/:id/finalize - Finalizar arrendamiento
router.patch('/:id/finalize', strictLimiter, leasesController.finalizeLease);
// DELETE /api/v1/leases/:id - Eliminar arrendamiento definitivamente
router.delete('/:id', strictLimiter, leasesController.deleteLease);

// GET /api/v1/leases/:id/payments - Obtener cobros del arrendamiento
router.get('/:id/payments', leasesController.getPayments);

// PATCH /api/v1/leases/:id/payments/:paymentId - Actualizar estado de cobro
router.patch(
  '/:id/payments/:paymentId',
  strictLimiter,
  validate(updatePaymentSchema),
  leasesController.updatePaymentStatus
);

// POST /api/v1/leases/:id/payments/:paymentId/receipt - Crear comprobante de pago
router.post(
  '/:id/payments/:paymentId/receipt',
  validate(createReceiptSchema),
  leasesController.createReceipt
);


module.exports = router;
