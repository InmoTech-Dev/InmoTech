import React from "react";
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Users,
  Calendar,
  ShoppingCart,
  DollarSign,
  Home,
  Key,
  BarChart3,
  User,
  Shield,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  CheckCircle,
  XCircle,
  Crown
} from "lucide-react";

const modulesData = [
  {
    name: "Gestion de Inmuebles",
    key: "inmuebles",
    permisos: ["Crear", "Editar", "Eliminar", "Ver"],
    icon: Building2,
    color: "bg-slate-50 border-slate-200",
    description: "Administracion completa del portafolio inmobiliario"
  },
  {
    name: "Gestion de Citas",
    key: "citas",
    permisos: ["Crear", "Editar", "Eliminar", "Ver"],
    icon: Calendar,
    color: "bg-slate-50 border-slate-200",
    description: "Programacion y seguimiento de citas comerciales"
  },
  {
    name: "Gestion de Ventas",
    key: "ventas",
    permisos: ["Crear", "Editar", "Eliminar", "Ver"],
    icon: DollarSign,
    color: "bg-slate-50 border-slate-200",
    description: "Control de procesos de venta y transacciones"
  },
  {
    name: "Gestion de Arriendos",
    key: "arriendos",
    permisos: ["Crear", "Editar", "Eliminar", "Ver"],
    icon: Key,
    color: "bg-slate-50 border-slate-200",
    description: "Control de propiedades en arriendo y pagos"
  },
  {
    name: "Reportes Inmobiliarios",
    key: "reportes",
    permisos: ["Crear", "Editar", "Anular", "Ver"],
    icon: BarChart3,
    color: "bg-slate-50 border-slate-200",
    description: "Generacion de informes y analisis de mercado"
  }
];

const permissionConfig = {
  "crear": { icon: Plus, color: "text-green-600", bg: "bg-green-50", label: "Crear" },
  "editar": { icon: Edit, color: "text-blue-600", bg: "bg-blue-50", label: "Editar" },
  "eliminar": { icon: Trash2, color: "text-red-600", bg: "bg-red-50", label: "Eliminar" },
  "anular": { icon: Trash2, color: "text-red-600", bg: "bg-red-50", label: "Anular" },
  "ver": { icon: Eye, color: "text-gray-600", bg: "bg-gray-50", label: "Ver" }
};

// Vista simple para roles normales
const permissionGroups = [
  { key: "roles", label: "Roles" },
  { key: "gEmpleados", label: "G Empleados" },
  { key: "clientes", label: "Clientes" },
  { key: "usuarios", label: "Usuarios" },
  { key: "reporteInmuebles", label: "Reporte inmuebles" },
  { key: "inmuebles", label: "Inmuebles" },
  { key: "citas", label: "Citas" },
];

const permissionActions = ["crear", "editar", "eliminar", "ver"];

