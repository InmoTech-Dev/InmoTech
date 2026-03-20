import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  MessageSquare,
  Edit,
  User,
  Home,
  FileText,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertTriangle,
  CheckCircle,
  Ban,
  RotateCcw,
  History
} from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import { useToast } from '../../../shared/hooks/use-toast';
import { useAuth } from '../../../shared/contexts/AuthContext';
import citaApiService from '../../../shared/services/citaApiService';
import { formatTimeTo12Hour } from '../../../shared/utils/time';
import {
  calculateEndTime,
  formatScheduleTimeLabel,
  getBusinessHoursMessage,
  isBusinessDay,
  VALID_START_TIMES,
} from '../../../shared/constants/appointmentSchedule';

const UserEditAppointmentModal = ({
  isOpen,
  onClose,
  appointment,
  onEditAppointment
}) => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [formData, setFormData] = useState({
    fecha_cita: '',
    hora_inicio: '',
    servicio: '',
    observaciones: '',
    comentario: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Servicio por defecto basado en la cita
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);

  const servicios = [
    { name: "Visita a Propiedad", icon: "🏠", description: "Recorridos guiados por propiedades", id: 1 },
    { name: "Avalúos", icon: "💰", description: "Tasación y valoración de inmuebles", id: 2 },
    { name: "Gestión de Alquileres", icon: "🏢", description: "Administración completa de arrendamientos", id: 3 },
    { name: "Asesoría Legal", icon: "⚖️", description: "Apoyo legal en temas inmobiliarios", id: 4 },
  ];

  // Populate form with existing appointment data
  useEffect(() => {
    if (appointment && isOpen) {
      const servicioEncontrado = servicios.find(s => s.id === appointment.id_servicio);
      setServicioSeleccionado(servicioEncontrado || servicios[0]);

      const horaNormalizada = appointment.hora_inicio
        ? normalizeHoraToOption(appointment.hora_inicio) || citaApiService.formatHoraDesdeAPI(appointment.hora_inicio)
        : '';
      const fechaNormalizada = normalizeFechaToInput(appointment.fecha_cita || appointment.fecha);

      setFormData({
        fecha_cita: fechaNormalizada,
        hora_inicio: horaNormalizada,
        servicio: servicioEncontrado ? servicioEncontrado.name : servicios[0].name,
        observaciones: appointment.observaciones || '',
        comentario: ''
      });

      // Ajustar el mes del calendario a la fecha de la cita
      if (fechaNormalizada) {
        setCurrentMonth(new Date(fechaNormalizada));
      }
    }
  }, [appointment, isOpen]);

  // Reset modal
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        fecha_cita: '',
        hora_inicio: '',
        servicio: '',
        observaciones: '',
        comentario: ''
      });
      setErrors({});
      setServicioSeleccionado(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const availableHours = VALID_START_TIMES.map(formatScheduleTimeLabel);

  const normalizeHoraToOption = (hora) => {
    if (!hora) return '';
    const formatted = formatTimeTo12Hour(hora);
    if (!formatted) return '';
    const [timePart = '', periodRaw = ''] = formatted.split(' ');
    const [hour = '00', minutes = '00'] = timePart.split(':');
    const period = periodRaw.replace(/[^a-z]/gi, '').toLowerCase();
    return `${hour.padStart(2, '0')}:${minutes.padStart(2, '0')} ${period || 'am'}`;
  };

  const normalizeFechaToInput = (fecha) => {
    if (!fecha) return '';
    if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
      return fecha.toISOString().split('T')[0];
    }
    if (typeof fecha === 'string') {
      const clean = fecha.includes('T') ? fecha.split('T')[0] : fecha;
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
      const parsed = new Date(clean);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    return '';
  };

  const horaAgendadaOpcion = useMemo(
    () => normalizeHoraToOption(appointment?.hora_inicio),
    [appointment?.hora_inicio]
  );

  const horasOptions = useMemo(() => {
    const base = [...availableHours];
    if (horaAgendadaOpcion && !base.includes(horaAgendadaOpcion)) {
      base.unshift(horaAgendadaOpcion);
    }
    return base;
  }, [horaAgendadaOpcion]);

  const formatearFechaLegible = (dateString) => {
    if (!dateString) return 'Fecha no especificada';

    if (dateString instanceof Date && !Number.isNaN(dateString.getTime())) {
      return dateString.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    try {
      const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
      const dateObj = new Date(year, (month || 1) - 1, day || 1);
      if (Number.isNaN(dateObj.getTime())) return 'Fecha no especificada';
      return dateObj.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Fecha no especificada';
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

      const isDisabled = !isBusinessDay(date) || date < today;

      days.push({
        date,
        isCurrentMonth: true,
        isDisabled,
        isToday: date.toDateString() === today.toDateString(),
        isSunday: date.getDay() === 0,
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

  const validateFecha = (fecha) => {
    if (!fecha) return "La fecha es requerida";
    const fechaSeleccionada = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaSeleccionada < hoy) return "No se pueden agendar citas en fechas pasadas";
    return "";
  };

  const validateHora = (hora) => {
    if (!hora) return "La hora es requerida";
    if (!availableHours.includes(hora) && hora !== horaAgendadaOpcion) {
      return `Las citas solo se pueden agendar ${getBusinessHoursMessage()} y en intervalos de 30 minutos`;
    }
    return "";
  };

  const validateComentario = (comentario) => {
    if (!comentario.trim()) return "El comentario es requerido";
    if (comentario.trim().length < 10) return "El comentario debe tener al menos 10 caracteres";
    return "";
  };

  const validateForm = () => {
    const newErrors = {};
    newErrors.fecha = validateFecha(formData.fecha_cita);
    newErrors.hora = validateHora(formData.hora_inicio);
    newErrors.comentario = validateComentario(formData.comentario);

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => !error);
  };

  const parseTime = (timeString) => {
    if (!timeString) return "";
    const [time, periodRaw] = timeString.trim().split(" ");
    const [hours, minutes] = time.split(":");
    let hour24 = parseInt(hours, 10);
    const period = periodRaw?.toLowerCase();

    if (Number.isNaN(hour24)) return "";

    if (period === "pm" && hour24 !== 12) {
      hour24 += 12;
    } else if (period === "am" && hour24 === 12) {
      hour24 = 0;
    }

    const date = new Date();
    date.setHours(hour24, parseInt(minutes || "0", 10), 0, 0);
    return date;
  };

  const calcularHoraFin = (horaInicio) => {
    if (!horaInicio) return "";
    const [horaStr, minutosStr] = horaInicio.split(':');
    let hora = parseInt(horaStr, 10);
    let minutos = parseInt(minutosStr, 10);

    return calculateEndTime(`${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Por favor, corrige los errores",
        variant: "destructive",
      });
      return;
    }

    const maxAllowedEdits = appointment?.ediciones_maximas || 2;
    const editsUsed = appointment?.ediciones_realizadas || 0;

    if (editsUsed >= maxAllowedEdits) {
      toast({
        title: "Límite de ediciones alcanzado",
        description: "Solo se permite editar una cita " + maxAllowedEdits + " veces como máximo.",
        variant: "destructive"
      });
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const servicioSeleccionado = servicios.find(s => s.name === formData.servicio);
      const horaFormateada = parseTime(formData.hora_inicio);

      const horaInicio24 = horaFormateada instanceof Date
        ? horaFormateada.toTimeString().substring(0, 5)
        : formData.hora_inicio;

      const updateData = {
        fecha_cita: formData.fecha_cita,
        hora_inicio: horaInicio24,
        hora_fin: calcularHoraFin(horaInicio24),
        id_servicio: servicioSeleccionado.id,
        observaciones: formData.observaciones,
        comentario_edicion: formData.comentario.trim(),
      };

      console.log('[DEBUG] Editando cita:', updateData);

      await onEditAppointment(appointment.id, updateData);

      toast({
        title: "Cita editada exitosamente",
        description: "Los cambios se han guardado y la cita ha sido reprogramada.",
        variant: "default",
      });

      onClose();
    } catch (error) {
      console.error('[ERROR] Error editando cita:', error);
      toast({
        title: "Error al editar la cita",
        description: error.message || "Por favor intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        fecha_cita: '',
        hora_inicio: '',
        servicio: '',
        observaciones: '',
        comentario: ''
      });
      setErrors({});
      onClose();
    }
  };

  const canSubmit = () => {
    return formData.fecha_cita.trim() !== "" &&
           formData.hora_inicio.trim() !== "" &&
           formData.servicio.trim() !== "" &&
           formData.comentario.trim().length >= 10 &&
           Object.values(errors).every((error) => !error);
  };

  const validateField = (field, value) => {
    switch (field) {
      case "fecha":
        return validateFecha(value);
      case "hora":
        return validateHora(value);
      case "comentario":
        return validateComentario(value);
      default:
        return "";
    }
  };

  const updateFormData = (field, value) => {
    if (isSubmitting) return;
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    const error = validateField(field, value);
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const handleDateSelect = (day) => {
    if (isSubmitting) return;
    if (day.isDisabled) return;
    const dateString = formatDateForInput(day.date);
    updateFormData("fecha_cita", dateString);
  };

  const navigateMonth = (direction) => {
    if (isSubmitting) return;
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const days = getDaysInMonth(currentMonth);

  // Contador real de ediciones
  const edicionesRealizadas = appointment?.ediciones_realizadas || 0;
  const maxEdiciones = appointment?.ediciones_maximas || 2;
  const fechaAgendadaLegible = formatearFechaLegible(appointment?.fecha_cita || appointment?.fecha);
  const horaAgendadaLegible = normalizeHoraToOption(appointment?.hora_inicio) ||
    citaApiService.formatHoraDesdeAPI(appointment?.hora_inicio);

  if (!isOpen || !appointment) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[95vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-amber-50 flex-shrink-0 relative">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <RotateCcw className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Editar Cita Programada
                </h2>
                <p className="text-slate-600 mt-1">
                  Modifica fecha, hora o detalles de tu cita
                </p>
                {edicionesRealizadas >= maxEdiciones && (
                  <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700 font-medium">
                      ⚠️ Has alcanzado el límite máximo de ediciones ({maxEdiciones})
                    </p>
                  </div>
                )}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
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
                  <History className="w-5 h-5" />
                  <span>Cita Actual</span>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                  <h3 className="font-bold text-lg text-slate-800 mb-3">
                    Cita #{appointment.userAppointmentNumber || appointment.id}
                  </h3>

                  {/* Estado actual */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      {appointment.estado_cita?.nombre === "Confirmada" ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : appointment.estado_cita?.nombre === "Cancelada" ? (
                        <Ban className="w-4 h-4 text-red-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="text-sm font-medium text-slate-700">Estado:</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      appointment.estado_cita?.id === 1 ? 'bg-blue-100 text-blue-800' :
                      appointment.estado_cita?.id === 2 ? 'bg-green-100 text-green-800' :
                      appointment.estado_cita?.id === 3 ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {appointment.estado_cita?.nombre || "Solicitada"}
                    </span>
                  </div>

                  {/* Detalles de la cita */}
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-slate-600">Fecha:</span>
                      <p className="text-slate-800">{new Date(appointment.fecha_cita).toLocaleDateString('es-ES')}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-600">Hora:</span>
                      <p className="text-slate-800">
                        {citaApiService.formatHoraDesdeAPI(appointment.hora_inicio)} - {citaApiService.formatHoraDesdeAPI(appointment.hora_fin)}
                      </p>
                    </div>
                    {appointment.inmueble && (
                      <div>
                        <span className="font-medium text-slate-600">Propiedad:</span>
                        <p className="text-slate-800 text-xs">{appointment.inmueble.direccion}</p>
                      </div>
                    )}
                    {appointment.servicio && (
                      <div>
                        <span className="font-medium text-slate-600">Servicio:</span>
                        <p className="text-slate-800">{appointment.servicio.nombre_servicio}</p>
                      </div>
                    )}
                  </div>

                  {/* Ediciones realizadas */}
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">Ediciones realizadas:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        edicionesRealizadas >= maxEdiciones ? 'bg-red-100 text-red-800' :
                        edicionesRealizadas === maxEdiciones - 1 ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {edicionesRealizadas} / {maxEdiciones}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Información de cambios */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-amber-800 mb-2">
                        Estado después de editar
                      </h4>
                      <ul className="text-amber-700 text-sm space-y-1">
                        <li>• Si estaba Confirmada → Reprogramada</li>
                        <li>• Si estaba Solicitada → Mantiene estado</li>
                        <li>• Máximo 2 ediciones por cita</li>
                        <li>• Se requiere comentario obligatorio</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:w-2/3 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 min-h-0">
              <form
                onSubmit={handleSubmit}
                className={`space-y-6 ${isSubmitting ? 'pointer-events-none' : ''}`}
              >
                {/* Información del Usuario - Solo lectura */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        Información del Usuario
                      </h3>
                      <p className="text-slate-600 text-sm">
                        Esta información no se puede modificar desde aquí
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-slate-600">Nombre:</span>
                        <p className="text-slate-800 font-medium">
                          {user?.nombre_completo || appointment.nombre_completo ||
                           (user?.primer_nombre && user?.primer_apellido
                             ? `${user.primer_nombre} ${user.primer_apellido}`
                             : appointment.nombre_completo)}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600">Documento:</span>
                        <p className="text-slate-800 font-medium">
                          {user?.tipo_documento ? `${user.tipo_documento} ${user.numero_documento}` :
                           (appointment.tipo_documento && appointment.numero_documento
                             ? `${appointment.tipo_documento} ${appointment.numero_documento}`
                             : "No disponible")}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600">Email:</span>
                        <p className="text-slate-800 font-medium">
                          {user?.correo || appointment.email || user?.email}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600">Teléfono:</span>
                        <p className="text-slate-800 font-medium">
                          {user?.telefono || appointment.telefono}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Servicio Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileText className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Servicio Requerido</h3>
                  </div>

                  <div>
                    {/* TIPO DE SERVICIO */}
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tipo de Servicio <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={formData.servicio}
                      onValueChange={(value) => {
                        updateFormData('servicio', value);
                      }}
                      disabled={edicionesRealizadas >= maxEdiciones || isSubmitting}
                    >
                      <SelectTrigger className={`w-full ${errors.servicio ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Seleccionar servicio requerido" />
                      </SelectTrigger>
                      <SelectContent>
                        {servicios.map(servicio => (
                          <SelectItem key={servicio.id} value={servicio.name}>
                            {servicio.icon} {servicio.name} - {servicio.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.servicio && (
                      <p className="text-red-500 text-sm mt-1">{errors.servicio}</p>
                    )}
                  </div>
                </div>

                {/* Date and Time Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    Nueva Fecha y Hora
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Fecha agendada</p>
                      <p className="text-sm font-semibold text-slate-800">{fechaAgendadaLegible}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Hora agendada</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {horaAgendadaLegible || 'Por confirmar'}
                      </p>
                    </div>
                  </div>

                  {/* Calendar */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigateMonth(-1)}
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      </motion.button>
                    </div>

                    {/* Days of Week */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {daysOfWeek.map((day) => (
                        <div
                          key={day}
                          className="text-center text-sm font-medium text-slate-500 py-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {days.map((day, index) => {
                        const isSelected = formData.fecha_cita === formatDateForInput(day.date);

                        return (
                          <motion.button
                            key={index}
                            type="button"
                            whileHover={!day.isDisabled ? { scale: 1.05 } : {}}
                            whileTap={!day.isDisabled ? { scale: 0.95 } : {}}
                            onClick={() => handleDateSelect(day)}
                            disabled={day.isDisabled || edicionesRealizadas >= maxEdiciones || isSubmitting}
                            className={`h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                              day.isDisabled || edicionesRealizadas >= maxEdiciones
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-slate-700 hover:bg-orange-50"
                            } ${!day.isCurrentMonth ? "text-slate-400" : ""}
                              ${day.isToday ? "bg-orange-100 text-orange-600 font-bold" : ""}
                              ${isSelected ? "bg-orange-600 text-white" : ""}
                              ${day.isSunday && day.isCurrentMonth ? "bg-red-50 text-red-400" : ""}
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
                        <span>Nueva fecha</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-orange-100 rounded"></div>
                        <span>Hoy</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-50 rounded"></div>
                        <span>No disponible</span>
                      </div>
                    </div>

                    {errors.fecha_cita && (
                      <p className="text-red-500 text-sm mt-2">
                        {errors.fecha_cita}
                      </p>
                    )}
                  </div>

                  {/* Time Selection */}
                  {formData.fecha_cita && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2 text-slate-700">
                        <Clock className="w-5 h-5" />
                        <h4 className="font-medium">Nueva Hora disponible</h4>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        {horasOptions.map((hour) => (
                          <motion.button
                            key={hour}
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateFormData("hora_inicio", hour)}
                            disabled={edicionesRealizadas >= maxEdiciones || isSubmitting}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                              formData.hora_inicio === hour
                                ? "bg-orange-600 text-white"
                                : "bg-white text-slate-700 hover:bg-orange-50 border border-slate-200"
                            }`}
                          >
                            {hour}
                          </motion.button>
                        ))}
                      </div>

                      {errors.hora_inicio && (
                        <p className="text-red-500 text-sm">{errors.hora_inicio}</p>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Additional Message */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Observaciones Adicionales
                  </label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => updateFormData("observaciones", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors resize-none"
                    placeholder="Agrega comentarios adicionales sobre la reprogramación..."
                    disabled={edicionesRealizadas >= maxEdiciones || isSubmitting}
                  />
                </div>

                {/* Required Comment */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <AlertTriangle className="w-4 h-4 inline mr-2 text-orange-600" />
                    Motivo de la Edición <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.comentario}
                    onChange={(e) => updateFormData("comentario", e.target.value)}
                    rows={4}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors resize-none ${
                      errors.comentario ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="Explica detalladamente por qué necesitas editar esta cita. Mínimo 10 caracteres."
                    required
                    disabled={edicionesRealizadas >= maxEdiciones || isSubmitting}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Obligatorio. Mínimo 10 caracteres. Este comentario se guardará en el historial de la cita.
                  </p>
                  {errors.comentario && (
                    <p className="text-red-500 text-sm mt-1">{errors.comentario}</p>
                  )}
                </div>

                {/* Information */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-orange-800 mb-2">
                        Información importante sobre la edición
                      </h4>
                      <ul className="text-orange-700 text-sm space-y-1">
                        <li>• Solo puedes editar una cita máximo 2 veces</li>
                        <li>• La edición requiere un comentario obligatorio</li>
                        <li>• Después de editar, el estado cambiará a "Reprogramada"</li>
                        <li>• Te contactaremos para confirmar los cambios</li>
                        <li>• Si estabas en estado "Solicitada", mantendrás ese estado</li>
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
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting || !canSubmit() || edicionesRealizadas >= maxEdiciones}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-orange-600 disabled:hover:to-orange-700"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Reprogramando...
                      </div>
                    ) : (
                      edicionesRealizadas >= maxEdiciones ? "Límite alcanzado" : "Guardar Cambios"
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default UserEditAppointmentModal;
