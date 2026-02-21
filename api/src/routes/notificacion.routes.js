const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacion.controller');
const { authenticateToken, authorizePermissions } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.get(
  '/',
  authorizePermissions('citas', 'ver'),
  notificacionController.obtenerNotificacionesNoLeidas
);

router.patch(
  '/:id/leer',
  authorizePermissions('citas', 'ver'),
  notificacionController.marcarComoLeida
);

router.post(
  '/leer-multiples',
  authorizePermissions('citas', 'ver'),
  notificacionController.marcarVariasComoLeidas
);

module.exports = router;
