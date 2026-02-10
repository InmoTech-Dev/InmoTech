import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, MapPin } from 'lucide-react';
import AppointmentCard from './AppointmentCard';
import { useAuth } from '../../../../shared/contexts/AuthContext';

const DayListModal = ({
  isOpen,
  onClose,
  date,
  appointments = [],
  onViewAppointment,
  onEditAppointment,
  onDeleteAppointment,
  onAcceptAppointment,
  onRejectAppointment
}) => {
  const { hasPermission } = useAuth();
  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const getStatusColor = (status) => {
    const colors = {
      programada: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmada: 'bg-green-100 text-green-800 border-green-200',
      completada: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelada: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-slate-800">
                      Citas del día
                    </h3>
                    <p className="text-sm text-slate-600 capitalize">
                      {formatDate(date)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 max-h-96 overflow-y-auto">
                {appointments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay citas programadas para este día</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((appointment, index) => (
                      <motion.div
                        key={appointment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-slate-500" />
                              <span className="font-medium text-slate-800">
                                {appointment.hora}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.estado)}`}>
                                {appointment.estado}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-slate-500" />
                              <span className="text-sm text-slate-700">
                                {appointment.cliente}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-500" />
                              <span className="text-sm text-slate-700">
                                {appointment.propiedad}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-3">
                          {appointment.estado === 'solicitada' ? (
                            <>
                              {/* Para citas solicitadas */}
                              {hasPermission("citas", "ver") && (
                                <button
                                  onClick={() => onViewAppointment(appointment)}
                                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                >
                                  Ver
                                </button>
                              )}
                              {/* Aceptar y Cancelar siempre disponibles para administrativos */}
                              <button
                                onClick={() => onAcceptAppointment && onAcceptAppointment(appointment)}
                                className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                              >
                                Aceptar
                              </button>
                              <button
                                onClick={() => onRejectAppointment && onRejectAppointment(appointment)}
                                className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Para citas confirmadas */}
                              {hasPermission("citas", "ver") && (
                                <button
                                  onClick={() => onViewAppointment(appointment)}
                                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                >
                                  Ver
                                </button>
                              )}
                              {hasPermission("citas", "editar") && (
                                <button
                                  onClick={() => onEditAppointment(appointment)}
                                  className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                                >
                                  Editar
                                </button>
                              )}
                              {hasPermission("citas", "eliminar") && (
                                <button
                                  onClick={() => onDeleteAppointment(appointment)}
                                  className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                                >
                                  Eliminar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default DayListModal;
