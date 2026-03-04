import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, MapPin, FileText, AlertTriangle, RefreshCw, ChevronLeft } from 'lucide-react';
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
        const timeStr = appointment.hora_inicio;

        // 1. Intentar extraer HH:mm directamente del string (formato "08:30" o "Thu Jan 01 1970 08:30:00")
        const timeRegex = /(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?(?:\s|$)/;
        const match = timeStr.match(timeRegex);

        if (match) {
          currentTime = `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}`;
        }
        // 2. Fallback a Date si tiene T (ISO)
        else if (timeStr.includes('T')) {
          try {
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              currentTime = `${hours}:${minutes}`;
            } else {
              currentTime = timeStr;
            }
          } catch (error) {
            currentTime = timeStr;
          }
        } else {
          currentTime = timeStr;
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

  // Helper para normalizar fecha (YYYY-MM-DD)
  const normalizeDate = (d) => {
    if (!d) return '';
    if (d.includes('T')) return d.split('T')[0];
    return d;
  };

  // Función para cargar horarios disponibles
  const loadAvailableTimes = async (fecha, servicioId) => {
    if (!fecha) return;

    setLoadingTimes(true);
    try {
      console.log('🔍 Cargando horarios disponibles para:', { fecha, servicioId });

      let response = await citaApiService.obtenerHorariosDisponibles({
        fecha_cita: fecha,
        id_servicio: servicioId
      });

      // Filtrar si es el día de hoy (margen de 2 horas)
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const isToday = normalizeDate(fecha) === todayStr;

      if (isToday) {
        const currentTotalMinutes = today.getHours() * 60 + today.getMinutes();

        response = response.filter(time => {
          const [h, m] = time.split(':').map(Number);
          const appointmentTotalMinutes = h * 60 + m;
          return (appointmentTotalMinutes - currentTotalMinutes) >= 120;
        });
      }

      // Siempre incluir la hora actual si la fecha coincide con la original
      const originalDate = normalizeDate(appointment?.fecha_cita || appointment?.fecha);
      if (normalizeDate(fecha) === originalDate && appointment?.hora_inicio) {
        // Extraer HH:mm si es ISO
        let currentTime = appointment.hora_inicio;
        if (currentTime.includes('T') || currentTime.includes(':')) {
          const date = new Date(currentTime);
          if (!isNaN(date.getTime())) {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            currentTime = `${hours}:${minutes}`;
          }
        }

        if (!response.includes(currentTime)) {
          response.unshift(currentTime);
          response.sort(); // Opcional: mantener orden cronológico
        }
      }

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
    // 1. Intentar extraer HH:mm directamente si es un string de fecha largo o ya tiene formato hora
    const timeMatch = timeString.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?(?:\s|$|am|pm|AM|PM)/i);
    if (timeMatch && !timeString.includes('T')) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2];
      const isPM = timeString.toLowerCase().includes('pm') || hours >= 12;
      const hours12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
      const ampm = isPM ? 'pm' : 'am';
      return `${hours12}:${minutes} ${ampm}`;
    }

    // 2. Manejar formato ISO
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
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

    if (isSubmitting) {
      return;
    }

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
      await onConfirm(reagendamientoData);
    } catch (error) {
      console.error('Error during reschedule:', error);
      setErrors({
        general: error.message || 'Error al reagendar la cita'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestClose = () => {
    if (isSubmitting) {
      return;
    }

    onCancel();
  };

  // Aplicar sugerencia de horario
  const applySuggestion = (suggestedTime) => {
    handleInputChange('hora_inicio', suggestedTime);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full"
      >
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Confirmar Reagendamiento
              </h2>
              <p className="text-sm text-slate-500">
                Ajusta los detalles para mover esta cita
              </p>
            </div>
          </div>
          <button
            onClick={handleRequestClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area - Single Scrollable Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">

          {/* Quick Context Card */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Cliente</p>
                    <p className="font-semibold text-slate-700">{clienteNombre}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                    <MapPin className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Servicio</p>
                    <p className="font-semibold text-slate-700">{servicioNombre}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 md:gap-4 self-center md:self-auto">
                <div className="text-center px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm min-w-[140px]">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Actual</p>
                  <p className="text-sm font-semibold text-red-500">{formatearFecha(fechaActual)}</p>
                  <p className="text-xs text-slate-400">{horaActual}</p>
                </div>
                <div className="w-8 flex items-center justify-center">
                  <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
                </div>
                <div className="text-center px-4 py-2 bg-blue-600 rounded-xl border border-blue-500 shadow-lg shadow-blue-100 min-w-[140px]">
                  <p className="text-[10px] uppercase font-bold text-blue-200 mb-1">Nueva Fecha</p>
                  <p className="text-sm font-semibold text-white">{formatearFecha(newDate)}</p>
                  <p className="text-xs text-blue-100">
                    {formData.hora_inicio ? formatTime(formData.hora_inicio) : 'Pendiente'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className={`space-y-8 ${isSubmitting ? 'pointer-events-none' : ''}`}
          >
            {/* Time Selection Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Seleccionar Horario
                </h3>
                {loadingTimes && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 font-medium animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Buscando disponibles...
                  </div>
                )}
              </div>

              {availableTimes.length > 0 ? (
                <div className="grid grid-cols-4 gap-3">
                  {availableTimes.map(hour => {
                    const isSelected = formData.hora_inicio === hour;
                    return (
                      <motion.button
                        key={hour}
                        type="button"
                        onClick={() => handleInputChange('hora_inicio', hour)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={isSubmitting}
                        className={`
                          py-3 rounded-xl text-xs font-bold transition-all duration-200 border
                          ${isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                          }
                        `}
                      >
                        {formatTime(hour).replace(' am', '').replace(' pm', '')}
                        <span className="block text-[8px] opacity-70 uppercase">
                          {formatTime(hour).includes('am') ? 'Mañana' : 'Tarde'}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              ) : !loadingTimes && (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Sin espacios disponibles</p>
                  <p className="text-xs text-slate-500">Prueba con otra fecha arrastrando la cita de nuevo.</p>
                </div>
              )}

              {errors.hora_inicio && (
                <p className="text-xs text-red-500 flex items-center gap-1 font-medium mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.hora_inicio}
                </p>
              )}

              {/* Suggestions */}
              {suggestedTimes.length > 0 && (
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Sugerencias inteligentes</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTimes.map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => applySuggestion(time)}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all duration-200 shadow-sm"
                      >
                        {formatTime(time)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Motivo Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Motivo del Cambio
              </h3>
              <div className="relative group">
                <textarea
                  name="motivo_reagendamiento"
                  value={formData.motivo_reagendamiento}
                  onChange={(e) => handleInputChange('motivo_reagendamiento', e.target.value)}
                  disabled={isSubmitting}
                  rows={4}
                  placeholder="Por favor, describe una razón válida para este cambio administrativo..."
                  className={`w-full p-5 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all duration-300 resize-none text-slate-700 text-sm placeholder:text-slate-400 leading-relaxed
                    ${errors.motivo_reagendamiento ? 'border-red-200 focus:border-red-400' : 'border-slate-100 focus:border-blue-500 group-hover:border-slate-300'}
                  `}
                />
                <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-400 bg-white/80 px-2 py-1 rounded-md backdrop-blur-sm border border-slate-100 shadow-sm">
                  {formData.motivo_reagendamiento.length}/500
                </div>
              </div>
              {errors.motivo_reagendamiento && (
                <p className="text-xs text-red-500 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.motivo_reagendamiento}
                </p>
              )}
            </div>

            <button type="submit" className="hidden" /> {/* Hidden submit allow enter key */}
          </form>

          {/* Guidelines Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <div className="text-[10px] font-bold text-emerald-600 uppercase mb-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Validación Automática
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                El sistema ha validado la disponibilidad del agente y del servicio para esta nueva fecha seleccionada.
              </p>
            </div>
            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
              <p className="text-[10px] font-bold text-amber-600 uppercase mb-2">Aviso Importante</p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Esta acción se registrará en el historial de la cita. El cliente recibirá una notificación automática.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50/80 backdrop-blur-md border-t border-slate-100 px-8 py-6 flex items-center justify-between">
            <button
              type="button"
              onClick={handleRequestClose}
              className="px-6 py-3 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors"
              disabled={isSubmitting}
            >
            Descartar cambios
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !validateTimeSelection()}
            className={`
              px-8 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all duration-300 shadow-xl shadow-blue-100
              ${isSubmitting || !validateTimeSelection()
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                Actualizando...
              </>
            ) : (
              <>
                Confirmar Reagendamiento
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </div>
      </motion.div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>,
    document.body
  );
};

export default RescheduleConfirmModal;
