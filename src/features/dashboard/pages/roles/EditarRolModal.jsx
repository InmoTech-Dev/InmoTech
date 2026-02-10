import React, { useState, useEffect, useRef } from "react";
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
    permisos: ["Crear", "Editar", "Eliminar", "Ver"],
    icon: BarChart3,
    color: "bg-slate-50 border-slate-200",
    description: "Generacion de informes y analisis de mercado"
  }
];

const permissionConfig = {
  "Crear": { icon: Plus, color: "text-green-600", bg: "bg-green-50" },
  "Editar": { icon: Edit, color: "text-blue-600", bg: "bg-blue-50" },
  "Eliminar": { icon: Trash2, color: "text-red-600", bg: "bg-red-50" },
  "Ver": { icon: Eye, color: "text-gray-600", bg: "bg-gray-50" }
};

export default function EditarRolModal({ isOpen, onClose, rol, onSave }) {
  const [nombre, setNombre] = useState("");
  const [modules, setModules] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);

  // Initialize form data when rol changes
  useEffect(() => {
    if (rol) {
      setNombre(rol.nombre);
      
      // Initialize modules with rol data
      const initialModules = modulesData.map((mod) => {
        const rolPermisos = rol.permisos?.[mod.key] || {};
        const permisosSeleccionados = mod.permisos.filter(permiso => 
          rolPermisos[permiso.toLowerCase()] === true
        );
        
        return {
          ...mod,
          enabled: permisosSeleccionados.length > 0,
          permisosSeleccionados
        };
      });
      
      setModules(initialModules);
    }
  }, [rol]);

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
              permisosSeleccionados: mod.permisosSeleccionados.includes(permiso)
                ? mod.permisosSeleccionados.filter((p) => p !== permiso)
                : [...mod.permisosSeleccionados, permiso],
            }
          : mod
      )
    );
    setErrors(prev => ({ ...prev, permisos: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Convertir el formato de permisos para que coincida con el esperado
      const permisos = {};
      modules.forEach((mod) => {
        if (mod.enabled && mod.permisosSeleccionados.length > 0) {
          // Crear objeto con formato: { crear: true, editar: true, eliminar: true, ver: true }
          const permisosObj = {};
          mod.permisosSeleccionados.forEach((permiso) => {
            permisosObj[permiso.toLowerCase()] = true;
          });
          permisos[mod.key] = permisosObj;
        }
      });

      // Crear el rol editado
      const rolEditado = {
        ...rol,
        nombre: nombre.trim(),       // Para el frontend
        nombre_rol: nombre.trim(),   // โ�� Ahora se envรญa para el API
        permisos
      };
      
      await onSave(rolEditado);
      onClose();
    } catch (error) {
      console.error('Error al editar rol:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setErrors({});
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
              <h2 className="text-2xl font-bold text-slate-800">Editar Rol</h2>
              <p className="text-slate-600 mt-1">Modifique los permisos y accesos del rol "{rol?.nombre}"</p>
              <div className="flex gap-4 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>{activeModulesCount} mรณdulos activos</span>
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
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors ${
                    errors.nombre ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.nombre && (
                  <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>
                )}
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

              {/* Mรณdulos y Permisos */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Configuraciรณn de Permisos por Mรณdulo
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
                        className={`border-2 rounded-lg transition-all duration-200 ${
                          module.enabled 
                            ? `${module.color} shadow-sm` 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        {/* Header del mรณdulo */}
                        <div className="p-4 border-b border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`p-2 rounded-lg ${
                                module.enabled ? 'bg-white shadow-sm' : 'bg-gray-100'
                              }`}>
                                <IconComponent 
                                  className={`w-4 h-4 ${module.enabled ? 'text-gray-700' : 'text-gray-400'}`}
                                />
                              </div>
                              <div className="flex-1">
                                <h4 className={`font-semibold text-sm ${
                                  module.enabled ? 'text-gray-800' : 'text-gray-500'
                                }`}>
                                  {module.name}
                                </h4>
                                <p className={`text-xs mt-1 ${
                                  module.enabled ? 'text-gray-600' : 'text-gray-400'
                                }`}>
                                  {module.description}
                                </p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={module.enabled}
                                onChange={() => toggleModule(index)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-600"></div>
                            </label>
                          </div>
                        </div>

                        {/* Permisos */}
                        {module.enabled && (
                          <div className="p-4">
                            <div className="grid grid-cols-2 gap-2">
                              {module.permisos.map((permiso) => {
                                const config = permissionConfig[permiso];
                                const IconPermiso = config.icon;
                                const isSelected = module.permisosSeleccionados.includes(permiso);
                                
                                return (
                                  <button
                                    key={permiso}
                                    type="button"
                                    onClick={() => togglePermiso(index, permiso)}
                                    className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all text-xs font-medium ${
                                      isSelected
                                        ? `${config.bg} ${config.color} border-current shadow-sm`
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <IconPermiso className="w-3 h-3" />
                                    <span>{permiso}</span>
                                  </button>
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
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                isSubmitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-slate-600 hover:bg-slate-700'
              } text-white`}
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
