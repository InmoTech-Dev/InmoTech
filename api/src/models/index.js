const { sequelize } = require('../config/database');

const Persona = require('./Persona');
const Administrativo = require('./Administrativo');
const Inmueble = require('./Inmueble');
const ServicioCita = require('./ServicioCita');
const Comodidad = require('./Comodidad');
const InmuebleComodidad = require('./InmuebleComodidad');
const InmuebleImagen = require('./InmuebleImagen');
const EstadoCita = require('./EstadoCita');
const Cita = require('./Cita');
const HistorialAsignacionAgente = require('./HistorialAsignacionAgente');
const Notificacion = require('./Notificacion');
const Rol = require('./Rol');
const Permiso = require('./Permiso');
const Acceso = require('./Acceso');
const PersonasRol = require('./PersonasRol');
const PropiedadInmueble = require('./PropiedadInmueble');
const Reporte = require('./Reporte');
const ReporteImagen = require('./ReporteImagen');
const ReporteArchivo = require('./ReporteArchivo');
const ReporteRubro = require('./ReporteRubro');
const RubroSeguimiento = require('./RubroSeguimiento');
const ReporteSeguimientoGeneral = require('./ReporteSeguimientoGeneral');
const SeguimientoVenta = require('./SeguimientoVenta');
const EstadosVenta = require('./EstadosVenta');
const Invitacion = require('./Invitacion');
const Buyer = require('./Buyer');
const Sale = require('./Sale');
const VentaAdjunto = require('./VentaAdjunto');
const Renant = require('./Renant');
const Arriendo = require('./Arriendo');
const Lease = require('./Lease');
const Payment = require('./Payment');
const Receipt = require('./Receipt');
const SeguimientoArrendamiento = require('./SeguimientoArrendamiento');

// Asociaciones de Cita
Cita.belongsTo(Persona, { foreignKey: 'id_persona', as: 'cliente' });
Cita.belongsTo(Inmueble, { foreignKey: 'id_inmueble', as: 'inmueble' });
Cita.belongsTo(ServicioCita, { foreignKey: 'id_servicio', as: 'servicio' });
Cita.belongsTo(EstadoCita, { foreignKey: 'id_estado_cita', as: 'estado' });
Cita.belongsTo(Persona, { foreignKey: 'id_agente_asignado', as: 'agente' });
Cita.belongsTo(Persona, { foreignKey: 'id_usuario_creador', as: 'creador' });
Cita.belongsTo(Cita, { foreignKey: 'id_cita_original', as: 'citaOriginal' });

Persona.hasMany(Cita, { foreignKey: 'id_persona', as: 'citasComoCliente' });
Persona.hasMany(Cita, { foreignKey: 'id_agente_asignado', as: 'citasComoAgente' });
Persona.hasMany(Cita, { foreignKey: 'id_usuario_creador', as: 'citasCreadas' });
Inmueble.hasMany(Cita, { foreignKey: 'id_inmueble', as: 'citas' });
ServicioCita.hasMany(Cita, { foreignKey: 'id_servicio', as: 'citas' });
EstadoCita.hasMany(Cita, { foreignKey: 'id_estado_cita', as: 'citas' });
Cita.hasMany(Cita, { foreignKey: 'id_cita_original', as: 'reagendamientos' });

// Inmueble - Comodidades
Inmueble.belongsToMany(Comodidad, { through: InmuebleComodidad, foreignKey: 'id_inmueble', otherKey: 'id_comodidad', as: 'comodidades' });
Comodidad.belongsToMany(Inmueble, { through: InmuebleComodidad, foreignKey: 'id_comodidad', otherKey: 'id_inmueble', as: 'inmuebles' });
InmuebleComodidad.belongsTo(Inmueble, { foreignKey: 'id_inmueble', as: 'inmueble' });
InmuebleComodidad.belongsTo(Comodidad, { foreignKey: 'id_comodidad', as: 'comodidad' });

// Imagenes de inmueble
Inmueble.hasMany(InmuebleImagen, { foreignKey: 'id_inmueble', as: 'imagenes' });
InmuebleImagen.belongsTo(Inmueble, { foreignKey: 'id_inmueble', as: 'inmueble' });

// Notificaciones
Notificacion.belongsTo(Cita, { foreignKey: 'id_cita', as: 'cita' });
Notificacion.belongsTo(Rol, { foreignKey: 'id_rol_destino', as: 'rol' });
Notificacion.belongsTo(Persona, { foreignKey: 'id_persona_destino', as: 'persona' });
Cita.hasMany(Notificacion, { foreignKey: 'id_cita', as: 'notificaciones' });
Rol.hasMany(Notificacion, { foreignKey: 'id_rol_destino', as: 'notificaciones' });
Persona.hasMany(Notificacion, { foreignKey: 'id_persona_destino', as: 'notificaciones' });

