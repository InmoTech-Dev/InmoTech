const express = require('express');
const Joi = require('joi');
const router = express.Router();
const citaController = require('../controllers/cita.controller');
const { validate, validateQuery } = require('../middlewares/validate.middleware');
const { createLimiter, strictLimiter, identityLookupLimiter } = require('../middlewares/security.middleware');
const { authenticateToken, authorizePermissions, optionalAuth } = require('../middlewares/auth.middleware');

const {
  crearCitaSchema,
  actualizarCitaSchema,
  confirmarCitaSchema,
  cancelarCitaSchema,
  reagendarCitaSchema,
  buscarPersonaSchema
} = require('../validators/cita.validator');

// POST /api/v1/citas - Crear cita
router.post(
  '/',
  // Permitir cita publica; si hay cookie optionalAuth setea req.user para trazabilidad
  optionalAuth,
  function (req, res, next) {
    // ✅ Permitir que usuarios autenticados creen citas sin permisos especiales
    // (hace la funcionalidad de agendar citas accesible para usuarios normales)
    req.skipPermissions = true;
    next();
  },
  createLimiter,
  validate(crearCitaSchema),
  citaController.crearCita
);

// GET /api/v1/citas - Obtener todas las citas
router.get(
  '/',
  authenticateToken,
  authorizePermissions('citas', 'ver'),
  citaController.obtenerCitas
);

// GET /api/v1/citas/buscar-persona - Buscar persona por documento (SIN AUTENTICACIÓN)
router.get(
  '/buscar-persona',
  identityLookupLimiter,
  validateQuery(buscarPersonaSchema),
  citaController.buscarPersonaPorDocumento
);

// GET /api/v1/citas/horarios-disponibles-publico - Obtener horarios disponibles para visitantes (PÚBLICO)
router.get(
  '/horarios-disponibles-publico',
  validateQuery(Joi.object({
    fecha_cita: Joi.string().isoDate().required(),
    id_servicio: Joi.number().integer().required(),
    id_inmueble: Joi.number().integer().optional()
  })),
  citaController.obtenerHorariosDisponiblesPublico
);

// GET /api/v1/citas/mis-citas - Obtener citas del usuario autenticado como cliente
// ✅ IMPORTANTE: Esta ruta debe definirse ANTES de rutas con parámetros como /:id
// Nota: Usuarios normales pueden ver sus propias citas sin permisos especiales
router.get(
  '/mis-citas',
  authenticateToken,
  function (req, res, next) {
    // Marcar que esta ruta no requiere permisos especiales
    // (permite que usuarios normales accedan a sus propias citas)
    req.skipPermissions = true;
    next();
  },
  citaController.obtenerMisCitas
);

// GET /api/v1/citas/mis-citas/horarios-disponibles - Obtener horarios disponibles para reagendamiento (usuario normal)
router.get(
  '/mis-citas/horarios-disponibles',
  authenticateToken,
  function (req, res, next) {
    // Marcar que esta ruta no requiere permisos especiales
    req.skipPermissions = true;
    next();
  },
  citaController.obtenerHorariosDisponiblesReagendar
);

// PUT /api/v1/citas/user/:id/reagendar - Reagendar cita del usuario (cliente)
// ✅ RENOMBRADA para evitar conflicto con /:id/reagendar
router.put(
  '/user/:id/reagendar',
  authenticateToken,
  function (req, res, next) {
    // Marcar que esta ruta no requiere permisos especiales
    req.skipPermissions = true;
    next();
  },
  strictLimiter,
  validate(reagendarCitaSchema),
  citaController.reagendarMiCita
);

// POST /api/v1/citas/mis-citas/:id/cancelar - Cancelar cita del usuario (cliente)
router.post(
  '/mis-citas/:id/cancelar',
  authenticateToken,
  function (req, res, next) {
    // Marcar que esta ruta no requiere permisos especiales
    req.skipPermissions = true;
    next();
  },
  strictLimiter,
  validate(cancelarCitaSchema),
  citaController.cancelarMiCita
);

