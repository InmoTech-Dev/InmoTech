import React, { useState, useRef, useEffect } from "react";
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
  Save,
  AlertCircle
} from "lucide-react";

const modulesData = [
  {
    name: "Gestion de Inmuebles",
    key: "inmuebles",
    permisos: ["Crear", "Editar", "Eliminar", "Ver"],
    icon: Building2,
    color: "bg-slate-50 border-slate-200",
    iconColor: "text-slate-600",
    description: "Administracion completa del portafolio inmobiliario"
  },
  {
    name: "Gestion de Citas",
    key: "citas",
    permisos: ["Crear", "Editar", "Eliminar", "Ver"],
    icon: Calendar,
    color: "bg-slate-50 border-slate-200",
    iconColor: "text-slate-600",
    description: "Programacion y seguimiento de citas comerciales"
  },
  {
    name: "Gestion de Ventas",
    key: "ventas",
    permisos: ["Crear", "Editar", "Eliminar", "Ver"],
    icon: DollarSign,
    color: "bg-slate-50 border-slate-200",
    iconColor: "text-slate-600",
    description: "Control de procesos de venta y transacciones"
  },
  {
    name: "Gestion de Arriendos",
    key: "arriendos",
    permisos: ["Crear", "Editar", "Eliminar", "Ver"],
    icon: Key,
    color: "bg-slate-50 border-slate-200",
    iconColor: "text-slate-600",
    description: "Control de propiedades en arriendo y pagos"
  },
  {
    name: "Reportes Inmobiliarios",
    key: "reportes",
    permisos: ["Crear", "Editar", "Eliminar", "Ver"],
    icon: BarChart3,
    color: "bg-slate-50 border-slate-200",
    iconColor: "text-slate-600",
    description: "Generacion de informes y analisis de mercado"
  }
];

const permissionConfig = {
  "Crear": { icon: Plus, color: "text-green-600", bg: "bg-green-50" },
  "Editar": { icon: Edit, color: "text-blue-600", bg: "bg-blue-50" },
  "Eliminar": { icon: Trash2, color: "text-red-600", bg: "bg-red-50" },
  "Ver": { icon: Eye, color: "text-gray-600", bg: "bg-gray-50" }
};

const VIEW_PERMISSION = "Ver";

const getNextPermissionsSelection = (currentPermissions = [], permiso) => {
  const selected = new Set(currentPermissions);
  const isSelected = selected.has(permiso);

  if (permiso === VIEW_PERMISSION) {
    if (isSelected) {
      return [];
    }
    selected.add(VIEW_PERMISSION);
    return Array.from(selected);
  }

  if (isSelected) {
    selected.delete(permiso);
    return Array.from(selected);
  }

  selected.add(permiso);
  selected.add(VIEW_PERMISSION);
  return Array.from(selected);
};