// Acceso
Acceso.belongsTo(Persona, { foreignKey: 'id_persona', as: 'persona' });
Persona.hasOne(Acceso, { foreignKey: 'id_persona', as: 'acceso' });

// Administrativo
Administrativo.belongsTo(Persona, { foreignKey: 'id_persona', as: 'persona' });
Persona.hasOne(Administrativo, { foreignKey: 'id_persona', as: 'administrativo' });

// Invitaciones
Invitacion.belongsTo(Persona, { foreignKey: 'id_persona', as: 'persona' });
Persona.hasMany(Invitacion, { foreignKey: 'id_persona', as: 'invitaciones' });

// PersonasRol / Roles / Permisos
PersonasRol.belongsTo(Persona, { foreignKey: 'id_persona', as: 'persona' });
PersonasRol.belongsTo(Rol, { foreignKey: 'id_rol', as: 'rol' });
Persona.belongsToMany(Rol, { through: PersonasRol, foreignKey: 'id_persona', otherKey: 'id_rol', as: 'roles' });
Rol.belongsToMany(Persona, { through: PersonasRol, foreignKey: 'id_rol', otherKey: 'id_persona', as: 'personas' });
Permiso.belongsTo(Rol, { foreignKey: 'id_rol', as: 'rol' });
Rol.hasMany(Permiso, { foreignKey: 'id_rol', as: 'permisos' });

// Propiedad inmueble
PropiedadInmueble.belongsTo(Inmueble, { foreignKey: 'id_inmueble', as: 'inmueble' });
PropiedadInmueble.belongsTo(Persona, { foreignKey: 'id_persona', as: 'propietario' });
Inmueble.hasMany(PropiedadInmueble, { foreignKey: 'id_inmueble', as: 'propietarios' });
Persona.hasMany(PropiedadInmueble, { foreignKey: 'id_persona', as: 'propiedades' });

// Reportes y adjuntos
Reporte.belongsTo(Inmueble, { foreignKey: 'id_inmueble', as: 'inmueble' });
Inmueble.hasMany(Reporte, { foreignKey: 'id_inmueble', as: 'reportes' });
Reporte.belongsTo(Persona, { foreignKey: 'id_persona_reporta', as: 'reportadoPor' });
Persona.hasMany(Reporte, { foreignKey: 'id_persona_reporta', as: 'reportesReportados' });
Reporte.hasMany(ReporteImagen, { foreignKey: 'id_reporte', as: 'imagenes' });
ReporteImagen.belongsTo(Reporte, { foreignKey: 'id_reporte', as: 'reporte' });
Reporte.hasMany(ReporteArchivo, { foreignKey: 'id_reporte', as: 'archivos' });
ReporteArchivo.belongsTo(Reporte, { foreignKey: 'id_reporte', as: 'reporte' });
Reporte.hasMany(ReporteRubro, { foreignKey: 'id_reporte', as: 'rubros' });
ReporteRubro.belongsTo(Reporte, { foreignKey: 'id_reporte', as: 'reporte' });
ReporteRubro.hasMany(RubroSeguimiento, { foreignKey: 'id_rubro', as: 'seguimientos' });
RubroSeguimiento.belongsTo(ReporteRubro, { foreignKey: 'id_rubro', as: 'rubro' });
RubroSeguimiento.belongsTo(Persona, { foreignKey: 'id_persona', as: 'responsable' });
Reporte.hasMany(ReporteSeguimientoGeneral, { foreignKey: 'id_reporte', as: 'seguimientosGenerales' });
ReporteSeguimientoGeneral.belongsTo(Reporte, { foreignKey: 'id_reporte', as: 'reporte' });
ReporteSeguimientoGeneral.belongsTo(Persona, { foreignKey: 'id_persona', as: 'responsable' });

// Historial asignacion de agentes
HistorialAsignacionAgente.belongsTo(Cita, { foreignKey: 'id_cita', as: 'cita' });
HistorialAsignacionAgente.belongsTo(Persona, { foreignKey: 'id_agente_anterior', as: 'agenteAnterior' });
HistorialAsignacionAgente.belongsTo(Persona, { foreignKey: 'id_agente_nuevo', as: 'agenteNuevo' });
HistorialAsignacionAgente.belongsTo(Persona, { foreignKey: 'id_usuario_realizo', as: 'usuarioRealizo' });
Cita.hasMany(HistorialAsignacionAgente, { foreignKey: 'id_cita', as: 'historialAsignaciones' });

