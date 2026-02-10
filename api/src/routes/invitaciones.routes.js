const express = require('express');
const router = express.Router();
const invitacionController = require('../controllers/invitacion.controller');
const { validate, validateQuery } = require('../middlewares/validate.middleware');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { validarAccesoAdmin } = require('../middlewares/admin.middleware');
const { invitationLimiter, loginLimiter } = require('../middlewares/security.middleware');
const {
  crearInvitacionSchema,
  validarInvitacionSchema,
  aceptarInvitacionSchema,
  reenviarInvitacionSchema
} = require('../validators/invitacion.validator');

// Crear invitacion (solo admin)
router.post('/',
  authenticateToken,
  validarAccesoAdmin,
  invitationLimiter,
  validate(crearInvitacionSchema),
  invitacionController.crear
);

// Validar invitacion (publica)
router.get('/validar',
  invitationLimiter,
  validateQuery(validarInvitacionSchema),
  invitacionController.validar
);

// Aceptar invitacion y setear password (publica)
router.post('/aceptar',
  invitationLimiter,
  validate(aceptarInvitacionSchema),
  invitacionController.aceptar
);

// Reenviar invitacion (público, usando el token viejo)
router.post('/reenviar',
  invitationLimiter,
  validate(reenviarInvitacionSchema),
  invitacionController.reenviar
);

module.exports = router;
