import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, Loader } from 'lucide-react';
import { useToast } from '../../../shared/hooks/use-toast';
import citaApiService from '../../../shared/services/citaApiService';

const UserCancelAppointmentModal = ({
  isOpen,
  onClose,
  appointment,
  onCancelAppointment
}) => {
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!motivoCancelacion.trim()) {
      toast({
        title: "Comentario obligatorio",
        description: "Por favor ingresa el motivo de la cancelación.",
        variant: "destructive"
      });
      return;
    }

    if (motivoCancelacion.trim().length < 10) {
      toast({
        title: "Comentario muy corto",
        description: "El motivo debe tener al menos 10 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onCancelAppointment(appointment.id, motivoCancelacion.trim());
      toast({
        title: "Cita cancelada",
        description: "La cita ha sido cancelada exitosamente.",
        variant: "default"
      });
      onClose();
      setMotivoCancelacion('');
    } catch (error) {
      console.error('Error cancelando cita:', error);
      toast({
        title: "Error al cancelar",
        description: error.message || "No se pudo cancelar la cita. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMotivoCancelacion('');
      onClose();
    }
  };

  if (!isOpen || !appointment) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-40 flex items-center justify-center p-4"
        onClick={handleClose}
        transition={{ duration: 0.3 }}
      >
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 50 }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 300,
            duration: 0.4
          }}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >

          {/* Header with Gradient */}
          <div className="relative bg-gradient-to-r from-red-600 via-red-700 to-pink-700 px-8 py-6 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-sm">
                    Cancelar Cita
                  </h2>
                  <p className="text-red-100 text-sm mt-1">
                    Confirma esta acción
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm disabled:opacity-50"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="space-y-6">
              {/* Appointment Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-gray-900">
                  Cita #{appointment.userAppointmentNumber || appointment.id}
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Fecha:</span> {new Date(appointment.fecha_cita).toLocaleDateString('es-ES')}
                  </p>
                  <p>
                    <span className="font-medium">Hora:</span>{' '}
                    {appointment.hora_inicio
                      ? citaApiService.formatHoraDesdeAPI(appointment.hora_inicio)
                      : 'Por definir'}
                  </p>
                  {appointment.inmueble && (
                    <p>
                      <span className="font-medium">Propiedad:</span> {appointment.inmueble.direccion}
                    </p>
                  )}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 mb-1">
                      ¿Estás seguro de cancelar esta cita?
                    </h4>
                    <p className="text-sm text-yellow-700">
                      Esta acción no se puede deshacer. Por favor, indica el motivo de la cancelación.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo de cancelación <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={motivoCancelacion}
                    onChange={(e) => setMotivoCancelacion(e.target.value)}
                    placeholder="Explica por qué necesitas cancelar esta cita..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    rows={4}
                    required
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo 10 caracteres. Sé específico para que podamos ayudarte mejor.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !motivoCancelacion.trim() || motivoCancelacion.trim().length < 10}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      'Confirmar Cancelación'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default UserCancelAppointmentModal;
