import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  MessageSquare,
  CheckCircle,
  User,
  Home,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { useToast } from '../../../shared/hooks/use-toast';
import { useAuth } from '../../../shared/contexts/AuthContext';
import citaApiService from '../../../shared/services/citaApiService';

const UserCreateAppointmentModal = ({ isOpen, onClose, preselectedDate, onAppointmentCreate }) => {
  const { user } = useAuth();

  // Si hay fecha preseleccionada, mostrar calendario en ese mes
  const initialMonth = preselectedDate ? new Date(preselectedDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    servicio: "",
    mensaje: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Pre-seleccionar fecha si viene del calendario
  useEffect(() => {
    if (isOpen && preselectedDate) {
      setFormData(prev => ({ ...prev, fecha: preselectedDate }));
    }
  }, [isOpen, preselectedDate]);

  // Reset modal
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        fecha: "",
        hora: "",
        servicio: "",
        mensaje: "",
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const availableHours = [
    "08:00 am", "08:30 am", "09:00 am", "09:30 am", "10:00 am", "10:30 am",
    "11:00 am", "11:30 am", "02:00 pm", "02:30 pm", "03:00 pm", "03:30 pm",
    "04:00 pm", "04:30 pm", "05:00 pm", "05:30 pm",
  ];

  const servicios = [
    { name: "Visita a Propiedad", icon: "🏠", description: "Recorridos guiados por propiedades", id: 1 },
    { name: "Avalúos", icon: "💰", description: "Tasación y valoración de inmuebles", id: 2 },
    { name: "Gestión de Alquileres", icon: "🏢", description: "Administración completa de arrendamientos", id: 3 },
    { name: "Asesoría Legal", icon: "⚖️", description: "Apoyo legal en temas inmobiliarios", id: 4 },
  ];

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

      // Si viene una fecha preseleccionada, solo permitir esa fecha específica
      let isDisabled = true; // Por defecto bloquear todas

      if (preselectedDate) {
        const preselectedDateObj = new Date(preselectedDate);
        preselectedDateObj.setHours(0, 0, 0, 0);
        const dateObj = new Date(date);
        dateObj.setHours(0, 0, 0, 0);

        // Solo habilitar la fecha preseleccionada (sin importar si es pasada o Sunday)
        if (dateObj.getTime() === preselectedDateObj.getTime()) {
          isDisabled = false;
        }
      } else {
        // Si no hay fecha preseleccionada, aplicar reglas normales
        isDisabled = date < today || date.getDay() === 0;
      }

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

    if (!availableHours.includes(hora)) {
      return "Las citas solo se pueden agendar entre las 8:00 am y las 6:00 pm";
    }

    return "";
  };

  const validateServicio = (servicio) => {
    if (!servicio) return "El servicio es requerido";
    const servicioExists = servicios.some(s => s.name === servicio);
    if (!servicioExists) return "Selecciona un servicio válido";
    return "";
  };

  const validateForm = () => {
    const newErrors = {};
    newErrors.fecha = validateFecha(formData.fecha);
    newErrors.hora = validateHora(formData.hora);
    newErrors.servicio = validateServicio(formData.servicio);

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => !error);
  };

  const parseTime = (timeString) => {
    if (!timeString) return null;
    const [time, periodRaw] = timeString.trim().split(" ");
    const [hoursStr, minutesStr] = (time || "").split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10) || 0;
    const period = (periodRaw || "").toLowerCase();

    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return { hours, minutes };
  };

  const formatHHmm = ({ hours, minutes }) =>
    `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  const calcularHoraFin = (horaInicio) => {
    const [horaStr, minutosStr] = horaInicio.split(':');
    let hora = parseInt(horaStr, 10);
    let minutos = parseInt(minutosStr, 10);

    minutos += 30;

    if (minutos >= 60) {
      hora += Math.floor(minutos / 60);
      minutos = minutos % 60;
    }

    return `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
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

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Validar disponibilidad del horario
      const servicioSeleccionado = servicios.find(s => s.name === formData.servicio);
      const convocatoriaData = {
        fecha_cita: formData.fecha,
        id_servicio: servicioSeleccionado.id
      };

      if (servicioSeleccionado.id === 1) { // Solo validar "Visita a Propiedad"
        const horaParseada = parseTime(formData.hora);
        const horaInicio24h = horaParseada ? formatHHmm(horaParseada) : null;
        const horariosDisponibles = await citaApiService.obtenerHorariosDisponiblesUsuario(convocatoriaData);

        if (!horaInicio24h || !horariosDisponibles.includes(horaInicio24h)) {
          toast({
            title: "Horario no disponible",
            description: `El horario ${formData.hora} ya fue ocupado. Por favor selecciona otro horario.`,
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Preparar datos para la cita
      const horaParseada = parseTime(formData.hora);
      const horaInicio24h = horaParseada ? formatHHmm(horaParseada) : null;
      if (!horaInicio24h) {
        throw new Error("Hora seleccionada inválida");
      }

      const citaData = {
        tipo_documento: user?.tipo_documento,
        numero_documento: user?.numero_documento,
        nombre_completo: user?.nombre_completo,
        apellido_completo: user?.apellido_completo,
        email: user?.correo,
        telefono: user?.telefono,
        fecha_cita: formData.fecha,
        hora_inicio: horaInicio24h,
        hora_fin: calcularHoraFin(horaInicio24h),
        id_servicio: servicioSeleccionado.id,
        id_estado_cita: 1,
        observaciones: formData.mensaje || null
      };

      console.log('📤 Creando cita:', citaData);

      await citaApiService.crearCita(citaData);

      toast({
        title: "¡Cita agendada exitosamente!",
        description: "Te contactaremos pronto para confirmar",
        variant: "default",
      });

      if (onAppointmentCreate) onAppointmentCreate();

      onClose();
    } catch (error) {
      console.error('❌ Error al crear cita:', error);
      toast({
        title: "Error al agendar la cita",
        description: error.message || "Por favor intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      fecha: "",
      hora: "",
      servicio: "",
      mensaje: "",
    });
    setErrors({});
    onClose();
  };

  const canSubmit = () => {
    return formData.fecha.trim() !== "" &&
           formData.hora.trim() !== "" &&
           formData.servicio.trim() !== "" &&
           Object.values(errors).every((error) => !error);
  };

  const validateField = (field, value) => {
    switch (field) {
      case "fecha":
        return validateFecha(value);
      case "hora":
        return validateHora(value);
      case "servicio":
        return validateServicio(value);
      default:
        return "";
    }
  };

  const updateFormData = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    const error = validateField(field, value);
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const handleDateSelect = (day) => {
    if (day.isDisabled) return;
    const dateString = formatDateForInput(day.date);
    updateFormData("fecha", dateString);
  };

  const navigateMonth = (direction) => {
    if (preselectedDate) {
      // Si hay fecha preseleccionada, permitir navegación normal pero no resetear a hoy
      setCurrentMonth((prev) => {
        const newDate = new Date(prev);
        newDate.setMonth(prev.getMonth() + direction);
        return newDate;
      });
    } else {
      // Si no hay fecha preseleccionada, navegación normal
      setCurrentMonth((prev) => {
        const newDate = new Date(prev);
        newDate.setMonth(prev.getMonth() + direction);
        return newDate;
      });
    }
  };

  // Reset currentMonth cuando abre el modal con nueva fecha preseleccionada
  useEffect(() => {
    if (isOpen) {
      const initialMonth = preselectedDate ? new Date(preselectedDate) : new Date();
      setCurrentMonth(initialMonth);
    }
  }, [isOpen, preselectedDate]);

  const days = getDaysInMonth(currentMonth);

  if (!isOpen) return null;

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
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0 relative">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {preselectedDate ? "Agendar Cita para la Fecha Seleccionada" : "Agendar Nueva Cita"}
                </h2>
                <p className="text-slate-600 mt-1">
                  {preselectedDate ? "Selecciona servicio y horario" : "Selecciona servicio, fecha y horario"}
                </p>
                {preselectedDate && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700 font-medium">
                      📅 Fecha seleccionada: {new Date(preselectedDate).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Espacio vacío para mantener el diseño */}
            <div></div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="flex flex-col lg:flex-row overflow-hidden flex-1 min-h-0">
            {/* Service Selection Sidebar */}
            <div className="lg:w-1/3 bg-gradient-to-b from-slate-50 to-slate-100 p-6 border-r border-slate-200 flex-shrink-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600 font-medium">
                  <FileText className="w-5 h-5" />
                  <span>Servicio deseado</span>
                </div>

                <div className="space-y-3">
                  {servicios.map((servicio) => (
                    <motion.button
                      key={servicio.name}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => updateFormData("servicio", servicio.name)}
                      className={`w-full p-4 rounded-xl border transition-all duration-200 ${
                        formData.servicio === servicio.name
                          ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-left">
                        <div className="text-lg font-bold flex items-center gap-2">
                          <span className="text-2xl">{servicio.icon}</span>
                          {servicio.name}
                        </div>
                        <p className={`text-sm mt-1 ${
                          formData.servicio === servicio.name
                            ? "text-blue-100"
                            : "text-slate-500"
                        }`}>
                          {servicio.description}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {errors.servicio && (
                  <p className="text-red-500 text-sm">{errors.servicio}</p>
                )}
              </div>
            </div>

            {/* Form */}
            <div className="lg:w-2/3 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 min-h-0">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Information - Auto-filled */}
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
                        Información completada automáticamente desde tu cuenta
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-slate-600">Nombre:</span>
                        <p className="text-slate-800 font-medium">{user?.nombre_completo} {user?.apellido_completo}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600">Documento:</span>
                        <p className="text-slate-800 font-medium">
                          {user?.tipo_documento} {user?.numero_documento}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600">Teléfono:</span>
                        <p className="text-slate-800 font-medium">{user?.telefono}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600">Email:</span>
                        <p className="text-slate-800 font-medium">{user?.correo}</p>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-green-100 rounded border border-green-200">
                      <p className="text-green-700 text-xs">
                        ✅ Información completada automáticamente. Solo necesitas seleccionar fecha y hora.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Date and Time Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Selecciona fecha y hora
                  </h3>

                  {/* Calendar */}
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
                        {months[currentMonth.getMonth()]}{" "}
                        {currentMonth.getFullYear()}
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
                        const isSelected =
                          formData.fecha === formatDateForInput(day.date);

                        return (
                          <motion.button
                            key={index}
                            type="button"
                            whileHover={!day.isDisabled ? { scale: 1.05 } : {}}
                            whileTap={!day.isDisabled ? { scale: 0.95 } : {}}
                            onClick={() => handleDateSelect(day)}
                            disabled={day.isDisabled}
                            className={`h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                              day.isDisabled
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-slate-700 hover:bg-blue-50"
                            } ${!day.isCurrentMonth ? "text-slate-400" : ""}
                              ${day.isToday ? "bg-blue-100 text-blue-600 font-bold" : ""}
                              ${isSelected ? "bg-blue-600 text-white" : ""}
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
                        <div className="w-3 h-3 bg-blue-600 rounded"></div>
                        <span>Seleccionado</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-100 rounded"></div>
                        <span>Hoy</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-50 rounded"></div>
                        <span>No disponible</span>
                      </div>
                    </div>

                    {errors.fecha && (
                      <p className="text-red-500 text-sm mt-2">
                        {errors.fecha}
                      </p>
                    )}
                  </div>

                  {/* Time Selection */}
                  {formData.fecha && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2 text-slate-700">
                        <Clock className="w-5 h-5" />
                        <h4 className="font-medium">Horarios disponibles</h4>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        {availableHours.map((hour) => (
                          <motion.button
                            key={hour}
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateFormData("hora", hour)}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                              formData.hora === hour
                                ? "bg-blue-600 text-white"
                                : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-200"
                            }`}
                          >
                            {hour}
                          </motion.button>
                        ))}
                      </div>

                      {errors.hora && (
                        <p className="text-red-500 text-sm">{errors.hora}</p>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Additional Message */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Mensaje Adicional (Opcional)
                  </label>
                  <textarea
                    value={formData.mensaje}
                    onChange={(e) => updateFormData("mensaje", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
                    placeholder="¿Hay algo específico que te gustaría saber o comentar?"
                  />
                </div>

                {/* Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">
                        Información importante
                      </h4>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Te contactaremos en las próximas 2 horas para confirmar</li>
                        <li>• Duración aproximada: 30-45 minutos</li>
                        <li>• Puedes reagendar con 24 horas de anticipación</li>
                        <li>• Algunos servicios requieren documentos específicos</li>
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
                    disabled={isSubmitting || !canSubmit()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Agendando...
                      </div>
                    ) : (
                      "Agendar Cita"
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

export default UserCreateAppointmentModal;