export default function CrearRolModal({ isOpen, onClose, onSubmit }) {
  const [nombre, setNombre] = useState("");
  const [esAdministrativo, setEsAdministrativo] = useState(true);
  const [modules, setModules] = useState(
    modulesData.map((mod) => ({
      ...mod,
      enabled: true,
      permisosSeleccionados: [...mod.permisos],
      permissions: mod.permisos.reduce((acc, permiso) => {
        acc[permiso] = true;
        return acc;
      }, {})
    }))
  );
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);


  // Scroll to top when modal opens
  useEffect(() => {
    if (isOpen && formRef.current) {
      formRef.current.scrollTop = 0;
    }
  }, [isOpen]);



  const validateForm = () => {
    const newErrors = {};

    if (!nombre.trim()) {
      newErrors.nombre = "El nombre del rol es obligatorio";
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = "El nombre debe tener al menos 3 caracteres";
    }

    const hasAnyPermission = modules.some(mod =>
      mod.enabled && mod.permisosSeleccionados.length > 0
    );

    if (!hasAnyPermission) {
      newErrors.permisos = "Debe seleccionar al menos un permiso";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toggleModule = (index) => {
    setModules((prev) =>
      prev.map((mod, i) =>
        i === index
          ? {
            ...mod,
            enabled: !mod.enabled,
            permisosSeleccionados: !mod.enabled ? [...mod.permisos] : [],
            permissions: mod.permisos.reduce((acc, permiso) => {
              acc[permiso] = !mod.enabled;
              return acc;
            }, {})
          }
          : mod
      )
    );
    setErrors(prev => ({ ...prev, permisos: undefined }));
  };

  const togglePermiso = (index, permiso) => {
    setModules((prev) =>
      prev.map((mod, i) =>
        i === index
          ? {
            ...mod,
            permisosSeleccionados: getNextPermissionsSelection(mod.permisosSeleccionados, permiso),
          }
          : mod
      )
    );
    setErrors(prev => ({ ...prev, permisos: undefined }));
  };

  const togglePermission = (index, permiso) => {
    setModules((prev) =>
      prev.map((mod, i) =>
        i === index
          ? (() => {
            const nextSelection = getNextPermissionsSelection(mod.permisosSeleccionados, permiso);
            const nextPermissions = mod.permisos.reduce((acc, modulePermission) => {
              acc[modulePermission] = nextSelection.includes(modulePermission);
              return acc;
            }, {});

            return {
              ...mod,
              permissions: nextPermissions,
              permisosSeleccionados: nextSelection,
            };
          })()
          : mod
      )
    );
    setErrors(prev => ({ ...prev, permisos: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Convertir el formato de permisos
      const permisos = {};
      modules.forEach((mod) => {
        if (mod.enabled && mod.permisosSeleccionados.length > 0) {
          const permisosObj = {};
          mod.permisosSeleccionados.forEach((permiso) => {
            permisosObj[permiso.toLowerCase()] = true;
          });
          permisos[mod.key] = permisosObj;
        }
      });

      // ✅ CORREGIDO: El formato debe ser nombre_rol, no nombre
      const nuevoRol = {
        nombre_rol: nombre.trim(), // ✅ Cambiar "nombre" por "nombre_rol"
        es_rol_administrativo: esAdministrativo, // Usar el valor del toggle
        permisos
      };

      // ✅ CAMBIAR onSave por onSubmit
      await onSubmit(nuevoRol);

      // Limpiar el formulario
      setNombre("");
      setModules(
        modulesData.map((mod) => ({
          ...mod,
          enabled: true,
          permisosSeleccionados: [...mod.permisos],
          permissions: mod.permisos.reduce((acc, permiso) => {
            acc[permiso] = true;
            return acc;
          }, {}),
        }))
      );
      setErrors({});

      // ✅ No cerrar aquí - dejar que Roles.jsx lo maneje después de éxito
      // onClose();

    } catch (error) {
      console.error('Error al crear rol:', error);
      // Mostrar error en el modal
      setErrors({ submit: error.message || 'Error al crear el rol' });
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleClose = () => {
    setErrors({});
    setNombre("");
    setEsAdministrativo(true);
    setModules(
      modulesData.map((mod) => ({
        ...mod,
        enabled: true,
        permisosSeleccionados: [...mod.permisos],
        permissions: mod.permisos.reduce((acc, permiso) => {
          acc[permiso] = true;
          return acc;
        }, {}),
      }))
    );
    onClose();
  };

  const activeModulesCount = modules.filter(mod => mod.enabled).length;
  const totalPermissionsCount = modules.reduce((acc, mod) =>
    acc + (mod.enabled ? mod.permisosSeleccionados.length : 0), 0
  );

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Crear Nuevo Rol</h2>
              <p className="text-slate-600 mt-1">Configure los permisos y accesos para el nuevo rol del sistema</p>
              <div className="flex gap-4 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>{activeModulesCount} módulos activos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>{totalPermissionsCount} permisos seleccionados</span>
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </motion.button>
          </div>

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 min-h-0">
            <div className="space-y-6">
              {/* Nombre del Rol */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Shield className="w-4 h-4 inline mr-2" />
                  Nombre del Rol *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setErrors(prev => ({ ...prev, nombre: undefined }));
                  }}
                  placeholder="Ej: Agente Comercial Senior"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors ${errors.nombre ? 'border-red-500' : 'border-slate-300'
                    }`}
                />
                {errors.nombre && (
                  <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>
                )}
              </div>

              {/* Rol Administrativo */}
              <div>
                <label className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={esAdministrativo}
                    onChange={(e) => setEsAdministrativo(e.target.checked)}
                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-blue-900">Rol Administrativo</span>
                    <p className="text-xs text-blue-700 mt-1">
                      Este rol tendrá acceso al panel administrativo completo del sistema
                    </p>
                  </div>
                </label>
              </div>

              {/* Error de permisos */}
              {errors.permisos && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium text-sm">{errors.permisos}</span>
                  </div>
                </div>
              )}

              {/* Módulos y Permisos */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Configuración de Permisos por Módulo
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {modules.map((module, index) => {
                    const IconComponent = module.icon;

                    return (
                      <motion.div
                        key={module.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`border-2 rounded-xl transition-all duration-200 hover:shadow-md ${module.enabled
                            ? 'bg-white border-slate-300 shadow-sm'
                            : 'bg-gray-50 border-gray-200'
                          }`}
                      >
                        {/* Header del módulo */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`p-2.5 rounded-lg transition-colors ${module.enabled
                                  ? 'bg-slate-100 border border-slate-200'
                                  : 'bg-gray-100 border border-gray-200'
                                }`}>
                                <IconComponent
                                  className={`w-5 h-5 ${module.enabled
                                      ? module.iconColor || 'text-slate-600'
                                      : 'text-gray-400'
                                    }`}
                                />
                              </div>
                              <div className="flex-1">
                                <h4 className={`font-semibold text-sm leading-tight ${module.enabled ? 'text-slate-800' : 'text-gray-500'
                                  }`}>
                                  {module.name}
                                </h4>
                                <p className={`text-xs mt-1.5 leading-relaxed ${module.enabled ? 'text-slate-600' : 'text-gray-400'
                                  }`}>
                                  {module.description}
                                </p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-2">
                              <input
                                type="checkbox"
                                checked={module.enabled}
                                onChange={() => toggleModule(index)}
                                className="sr-only peer"
                              />
                              <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>

                        {/* Permisos */}
                        {module.enabled && (
                          <div className="p-4">
                            <div className="grid grid-cols-2 gap-2">
                              {module.permisos.map((permiso) => {
                                const config = permissionConfig[permiso];
                                const IconComponent = config.icon;
                                const isChecked = module.permissions[permiso];

                                return (
                                  <label
                                    key={permiso}
                                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all duration-200 ${isChecked
                                        ? `${config.bg} ${config.color.replace('text-', 'border-')} border-opacity-30`
                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                      }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(index, permiso)}
                                      className="sr-only"
                                    />
                                    <div className={`p-1 rounded ${isChecked ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                                      <IconComponent
                                        className={`w-3.5 h-3.5 ${isChecked ? config.color : 'text-gray-400'
                                          }`}
                                      />
                                    </div>
                                    <span className={`text-xs font-medium ${isChecked ? config.color : 'text-gray-500'
                                      }`}>
                                      {permiso}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${isSubmitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-slate-600 hover:bg-slate-700'
                } text-white`}
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Creando...' : 'Crear Rol'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
