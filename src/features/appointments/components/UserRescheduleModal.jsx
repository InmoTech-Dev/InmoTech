import React, { useState, useEffect, useContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  User,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  FileText,
  Building,
  Home
} from 'lucide-react';
import { useToast } from '../../../shared/hooks/use-toast';
import { useAuth } from '../../../shared/contexts/AuthContext';
import citaApiService from '../../../shared/services/citaApiService';
import { formatTimeTo12Hour, formatTimeTo24Hour } from '../../../shared/utils/time';

const UserRescheduleModal = ({ isOpen, onClose, appointment, newDate, onConfirm }) => {
  const [formData, setFormData] = useState({
    hora_inicio: '',
    motivo_reagendamiento: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [suggestedTimes, setSuggestedTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { toast } = useToast();

  // Meses del año
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const availableHours = [
    "08:00 am", "08:30 am", "09:00 am", "09:30 am", "10:00 am", "10:30 am",
    "11:00 am", "11:30 am", "02:00 pm", "02:30 pm", "03:00 pm", "03:30 pm",
    "04:00 pm", "04:30 pm", "05:00 pm"
  ];

  // Cargar hora actual y datos iniciales
  useEffect(() => {
    if (isOpen && appointment && newDate) {
      // Establecer mes actual basado en newDate
      setCurrentMonth(new Date(newDate));

      // Extraer hora actual de la cita normalizada a formato HH:mm
      let currentTime = '';
      if (appointment.hora_inicio) {
        currentTime = formatTimeTo24Hour(appointment.hora_inicio) || appointment.hora_inicio;
      }

      setFormData({
        hora_inicio: currentTime,
        motivo_reagendamiento: ''
      });

      // Cargar horarios disponibles para la nueva fecha
      loadAvailableTimes(newDate, appointment.id_servicio || 1);
    }
  }, [isOpen, appointment, newDate]);

  // Función para cargar horarios disponibles
  const loadAvailableTimes = async (fecha, servicioId) => {
    if (!fecha) return;

    setLoadingTimes(true);
    try {
      console.log('🔍 Cargando horarios disponibles para:', { fecha, servicioId });

      // Cambiar a usar el endpoint específico para usuarios
      const response = await citaApiService.obtenerHorariosDisponiblesUsuario({
        fecha_cita: fecha,
        id_servicio: servicioId
      });

      setAvailableTimes(response);
    } catch (error) {
      console.error('Error loading available times:', error);
      setAvailableTimes([]);
      toast({
        title: "Error",
        description: "No se pudieron cargar los horarios disponibles",
        variant: "destructive"
      });
    } finally {
      setLoadingTimes(false);
    }
  };

  // Generar sugerencias de horarios alternativos
  const generateSuggestions = () => {
    if (availableTimes.length === 0) return [];

    const selectedHour = formData.hora_inicio;
    if (!selectedHour || availableTimes.includes(selectedHour)) return [];

    const [targetHour] = selectedHour.split(':').map(Number);

    const suggestions = availableTimes
      .map(time => {
        const [hour] = time.split(':').map(Number);
        const diff = Math.abs(hour - targetHour);
        return { time, diff };
      })
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3)
      .map(item => item.time);

    return suggestions;
  };

  // Manejar cambios en el formulario
  const handleInputChange = (field, value) => {
    if (isSubmitting) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar errores según el campo
    if (field === 'hora_inicio') {
      setErrors(prev => ({
        ...prev,
        hora_inicio: undefined
      }));
      setSuggestedTimes([]);
    } else if (field === 'motivo_reagendamiento') {
      setErrors(prev => ({
        ...prev,
        motivo_reagendamiento: undefined
      }));
    }
  };

  // ✅ Función para mostrar horas en formato amigable
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return formatTimeTo12Hour(timeString) || timeString;
  };

  // ✅ Función para calcular hora_fin (30 minutos después)
  const calcularHoraFin = (horaInicio) => {
    if (!horaInicio) return "";
    const [horaStr, minutosStr] = horaInicio.split(':');
    let hora = parseInt(horaStr, 10);
    let minutos = parseInt(minutosStr, 10);

    minutos += 30;

    if (minutos >= 60) {
      hora += Math.floor(minutos / 60);
      minutos = 0;
    }

    return `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  };

  // ✅ Extraer datos de objetos anidados con fallback usando datos del usuario autenticado
  const cliente = appointment?.cliente || {};
  const servicio = appointment?.servicio || {};
  const inmueble = appointment?.inmueble || {};

  // ✅ Si no hay datos del cliente, usar el usuario actual (cliente del usuario autenticado)
  const { user } = useAuth();

  const clienteNombre = cliente.nombre_completo && cliente.apellido_completo
    ? `${cliente.nombre_completo} ${cliente.apellido_completo}`
    : cliente.nombre_completo ||
      // Fallback: usar datos del usuario autenticado
      (user && (user.nombre_completo && user.apellido_completo
        ? `${user.nombre_completo} ${user.apellido_completo}`
        : user.nombre_completo || user.full_name)) ||
      'Cliente no especificado';

  const servicioNombre = servicio.nombre_servicio || 'Servicio no especificado';
  const inmuebleInfo = inmueble.direccion || 'Propiedad no especificada';

  const fechaActual = appointment?.fecha_cita || appointment?.fecha;
  const horaActual = formatTime(appointment?.hora_inicio || appointment?.hora || '') || 'Por confirmar';

  // ✅ Función para formatear fecha con validación
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

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Días del mes anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isDisabled: true,
      });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ✅ BLOQUEAR: Solo permitir la fecha que fue arrastrada para reagendamiento
      const dateString = date.toISOString().split('T')[0];
      const isTargetDate = dateString === newDate;
      const isDisabled = date < today || !isTargetDate;

      days.push({
        date,
        isCurrentMonth: true,
        isDisabled,
        isToday: date.toDateString() === today.toDateString(),
        isTargetDate, // ✅ Nueva propiedad para marcar la fecha de reagendamiento
      });
    }

    // Días del mes siguiente
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isDisabled: true,
      });
    }

    return days;
  };

  const formatDateForInput = (date) => {
    return date.toISOString().split("T")[0];
  };

  const fechaNuevaLegible = formatearFecha(newDate);

  const handleDateSelect = (day) => {
    if (isSubmitting) return;
    if (day.isDisabled) return;

    const dateString = formatDateForInput(day.date);

    // ✅ BLOQUEAR fechas distintas a la que fue arrastrada para reagendamiento
    if (dateString !== newDate) {
      console.log('⛔ Solo se puede reagendar para la fecha seleccionada inicialmente:', newDate);
      return; // No permitir cambiar a otras fechas
    }

    // Recargar horarios para la misma fecha (por si hay cambios)
    loadAvailableTimes(dateString, appointment?.id_servicio || 1);
  };

  const navigateMonth = (direction) => {
    if (isSubmitting) return;
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // Validar formulario antes de enviar
  const validateForm = () => {
    const newErrors = {};

    // Validar hora
    if (!formData.hora_inicio) {
      newErrors.hora_inicio = 'La hora es obligatoria';
    } else if (!availableTimes.includes(formData.hora_inicio)) {
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
      toast({
        title: "Por favor, corrige los errores",
        variant: "destructive",
      });
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 🔧 IMPORTANTE: newDate podría venir como string o Date object del calendario
      // Asegúrate de que siempre sea un string 'YYYY-MM-DD'
      let fechaString;
      if (typeof newDate === 'string') {
        fechaString = newDate;
      } else if (newDate instanceof Date) {
        fechaString = newDate.toISOString().split('T')[0]; // '2025-11-XX'
      } else {
        fechaString = String(newDate);
      }

      // Formatear datos para el reagendamiento
      const reagendamientoData = {
        fecha_cita: fechaString,
        hora_inicio: formData.hora_inicio,
        hora_fin: calcularHoraFin(formData.hora_inicio),
        motivo_reagendamiento: formData.motivo_reagendamiento.trim()
      };

      console.log('🔍 UserRescheduleModal handleSubmit llamando onConfirm con reagendamientoData:', reagendamientoData);
      await onConfirm(appointment.id, reagendamientoData);
      onClose();

      toast({
        title: "Reagendando cita...",
        description: "Tu cita está siendo reagendada",
      });

    } catch (error) {
      console.error('Error during reschedule:', error);
      toast({
        title: "Error al reagendar",
        description: error.message || 'No se pudo reagendar la cita',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleRequestClose = () => {
    if (isSubmitting) {
      return;
    }

    onClose();
  };
  const applySuggestion = (suggestedTime) => {
    handleInputChange('hora_inicio', suggestedTime);
  };

  const canSubmit = () => {
    if (!formData.hora_inicio || !formData.motivo_reagendamiento.trim()) {
      return false;
    }

    if (!availableTimes.includes(formData.hora_inicio)) {
      return false;
    }

    if (formData.motivo_reagendamiento.trim().length < 10) {
      return false;
    }

    return true;
  };

  const horasOptions = useMemo(() => {
    const base = [...availableTimes];
    if (formData.hora_inicio && !base.includes(formData.hora_inicio)) {
      base.unshift(formData.hora_inicio);
    }
    return base;
  }, [availableTimes, formData.hora_inicio]);

  const days = getDaysInMonth(currentMonth);

  if (!isOpen || !appointment || !newDate) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleRequestClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-4 my-4 max-h-[95vh] overflow-hidden flex flex-col z-[10001]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-amber-50 flex-shrink-0 relative">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <RefreshCw className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Reagendar Cita
                </h2>
                <p className="text-slate-600 mt-1">
                  Arrastraste tu cita a una nueva fecha
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRequestClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5 text-slate-500" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="flex flex-col lg:flex-row overflow-hidden flex-1 min-h-0">
            {/* Appointment Info Sidebar */}
            <div className="lg:w-1/3 bg-gradient-to-b from-slate-50 to-slate-100 p-6 border-r border-slate-200 flex-shrink-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-600 font-medium">
                  <Calendar className="w-5 h-5" />
                  <span>Cita actual</span>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                  <h3 className="font-bold text-lg text-slate-800 mb-2">
                    {servicioNombre}
                  </h3>

                  <div className="space-y-3">
                    {/* Cliente */}
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-slate-700">{clienteNombre}</span>
                    </div>

                    {/* Fecha actual */}
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-xs text-slate-500">Fecha actual</p>
                        <p className="text-sm font-semibold text-slate-800">{formatearFecha(fechaActual)}</p>
                      </div>
                    </div>

                    {/* Hora actual */}
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-xs text-slate-500">Hora actual</p>
                        <p className="text-sm font-semibold text-slate-800">{horaActual}</p>
                      </div>
                    </div>

                    {/* Propiedad */}
                    {inmuebleInfo !== 'Propiedad no especificada' && (
                      <div className="flex items-start gap-3">
                        <Building className="w-4 h-4 text-indigo-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Propiedad</p>
                          <p className="text-sm text-slate-800">{inmuebleInfo}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nueva fecha destacada */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                    <Home className="w-4 h-4" />
                    <span>Nueva fecha</span>
                  </div>
                  <p className="text-green-800 font-bold">{formatearFecha(newDate)}</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:w-2/3 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 min-h-0">
              <form
                onSubmit={handleSubmit}
                className={`space-y-6 ${isSubmitting ? 'pointer-events-none' : ''}`}
              >
                {/* Instrucción */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-800">
                        Cita reagendada por arrastre
                      </p>
                      <p className="text-orange-700 text-sm mt-1">
                        Has arrastrado tu cita al calendario. Solo necesitas seleccionar una nueva hora disponible y explicar el motivo del cambio.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Calendar para ver fechas disponibles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    Calendario de disponibilidad
                  </h3>

                  {/* Mini calendar */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigateMonth(-1)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                      </motion.button>

                      <h4 className="text-lg font-semibold text-slate-800">
                        {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </h4>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigateMonth(1)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      </motion.button>
                    </div>

                    {/* Days of Week */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {daysOfWeek.map((day) => (
                        <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {days.map((day, index) => {
                        const isSelected = formatDateForInput(day.date) === newDate;

                        return (
                          <motion.button
                            key={index}
                            type="button"
                            whileHover={!day.isDisabled ? { scale: 1.05 } : {}}
                            whileTap={!day.isDisabled ? { scale: 0.95 } : {}}
                            onClick={() => handleDateSelect(day)}
                            disabled={day.isDisabled}
                            className={`
                              h-8 w-8 rounded-lg text-sm font-medium transition-all duration-200
                              ${day.isDisabled
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-slate-700 hover:bg-orange-50"
                              }
                              ${!day.isCurrentMonth ? "text-slate-400" : ""}
                              ${day.isToday ? "bg-blue-100 text-blue-600 font-bold" : ""}
                              ${isSelected ? "bg-orange-600 text-white ring-2 ring-orange-300" : ""}
                            `}
                          >
                            {day.date.getDate()}
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-orange-600 rounded"></div>
                        <span>Fecha seleccionada</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-100 rounded"></div>
                        <span>Hoy</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    Selecciona nueva hora
                  </h3>

                  {loadingTimes ? (
                    <div className="flex items-center justify-center py-8 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3 text-slate-600">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Cargando horarios disponibles...</span>
                      </div>
                    </div>
                  ) : availableTimes.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-3">
                        {horasOptions.map(hour => {
                          const isSelected = formData.hora_inicio === hour;

                          return (
                            <motion.button
                              key={hour}
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleInputChange('hora_inicio', hour)}
                              className={`
                                py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200
                                ${isSelected
                                  ? "bg-orange-600 text-white shadow-lg"
                                  : "bg-white text-slate-700 hover:bg-orange-50 border border-slate-200"
                                }
                              `}
                            >
                              {formatTime(hour)}
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Hora actual vs nueva */}
                      {formData.hora_inicio && (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-xs font-medium text-red-600 mb-1">Hora actual</p>
                            <p className="text-sm font-semibold text-slate-800">{horaActual}</p>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-xs font-medium text-green-600 mb-1">Nueva hora</p>
                            <p className="text-sm font-semibold text-slate-800">{formatTime(formData.hora_inicio)}</p>
                          </div>
                        </div>
                      )}
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

                  {errors.hora_inicio && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {errors.hora_inicio}
                    </p>
                  )}

                  {/* Sugerencias de horarios alternativos */}
                  {suggestedTimes.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
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

                {/* Motivo del reagendamiento */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Motivo del reagendamiento <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      name="motivo_reagendamiento"
                      value={formData.motivo_reagendamiento}
                      onChange={(e) => handleInputChange('motivo_reagendamiento', e.target.value)}
                      rows={4}
                      placeholder="Explica por qué necesitas reagendar esta cita (mínimo 10 caracteres)..."
                      className={`w-full pl-4 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors resize-none ${
                        errors.motivo_reagendamiento ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                  </div>

                  {/* Contador de caracteres */}
                  <div className="flex justify-between mt-2">
                    {errors.motivo_reagendamiento && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        {errors.motivo_reagendamiento}
                      </p>
                    )}
                    <p className="text-sm text-slate-500 ml-auto">
                      {formData.motivo_reagendamiento.length}/500 caracteres
                    </p>
                  </div>
                </div>

                {/* Información importante */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800 mb-2">
                        Información importante
                      </h4>
                      <ul className="text-amber-700 text-sm space-y-1">
                        <li>• El reagendamiento está sujeto a confirmación del agente</li>
                        <li>• Mantén tu cita actual hasta recibir confirmación</li>
                        <li>• Puedes reagendar con al menos 24 horas de anticipación</li>
                        <li>• Proporciona un motivo claro para agilizar el proceso</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRequestClose}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting || !canSubmit()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-orange-600 disabled:hover:to-amber-600"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Reagendando...</span>
                      </div>
                    ) : (
                      "Confirmar Reagendamiento"
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserRescheduleModal;

