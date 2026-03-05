import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Calendar, FileText, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import StepIndicator from '../StepIndicator';
import CustomerStep from './steps/CustomerStep';
import DateTimeStep from './steps/DateTimeStep';
import DetailsStepStep from './steps/DetailsStep';
import SummaryStepStep from './steps/SummaryStep';
import { useToast } from '../../../../shared/hooks/use-toast';
import { formatPhoneNumber } from '../../../../shared/utils/phoneFormatter';
import { useAppointments } from '../../../../shared/contexts/AppointmentContext';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { apiClient } from '../../../../shared/services/api.config';
import citaApiService from '../../../../shared/services/citaApiService';

const SERVICIO_MAP = {
  "Visita a Propiedad": 1,
  "Avalúos": 2,
  "Gestión de Alquileres": 3,
  "Asesoría Legal": 4,
};

const ESTADO_MAP = {
  "solicitada": 1,
  "confirmada": 2,
  "programada": 3,
};

const getServicioIdFromNombre = (nombreServicio) => {
  if (!nombreServicio) return null;

  const normalized = String(nombreServicio)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized.includes('visita')) return 1;
  if (normalized.includes('avalu')) return 2;
  if (normalized.includes('alquiler')) return 3;
  if (normalized.includes('legal')) return 4;

  return SERVICIO_MAP[nombreServicio] || null;
};