// Buyers / Sales
Buyer.belongsTo(Persona, { foreignKey: 'id_persona', as: 'persona' });
Persona.hasOne(Buyer, { foreignKey: 'id_persona', as: 'buyer' });
Sale.belongsTo(Buyer, { foreignKey: 'id_comprador', as: 'comprador' });
Sale.belongsTo(Inmueble, { foreignKey: 'id_inmueble', as: 'inmueble' });
Buyer.hasMany(Sale, { foreignKey: 'id_comprador', as: 'ventas' });
Sale.hasMany(SeguimientoVenta, { foreignKey: 'id_venta', as: 'seguimientos' });
SeguimientoVenta.belongsTo(Sale, { foreignKey: 'id_venta', as: 'venta' });
SeguimientoVenta.belongsTo(Persona, { foreignKey: 'id_persona', as: 'persona' });
SeguimientoVenta.belongsTo(EstadosVenta, { foreignKey: 'id_estado_venta', as: 'estado' });
Inmueble.hasMany(Sale, { foreignKey: 'id_inmueble', as: 'ventas' });
Sale.hasMany(VentaAdjunto, { foreignKey: 'id_venta', as: 'adjuntos' });
VentaAdjunto.belongsTo(Sale, { foreignKey: 'id_venta', as: 'venta' });

// Arrendamientos
Arriendo.belongsTo(Renant, { foreignKey: 'id_arrendatario', as: 'arrendatario' });
Arriendo.belongsTo(Inmueble, { foreignKey: 'id_inmueble', as: 'inmueble' });
Renant.hasMany(Arriendo, { foreignKey: 'id_arrendatario', as: 'arrendamientos' });
Inmueble.hasMany(Arriendo, { foreignKey: 'id_inmueble', as: 'arrendamientos' });

// Asociaciones de Lease (arrendamientos legacy/alternativo)
Lease.belongsTo(Inmueble, {
  foreignKey: 'id_inmueble',
  as: 'inmueble'
});

// Codeudor (Persona)
Lease.belongsTo(Persona, {
  foreignKey: 'id_codeudor',
  as: 'codeudor'
});
Persona.hasMany(Lease, {
  foreignKey: 'id_codeudor',
  as: 'leasesComoCodeudor'
});

// Nota: en el modelo Lease el atributo se llama id_cliente pero la columna es id_arrendatario
// por eso usamos el nombre del atributo como foreignKey para que Sequelize lo resuelva al campo.
Lease.belongsTo(Renant, {
  foreignKey: 'id_cliente',
  as: 'arrendatario'
});

Inmueble.hasMany(Lease, {
  foreignKey: 'id_inmueble',
  as: 'arrendamientosLegacy'
});

Renant.hasMany(Lease, {
  foreignKey: 'id_cliente',
  as: 'arrendamientosLegacy'
});

// Seguimiento de arrendamientos
Lease.hasMany(SeguimientoArrendamiento, {
  foreignKey: 'id_arrendamiento',
  as: 'seguimientos'
});
SeguimientoArrendamiento.belongsTo(Lease, {
  foreignKey: 'id_arrendamiento',
  as: 'arrendamiento'
});
SeguimientoArrendamiento.belongsTo(Persona, {
  foreignKey: 'id_persona',
  as: 'autor'
});
Persona.hasMany(SeguimientoArrendamiento, {
  foreignKey: 'id_persona',
  as: 'seguimientos_arrendamiento'
});

// Sin relación de codeudor

module.exports = {
  sequelize,
  Persona,
  Administrativo,
  Inmueble,
  ServicioCita,
  EstadoCita,
  Cita,
  HistorialAsignacionAgente,
  Notificacion,
  Rol,
  Permiso,
  Acceso,
  PersonasRol,
  PropiedadInmueble,
  Reporte,
  ReporteImagen,
  ReporteArchivo,
  ReporteRubro,
  RubroSeguimiento,
  ReporteSeguimientoGeneral,
  SeguimientoVenta,
  EstadosVenta,
  Buyer,
  Sale,
  VentaAdjunto,
  Renant,
  Arriendo,
  Lease,
  Payment,
  Receipt,
  SeguimientoArrendamiento,
  Invitacion,
  Comodidad,
  InmuebleComodidad,
  InmuebleImagen,
};
