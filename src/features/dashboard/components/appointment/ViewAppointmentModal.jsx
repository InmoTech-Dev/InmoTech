import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Mail, Calendar, Clock, Home, FileText, MapPin, Hash } from 'lucide-react';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import citaApiService from '../../../../shared/services/citaApiService';

const ViewAppointmentModal = ({ isOpen, onClose, cita }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  if (!isOpen || !cita) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';

    try {
      let date;

      // Si es un formato ISO con T (puede tener zona horaria UTC)
      if (typeof dateString === 'string' && dateString.includes('T')) {
        date = new Date(dateString);
        // Si viene en UTC y podemos afectar la fecha, normalizamos
        const utcDate = date.getUTCDate();
        const utcMonth = date.getUTCMonth();
        const utcYear = date.getUTCFullYear();

        // Crear fecha local sin zona horaria
        date = new Date(utcYear, utcMonth, utcDate);
      }
      // Si es formato YYYY-MM-DD
      else if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = new Date(dateString + 'T00:00:00');
      }
      // Otros formatos
      else {
        date = new Date(dateString);
      }

      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        console.error('Fecha inválida:', dateString);
        return 'Fecha inválida';
      }

      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formateando fecha en ViewAppointmentModal:', error, dateString);
      return 'Error de fecha';
    }
  };


  const formatTime = (timeString) => {
    if (!timeString) return '';

    try {
      // Usar la función centralizada corregida para zona horaria
      return citaApiService.formatHoraDesdeAPI(timeString);
    } catch (error) {
      console.error('❌ Error formateando hora en ViewAppointmentModal:', error, timeString);
      return timeString || 'Error de formato';
    }
  };
  
  
  const getStatusBadge = (estado) => {
    const statusConfig = {
      'solicitada': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Solicitada' }, // ✅ AGREGADO
      'programada': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Programada' },
      'confirmada': { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmada' },
      'cancelada': { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada' },
      'completada': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Completada' },
      're agendada': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Re Agendada' } // ✅ AGREGADO
    };
    
    const estadoLower = (estado || 'solicitada').toLowerCase(); // ✅ AGREGADO toLowerCase
    const config = statusConfig[estadoLower] || statusConfig['solicitada']; // ✅ CAMBIADO default
      
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
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

  const formatDocumentInfo = (tipoDocumento, numeroDocumento) => {
    if (!tipoDocumento || !numeroDocumento) return 'No especificado';
    return `${getDocumentTypeLabel(tipoDocumento)} - ${numeroDocumento}`;
  };

// ✅ AGREGADO: Extraer objetos de forma segura ANTES del array
const cliente = cita.cliente || {};
const inmueble = cita.inmueble || {};
const servicio = cita.servicio || {};
const editNote =
  cita.motivo_reagendamiento ||
  cita.comentario_edicion ||
  cita.comentario ||
  cita.motivo_cancelacion || // si solo hay cancelación, úsalo como nota
  cita.motivoCancelacion;
const cancelNote = cita.motivo_cancelacion || cita.motivoCancelacion;
const estadoCita = (cita.estado || '').toLowerCase();
const estadoDetalle = (cita.estado_detalle?.nombre_estado || '').toLowerCase();
const wasEdited =
  !!(editNote && editNote.trim && editNote.trim().length > 0) ||
  (cita?.ediciones_realizadas ?? 0) > 0 ||
  estadoCita === 're agendada' ||
  estadoDetalle === 're agendada';

// ✅ CORREGIDO: Ahora todos los valores son strings, no objetos
const infoItems = [
  {
    icon: User,
    label: 'Cliente',
    value: `${cliente.nombre_completo || ''} ${cliente.apellido_completo || ''}`.trim() || 'No especificado', // ✅ STRING
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    icon: Hash,
    label: 'Documento',
    value: formatDocumentInfo(cliente.tipo_documento, cliente.numero_documento), // ✅ Datos del objeto cliente
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  },
  {
    icon: Phone,
    label: 'Teléfono',
    value: cliente.telefono || 'No especificado', // ✅ Dato del objeto cliente
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    icon: Mail,
    label: 'Email',
    value: cliente.correo || 'No especificado', // ✅ correo, no email
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    icon: Calendar,
    label: 'Fecha',
    value: formatDate(cita.fecha_cita), // ✅ fecha_cita según tu BD
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    icon: Clock,
    label: 'Hora',
    value: `${formatTime(cita.hora_inicio)} - ${formatTime(cita.hora_fin)}`, // ✅ hora_inicio y hora_fin
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  {
    icon: Home,
    label: 'Servicio',
    value: servicio.nombre_servicio || 'No especificado', // ✅ STRING del objeto servicio
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  },
  {
    icon: MapPin, // ✅ AGREGADO: Info del inmueble
    label: 'Dirección',
    value: inmueble.direccion ? `${inmueble.direccion}, ${inmueble.ciudad || ''}` : 'No especificado',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50'
  }
];

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4">
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-[760px] overflow-hidden flex flex-col"
            >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Detalles de la Cita</h2>
              <p className="text-sm text-slate-600 mt-0.5">Información completa de la cita</p>
            </div>
            <div className="flex items-center gap-3">
            {getStatusBadge(cita.estado_detalle?.nombre_estado || cita.estado)} {/* ✅ Manejar objeto estado */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="space-y-4">
              {/* Información Principal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {infoItems.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`p-3 rounded-lg border ${item.bgColor} border-opacity-50`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`p-1.5 rounded-lg bg-white shadow-sm`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-600 mb-0.5">{item.label}</p>
                        <p className="text-sm text-slate-800 font-semibold leading-snug">{item.value}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

                {/* Observaciones */}
                {cita.observaciones && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white shadow-sm">
                      <FileText className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-600 mb-1">Observaciones</p>
                      <p className="text-slate-800 leading-relaxed">{cita.observaciones}</p> {/* ✅ CAMBIO: notas → observaciones */}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Motivo de Reagendamiento */}
              {wasEdited && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 }}
                  className="bg-orange-50 border border-orange-200 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white shadow-sm">
                      <FileText className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-orange-600 mb-1">Motivo de la Edici&oacute;n *</p>
                      <p className="text-orange-800 leading-relaxed">{editNote || 'Motivo no registrado'}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Motivo de Cancelación */}
              {cancelNote && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.75 }}
                  className="bg-red-50 border border-red-200 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white shadow-sm">
                      <FileText className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-red-600 mb-1">Motivo de cancelaci&oacute;n</p>
                      <p className="text-red-800 leading-relaxed">{cancelNote}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Agentes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
                className="bg-green-50 border border-green-200 rounded-lg p-3"
              >
                <h4 className="font-semibold text-green-800 mb-2">Información de Agentes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white shadow-sm">
                      <User className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-green-600">Agente Asignado</p>
                      <p className="text-sm text-green-800 font-semibold leading-snug">
                        {cita.agente ? `${cita.agente.nombre_completo} ${cita.agente.apellido_completo}` : 'No asignado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white shadow-sm">
                      <User className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-green-600">Creador de la Cita</p>
                      <p className="text-sm text-green-800 font-semibold leading-snug">
                        {cita.creador
                          ? `${cita.creador.nombre_completo} ${cita.creador.apellido_completo}`
                          : user
                            ? `${user.nombre_completo} ${user.apellido_completo}`
                            : 'Creador no registrado'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Información Adicional */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.7 }}
                className="bg-blue-50 border border-blue-200 rounded-lg p-3"
              >
                <h4 className="font-semibold text-blue-800 mb-2">Información Adicional</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-600 font-medium">ID de Cita:</span>
                    <span className="text-blue-800 ml-2">#{cita.id_cita || cita.id} {/* ✅ Usar id_cita de tu BD */}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Fecha de Creación:</span>
                    <span className="text-blue-800 ml-2">{formatDate(cita.fecha_creacion)} {/* ✅ fecha_creacion según tu BD */}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-4 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
            >
              Cerrar
            </motion.button>
          </div>
            </motion.div>
        </div>
      </>
    </AnimatePresence>,
    document.body
  );
};

export default ViewAppointmentModal;


