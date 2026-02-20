const express = require('express');
const router = express.Router();

// Rutas importadas
const authRoutes = require('./auth.routes');
const administrativosRoutes = require('./administrativos.routes');
const citaRoutes = require('./cita.routes');
const notificacionRoutes = require('./notificacion.routes');
const personasRoutes = require('./personas.routes');
const rolesRoutes = require('./roles.routes');
const inmueblesRoutes = require('./inmuebles.routes');
const reportesRoutes = require('./reportes.routes');
const reportesInmobiliariosRoutes = require('./reportesInmobiliarios.routes');
const leasesRoutes = require('./leases.routes');
const renantsRoutes = require('./renants.route');
const buyersRoutes = require('./buyers.routes');
const salesRoutes = require('./sales.route');
const setupRoutes = require('./setup.routes');
const sseRoutes = require('./sse.routes');
const invitacionesRoutes = require('./invitaciones.routes');
const uploadRoutes = require('./upload.routes');
const arriendoRoutes = require('./arriendo.routes');
const dashboardRoutes = require('./dashboard.route');

// Montaje de rutas
router.use('/auth', authRoutes);
router.use('/administrativos', administrativosRoutes);
router.use('/citas', citaRoutes);
router.use('/notificaciones', notificacionRoutes);
router.use('/personas', personasRoutes);
router.use('/roles', rolesRoutes);
router.use('/inmuebles', inmueblesRoutes);
router.use('/reportes', reportesRoutes);
router.use('/reportes-inmobiliarios', reportesInmobiliariosRoutes);
// Montar subruta específica antes de /leases para evitar colisiones con :id
router.use('/leases/renants', renantsRoutes);
router.use('/leases', leasesRoutes);
router.use('/sales/buyers', buyersRoutes);
router.use('/sales', salesRoutes);
router.use('/setup', setupRoutes);
router.use('/sse', sseRoutes);
router.use('/invitaciones', invitacionesRoutes);
router.use('/files', uploadRoutes);
router.use('/arriendos', arriendoRoutes);
router.use('/dashboard', dashboardRoutes);

// Ruta de salud
router.get('/health', async (req, res) => {
  try {
    const dbStatus = await require('../config/database').testConnection();
    res.json({
      success: true,
      status: 'OK',
      message: 'Servidor funcionando correctamente',
      timestamp: new Date().toISOString(),
      database: dbStatus ? 'Conectado' : 'Desconectado',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.API_VERSION || 'v1'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'ERROR',
      message: 'Error en el servidor',
      error: error.message
    });
  }
});

module.exports = router;
