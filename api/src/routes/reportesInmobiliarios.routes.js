const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth.middleware');
const { validate, validateQuery } = require('../middlewares/validate.middleware');
const { generalLimiter, createLimiter, strictLimiter } = require('../middlewares/security.middleware');
const controller = require('../controllers/reportesInmobiliarios.controller');
const service = require('../services/reportesInmobiliarios.service');
const {
  crearReporteSchema,
  actualizarReporteSchema,
  listarReportesSchema,
  crearSeguimientoSchema,
  actualizarSeguimientoSchema,
  crearImagenSchema,
  crearArchivoSchema,
  crearRubroSchema,
  actualizarRubroSchema,
  crearSeguimientoRubroSchema,
  actualizarSeguimientoRubroSchema,
  autocompleteInmuebleSchema,
  crearInmuebleSchema
} = require('../validators/reportesInmobiliarios.validator');

// Autenticación y roles (sin afectar citas)
router.use(auth.authenticateToken);
router.use(auth.authorizeRoles(['Super Administrador', 'Administrador', 'Empleado']));

// Limiter general por defecto para el módulo
router.use(generalLimiter);

// Búsqueda de inmuebles para el módulo de reportes
router.get('/inmuebles/autocomplete', validateQuery(autocompleteInmuebleSchema), controller.autocompleteInmuebles);
router.get('/inmuebles/:id', controller.obtenerInmuebleBasico);
router.post('/inmuebles', createLimiter, validate(crearInmuebleSchema), async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const result = await service.crearInmuebleBasico(req.validatedData, userId);
    const status = result.success ? 201 : 400;
    return res.status(status).json(result);
  } catch (err) {
    return next(err);
  }
});

// CRUD Reportes
router.get('/', validateQuery(listarReportesSchema), controller.listarReportes);
router.post('/', createLimiter, validate(crearReporteSchema), controller.crearReporte);
router.get('/:id', controller.obtenerReporte);
router.patch('/:id', validate(actualizarReporteSchema), controller.actualizarReporte);
router.delete('/:id', strictLimiter, controller.eliminarReporte);

// Seguimiento general
router.post('/:id/seguimientos', createLimiter, validate(crearSeguimientoSchema), controller.crearSeguimientoGeneral);
router.get('/:id/seguimientos', controller.listarSeguimientosGenerales);
router.patch('/:reporteId/seguimientos/:seguimientoId', validate(actualizarSeguimientoSchema), controller.actualizarSeguimientoGeneral);
router.delete('/:reporteId/seguimientos/:seguimientoId', strictLimiter, controller.eliminarSeguimientoGeneral);

// Imágenes
router.post('/:id/imagenes', createLimiter, validate(crearImagenSchema), controller.agregarImagen);
router.delete('/:id/imagenes/:imagenId', strictLimiter, controller.eliminarImagen);

// Archivos
router.post('/:id/archivos', createLimiter, validate(crearArchivoSchema), controller.agregarArchivo);
router.delete('/:id/archivos/:archivoId', strictLimiter, controller.eliminarArchivo);

// Rubros
router.post('/:id/rubros', createLimiter, validate(crearRubroSchema), controller.crearRubro);
router.get('/:id/rubros', controller.listarRubros);
router.patch('/:id/rubros/:rubroId', validate(actualizarRubroSchema), controller.actualizarRubro);
router.delete('/:id/rubros/:rubroId', strictLimiter, controller.eliminarRubro);

// Seguimiento por Rubro
router.post('/:id/rubros/:rubroId/seguimientos', createLimiter, validate(crearSeguimientoRubroSchema), controller.crearSeguimientoRubro);
router.get('/:id/rubros/:rubroId/seguimientos', controller.listarSeguimientosRubro);
router.patch('/:id/rubros/:rubroId/seguimientos/:seguimientoId', validate(actualizarSeguimientoRubroSchema), controller.actualizarSeguimientoRubro);

// Estadísticas y exportación
router.get('/estadisticas', controller.obtenerEstadisticas);
router.get('/exportar', controller.exportarReportes);

module.exports = router;