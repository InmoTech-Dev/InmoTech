import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  Eye,
  X,
  Calendar,
  Clock,
  MapPin,
  Building,
  User,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import citaApiService from '../../../shared/services/citaApiService';

const UserViewAppointmentModal = ({ isOpen, onClose, appointment }) => {
  if (!isOpen || !appointment) return null;

  const statusConfig = {
    solicitada: {
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: AlertCircle,
      label: 'Solicitada'
    },
    confirmada: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Clock,
      label: 'Confirmada'
    },
    programada: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle,
      label: 'Programada'
    },
    completada: {
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: CheckCircle,
      label: 'Completada'
    },
    cancelada: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: XCircle,
      label: 'Cancelada'
    },
    're agendada': {
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: AlertCircle,
      label: 'Re Agendada'
    }
  };

  const statusInfo = statusConfig[appointment.estado] || statusConfig.solicitada;
  const StatusIcon = statusInfo.icon;
  const editNote =
    appointment.motivo_reagendamiento ||
    appointment.comentario_edicion ||
    appointment.comentario ||
    appointment.motivo_cancelacion ||
    appointment.motivoCancelacion;
  const cancelNote = appointment.motivo_cancelacion || appointment.motivoCancelacion;
  const estadoCita = (appointment.estado || '').toLowerCase();
  const estadoDetalle = (appointment.estado_cita?.nombre || '').toLowerCase();
  const estadoId = appointment.id_estado_cita;
  const wasEdited =
    !!(editNote && editNote.trim && editNote.trim().length > 0) ||
    (appointment?.ediciones_realizadas ?? 0) > 0 ||
    estadoCita === 're agendada' ||
    estadoDetalle === 're agendada';

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      const date = dateString.includes('T') ? new Date(dateString) : new Date(`${dateString}T00:00:00`);
      if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
      return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'Fecha no disponible';
    }
  };

  const formatHora = (horaString) => citaApiService.formatHoraDesdeAPI(horaString);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-45 backdrop-blur-md z-[10000]"
            onClick={onClose}
            transition={{ duration: 0.2 }}
          />

          <div className="fixed inset-0 flex items-center justify-center p-4 z-[10001] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 24, stiffness: 260, duration: 0.3 }}
              className="pointer-events-auto bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-8 py-6 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white drop-shadow-sm">Detalles de la Cita</h2>
                      <p className="text-blue-100 text-sm mt-1">Revisa toda la informacion completa</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color} bg-white/20 text-white border-white/40`}
                    >
                      <StatusIcon className="h-4 w-4" />
                      <span>{statusInfo.label}</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
                    >
                      <X className="w-6 h-6" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-7 py-7 bg-slate-50">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-semibold text-gray-900">
                      Cita #{appointment.userAppointmentNumber || appointment.id}
                    </h3>
                  </div>

                  {/* Primary info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="p-2 bg-blue-50 rounded-xl">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Fecha</p>
                          <p className="text-lg font-semibold text-gray-900">{formatDate(appointment.fecha_cita)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="p-2 bg-blue-50 rounded-xl">
                          <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Hora</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {appointment.hora_inicio ? formatHora(appointment.hora_inicio) : 'Por confirmar'}
                            {appointment.hora_fin && ` - ${formatHora(appointment.hora_fin)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Property & Service */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {appointment.inmueble && (
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-green-50 rounded-xl">
                            <Building className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Propiedad</p>
                            <p className="text-base font-semibold text-gray-900">{appointment.inmueble.direccion}</p>
                            {appointment.inmueble.departamento && appointment.inmueble.ciudad && (
                              <p className="text-sm text-gray-600">
                                {appointment.inmueble.ciudad}, {appointment.inmueble.departamento}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {appointment.servicio && (
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-indigo-50 rounded-xl">
                            <MapPin className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Servicio solicitado</p>
                            <p className="text-base font-semibold text-gray-900">
                              {appointment.servicio.nombre_servicio}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Agent */}
                  {appointment.agente && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 rounded-xl">
                          <User className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Agente asignado</p>
                          <p className="text-base font-semibold text-gray-900">
                            {appointment.agente.nombre_completo}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-700 ml-1">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{appointment.agente.telefono || 'No disponible'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>{appointment.agente.correo || 'No disponible'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observations */}
                  {appointment.observaciones && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-50 rounded-xl mt-1">
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Observaciones</p>
                          <p className="text-gray-800">{appointment.observaciones}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit justification */}
                  {wasEdited && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl mt-1">
                          <AlertCircle className="w-5 h-5 text-blue-700" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-blue-700">Motivo de la Edici&oacute;n *</p>
                          <p className="text-blue-900">{editNote || 'Motivo no registrado'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cancellation */}
                  {(cancelNote || estadoCita.includes('cancel') || estadoDetalle.includes('cancel') || estadoId === 6) && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-100 rounded-xl mt-1">
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-red-600">Motivo de cancelacion</p>
                          <p className="text-red-800">
                            {cancelNote || editNote || 'Motivo no registrado'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={onClose}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-sm"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
        </motion.div>
      </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default UserViewAppointmentModal;
