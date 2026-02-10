const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/venta.controller');

// Gestión de Ventas
router.post('/', ventaController.crearVenta);
router.get('/', ventaController.obtenerVentas);
router.get('/estadisticas', ventaController.obtenerEstadisticas);
router.get('/:id', ventaController.obtenerVentaPorId);
router.put('/:id', ventaController.actualizarVenta);
router.patch('/:id/avanzar-estado', ventaController.avanzarEstado);
router.patch('/:id/cancelar', ventaController.cancelarVenta);
router.get('/inmueble/:inmuebleId', ventaController.obtenerVentasPorInmueble);

module.exports = router;