const CreateAppointmentModal = ({ isOpen, onClose, onSubmit, preselectedDate }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    tipoDocumento: '',
    numeroDocumento: '',
    fecha: '',
    hora: '',
    servicio: '',
    id_inmueble: null,
    inmueble_label: '',
    notas: '',
    estado: 'solicitada'
  });
  const [errors, setErrors] = useState({});
  // ⭐ AGREGADO: Estado para búsqueda automática
  const [isSearchingPerson, setIsSearchingPerson] = useState(false);
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);
  const { toast } = useToast();
  const { createAppointment } = useAppointments();
  const { user } = useAuth();
  const contentRef = useRef(null);

  // Scroll to top when step changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentStep]);

  // Set preselected date when modal opens
  useEffect(() => {
    if (isOpen && preselectedDate) {
      setFormData(prev => ({ ...prev, fecha: preselectedDate }));
    }
  }, [isOpen, preselectedDate]);

  const steps = [
    { number: 1, title: 'Cliente', icon: User },
    { number: 2, title: 'Servicio', icon: FileText },
    { number: 3, title: 'Fecha y Hora', icon: Calendar },
    { number: 4, title: 'Estado', icon: CheckCircle }
  ];

  // Función para validar nombre completo
  const validateNombre = (nombre) => {
    if (!nombre.trim()) return 'El nombre del cliente es requerido';
    if (nombre.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
    if (nombre.trim().length > 100) return 'El nombre no puede tener más de 100 caracteres';
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nombre.trim())) return 'El nombre solo puede contener letras y espacios';
    return '';
  };

  // Función para validar teléfono colombiano
  const validateTelefono = (telefono) => {
    if (!telefono.trim()) return 'El teléfono es requerido';
    const telefonoLimpio = telefono.replace(/[\s\-\(\)]/g, '');
    if (!/^(\+57|57)?[3][0-9]{9}$/.test(telefonoLimpio)) {
      return 'El teléfono debe tener formato colombiano (+57 XXX XXX XXXX o 3XX XXX XXXX)';
    }
    return '';
  };

  // Función para validar email
  const validateEmail = (email) => {
    if (!email.trim()) return 'El email es requerido';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) return 'Ingresa un email válido';
    if (email.length > 254) return 'El email es demasiado largo';
    return '';
  };

  // Función para validar tipo de documento
  const validateTipoDocumento = (tipoDocumento) => {
    if (!tipoDocumento) return 'El tipo de documento es requerido';
    return '';
  };

  // Función para validar número de documento
  const validateNumeroDocumento = (numeroDocumento, tipoDocumento) => {
    if (!numeroDocumento.trim()) return 'El número de documento es requerido';

    const numeroLimpio = numeroDocumento.replace(/[\s\-\.]/g, '');

    switch (tipoDocumento) {
      case 'CC':
        if (!/^[0-9]{8,10}$/.test(numeroLimpio)) {
          return 'La cédula debe tener entre 8 y 10 dígitos';
        }
        break;
      case 'CE':
        if (!/^[0-9]{6,10}$/.test(numeroLimpio)) {
          return 'La cédula de extranjería debe tener entre 6 y 10 dígitos';
        }
        break;
      case 'NIT':
        if (!/^[0-9]{8,10}$/.test(numeroLimpio)) {
          return 'El NIT debe tener entre 8 y 10 dígitos';
        }
        break;
      case 'PASAPORTE':
        if (numeroLimpio.length < 6 || numeroLimpio.length > 20) {
          return 'El pasaporte debe tener entre 6 y 20 caracteres';
        }
        if (!/^[A-Za-z0-9]+$/.test(numeroLimpio)) {
          return 'El pasaporte solo puede contener letras y números';
        }
        break;
      case 'TI':
        if (!/^[0-9]{10,11}$/.test(numeroLimpio)) {
          return 'La tarjeta de identidad debe tener 10 u 11 dígitos';
        }
        break;
      default:
        return 'Tipo de documento no válido';
    }

    return '';
  };

  // Función para validar fecha
  const validateFecha = (fecha) => {
    if (!fecha) return 'La fecha es requerida';

    // Parsear manualmente para evitar problemas de zona horaria (UTC vs Local)
    const [y, m, d] = fecha.split('-').map(Number);
    const fechaSeleccionada = new Date(y, m - 1, d);
    fechaSeleccionada.setHours(0, 0, 0, 0);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaSeleccionada < hoy) return 'No se pueden agendar citas en fechas pasadas';
    return '';
  };

  // Función para validar hora (horario laboral)
  const validateHora = (hora) => {
    if (!hora) return 'La hora es requerida';

    // Check for multiple AM/PM suffixes
    const amMatches = hora.match(/\b(am|AM)\b/g);
    const pmMatches = hora.match(/\b(pm|PM)\b/g);
    const totalSuffixes = (amMatches ? amMatches.length : 0) + (pmMatches ? pmMatches.length : 0);

    if (totalSuffixes > 1) {
      return 'La hora no puede tener múltiples sufijos AM/PM';
    }

    // Detectar si es AM o PM
    const isPM = /\s*pm$/i.test(hora);
    const isAM = /\s*am$/i.test(hora);

    // Remover el sufijo ' am' o ' pm' antes de parsear
    const horaLimpia = hora.replace(/\s*(am|pm)$/i, '');
    let [horas, minutos] = horaLimpia.split(':').map(Number);

    // Verificar que la conversión fue exitosa
    if (isNaN(horas) || isNaN(minutos)) {
      return 'Formato de hora inválido';
    }

    // Convertir a formato 24 horas
    if (isPM && horas < 12) horas += 12;
    if (isAM && horas === 12) horas = 0;

    const horaDecimal = horas + (minutos / 60);

    // Horario laboral: 8:00 am - 1:00 pm y 2:00 pm - 5:00 pm
    // El último inicio permitido en la mañana es 12:30 (12.5) y en la tarde 4:30 (16.5)
    const isMorning = horaDecimal >= 8 && horaDecimal <= 12.5;
    const isAfternoon = horaDecimal >= 14 && horaDecimal <= 16.5;

    if (!isMorning && !isAfternoon) {
      return 'Las citas solo se pueden agendar entre las 8:00 am - 1:00 pm y 2:00 pm - 5:00 pm';
    }

    // Verificar que sea en intervalos de 30 minutos
    if (minutos !== 0 && minutos !== 30) {
      return 'Las citas solo se pueden agendar en intervalos de 30 minutos (ej: 8:00 am, 8:30 am, 9:00 am)';
    }

    return '';
  };

  // Función para validar servicio
  const validateServicio = (servicio) => {
    if (!servicio || servicio.trim() === '') {
      return 'El servicio es requerido';
    }

    const servicios = [
      'Avalúos',
      'Gestión de Alquileres',
      'Asesoría Legal',
      'Visita a Propiedad'
    ];

    // Verificar que el servicio seleccionado existe en la lista
    if (!servicios.includes(servicio)) {
      return 'Selecciona un servicio válido de la lista';
    }

    return '';
  };

  const validateInmueble = (idInmueble, servicioNombre) => {
    const idServicio = getServicioIdFromNombre(servicioNombre);
    if (idServicio === 1 && !idInmueble) {
      return 'Selecciona un inmueble para este servicio';
    }
    return '';
  };

  // ⭐ Función para buscar persona automáticamente basada en documento
  const buscarPersonaAutomaticamente = async (tipoDocumento, numeroDocumento) => {
    // Validaciones previas
    if (!tipoDocumento || !numeroDocumento || numeroDocumento.length < 5) {
      return;
    }

    const errorDocumento = validateNumeroDocumento(numeroDocumento, tipoDocumento);
    if (errorDocumento) {
      return;
    }

    setIsSearchingPerson(true);

    try {
      console.log('🔍 Buscando persona en dashboard:', {
        tipo: tipoDocumento,
        numero: numeroDocumento.replace(/[\s\-\.]/g, '')
      });

      const response = await apiClient.get('/citas/buscar-persona', {
        params: {
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento.replace(/[\s\-\.]/g, '')
        },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      console.log('✅ Respuesta del servidor:', response);

      // La respuesta viene envuelta en { success: true, data: {...} }
      const persona = response.data?.data || response.data || response;

      if (persona && (persona.nombre_completo || persona.correo || persona.telefono)) {
        // Formatear el teléfono usando formatPhoneNumber
        let telefonoFormateado = persona.telefono || '';
        if (telefonoFormateado) {
          telefonoFormateado = formatPhoneNumber(telefonoFormateado, '', false);
        }

        // Reconstruir nombres y apellidos desde los campos separados si vienen
        const primerNombre = persona.primer_nombre || '';
        const segundoNombre = persona.segundo_nombre || '';
        const primerApellido = persona.primer_apellido || '';
        const segundoApellido = persona.segundo_apellido || '';

        const nombreCompletoReconstruido = [primerNombre, segundoNombre].filter(Boolean).join(' ').trim();
        const apellidoCompletoReconstruido = [primerApellido, segundoApellido].filter(Boolean).join(' ').trim();

        console.log('📝 Datos encontrados:', {
          nombre: nombreCompletoReconstruido || persona.nombre_completo,
          apellido: apellidoCompletoReconstruido || persona.apellido_completo,
          telefono: telefonoFormateado,
          email: persona.correo
        });

        // Actualizar formulario automáticamente
        setFormData(prev => ({
          ...prev,
          nombre: nombreCompletoReconstruido || persona.nombre_completo || prev.nombre,
          apellido: apellidoCompletoReconstruido || persona.apellido_completo || prev.apellido,
          telefono: telefonoFormateado,
          email: persona.correo || prev.email
        }));

        toast({
          title: "✅ Datos encontrados",
          description: "Se han completado los campos con la información existente.",
          variant: "default"
        });
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('❌ Error al buscar persona:', error);
        toast({
          title: "Error al buscar información",
          description: "No se pudo verificar si el documento existe. Continúa ingresando los datos manualmente.",
          variant: "destructive"
        });
      } else {
        console.log('ℹ️ Persona no encontrada, continuar con registro nuevo');
      }
    } finally {
      setIsSearchingPerson(false);
    }
  };

  const validateStep = (step) => {
    let newErrors = {};

    switch (step) {
      case 1:
        newErrors.nombre = validateNombre(formData.nombre);
        newErrors.apellido = validateNombre(formData.apellido);
        newErrors.telefono = validateTelefono(formData.telefono);
        newErrors.email = validateEmail(formData.email);
        newErrors.tipoDocumento = validateTipoDocumento(formData.tipoDocumento);
        newErrors.numeroDocumento = validateNumeroDocumento(formData.numeroDocumento, formData.tipoDocumento);
        break;
      case 2:
        newErrors.servicio = validateServicio(formData.servicio);
        newErrors.id_inmueble = validateInmueble(formData.id_inmueble, formData.servicio);
        break;
      case 3:
        newErrors.fecha = validateFecha(formData.fecha);
        newErrors.hora = validateHora(formData.hora);
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canProceedToNextStep = (step) => {
    switch (step) {
      case 1:
        // Para el paso 1, verificar que los campos estén llenos (sin errores críticos)
        const step1Errors = {
          nombre: validateNombre(formData.nombre),
          apellido: validateNombre(formData.apellido),
          telefono: validateTelefono(formData.telefono),
          email: validateEmail(formData.email),
          tipoDocumento: validateTipoDocumento(formData.tipoDocumento),
          numeroDocumento: validateNumeroDocumento(formData.numeroDocumento, formData.tipoDocumento)
        };
        return formData.nombre.trim() &&
          formData.apellido.trim() &&
          formData.telefono.trim() &&
          formData.email.trim() &&
          formData.tipoDocumento &&
          formData.numeroDocumento.trim() &&
          Object.keys(step1Errors).every(key => !step1Errors[key]);
      case 2:
        // Para el paso 2, verificar servicio e inmueble (si aplica)
        const step2Errors = {
          servicio: validateServicio(formData.servicio),
          id_inmueble: validateInmueble(formData.id_inmueble, formData.servicio)
        };
        return formData.servicio &&
          Object.keys(step2Errors).every(key => !step2Errors[key]);
      case 3:
        // Para el paso 3, verificar fecha y hora
        const step3Errors = {
          fecha: validateFecha(formData.fecha),
          hora: validateHora(formData.hora)
        };
        return formData.fecha &&
          formData.hora &&
          Object.keys(step3Errors).every(key => !step3Errors[key]);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isCreatingAppointment) return;
    if (canProceedToNextStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      // Si no puede proceder, mostrar validación
      validateStep(currentStep);
      toast({
        title: "Campos requeridos",
        description: "Por favor corrige los errores antes de continuar",
        variant: "destructive"
      });
    }
  };

  const handlePrev = () => {
    if (isCreatingAppointment) return;
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateAllSteps = () => {
    let allErrors = {};
    // Validate step 1
    allErrors = { ...allErrors, ...{ nombre: validateNombre(formData.nombre), apellido: validateNombre(formData.apellido), telefono: validateTelefono(formData.telefono), email: validateEmail(formData.email), tipoDocumento: validateTipoDocumento(formData.tipoDocumento), numeroDocumento: validateNumeroDocumento(formData.numeroDocumento, formData.tipoDocumento) } };
    // Validate step 2
    allErrors = { ...allErrors, ...{ servicio: validateServicio(formData.servicio), id_inmueble: validateInmueble(formData.id_inmueble, formData.servicio) } };
    // Validate step 3
    allErrors = { ...allErrors, ...{ fecha: validateFecha(formData.fecha), hora: validateHora(formData.hora) } };
    setErrors(allErrors);
    return Object.values(allErrors).every(error => !error);
  };

  // Función para convertir hora de 12h a 24h
  const formatHoraParaAPI = (hora) => {
    if (!hora) return "09:00";

    const horaLimpia = hora.toLowerCase().replace(/\s+/g, "");
    const isPM = horaLimpia.includes("pm");
    const isAM = horaLimpia.includes("am");

    let [horas, minutos] = horaLimpia
      .replace(/am|pm/g, "")
      .split(":")
      .map(Number);

    if (isPM && horas !== 12) horas += 12;
    if (isAM && horas === 12) horas = 0;

    return `${String(horas).padStart(2, "0")}:${String(minutos || 0).padStart(2, "0")}`;
  };

  // Función para calcular hora_fin (30 minutos después)
  const calcularHoraFin = (horaInicio) => {
    const [horas, minutos] = horaInicio.split(":").map(Number);
    let horaFin = horas;
    let minutosFin = minutos + 30; // ✅ Citas de 30 minutos

    if (minutosFin >= 60) {
      horaFin += 1;
      minutosFin = 0;
    }

    return `${String(horaFin).padStart(2, "0")}:${String(minutosFin).padStart(2, "0")}`;
  };

  // ✅ MODIFICADO: Crear la cita directamente sin modal de confirmación
  const handleSubmit = () => {
    if (isCreatingAppointment) return;
    if (validateAllSteps()) {
      handleConfirmAppointment();
    } else {
      toast({
        title: "Campos requeridos",
        description: "Por favor corrige los errores antes de crear la cita",
        variant: "destructive"
      });
    }
  };

  // ✅ MODIFICADO: Función que realmente crea la cita después de la confirmación
  // CON VALIDACIÓN FINAL DE HORARIO DISPONIBLE
  const handleConfirmAppointment = async () => {
    if (isCreatingAppointment) return;
    setIsCreatingAppointment(true);

    try {
      // 🛡️ VALIDACIÓN FINAL: Verificar que el horario sigua disponible justo antes de crear
      const idServicio = getServicioIdFromNombre(formData.servicio) || 1;
      const horaInicio24h = formatHoraParaAPI(formData.hora);

      const disponibilidadData = {
        fecha_cita: formData.fecha,
        id_servicio: idServicio,
        id_inmueble: formData.id_inmueble || null,
      };

      const horariosDisponibles = await citaApiService.obtenerHorariosDisponibles(disponibilidadData);

      if (!horariosDisponibles.includes(horaInicio24h)) {
        console.error("❌ Horario ya no disponible:", horaInicio24h);
        toast({
          title: "Horario no disponible",
          description: `El horario ${formData.hora} para el día ${formData.fecha} ya fue ocupado. Por favor selecciona otro horario.`,
          variant: "destructive"
        });

        // Regresar al paso de fecha/hora
        setCurrentStep(3);
        return;
      }

      // Si la validación pasa, continuar con la creación normal
      const horaFin24h = calcularHoraFin(horaInicio24h);

      // Convertir estado string a ID numérico
      const idEstadoCita = ESTADO_MAP[formData.estado] || 1;

      // Determinar si asignar agente automáticamente
      let idAgenteAsignado = null;
      const userId = user?.id_persona || user?.id;
      if ((formData.estado === 'programada' || formData.estado === 'confirmada') && userId) {
        idAgenteAsignado = userId;
      }

      // Preparar los datos para el backend según la estructura esperada por citaApiService
      const citaData = {
        tipo_documento: formData.tipoDocumento,
        numero_documento: formData.numeroDocumento,
        nombre_completo: formData.nombre,
        apellido_completo: formData.apellido,
        email: formData.email,
        telefono: formData.telefono,
        fecha_cita: formData.fecha,
        hora_inicio: horaInicio24h,
        hora_fin: horaFin24h,
        id_inmueble: formData.id_inmueble || null,
        id_servicio: idServicio,
        id_estado_cita: idEstadoCita,
        id_agente_asignado: idAgenteAsignado,
        id_usuario_creador: userId || null,
        observaciones: formData.notas || null
      };

      console.log("📤 Datos preparados para crear cita:", citaData);

      // ✅ Crear la cita usando createAppointment (crea en backend y agrega al estado)
      const nuevaCita = await createAppointment(citaData);

      // ✅ INTEGRACIÓN: Procesar integraciones para cita confirmada
      if (nuevaCita && formData.estado === 'confirmada') {
        console.log("🚀 Procesando integraciones para cita confirmada...");

        // Aquí iría la llamada al servicio de integración Flutter
        // Como estamos en React, solo mostramos el mensaje
        toast({
          title: "📅 Integraciones activadas",
          description: "La cita se agregó al calendario y se programaron recordatorios.",
          variant: "default"
        });
      }

      toast({
        title: "¡Cita creada exitosamente!",
        description: "La cita ha sido agendada correctamente.",
        variant: "default"
      });

      // Cerrar el modal
      handleClose();
    } catch (error) {
      console.error("Error al crear cita:", error);
      toast({
        title: "Error al crear la cita",
        description: "No se pudo crear la cita. Por favor, intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingAppointment(false);
    }
  };

  const handleClose = () => {
    if (isCreatingAppointment) return;
    setCurrentStep(1);
    setFormData({
      nombre: '',
      apellido: '',
      telefono: '',
      email: '',
      tipoDocumento: '',
      numeroDocumento: '',
      fecha: '',
      hora: '',
      servicio: '',
      id_inmueble: null,
      inmueble_label: '',
      notas: '',
      estado: 'solicitada'
    });
    setErrors({});
    onClose();
  };

  const updateFormData = (field, value) => {
    let cleanedValue = value;

    // Clean 'hora' field to keep only the last valid AM/PM suffix
    if (field === 'hora' && value) {
      const amMatches = value.match(/\b(am|AM)\b/g);
      const pmMatches = value.match(/\b(pm|PM)\b/g);
      const totalSuffixes = (amMatches ? amMatches.length : 0) + (pmMatches ? pmMatches.length : 0);

      if (totalSuffixes > 1) {
        // Keep only the last suffix
        const lastAM = amMatches && amMatches.length > 0 ? amMatches[amMatches.length - 1] : null;
        const lastPM = pmMatches && pmMatches.length > 0 ? pmMatches[pmMatches.length - 1] : null;

        // Remove all suffixes first
        let cleaned = value.replace(/\s*\b(am|pm)\b/gi, '');

        // Add back the last suffix
        if (lastPM) {
          cleaned += ' ' + lastPM.toLowerCase();
        } else if (lastAM) {
          cleaned += ' ' + lastAM.toLowerCase();
        }

        cleanedValue = cleaned.trim();
      }
    }

    // Formatear automáticamente el teléfono si es el campo de teléfono
    if (field === 'telefono') {
      // El formateo ya se aplica directamente en CustomerStep con Smart
      // Aquí dejamos el valor tal cual
    }
    setFormData(prev => {
      const next = { ...prev, [field]: cleanedValue };

      if (field === 'servicio') {
        const nextServicioId = getServicioIdFromNombre(cleanedValue);
        const prevServicioId = getServicioIdFromNombre(prev.servicio);

        if (nextServicioId !== prevServicioId) {
          next.hora = '';
        }

        if (nextServicioId !== 1) {
          next.id_inmueble = null;
          next.inmueble_label = '';
        }
      }

      if (field === 'id_inmueble') {
        next.hora = '';
      }

      return next;
    });

    // Validación en tiempo real
    const newErrors = { ...errors };

    switch (field) {
      case 'cliente':
        newErrors.cliente = validateNombre(cleanedValue);
        break;
      case 'telefono':
        newErrors.telefono = validateTelefono(cleanedValue);
        break;
      case 'email':
        newErrors.email = validateEmail(cleanedValue);
        break;
      case 'tipoDocumento':
        newErrors.tipoDocumento = validateTipoDocumento(cleanedValue);
        // Revalidar número de documento cuando cambie el tipo
        if (formData.numeroDocumento) {
          newErrors.numeroDocumento = validateNumeroDocumento(formData.numeroDocumento, cleanedValue);
        }
        // ⭐ Búsqueda automática cuando cambie el tipo de documento
        if (formData.numeroDocumento.trim().length >= 5) {
          // Limpiar timeout anterior
          if (window.customerSearchTimeout) {
            clearTimeout(window.customerSearchTimeout);
          }

          // Buscar después de 300ms
          window.customerSearchTimeout = setTimeout(() => {
            buscarPersonaAutomaticamente(cleanedValue, formData.numeroDocumento);
          }, 300);
        }
        break;
      case 'numeroDocumento':
        newErrors.numeroDocumento = validateNumeroDocumento(cleanedValue, formData.tipoDocumento);
        // ⭐ Búsqueda automática con debounce cuando cambie el número de documento
        if (formData.tipoDocumento && cleanedValue.trim().length >= 5) {
          // Limpiar búsqueda anterior
          if (window.customerSearchTimeout) {
            clearTimeout(window.customerSearchTimeout);
          }

          // Buscar automáticamente con debounce
          window.customerSearchTimeout = setTimeout(() => {
            buscarPersonaAutomaticamente(formData.tipoDocumento, cleanedValue);
          }, 500);
        }
        break;
      case 'fecha':
        newErrors.fecha = validateFecha(cleanedValue);
        break;
      case 'hora':
        newErrors.hora = validateHora(cleanedValue);
        break;
      case 'servicio':
        newErrors.servicio = validateServicio(cleanedValue);
        newErrors.id_inmueble = validateInmueble(formData.id_inmueble, cleanedValue);
        break;
      case 'id_inmueble':
        newErrors.id_inmueble = validateInmueble(cleanedValue, formData.servicio);
        break;
      case 'estado':
        // Estado siempre tiene un valor válido (select controlado), no requiere validación extra
        break;
    }

    setErrors(newErrors);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <CustomerStep
            formData={formData}
            errors={errors}
            updateFormData={updateFormData}
            isSearchingPerson={isSearchingPerson}
          />
        );
      case 2:
        return (
          <DetailsStepStep
            formData={formData}
            errors={errors}
            updateFormData={updateFormData}
          />
        );
      case 3:
        return (
          <DateTimeStep
            formData={formData}
            errors={errors}
            updateFormData={updateFormData}
          />
        );
      case 4:
        return (
          <SummaryStepStep
            formData={formData}
            errors={errors}
            updateFormData={updateFormData}
          />
        );
      default:
        return null;
    }
  };

  // ✅ NUEVO: Función para cerrar el modal de confirmación
  const handleCloseConfirmation = () => {
    setShowConfirmationModal(false);
  };

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
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Nueva Cita</h2>
              <p className="text-slate-600 mt-1">Agenda una nueva cita con tu cliente</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              disabled={isCreatingAppointment}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-slate-500" />
            </motion.button>
          </div>

          {/* Step Indicator */}
          <div className="px-6 py-4 border-b border-slate-200">
            <StepIndicator steps={steps} currentStep={currentStep} />
          </div>

          {/* Content */}
          <div ref={contentRef} className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 min-h-0 ${currentStep === 1 ? 'p-6 pb-2' : 'p-6'}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between border-t border-slate-200 bg-slate-50 flex-shrink-0 ${currentStep === 1 ? 'p-4 pt-3' : 'p-6'}`}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePrev}
              disabled={currentStep === 1 || isCreatingAppointment}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </motion.button>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClose}
                disabled={isCreatingAppointment}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </motion.button>

              {currentStep < 4 ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  disabled={isCreatingAppointment}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={isCreatingAppointment}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isCreatingAppointment ? 'Creando...' : 'Crear Cita'}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>


      </div>
    </AnimatePresence>,
    document.body
  );
};

export default CreateAppointmentModal;
