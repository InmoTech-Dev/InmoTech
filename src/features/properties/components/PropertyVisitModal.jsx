import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  CreditCard,
  Hash,
  Phone,
  Mail,
  Calendar,
  Clock,
  MessageSquare,
  MapPin,
  Home,
  DollarSign,
  Info,
  ChevronLeft,
  ChevronRight,
  Save,
  Clock as ClockIcon,
  Bed,
  Bath
} from 'lucide-react';
import { formatPhoneNumber } from '../../../shared/utils/phoneFormatter';
import { useToast } from '../../../shared/hooks/use-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import citaApiService from '../../../shared/services/citaApiService';
import { apiClient } from '../../../shared/services/api.config';
import { useAppointments } from '../../../shared/contexts/AppointmentContext';
import { useAuth } from '../../../shared/contexts/AuthContext';


const PropertyVisitModal = ({ isOpen, onClose, property, onSubmit }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { user, isAuthenticated } = useAuth();

  //  Estado simple del formulario sin auto-guardado
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    tipoDocumento: '',
    numeroDocumento: "",
    telefono: "",
    email: "",
    fecha: "",
    hora: "",
    mensaje: "",
  });

  const [errors, setErrors] = useState({});
  const [prevPhone, setPrevPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingPerson, setIsSearchingPerson] = useState(false);
  const [dynamicAvailableHours, setDynamicAvailableHours] = useState([]);
  const [isLoadingHours, setIsLoadingHours] = useState(false);

  const { toast } = useToast();
  const { addExistingAppointment } = useAppointments();

  // ✅ AUTO-COMPLETAR DATOS CUANDO EL USUARIO ESTÁ AUTENTICADO
  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      console.log('🔐 Usuario autenticado detectado:', user.correo);
      console.log('📋 Datos completos del user:', {
        tipo_documento: user.tipo_documento,
        numero_documento: user.numero_documento,
        nombre_completo: user.nombre_completo,
        apellido_completo: user.apellido_completo,
        telefono: user.telefono,
        correo: user.correo
      });

      // Separar el nombre completo en nombres y apellidos
      const nombreCompleto = user.nombre_completo || "";
      const apellidoCompleto = user.apellido_completo || "";

      // Auto-completar el formulario
      const nuevosDatos = {
        nombres: nombreCompleto,
        apellidos: apellidoCompleto,
        tipoDocumento: user.tipo_documento || '',
        numeroDocumento: user.numero_documento || '',
        telefono: user.telefono || '',
        email: user.correo || user.email || ''
      };

      setFormData(prev => ({
        ...prev,
        ...nuevosDatos
      }));

      // Actualizar prevPhone para el formateo del teléfono
      if (user.telefono) {
        setPrevPhone(user.telefono);
      }

      console.log('✅ Formulario auto-completado con datos del usuario');
      console.log('📝 Nuevos datos del formulario:', nuevosDatos);
    }
  }, [isOpen, isAuthenticated, user]);

  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const availableHours = [
    "08:00 am",
    "08:30 am",
    "09:00 am",
    "09:30 am",
    "10:00 am",
    "10:30 am",
    "11:00 am",
    "11:30 am",
    "02:00 pm",
    "02:30 pm",
    "03:00 pm",
    "03:30 pm",
    "04:00 pm",
    "04:30 pm",
    "05:00 pm",
    "05:30 pm",
  ];

  const tiposDocumento = [
    { value: "Cédula de Ciudadanía", label: "Cédula de Ciudadanía (CC)" },
    { value: "Cédula de Extranjería", label: "Cédula de Extranjería (CE)" },
    { value: "NIT", label: "NIT" },
    { value: "Pasaporte", label: "Pasaporte" },
    { value: "Tarjeta de Identidad", label: "Tarjeta de Identidad (TI)" },
  ];

  const tipoDocumentoMap = {
    "Cédula de Ciudadanía": "CC",
    "Cédula de Extranjería": "CE",
    NIT: "NIT",
    Pasaporte: "Pasaporte",
    "Tarjeta de Identidad": "TI",
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

      // Deshabilitar domingos (día 0)
      const isDisabled = date < today || date.getDay() === 0;

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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ✅ EFECTO PARA CARGAR HORARIOS DINÁMICOS
  useEffect(() => {
    const fetchAvailableHours = async () => {
      if (!formData.fecha) {
        setDynamicAvailableHours([]);
        return;
      }

      setIsLoadingHours(true);
      try {
        console.log("📅 Cargando horarios dinámicos para:", formData.fecha);
        // ID 1 es Visita a Propiedad
        const horas = await citaApiService.obtenerHorariosDisponiblesPublico({
          fecha_cita: formData.fecha,
          id_servicio: 1,
          id_inmueble: property.id || property.id_inmueble
        });

        // Convertir de formato "HH:mm" a "hh:mm a" para el UI
        const horasFormateadas = horas.map(h => {
          const [hour, minute] = h.split(':');
          const hNum = parseInt(hour);
          const period = hNum >= 12 ? 'pm' : 'am';
          const h12 = hNum % 12 || 12;
          return `${h12.toString().padStart(2, '0')}:${minute} ${period}`;
        });

        setDynamicAvailableHours(horasFormateadas);
      } catch (error) {
        console.error("Error cargando horarios:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los horarios disponibles. Usando horarios predeterminados.",
          variant: "destructive"
        });
        // Feedback visual: usamos los estáticos si falla
        setDynamicAvailableHours([]);
      } finally {
        setIsLoadingHours(false);
      }
    };

    if (isOpen && formData.fecha) {
      fetchAvailableHours();
    }
  }, [formData.fecha, isOpen]);

  // Función para validar nombre completo (igual que dashboard)
  // ✅ Validar nombres
  const validateNombres = (nombres) => {
    if (!nombres.trim()) return "Los nombres son requeridos";
    if (nombres.trim().length < 2)
      return "Los nombres deben tener al menos 2 caracteres";
    if (nombres.trim().length > 50)
      return "Los nombres no pueden tener más de 50 caracteres";
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nombres.trim()))
      return "Los nombres solo pueden contener letras y espacios";
    return "";
  };

  // ✅ Validar apellidos
  const validateApellidos = (apellidos) => {
    if (!apellidos.trim()) return "Los apellidos son requeridos";
    if (apellidos.trim().length < 2)
      return "Los apellidos deben tener al menos 2 caracteres";
    if (apellidos.trim().length > 50)
      return "Los apellidos no pueden tener más de 50 caracteres";
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(apellidos.trim()))
      return "Los apellidos solo pueden contener letras y espacios";
    return "";
  };

  // Función para validar teléfono colombiano (igual que dashboard)
  const validateTelefono = (telefono) => {
    if (!telefono.trim()) return "El teléfono es requerido";
    const telefonoLimpio = telefono.replace(/[\s\-\(\)]/g, "");
    if (!/^(\+57|57)?[3][0-9]{9}$/.test(telefonoLimpio)) {
      return "El teléfono debe tener formato colombiano (+57 XXX XXX XXXX o 3XX XXX XXXX)";
    }
    return "";
  };

  // Función para validar email (igual que dashboard)
  const validateEmail = (email) => {
    if (!email.trim()) return "El email es requerido";
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) return "Ingresa un email válido";
    if (email.length > 254) return "El email es demasiado largo";
    return "";
  };

  // Función para validar tipo de documento (igual que dashboard)
  const validateTipoDocumento = (tipoDocumento) => {
    if (!tipoDocumento) return "El tipo de documento es requerido";
    return "";
  };

  // Función para validar número de documento (igual que dashboard)
  const validateNumeroDocumento = (numeroDocumento, tipoDocumento) => {
    if (!numeroDocumento.trim()) return "El número de documento es requerido";

    const numeroLimpio = numeroDocumento.replace(/[\s\-\.]/g, "");

    switch (tipoDocumento) {
      case "Cédula de Ciudadanía":
        if (!/^[0-9]{8,10}$/.test(numeroLimpio)) {
          return "La cédula debe tener entre 8 y 10 dígitos";
        }
        break;
      case "Cédula de Extranjería":
        if (!/^[0-9]{6,10}$/.test(numeroLimpio)) {
          return "La cédula de extranjería debe tener entre 6 y 10 dígitos";
        }
        break;
      case "NIT":
        if (!/^[0-9]{8,10}$/.test(numeroLimpio)) {
          return "El NIT debe tener entre 8 y 10 dígitos";
        }
        break;
      case "Pasaporte":
        if (numeroLimpio.length < 6 || numeroLimpio.length > 20) {
          return "El pasaporte debe tener entre 6 y 20 caracteres";
        }
        if (!/^[A-Za-z0-9]+$/.test(numeroLimpio)) {
          return "El pasaporte solo puede contener letras y números";
        }
        break;
      case "Tarjeta de Identidad":
        if (!/^[0-9]{10,11}$/.test(numeroLimpio)) {
          return "La tarjeta de identidad debe tener 10 u 11 dígitos";
        }
        break;
      default:
        return "Tipo de documento no válido";
    }

    return "";
  };

  // Función para validar fecha (igual que dashboard)
  const validateFecha = (fecha) => {
    if (!fecha) return "La fecha es requerida";
    const fechaSeleccionada = new Date(`${fecha}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaSeleccionada < hoy)
      return "No se pueden agendar citas en fechas pasadas";
    return "";
  };

  // Función para validar hora (horario laboral como dashboard)
  const validateHora = (hora) => {
    if (!hora) return "La hora es requerida";

    // Lista de horas válidas
    const validHours = [
      "08:00 am",
      "08:30 am",
      "09:00 am",
      "09:30 am",
      "10:00 am",
      "10:30 am",
      "11:00 am",
      "11:30 am",
      "02:00 pm",
      "02:30 pm",
      "03:00 pm",
      "03:30 pm",
      "04:00 pm",
      "04:30 pm",
      "05:00 pm",
      "05:30 pm",
    ];

    if (!validHours.includes(hora)) {
      return "Las citas solo se pueden agendar entre las 8:00 am y las 6:00 pm";
    }

    return "";
  };

  const validateForm = () => {
    const newErrors = {};

    // ✅ Si NO está autenticado, validar todos los campos personales
    if (!isAuthenticated || !user) {
      newErrors.nombres = validateNombres(formData.nombres);
      newErrors.apellidos = validateApellidos(formData.apellidos);
      newErrors.telefono = validateTelefono(formData.telefono);
      newErrors.email = validateEmail(formData.email);
      newErrors.tipoDocumento = validateTipoDocumento(formData.tipoDocumento);
      newErrors.numeroDocumento = validateNumeroDocumento(
        formData.numeroDocumento,
        formData.tipoDocumento
      );
    }

    // Siempre validar fecha y hora indistintamente del estado de autenticación
    newErrors.fecha = validateFecha(formData.fecha);
    newErrors.hora = validateHora(formData.hora);

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => !error);
  };

  const parseTime = (timeString) => {
    const [time, period] = timeString.split(" ");
    const [hours, minutes] = time.split(":");
    let hour24 = parseInt(hours);

    if (period === "pm" && hour24 !== 12) {
      hour24 += 12;
    } else if (period === "am" && hour24 === 12) {
      hour24 = 0;
    }

    const date = new Date();
    date.setHours(hour24, parseInt(minutes), 0, 0);
    return date;
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
      // ✅ DATOS CORRECTOS con los nombres que espera el backend
      const citaData = {
        tipo_documento: tipoDocumentoMap[formData.tipoDocumento] || formData.tipoDocumento,
        numero_documento: formData.numeroDocumento.replace(/[\s.-]/g, ''),
        nombre_completo: formData.nombres.trim(),      // ✅ CAMBIO
        apellido_completo: formData.apellidos.trim(),  // ✅ CAMBIO
        email: formData.email.trim(),                  // ✅ CAMBIO (era correo)
        telefono: formData.telefono,
        fecha_cita: formData.fecha,                   // ✅ CAMBIO (con guión bajo)
        hora_inicio: parseTime(formData.hora).toTimeString().substring(0, 5), // ✅ FORMATO HH:MM
        hora_fin: calcularHoraFin(parseTime(formData.hora).toTimeString().substring(0, 5)), // ✅ FORMATO HH:MM
        id_inmueble: property?.id || 1,               // ✅ CAMBIO (con guión bajo)
        id_servicio: 1,                               // ✅ CAMBIO (con guión bajo)
        observaciones: formData.mensaje || null
      };

      console.log('📤 Datos de cita a enviar:', citaData);

      // Crear la cita
      const nuevaCita = await citaApiService.crearCita(citaData);

      // Agregar al contexto
      addExistingAppointment(nuevaCita);

      toast({
        title: "¡Visita agendada exitosamente!",
        variant: "default",
      });

      handleClose();

    } catch (error) {
      console.error('❌ Error al crear cita:', error);
      toast({
        title: "Error al agendar la visita",
        description: error.message || "Por favor intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  // ✅ Función auxiliar para calcular hora fin (30 minutos después)
  const calcularHoraFin = (horaInicio) => {
    const [horaStr, minutosStr] = horaInicio.split(':');
    let hora = parseInt(horaStr, 10);
    let minutos = parseInt(minutosStr, 10);

    // Sumar 30 minutos
    minutos += 30;

    // Si minutos excede 59, incrementar hora y ajustar minutos
    if (minutos >= 60) {
      hora += Math.floor(minutos / 60);
      minutos = minutos % 60;
    }

    // Asegurar formato HH:MM
    return `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    // Limpiar datos al cerrar modal
    setFormData({
      nombres: "",
      apellidos: "",
      tipoDocumento: "",
      numeroDocumento: "",
      telefono: "",
      email: "",
      fecha: "",
      hora: "",
      mensaje: "",
    });
    setErrors({});
    setPrevPhone("");
    onClose();
  };

  // Función para verificar si se puede proceder (similar a canProceedToNextStep del dashboard)
  const canSubmit = () => {
    // Campos requeridos dependen del estado de autenticación
    let requiredFields = ["fecha", "hora"];

    // Solo si NO está autenticado, agregar campos personales
    if (!isAuthenticated || !user) {
      requiredFields = requiredFields.concat([
        "nombres",
        "apellidos",
        "telefono",
        "email",
        "tipoDocumento",
        "numeroDocumento"
      ]);
    }

    const hasAllRequired = requiredFields.every(
      (field) => formData[field].trim() !== ""
    );

    if (!hasAllRequired) return false;

    const newErrors = {};

    // Solo si NO está autenticado, validar campos personales
    if (!isAuthenticated || !user) {
      newErrors.nombres = validateNombres(formData.nombres);
      newErrors.apellidos = validateApellidos(formData.apellidos);
      newErrors.telefono = validateTelefono(formData.telefono);
      newErrors.email = validateEmail(formData.email);
      newErrors.tipoDocumento = validateTipoDocumento(formData.tipoDocumento);
      newErrors.numeroDocumento = validateNumeroDocumento(
        formData.numeroDocumento,
        formData.tipoDocumento
      );
    }

    // Siempre validar fecha y hora
    newErrors.fecha = validateFecha(formData.fecha);
    newErrors.hora = validateHora(formData.hora);

    return Object.keys(newErrors).every((key) => !newErrors[key]);
  };

  // Función para validar campo específico en tiempo real
  const validateField = (field, value) => {
    switch (field) {
      case "nombres":
        return validateNombres(value);
      case "apellidos":
        return validateApellidos(value);
      case "telefono":
        return validateTelefono(value);
      case "email":
        return validateEmail(value);
      case "tipoDocumento":
        return validateTipoDocumento(value);
      case "numeroDocumento":
        return validateNumeroDocumento(value, formData.tipoDocumento);
      case "fecha":
        return validateFecha(value);
      case "hora":
        return validateHora(value);
      default:
        return "";
    }
  };

  const updateFormData = (field, value) => {
    // Actualizar el estado del formulario
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    // Validación en tiempo real
    const error = validateField(field, value);
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  // ⭐ CORRECCIÓN: Función para buscar persona automáticamente
  const buscarPersonaAutomaticamente = async (tipoDocumento, numeroDocumento) => {
    // Si el número es demasiado corto, limpiar campos y salir
    if (!numeroDocumento || numeroDocumento.replace(/[\s\-\.]/g, '').length < 5) {
      setFormData(prev => ({
        ...prev,
        nombres: "",
        apellidos: "",
        telefono: "",
        email: ""
      }));
      setPrevPhone("");
      return;
    }

    if (!tipoDocumento) return;

    const errorDocumento = validateNumeroDocumento(numeroDocumento, tipoDocumento);
    if (errorDocumento) return;

    setIsSearchingPerson(true);

    try {
      const tipoDocMap = tipoDocumentoMap[tipoDocumento] || tipoDocumento;
      const response = await apiClient.get('/citas/buscar-persona', {
        params: {
          tipo_documento: tipoDocMap,
          numero_documento: numeroDocumento.replace(/[\s\-\.]/g, '')
        }
      });

      const persona = response.data || response;

      if (persona && (persona.primer_nombre || persona.correo || persona.telefono)) {
        const nombresCompletos = [persona.primer_nombre, persona.segundo_nombre].filter(Boolean).join(' ');
        const apellidosCompletos = [persona.primer_apellido, persona.segundo_apellido].filter(Boolean).join(' ');
        
        let telefonoFormateado = persona.telefono || '';
        if (telefonoFormateado) {
          telefonoFormateado = formatPhoneNumber(telefonoFormateado, '', false);
        }

        setFormData(prev => ({
          ...prev,
          nombres: nombresCompletos.trim(),
          apellidos: apellidosCompletos.trim(),
          telefono: telefonoFormateado,
          email: (persona.correo || "").trim()
        }));

        if (telefonoFormateado) setPrevPhone(telefonoFormateado);

        toast({
          title: "✅ Datos encontrados",
          description: "Se han completado los campos con la información existente.",
          variant: "default"
        });
      } else {
        // Si la respuesta es exitosa pero sin datos útiles, limpiar
        setFormData(prev => ({
          ...prev,
          nombres: "",
          apellidos: "",
          telefono: "",
          email: ""
        }));
        setPrevPhone("");
      }
    } catch (error) {
      // ⭐ LIMPIEZA: Si no se encuentra (404) o hay error, limpiar campos prellenados
      setFormData(prev => ({
        ...prev,
        nombres: "",
        apellidos: "",
        telefono: "",
        email: ""
      }));
      setPrevPhone("");

      if (error.response?.status !== 404) {
        console.error('❌ Error al buscar persona:', error);
      }
    } finally {
      setIsSearchingPerson(false);
    }
  };

  // Función para manejar el cambio del teléfono con formateo automático
  const handlePhoneChange = (e) => {
    const newValue = e.target.value;
    const formatted = formatPhoneNumber(newValue, prevPhone, false);
    setPrevPhone(formatted);
    updateFormData("telefono", formatted);
  };

  // Función para manejar el evento de teclado en el teléfono (backspace)
  const handlePhoneKeyDown = (e) => {
    if (e.key === "Backspace") {
      const formatted = formatPhoneNumber(
        formData.telefono.slice(0, -1),
        formData.telefono,
        true
      );
      setPrevPhone(formatted);
      updateFormData("telefono", formatted);
      e.preventDefault();
    }
  };

  // ✅ Filtrar horas disponibles (Margen de 2 horas si es hoy)
  const filteredAvailableHours = React.useMemo(() => {
    if (!formData.fecha) return [];

    // Crear fecha seleccionada (ajustando zona horaria local o simplemente comparando strings si se usa formatDateForInput)
    // Como formData.fecha viene de formatDateForInput (YYYY-MM-DD), lo comparamos con el de hoy
    const today = new Date();
    const todayStr = formatDateForInput(today);

    // Si no es hoy, mostrar todas
    if (formData.fecha !== todayStr) {
      return availableHours;
    }

    // Si es hoy, filtrar
    const now = new Date();
    // Margen de 2 horas
    const marginTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    return availableHours.filter((timeStr) => {
      // Usamos la función parseTime existente que ya devuelve un Date con fecha de hoy
      const slotTime = parseTime(timeStr);
      return slotTime >= marginTime;
    });
  }, [formData.fecha]);

  const handleDateSelect = (day) => {
    if (day.isDisabled) return;

    const dateString = formatDateForInput(day.date);

    // Actualizar estado atómicamente para evitar condiciones de carrera
    setFormData(prev => ({
      ...prev,
      fecha: dateString,
      hora: "" // Limpiar hora al cambiar fecha
    }));

    // Validar fecha inmediatamente
    const error = validateField("fecha", dateString);
    setErrors(prev => ({
      ...prev,
      fecha: error,
      hora: "" // Limpiar error de hora
    }));
  };

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const days = getDaysInMonth(currentMonth);

  if (!isOpen || !property) return null;

  return (
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
                  Agendar Visita a la Propiedad
                </h2>
                <p className="text-slate-600 mt-1">
                  Programa tu visita personalizada
                </p>
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
            {/* Property Info Sidebar - Rediseñado */}
            <div className="lg:w-1/3 bg-slate-50 border-r border-slate-200 flex-shrink-0 flex flex-col p-4">
              {/* Imagen Principal */}
              <div className="relative h-48 lg:h-56 w-full flex-shrink-0 rounded-2xl overflow-hidden shadow-md">
                <img
                  src={property.mainImage || "/placeholder.svg"}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Precio sobre la imagen */}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-xs font-medium opacity-90 mb-0.5 uppercase tracking-wider">Precio</p>
                  <p className="text-2xl font-bold">{property.price}</p>
                </div>
              </div>

              {/* Información Detallada */}
              <div className="py-6 px-2 flex-1 overflow-y-auto">
                <div className="space-y-6">
                  {/* Título y Ubicación */}
                  <div>
                    <h3 className="font-bold text-xl text-slate-800 leading-tight mb-2">
                      {property.title}
                    </h3>
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-blue-600" />
                      <span className="text-sm">{property.location}</span>
                    </div>
                  </div>

                  {/* Grid de Características */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:border-blue-100 transition-colors">
                      <div className="p-2 bg-blue-50 rounded-full mb-2">
                        <Home className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Área</span>
                      <span className="font-bold text-slate-800 text-sm mt-1">{property.area}</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:border-blue-100 transition-colors">
                      <div className="p-2 bg-blue-50 rounded-full mb-2">
                        <Bed className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Hab.</span>
                      <span className="font-bold text-slate-800 text-sm mt-1">{property.bedrooms}</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:border-blue-100 transition-colors">
                      <div className="p-2 bg-blue-50 rounded-full mb-2">
                        <Bath className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Baños</span>
                      <span className="font-bold text-slate-800 text-sm mt-1">{property.bathrooms}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:w-2/3 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 min-h-0">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information - Solo mostrar si NO está autenticado */}
                {!isAuthenticated ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Información Personal
                    </h3>

                    {/* Tipo de Documento y Número */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* TIPO DE DOCUMENTO */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Tipo de Documento <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={formData.tipoDocumento}
                          onValueChange={(value) => {
                            updateFormData('tipoDocumento', value);

                            // Si ya hay un número de documento válido, buscar automáticamente
                            if (formData.numeroDocumento.trim().length >= 5) {
                              // Limpiar timeout anterior
                              if (window.searchTimeout) {
                                clearTimeout(window.searchTimeout);
                              }

                              // Buscar después de 300ms
                              window.searchTimeout = setTimeout(() => {
                                buscarPersonaAutomaticamente(value, formData.numeroDocumento);
                              }, 300);
                            }
                          }}
                        >
                          <SelectTrigger className={`w-full ${errors.tipoDocumento ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Seleccionar tipo de documento" />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposDocumento.map(tipo => (
                              <SelectItem key={tipo.value} value={tipo.value}>
                                {tipo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.tipoDocumento && (
                          <p className="text-red-500 text-sm mt-1">{errors.tipoDocumento}</p>
                        )}
                      </div>

                      {/* NÚMERO DE DOCUMENTO */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Número de Documento <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.numeroDocumento}
                          onChange={(e) => {
                            const value = e.target.value;
                            const filteredValue = value.replace(/[^0-9\s\.\-]/g, '');
                            updateFormData('numeroDocumento', filteredValue);

                            if (window.searchTimeout) clearTimeout(window.searchTimeout);

                            const cleanValue = filteredValue.replace(/[\s\-\.]/g, '');
                            
                            // ⭐ LIMPIEZA: Si el documento es vacío o muy corto, limpiar campos
                            if (cleanValue.length < 5) {
                              setFormData(prev => ({
                                ...prev,
                                nombres: "",
                                apellidos: "",
                                telefono: "",
                                email: ""
                              }));
                              setPrevPhone("");
                            }

                            if (formData.tipoDocumento && cleanValue.length >= 5) {
                              window.searchTimeout = setTimeout(() => {
                                buscarPersonaAutomaticamente(formData.tipoDocumento, filteredValue);
                              }, 500);
                            }
                          }}
                          onKeyDown={(e) => {
                            // Prevenir entrada de letras
                            if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.numeroDocumento ? 'border-red-500' : 'border-slate-300'
                            } ${isSearchingPerson ? 'bg-blue-50' : ''}`}
                          placeholder="Número de documento"
                          disabled={!formData.tipoDocumento}
                        />
                        {errors.numeroDocumento && (
                          <p className="text-red-500 text-sm mt-1">{errors.numeroDocumento}</p>
                        )}
                        {isSearchingPerson && (
                          <div className="text-blue-500 text-sm mt-1 flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            Buscando información...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Nombres <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.nombres}
                          onChange={(e) =>
                            updateFormData("nombres", e.target.value)
                          }
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.nombres ? "border-red-500" : "border-slate-300"
                            }`}
                          placeholder="Ej: Juan Carlos"
                        />
                        {errors.nombres && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.nombres}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Apellidos <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.apellidos}
                          onChange={(e) =>
                            updateFormData("apellidos", e.target.value)
                          }
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.apellidos
                            ? "border-red-500"
                            : "border-slate-300"
                            }`}
                          placeholder="Ej: Pérez González"
                        />
                        {errors.apellidos && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.apellidos}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Teléfono <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={formData.telefono}
                          onChange={handlePhoneChange}
                          onKeyDown={handlePhoneKeyDown}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.telefono
                            ? "border-red-500"
                            : "border-slate-300"
                            }`}
                          placeholder="+57 300 123 4567"
                        />
                        {errors.telefono && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.telefono}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Correo Electrónico <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateFormData("email", e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.email ? "border-red-500" : "border-slate-300"
                          }`}
                        placeholder="tu@email.com"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  // 🔐 USUARIO AUTENTICADO - Mostrar información solo para confirmación
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
                          Datos completados automáticamente desde tu cuenta
                        </p>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-slate-600">Nombre:</span>
                          <p className="text-slate-800 font-medium">{user?.nombre_completo || formData.nombres}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Apellidos:</span>
                          <p className="text-slate-800 font-medium">{user?.apellido_completo || formData.apellidos}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Documento:</span>
                          <p className="text-slate-800 font-medium">
                            {user?.tipo_documento} {user?.numero_documento}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Teléfono:</span>
                          <p className="text-slate-800 font-medium">{user?.telefono || formData.telefono}</p>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium text-slate-600">Email:</span>
                          <p className="text-slate-800 font-medium">{user?.correo || formData.email}</p>
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-green-100 rounded border border-green-200">
                        <p className="text-green-700 text-xs">
                          ✅ Información completada automáticamente. Solo necesitas seleccionar fecha, hora y agregar un mensaje.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
                            className={`
                              h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200
                              ${day.isDisabled
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-slate-700 hover:bg-blue-50"
                              }
                              ${!day.isCurrentMonth ? "text-slate-400" : ""}
                              ${day.isToday
                                ? "bg-blue-100 text-blue-600 font-bold"
                                : ""
                              }
                              ${isSelected ? "bg-blue-600 text-white" : ""}
                              ${day.isSunday && day.isCurrentMonth
                                ? "bg-red-50 text-red-400"
                                : ""
                              }
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
                        {isLoadingHours && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full ml-1"
                          />
                        )}
                      </div>

                      {isLoadingHours ? (
                        <div className="flex justify-center py-6 text-sm text-slate-500">
                          Buscando horarios disponibles...
                        </div>
                      ) : dynamicAvailableHours.length > 0 ? (
                        <div className="grid grid-cols-4 gap-3">
                          {dynamicAvailableHours.map((hour) => (
                            <motion.button
                              key={hour}
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => updateFormData("hora", hour)}
                              className={`
                                py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200
                                ${formData.hora === hour
                                  ? "bg-blue-600 text-white"
                                  : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-200"
                                }
                              `}
                            >
                              {hour}
                            </motion.button>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                          <p className="text-amber-700 text-sm font-medium">
                            No hay horarios disponibles para esta fecha.
                          </p>
                          <p className="text-amber-600 text-xs mt-1">
                            Todos los horarios están ocupados. Por favor selecciona otra fecha.
                          </p>
                        </div>
                      )}

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
                    Mensaje Adicional
                  </label>
                  <textarea
                    value={formData.mensaje}
                    onChange={(e) => updateFormData("mensaje", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
                    placeholder="¿Hay algo específico que te gustaría saber sobre la propiedad?"
                  />
                </div>

                {/* Important Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">
                        Información importante
                      </h4>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>
                          • Te contactaremos en las próximas 2 horas para
                          confirmar
                        </li>
                        <li>• Duración aproximada: 30-45 minutos</li>
                        <li>
                          • Agradecemos tu puntualidad y asistencia. Tu
                          compromiso es fundamental para nosotros.
                        </li>
                        <li>
                          • Para visitas presenciales, lleva identificación
                        </li>
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
                      "Agendar Visita"
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

export default PropertyVisitModal;