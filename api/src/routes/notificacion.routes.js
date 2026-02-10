const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacion.controller');

router.get(
  '/',
  notificacionController.obtenerNotificacionesNoLeidas
);

router.patch(
  '/:id/leer',
  notificacionController.marcarComoLeida
);

router.post(
  '/leer-multiples',
  notificacionController.marcarVariasComoLeidas
);

module.exports = router;
