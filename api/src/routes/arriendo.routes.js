const express = require('express');
const router = express.Router();
const arriendoController = require('../controllers/arriendo.controller');
const { authenticateToken, authorizePermissions } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.post(
  '/',
  authorizePermissions('arriendos', 'crear'),
  arriendoController.crearArriendo
);

router.get(
  '/',
  authorizePermissions('arriendos', 'ver'),
  arriendoController.obtenerArriendos
);

router.get(
  '/estadisticas',
  authorizePermissions('arriendos', 'ver'),
  arriendoController.obtenerEstadisticas
);

router.patch(
  '/:id/reservar',
  authorizePermissions('arriendos', 'editar'),
  arriendoController.reservarArriendo
);

router.patch(
  '/:id/activar',
  authorizePermissions('arriendos', 'editar'),
  arriendoController.activarArriendo
);

router.patch(
  '/:id/finalizar',
  authorizePermissions('arriendos', 'editar'),
  arriendoController.finalizarArriendo
);

module.exports = router;
