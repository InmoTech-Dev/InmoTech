import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Briefcase, Mail, Phone, Calendar, Shield, FileText, Users } from 'lucide-react';

const ViewAdministrativoModal = ({ isOpen, onClose, administrativo }) => {
  if (!isOpen || !administrativo) return null;

  const getRolNombre = (administrativo) => {
    const roles = administrativo?.persona?.roles;
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return 'Sin rol asignado';
    }

    // 1. Intentar encontrar el rol de Administrador o Super Administrador activo (Case Insensitive & Robust)
    const protectedRole = roles.find(rol => {
      const nombre = (rol.nombre_rol || rol.nombre || rol.name || '').trim().toLowerCase();
      // Si el rol está presente, lo consideramos activo a menos que PersonasRol.estado sea explícitamente false
      const isActive = rol.PersonasRol ? !!rol.PersonasRol.estado :
        rol.through ? !!rol.through.estado : true;

      return (nombre === 'super administrador' || nombre === 'administrador' || nombre === 'admin') && isActive;
    });

    if (protectedRole) return protectedRole.nombre_rol;

    // 2. Si no hay admin, buscar cualquier otro rol activo
    const activeRol = roles.find(rol => {
      const isActive = rol.PersonasRol ? !!rol.PersonasRol.estado :
        rol.through ? !!rol.through.estado : true;
      return isActive;
    });
    return activeRol ? activeRol.nombre_rol : roles[0].nombre_rol;
  };

  const getFullName = (persona) => {
    if (!persona) return '';
    if (persona.nombre_completo && persona.nombre_completo !== 'undefined') {
      return `${persona.nombre_completo} ${persona.apellido_completo || ''}`.trim();
    }
    return 'Sin nombre';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
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
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {getFullName(administrativo.persona)}
                </h2>
                <p className="text-slate-600 mt-1">Detalles del administrativo</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información Personal */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Información Personal</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Documento</p>
                      <p className="text-sm font-medium text-slate-800">
                        {administrativo.persona?.tipo_documento} {administrativo.persona?.numero_documento}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                      <p className="text-sm font-medium text-slate-800">{administrativo.persona?.correo}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Teléfono</p>
                        <p className="text-sm font-medium text-slate-800">{administrativo.persona?.telefono}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Fecha de Registro</p>
                        <p className="text-sm font-medium text-slate-800">
                          {formatDate(administrativo.persona?.fecha_registro)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información Laboral */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Información Laboral</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Shield className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Código Empleado</p>
                      <p className="text-sm font-medium text-slate-800">
                        {getRolNombre(administrativo) === 'Administrador' || getRolNombre(administrativo) === 'Super Administrador'
                          ? getRolNombre(administrativo)
                          : administrativo.codigo_empleado}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Fecha de Ingreso</p>
                      <p className="text-sm font-medium text-slate-800">
                        {formatDate(administrativo.fecha_ingreso)}
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Estado y Rol */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-slate-800">Estado y Rol</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${administrativo.estado_laboral === 'Activo' ? 'bg-green-500' :
                      administrativo.estado_laboral === 'Inactivo' ? 'bg-yellow-500' :
                        administrativo.estado_laboral === 'Suspendido' ? 'bg-red-500' :
                          'bg-gray-500'
                      }`} />
                    <span className="text-sm font-medium text-slate-700">Estado Laboral</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-800">{administrativo.estado_laboral}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">Rol Administrativo</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-800">
                    {getRolNombre(administrativo)}
                  </p>
                </div>
              </div>
            </div>

            {/* Información adicional si existe */}
            {administrativo.observaciones && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Observaciones</h3>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-700">{administrativo.observaciones}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default ViewAdministrativoModal;
