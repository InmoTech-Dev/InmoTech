import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, MapPin, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import citaApiService from '../../../../shared/services/citaApiService';

const RescheduleConfirmModal = ({ isOpen, onCancel, onConfirm, appointment, newDate }) => {
  const [formData, setFormData] = useState({
    hora_inicio: '',
    motivo_reagendamiento: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [suggestedTimes, setSuggestedTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Cargar hora actual de la cita si está disponible
  useEffect(() => {
    if (isOpen && appointment) {
      // Extraer hora actual de la cita
      let currentTime = '';
      if (appointment.hora_inicio) {
        // Si es formato ISO, extraer hora
        if (appointment.hora_inicio.includes('T')) {
          try {
            const date = new Date(appointment.hora_inicio);
            currentTime = date.toISOString().substring(11, 16); // HH:mm format
          } catch (error) {
            console.error('Error parsing current time:', error);
            currentTime = appointment.hora_inicio;
          }
        } else {
          currentTime = appointment.hora_inicio;
        }
      }

      setFormData({
        hora_inicio: currentTime,
        motivo_reagendamiento: ''
      });

      // Cargar horarios disponibles para la nueva fecha
      if (newDate) {
        loadAvailableTimes(newDate, appointment.id_servicio || 1);
      }
    }
  }, [isOpen, appointment, newDate]);

  // Función para cargar horarios disponibles
  const loadAvailableTimes = async (fecha, servicioId) => {
    if (!fecha) return;

    setLoadingTimes(true);
    try {
      console.log('🔍 Cargando horarios disponibles para:', { fecha, servicioId });

      const response = await citaApiService.obtenerHorariosDisponibles({
        fecha_cita: fecha,
        id_servicio: servicioId
      });

      setAvailableTimes(response);
      setValidationResult(null);
      setSuggestedTimes([]);
    } catch (error) {
      console.error('Error loading available times:', error);
      setAvailableTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  // Validar si la hora seleccionada está disponible
  const validateTimeSelection = () => {
    if (!formData.hora_inicio) return false;
    return availableTimes.includes(formData.hora_inicio);
  };

  // Generar sugerencias de horarios alternativos
  const generateSuggestions = () => {
    if (availableTimes.length === 0) return [];

    // Priorizar horarios cercanos a la hora original
    const selectedHour = formData.hora_inicio;
    if (!selectedHour || validateTimeSelection()) return [];

    const [targetHour] = selectedHour.split(':').map(Number);

    // Encontrar horarios cercanos ordenados por proximidad
    const suggestions = availableTimes
      .map(time => {
        const [hour] = time.split(':').map(Number);
        const diff = Math.abs(hour - targetHour);
        return { time, diff };
      })
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5) // Máximo 5 sugerencias
      .map(item => item.time);

    return suggestions;
  };

  // Manejar cambios en el formulario
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validar motivo
    if (field === 'motivo_reagendamiento') {
      if (errors.motivo_reagendamiento) {
        setErrors(prev => ({
          ...prev,
          motivo_reagendamiento: undefined
        }));
      }
    }

    // Validar hora y generar sugerencias
    if (field === 'hora_inicio') {
      const isValid = availableTimes.includes(value);
      setValidationResult({
        isValid,
        message: isValid
          ? null
          : `El horario ${formatTime(value)} no está disponible para esta fecha.`
      });

      // Generar sugerencias si no es válido
      if (!isValid) {
        setSuggestedTimes(generateSuggestions());
      } else {
        setSuggestedTimes([]);
      }
    }
  };

  if (!isOpen || !appointment) return null;

  // ✅ CORREGIDO: Función para convertir formato ISO a 12 horas
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // Manejar formato ISO (1970-01-01T06:00:00.000Z)
    if (timeString.includes('T') && timeString.includes('Z')) {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const isPM = hours >= 12;
        const hours12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        return `${hours12}:${String(minutes).padStart(2, '0')} ${isPM ? 'pm' : 'am'}`;
      }
    }
    
    // Clean multiple AM/PM suffixes for display safety
    let cleanedTime = timeString;
    const amMatches = timeString.match(/\b(am|AM)\b/g);
    const pmMatches = timeString.match(/\b(pm|PM)\b/g);
    const totalSuffixes = (amMatches ? amMatches.length : 0) + (pmMatches ? pmMatches.length : 0);

    if (totalSuffixes > 1) {
      const lastAM = amMatches && amMatches.length > 0 ? amMatches[amMatches.length - 1] : null;
      const lastPM = pmMatches && pmMatches.length > 0 ? pmMatches[pmMatches.length - 1] : null;
      cleanedTime = timeString.replace(/\s*\b(am|pm)\b/gi, '');
      
      if (lastPM) {
        cleanedTime += ' ' + lastPM.toLowerCase();
      } else if (lastAM) {
        cleanedTime += ' ' + lastAM.toLowerCase();
      }
      
      cleanedTime = cleanedTime.trim();
    }

    if (cleanedTime.includes('am') || cleanedTime.includes('pm') ||
        cleanedTime.includes('AM') || cleanedTime.includes('PM')) {
      return cleanedTime;
    }

    const [hours, minutes] = cleanedTime.split(':');
    const hour24 = parseInt(hours, 10);
    
    if (isNaN(hour24)) return cleanedTime;
    
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'pm' : 'am';

    return `${hour12}:${minutes} ${ampm}`;
  };

  // ✅ CORREGIDO: Extraer datos de objetos anidados
  const cliente = appointment.cliente || {};
  const servicio = appointment.servicio || {};
  const inmueble = appointment.inmueble || {};

  const clienteNombre = cliente.nombre_completo && cliente.apellido_completo
    ? `${cliente.nombre_completo} ${cliente.apellido_completo}`
    : cliente.nombre_completo || 'Cliente no especificado';

  const clienteTelefono = cliente.telefono || 'No especificado';
  const servicioNombre = servicio.nombre_servicio || 'Servicio no especificado';
  const inmuebleInfo = inmueble.direccion || 'Propiedad no especificada';
  
  // ✅ CORREGIDO: Usar fecha_cita en lugar de fecha
  const fechaActual = appointment.fecha_cita || appointment.fecha;
  const horaActual = formatTime(appointment.hora_inicio || appointment.hora || '');

  // ✅ CORREGIDO: Función para formatear fecha con validación
  const formatearFecha = (dateString) => {
    if (!dateString) return 'Fecha no especificada';
    
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      
      if (isNaN(dateObj.getTime())) {
        return 'Fecha inválida';
      }
      
      return dateObj.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Validar formulario antes de enviar
  const validateForm = () => {
    const newErrors = {};

    // Validar hora
    if (!formData.hora_inicio) {
      newErrors.hora_inicio = 'La hora es obligatoria';
    } else if (!validateTimeSelection()) {
      newErrors.hora_inicio = 'El horario seleccionado no está disponible';
    }

    // Validar motivo
    if (!formData.motivo_reagendamiento.trim()) {
      newErrors.motivo_reagendamiento = 'El motivo del reagendamiento es obligatorio';
    } else if (formData.motivo_reagendamiento.trim().length < 10) {
      newErrors.motivo_reagendamiento = 'El motivo debe tener al menos 10 caracteres';
    } else if (formData.motivo_reagendamiento.length > 500) {
      newErrors.motivo_reagendamiento = 'El motivo no puede exceder 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Formatear datos para el reagendamiento
      const reagendamientoData = {
        fecha_cita: newDate,
        hora_inicio: formData.hora_inicio,
        id_agente_asignado: appointment.id_agente_asignado,
        motivo_reagendamiento: formData.motivo_reagendamiento.trim()
      };

      // Llamar a la función de confirmación que maneja el reagendamiento
      onConfirm(reagendamientoData);
    } catch (error) {
      console.error('Error during reschedule:', error);
      setErrors({
        general: error.message || 'Error al reagendar la cita'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aplicar sugerencia de horario
  const applySuggestion = (suggestedTime) => {
    handleInputChange('hora_inicio', suggestedTime);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 my-8 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Reagendar Cita - Validación Inteligente
          </h2>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Instrucción */}
          <p className="text-gray-600 text-sm bg-blue-50 p-3 rounded-lg">
            📅 <strong>Cita arrastrada al calendario:</strong> Se aplicarán validaciones automáticas de disponibilidad
          </p>

          {/* Información de la cita */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Información de la Cita
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Cliente */}
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Cliente</p>
                  <p className="font-semibold text-gray-900">{clienteNombre}</p>
                </div>
              </div>

              {/* Teléfono */}
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Teléfono</p>
                  <p className="font-semibold text-gray-900">{clienteTelefono}</p>
                </div>
              </div>

              {/* Servicio */}
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Servicio</p>
                  <p className="font-semibold text-gray-900">{servicioNombre}</p>
                </div>
              </div>

              {/* Hora actual */}
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Hora actual</p>
                  <p className="font-semibold text-gray-900">{horaActual}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparación de fechas */}
          <div className="grid grid-cols-2 gap-4">
            {/* Fecha actual */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-xs font-medium text-red-600 mb-2">📅 Fecha actual</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatearFecha(fechaActual)}
              </p>
              <p className="text-xs text-gray-600 mt-1">a las {horaActual}</p>
            </div>

            {/* Nueva fecha */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs font-medium text-green-600 mb-2">🎯 Nueva fecha</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatearFecha(newDate)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {formData.hora_inicio ? `a las ${formatTime(formData.hora_inicio)}` : 'selecciona hora'}
              </p>
            </div>
          </div>

          {/* Selector de nueva hora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Nueva hora para {formatearFecha(newDate)}
            </label>

            {loadingTimes ? (
              <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 text-gray-600">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Cargando horarios disponibles...</span>
                </div>
              </div>
            ) : availableTimes.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {availableTimes.map(hour => {
                  const isSelected = formData.hora_inicio === hour;
                  const isValid = validateTimeSelection();

                  return (
                    <motion.button
                      key={hour}
                      type="button"
                      onClick={() => handleInputChange('hora_inicio', hour)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        py-3 px-3 rounded-lg text-sm font-medium transition-all duration-200 border
                        ${isSelected
                          ? isValid
                            ? 'bg-green-600 text-white border-green-600 shadow-md'
                            : 'bg-red-600 text-white border-red-600 shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:border-blue-400'
                        }
                      `}
                    >
                      {formatTime(hour)}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="text-center text-yellow-700">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm font-medium">No hay horarios disponibles</p>
                  <p className="text-xs">Selecciona otra fecha</p>
                </div>
              </div>
            )}

            {/* Error de hora */}
            {errors.hora_inicio && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {errors.hora_inicio}
              </p>
            )}

            {/* Mensaje de validación */}
            {validationResult && !validationResult.isValid && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  {validationResult.message}
                </p>
              </div>
            )}

            {/* Sugerencias de horarios alternativos */}
            {suggestedTimes.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-2 flex items-center gap-2">
                  💡 <strong>Horarios sugeridos alternativos:</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedTimes.map(time => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => applySuggestion(time)}
                      className="px-3 py-1 bg-white border border-blue-300 rounded-md text-sm text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      {formatTime(time)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Campo de motivo del reagendamiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Motivo del reagendamiento <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                name="motivo_reagendamiento"
                value={formData.motivo_reagendamiento}
                onChange={(e) => handleInputChange('motivo_reagendamiento', e.target.value)}
                rows={3}
                placeholder="Ej: El cliente solicitó cambiar la fecha por compromiso laboral ineludible..."
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none ${
                  errors.motivo_reagendamiento ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            </div>

            {/* Contador de caracteres */}
            <div className="flex justify-between mt-1">
              {errors.motivo_reagendamiento && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {errors.motivo_reagendamiento}
                </p>
              )}
              <p className="text-sm text-gray-500 ml-auto">
                {formData.motivo_reagendamiento.length}/500 caracteres
              </p>
            </div>
          </div>

          {/* Error general */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                ❌ {errors.general}
              </p>
            </div>
          )}

          {/* Información importante */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Validaciones aplicadas</p>
                <ul className="space-y-1 text-xs">
                  <li>• Solo se permiten horarios no ocupados para visitas a inmuebles</li>
                  <li>• Se valida la disponibilidad en tiempo real</li>
                  <li>• El motivo es obligatorio para auditoría</li>
                  <li>• Las otras fechas se sugieren automáticamente si hay conflictos</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer - Botones */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={isSubmitting}
            >
              Cancelar
            </button>

            <div className="flex items-center gap-3">
              {!validateTimeSelection() && suggestedTimes.length > 0 && (
                <span className="text-xs text-gray-500">
                  💡 Selecciona una de las sugerencias o elige otro horario
                </span>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !validateTimeSelection()}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    Confirmar Reagendamiento
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
};

export default RescheduleConfirmModal;