// GET /api/v1/citas/agentes-disponibles - Obtener agentes disponibles
// Nota: Se desactiva sanitizeInput para evitar problemas con parseInt válidos
router.get(
  '/agentes-disponibles',
  authenticateToken,
  authorizePermissions('citas', 'ver'),
  function (req, res, next) {
    // Saltar sanitizeInput si está aplicándose globalmente
    req.skipSanitize = true;
    next();
  },
  citaController.obtenerAgentesDisponibles
);

// GET /api/v1/citas/:id - Obtener cita por ID
router.get(
  '/:id',
  authenticateToken,
  authorizePermissions('citas', 'ver'),
  citaController.obtenerCitaPorId
);

// ⭐ AGREGAR: PUT /api/v1/citas/:id - Actualizar cita
router.put(
  '/:id',
  authenticateToken,
  authorizePermissions('citas', 'editar'),
  strictLimiter,
  validate(actualizarCitaSchema),
  citaController.actualizarCita
);

// PATCH /api/v1/citas/:id - Actualizar cita (alternativa)
router.patch(
  '/:id',
  authenticateToken,
  authorizePermissions('citas', 'editar'),
  strictLimiter,
  validate(actualizarCitaSchema),
  citaController.actualizarCita
);

// POST /api/v1/citas/:id/confirmar - Confirmar cita
router.post(
  '/:id/confirmar',
  authenticateToken,
  authorizePermissions('citas', 'editar'),
  strictLimiter,
  validate(confirmarCitaSchema),
  citaController.confirmarCita
);

// POST /api/v1/citas/:id/cancelar - Cancelar cita
router.post(
  '/:id/cancelar',
  authenticateToken,
  authorizePermissions('citas', 'cancelar'),
  strictLimiter,
  validate(cancelarCitaSchema),
  citaController.cancelarCita
);

// PUT /api/v1/citas/:id/reagendar - Reagendar cita
router.put(
  '/:id/reagendar',
  authenticateToken,
  authorizePermissions('citas', 'editar'),
  strictLimiter,
  validate(reagendarCitaSchema),
  citaController.reagendarCita
);

// DELETE /api/v1/citas/:id - Eliminar cita
router.delete(
  '/:id',
  authenticateToken,
  authorizePermissions('citas', 'eliminar'),
  strictLimiter,
  citaController.eliminarCita
);

// ✅ NUEVA RUTA OPTIMIZADA: PATCH /api/v1/citas/:id/estado - Actualizar solo el estado de la cita
router.patch(
  '/:id/estado',
  authenticateToken,
  authorizePermissions('citas', 'editar'),
  strictLimiter,
  validate(Joi.object({
    id_estado_cita: Joi.number()
      .integer()
      .valid(1, 2, 3, 4, 5, 6)
      .required()
  })),
  citaController.actualizarEstadoCita
);

// POST /api/v1/citas/:id/asignar-agente - Asignar agente a cita
router.post(
  '/:id/asignar-agente',
  authenticateToken,
  authorizePermissions('citas', 'asignar'),
  strictLimiter,
  validate(Joi.object({
    id_agente_nuevo: Joi.number().integer().required(),
    comentario: Joi.string().max(500).allow('').optional(), // Permitir vac?o para primera asignaci?n
    motivo_reagendamiento: Joi.string().min(5).max(500).allow('').optional()
  })),
  citaController.asignarAgente
);

// GET /api/v1/citas/:id/historial-asignaciones - Obtener historial de asignaciones
router.get(
  '/:id/historial-asignaciones',
  authenticateToken,
  authorizePermissions('citas', 'ver'),
  citaController.obtenerHistorialAsignaciones
);

// GET /api/v1/citas/:id/con-historial - Obtener cita con historial completo
router.get(
  '/:id/con-historial',
  authenticateToken,
  authorizePermissions('citas', 'ver'),
  citaController.obtenerCitaConHistorial
);

module.exports = router;
