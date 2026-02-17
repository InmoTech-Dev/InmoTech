import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, Calendar, FileText, Shield, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import UserStatusSelector from '../../../../shared/components/ui/UserStatusSelector';

const ViewUserModal = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const getFullName = () => {
    return `${user.nombre_completo || ''} ${user.apellido_completo || ''}`.trim() || 'Sin nombre';
  };

  const renderAccessStatus = () => {
    const isDisabled = user.estado === false;
    const isVerified = user.correo_verificado === true;
    const hasAccount = user.tiene_cuenta === true;
    const raw = (user.invitacion_estado || '').toLowerCase();

    if (isDisabled) {
      return {
        title: 'Cuenta deshabilitada',
        description: 'El usuario no puede iniciar sesión ni recibir invitaciones.',
        icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800'
      };
    }

    if (isVerified) {
      return {
        title: 'Cuenta activa',
        description: 'Correo verificado. El usuario puede iniciar sesión.',
        icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800'
      };
    }

    if (raw.includes('verificacion')) {
      return {
        title: 'Verificación pendiente',
        description: 'Se requiere que el usuario confirme el correo y genere una nueva contraseña.',
        icon: <Clock className="w-5 h-5 text-amber-600" />,
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800'
      };
    }

    if (hasAccount) {
      return {
        title: 'Verificación pendiente',
        description: 'Tiene cuenta pero debe verificar su correo para iniciar sesión.',
        icon: <Clock className="w-5 h-5 text-amber-600" />,
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800'
      };
    }

    return {
      title: 'Activación pendiente',
      description: 'Sin contraseña definida. Reenviar invitación si es necesario.',
      icon: <Clock className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800'
    };
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
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{getFullName()}</h2>
                <p className="text-slate-600 mt-1">Detalles del usuario</p>
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
            <div className="space-y-4">
              {/* Información Personal */}
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-800">Información Personal</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Documento</p>
                    <p className="text-sm font-medium text-slate-800">
                      {user.tipo_documento} {user.numero_documento}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                    <p className="text-sm font-medium text-slate-800">{user.correo}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Teléfono</p>
                    <p className="text-sm font-medium text-slate-800">{user.telefono || 'No especificado'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Fecha de Registro</p>
                    <p className="text-sm font-medium text-slate-800">
                      {formatDate(user.fecha_registro)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Estado */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-slate-800">Estado</h3>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-medium text-slate-700">Estado de Cuenta</span>
                </div>
                <div className="mb-3">
                  <UserStatusSelector
                    value={user.estado}
                    disabled={true}
                    className="w-full max-w-[200px]"
                  />
                </div>
                <p className={`text-sm ${
                  user.estado === true || user.estado === 'true' || user.estado === 1
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {user.estado === true || user.estado === 'true' || user.estado === 1
                    ? 'El usuario puede iniciar sesión y acceder a todas las funcionalidades del sistema.'
                    : 'El usuario no puede iniciar sesión ni acceder al sistema.'
                  }
                </p>

                <div className="mt-4">
                  <span className="text-sm font-medium text-slate-700">Estado de acceso</span>
                  <div className="mt-2">
                    {(() => {
                      const access = renderAccessStatus();
                      return (
                        <div className={`flex items-start gap-3 rounded-lg border ${access.border} ${access.bg} px-3 py-3`}>
                          {access.icon}
                          <div className={`${access.text}`}>
                            <p className="font-semibold text-sm">{access.title}</p>
                            <p className="text-xs mt-1">{access.description}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
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

export default ViewUserModal;
