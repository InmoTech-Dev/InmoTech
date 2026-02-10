const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');
const { validate, validateQuery } = require('../middlewares/validate.middleware');
const auth = require('../middlewares/auth.middleware');

const {
  crearReporteSchema,
  generarReporteCitasSchema,
  generarReporteInmueblesSchema,
  actualizarEstadoReporteSchema,
  listarReportesSchema
} = require('../validators/reportes.validator');

// Autenticación obligatoria
router.use(auth.authenticateToken);

// Acceso base: ver reportes (usa permisos, Admin/SuperAdmin pasan)
router.use(auth.authorizePermissions('reportes', ['read']));

// Estadísticas del dashboard (ruta específica antes de :id)
router.get('/dashboard-stats',
  reportesController.obtenerEstadisticasDashboard
);

// Listar reportes
router.get('/',
  validateQuery(listarReportesSchema),
  reportesController.listarReportes
);

// Crear reporte manual
router.post('/',
  auth.authorizePermissions('reportes', ['create']),
  validate(crearReporteSchema),
  reportesController.crearReporte
);

// Generar reporte de citas
router.post('/citas',
  auth.authorizePermissions('reportes', ['create']),
  validate(generarReporteCitasSchema),
  reportesController.generarReporteCitas
);

// Generar reporte de inmuebles
router.post('/inmuebles',
  auth.authorizePermissions('reportes', ['create']),
  validate(generarReporteInmueblesSchema),
  reportesController.generarReporteInmuebles
);

// Obtener reporte por ID
router.get('/:id',
  reportesController.obtenerReporte
);

// Actualizar estado del reporte
router.patch('/:id/estado',
  auth.authorizePermissions('reportes', ['update']),
  validate(actualizarEstadoReporteSchema),
  reportesController.actualizarEstado
);

// Descargar reporte
router.get('/:id/descargar',
  reportesController.descargarReporte
);

// Eliminar reporte
router.delete('/:id',
  auth.authorizePermissions('reportes', ['delete']),
  reportesController.eliminarReporte
);

module.exports = router;
