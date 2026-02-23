const express = require('express');
const router = express.Router();
const securityController = require('../controllers/security.controller');
const auth = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { transferAdminHolderSchema } = require('../validators/security.validator');

router.put(
  '/admin/holder',
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador']),
  validate(transferAdminHolderSchema),
  securityController.transferAdminHolder
);

module.exports = router;
