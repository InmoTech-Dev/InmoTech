import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Home,
  FileText,
  CheckCircle,
  Hash,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  formData,
  isLoading = false
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';

    const [year, month, day] = dateString.split('-');
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const weekdays = [
      'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
    ];

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);

    const weekdayIndex = (dayNum + Math.floor(2.6 * ((monthNum + 1) % 12) - 0.2) +
      yearNum % 100 + Math.floor(yearNum % 100 / 4) +
      Math.floor(yearNum / 400) - 2 * Math.floor(yearNum / 100)) % 7;

    const weekday = weekdays[Math.abs(weekdayIndex) % 7];
    const monthName = months[parseInt(month) - 1];

    return `${weekday}, ${day} de ${monthName} de ${year}`;
  };

  const getDocumentTypeLabel = (tipoDocumento) => {
    const documentTypes = {
      'CC': 'Cédula de Ciudadanía',
      'CE': 'Cédula de Extranjería',
      'NIT': 'NIT',
      'PASAPORTE': 'Pasaporte',
      'TI': 'Tarjeta de Identidad'
    };
    return documentTypes[tipoDocumento] || tipoDocumento;
  };

  const getStatusBadge = (estado) => {
    const statusConfig = {
      programada: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Programada'
      },
      confirmada: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Confirmada'
      },
      solicitada: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-800',
        label: 'Solicitada'
      }
    };

    const config = statusConfig[estado] || statusConfig.programada;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const infoItems = [
    {
      icon: User,
      label: 'Nombre Completo',
      value: `${formData.nombre || ''} ${formData.apellido || ''}`.trim(),
      color: 'text-blue-600'
    },
    {
      icon: FileText,
      label: 'Tipo de Documento',
      value: getDocumentTypeLabel(formData.tipoDocumento),
      color: 'text-indigo-600'
    },
    {
      icon: Hash,
      label: 'Número de Documento',
      value: formData.numeroDocumento,
      color: 'text-slate-600'
    },
    {
      icon: Phone,
      label: 'Teléfono',
      value: formData.telefono,
      color: 'text-green-600'
    },
    {
      icon: Mail,
      label: 'Correo Electrónico',
      value: formData.email,
      color: 'text-purple-600'
    },
    {
      icon: Calendar,
      label: 'Fecha de la Cita',
      value: formatDate(formData.fecha),
      color: 'text-orange-600'
    },
    {
      icon: Clock,
      label: 'Hora de la Cita',
      value: formData.hora,
      color: 'text-red-600'
    },
    {
      icon: Home,
      label: 'Servicio Solicitado',
      value: formData.servicio,
      color: 'text-teal-600'
    }
  ];

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center"
              >
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Confirmar Cita</h2>
                <p className="text-slate-600 mt-1">Revisa todos los datos antes de crear la cita</p>
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
            <div className="space-y-6">
              {/* Información Principal */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Información de la Cita
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {infoItems.map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm"
                    >
                      <div className={`p-2 rounded-lg bg-slate-50 flex-shrink-0`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-600 mb-1">{item.label}</p>
                        <p className="text-slate-800 font-semibold break-words">{item.value || 'No especificado'}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Estado de la Cita */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">Estado inicial de la cita:</span>
                  {getStatusBadge(formData.estado)}
                </div>
              </motion.div>

              {/* Notas Adicionales */}
              {formData.notas && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-amber-50 border border-amber-200 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 flex-shrink-0">
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 mb-1">Notas Adicionales</p>
                      <p className="text-amber-700">{formData.notas}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Advertencia Importante */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Importante</p>
                    <p className="text-yellow-700 text-sm">
                      Una vez creada la cita, podrás editarla o cambiar su estado más tarde si es necesario.
                      Asegúrate de que toda la información sea correcta antes de confirmar.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Confirmación Final */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">¿Todo correcto?</span>
                </div>
                <p className="text-green-700 text-sm">
                  Si confirmas, la cita será creada inmediatamente y se notificará al cliente si es necesario.
                </p>
              </motion.div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-6 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Revisar Datos
            </motion.button>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                disabled={isLoading}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onConfirm}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Creando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirmar Cita
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default ConfirmationModal;