export default function VerRolModal({ isOpen, onClose, rol }) {
  if (!isOpen) return null;

  // Detectar si es Super Admin
  const isSuperAdmin = rol?.nombre?.toLowerCase().includes('super admin') ||
    rol?.nombre?.toLowerCase().includes('superadmin') ||
    rol?.id === "01";

  // Helper to check if a permission is granted
  const hasPermiso = (groupKey, actionKey) => {
    return rol?.permisos?.[groupKey]?.[actionKey] || false;
  };

  // Helper to get all permissions for a group
  const getPermisosGrupo = (groupKey) => {
    const permisos = rol?.permisos?.[groupKey] || {};
    return Object.entries(permisos)
      .filter(([key, value]) => value === true && key && key.trim() !== '')
      .map(([key]) => key);
  };

  // Helper para obtener módulos con permisos activos
  const getModulosConPermisos = () => {
    return modulesData.filter(modulo => {
      const permisosActivos = getPermisosGrupo(modulo.key);
      return permisosActivos.length > 0;
    }).map(modulo => ({
      ...modulo,
      permisosActivos: getPermisosGrupo(modulo.key)
    }));
  };

  // Vista completa para Super Admin
  if (isSuperAdmin) {
    const totalModulos = modulesData.length;
    const modulosConPermisos = modulesData.filter(modulo =>
      getPermisosGrupo(modulo.key).length > 0
    ).length;
    const totalPermisosPosibles = modulesData.length * 4;
    const totalPermisosActivos = modulesData.reduce((total, modulo) =>
      total + getPermisosGrupo(modulo.key).length, 0
    );

    return ReactDOM.createPortal(
      <AnimatePresence>
        {/* Backdrop */}
        <motion.div
          key="super-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          key="super-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header especial para Super Admin */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center space-x-4">
                <div className="bg-amber-100 p-3 rounded-lg">
                  <Crown className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
                    <span>Super Administrador</span>
                    <Crown className="h-6 w-6 text-amber-600" />
                  </h2>
                  <p className="text-slate-600 mt-1">Acceso completo a todos los módulos y permisos del sistema</p>
                  <div className="flex gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                      <span>{totalModulos} módulos disponibles</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Acceso completo</span>
                    </div>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </motion.button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 min-h-0">
              {/* Información del rol */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del Rol</label>
                  <div className="text-xl font-semibold text-slate-900 flex items-center space-x-2">
                    <Crown className="h-5 w-5 text-amber-600" />
                    <span>{rol?.nombre || "Super Admin"}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <label className="block text-sm font-medium text-green-700 mb-2">Estado</label>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-600 font-medium">Activo</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nivel de Acceso</label>
                  <div className="text-xl font-semibold text-slate-900">
                    Completo
                  </div>
                  <div className="text-sm text-slate-600">
                    Sin restricciones
                  </div>
                </div>
              </div>

              {/* Descripción especial para Super Admin */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 mb-8">
                <div className="flex items-start space-x-4">
                  <div className="bg-amber-100 p-3 rounded-lg">
                    <Shield className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Privilegios de Super Administrador</h3>
                    <p className="text-slate-700 leading-relaxed">
                      Este rol tiene acceso completo y sin restricciones a todos los módulos, funciones y configuraciones del sistema.
                      Puede realizar cualquier acción, incluyendo la gestión de otros usuarios y roles.
                    </p>
                  </div>
                </div>
              </div>

              {/* Módulos disponibles para Super Admin */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-slate-600" />
                  <span>Módulos del Sistema</span>
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {modulesData.map((modulo) => {
                    const Icon = modulo.icon;

                    return (
                      <div
                        key={modulo.key}
                        className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow"
                      >
                        {/* Header del módulo */}
                        <div className="flex items-start space-x-4 mb-4">
                          <div className="p-3 rounded-lg bg-white">
                            <Icon className="h-6 w-6 text-slate-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-slate-900">{modulo.name}</h4>
                            <p className="text-sm text-slate-600 mt-1">{modulo.description}</p>
                          </div>
                          <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Acceso completo
                          </div>
                        </div>

                        {/* Todos los permisos para Super Admin */}
                        <div className="grid grid-cols-2 gap-3">
                          {modulo.permisos.map((permiso, index) => {
                            const config = permissionConfig[permiso.toLowerCase()];
                            const PermisoIcon = config?.icon || Eye;

                            return (
                              <div
                                key={`permiso-super-${modulo.key}-${index}`}
                                className="flex items-center space-x-3 p-3 rounded-lg border bg-white shadow-sm"
                              >
                                <div className={`p-2 rounded-md ${config?.bg || 'bg-slate-50'}`}>
                                  <PermisoIcon className={`h-4 w-4 ${config?.color || 'text-slate-600'}`} />
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-slate-900">
                                    {permiso}
                                  </span>
                                </div>
                                <div>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Cerrar
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  }

  // Vista mejorada para roles normales - SOLO MÓDULOS CON PERMISOS
  const modulosConPermisos = getModulosConPermisos();
  const totalPermisosActivos = modulosConPermisos.reduce((total, modulo) =>
    total + modulo.permisosActivos.length, 0
  );

  return ReactDOM.createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="normal-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        key="normal-modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header del rol */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Detalles del Rol</h2>
              <p className="text-slate-600 mt-1">Permisos y módulos asignados a "{rol?.nombre}"</p>
              <div className="flex gap-4 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>{modulosConPermisos.length} módulos activos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>{totalPermisosActivos} permisos asignados</span>
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </motion.button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 min-h-0">
            {/* Información del rol */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del Rol</label>
                <div className="text-xl font-semibold text-slate-900 flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-slate-600" />
                  <span>{rol?.nombre || "Sin nombre"}</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <label className="block text-sm font-medium text-green-700 mb-2">Estado</label>
                <div className="flex items-center space-x-2">
                  {rol?.estado ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-600 font-medium">Activo</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-red-600 font-medium">Inactivo</span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">Permisos Totales</label>
                <div className="text-xl font-semibold text-slate-900">
                  {totalPermisosActivos}
                </div>
                <div className="text-sm text-slate-600">
                  {modulosConPermisos.length} módulos activos
                </div>
              </div>
            </div>

            {/* Mensaje si no hay permisos */}
            {modulosConPermisos.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-slate-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Sin Permisos Asignados</h3>
                <p className="text-slate-500">Este rol no tiene permisos asignados a ningún módulo.</p>
              </div>
            ) : (
              <>
                {/* Resumen de permisos por tipo */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-slate-600" />
                    <span>Resumen de Permisos</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(permissionConfig)
                      .filter(([key, config]) => key && key.trim() !== '')
                      .map(([key, config]) => {
                        const Icon = config.icon;
                        const count = modulosConPermisos.filter(modulo =>
                          modulo.permisosActivos && modulo.permisosActivos.includes(key)
                        ).length;

                        return (
                          <div key={key && key.trim() !== '' ? key : `permiso-${Math.random()}`} className={`${config.bg} border rounded-lg p-4 text-center shadow-sm`}>
                            <Icon className={`h-6 w-6 ${config.color} mx-auto mb-2`} />
                            <div className="text-2xl font-bold text-slate-900">{count}</div>
                            <div className="text-sm text-slate-600">{config.label}</div>
                            <div className="text-xs text-slate-500 mt-1">módulos</div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Módulos con permisos */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-slate-600" />
                    <span>Módulos con Permisos Asignados</span>
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {modulosConPermisos.map((modulo) => {
                      const Icon = modulo.icon;

                      return (
                        <div
                          key={modulo.key}
                          className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow"
                        >
                          {/* Header del módulo */}
                          <div className="flex items-start space-x-4 mb-4">
                            <div className="p-3 rounded-lg bg-white">
                              <Icon className="h-6 w-6 text-slate-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-slate-900">{modulo.name}</h4>
                              <p className="text-sm text-slate-600 mt-1">{modulo.description}</p>
                            </div>
                            <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {modulo.permisosActivos.length} permisos
                            </div>
                          </div>

                          {/* Permisos activos del módulo */}
                          <div className="grid grid-cols-2 gap-3">
                            {modulo.permisosActivos
                              .filter(permiso => permiso && permiso.trim() !== '')
                              .map((permiso, index) => {
                                const config = permissionConfig[permiso];
                                const PermisoIcon = config?.icon || Eye;

                                return (
                                  <div
                                    key={`permiso-normal-${modulo.key}-${permiso}-${index}`}
                                    className="flex items-center space-x-3 p-3 rounded-lg border bg-white shadow-sm"
                                  >
                                    <div className={`p-2 rounded-md ${config?.bg || 'bg-slate-50'}`}>
                                      <PermisoIcon className={`h-4 w-4 ${config?.color || 'text-slate-600'}`} />
                                    </div>
                                    <div className="flex-1">
                                      <span className="text-sm font-medium text-slate-900 capitalize">
                                        {permiso}
                                      </span>
                                    </div>
                                    <div>
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cerrar
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
