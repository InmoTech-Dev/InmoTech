import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Phone, Mail, Calendar, Clock, Home, FileText, Hash } from 'lucide-react';
import { useToast } from '../../../../shared/hooks/use-toast';
import { formatPhoneNumber } from '../../../../shared/utils/phoneFormatter';
import { formatTimeTo12Hour } from '../../../../shared/utils/time';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../shared/components/ui/select';
import ConfirmationDialog from '../../../../shared/components/ui/ConfirmationDialog';

const EditAppointmentModal = ({ isOpen, onClose, cita, onSubmit }) => {
  const [formData, setFormData] = useState({
    nombre: '',        // ✅ NUEVO: Campo separado para nombre
    apellido: '',      // ✅ NUEVO: Campo separado para apellido    telefono: '',
    email: '',
    tipoDocumento: '',
    numeroDocumento: '',
    fecha: '',
    hora: '',
    servicio: '',
    notas: '',
    estado: 'programada',
    // ✅ AGREGADO: IDs necesarios para el backend
    id: null,
    id_cita: null,
    id_servicio: null,
    id_inmueble: null,
    id_persona: null
  });


  const [errors, setErrors] = useState({});
  const [prevPhone, setPrevPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();
  const formRef = useRef(null);

  // Scroll to top when modal opens
  useEffect(() => {
    if (isOpen && formRef.current) {
      formRef.current.scrollTop = 0;
    }
  }, [isOpen]);

// ✅ Servicios con sus IDs según tu base de datos
const servicios = [
  { id_servicio: 1, nombre_servicio: 'Visita a Propiedad' },
  { id_servicio: 2, nombre_servicio: 'Avalúos' },
  { id_servicio: 3, nombre_servicio: 'Gestión de Alquileres' },
  { id_servicio: 4, nombre_servicio: 'Asesoría Legal' }
];

  const availableHours = useMemo(() => [
    '08:00 am', '08:30 am', '09:00 am', '09:30 am', '10:00 am', '10:30 am',
    '11:00 am', '11:30 am', '02:00 pm', '02:30 pm', '03:00 pm', '03:30 pm',
    '04:00 pm', '04:30 pm', '05:00 pm', '05:30 pm'
  ], []);

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

  const normalizeHoraToOption = (hora) => {
    if (!hora) return '';
    const formatted = formatTimeTo12Hour(hora);
    if (!formatted) return '';
    const [timePart = '', periodRaw = ''] = formatted.split(' ');
    const [hour = '00', minutes = '00'] = timePart.split(':');
    const period = periodRaw.replace(/[^a-z]/gi, '').toLowerCase();
    return `${hour.padStart(2, '0')}:${minutes.padStart(2, '0')} ${period || 'am'}`;
  };

  const horaAgendadaOpcion = useMemo(
    () => normalizeHoraToOption(cita?.hora_inicio || cita?.hora),
    [cita?.hora, cita?.hora_inicio]
  );

  const horaOptions = useMemo(() => {
    const base = [...availableHours];
    if (horaAgendadaOpcion && !base.includes(horaAgendadaOpcion)) {
      base.unshift(horaAgendadaOpcion);
    }
    return base;
  }, [availableHours, horaAgendadaOpcion]);

  useEffect(() => {
    if (cita) {
      const cliente = cita.cliente || {};
      const servicio = cita.servicio || {};
      const fechaNormalizada = normalizeFechaToInput(cita.fecha_cita || cita.fecha);
      const horaNormalizada = normalizeHoraToOption(cita.hora_inicio || cita.hora);

      setFormData({
        nombre: cliente.nombre_completo || '',
        apellido: cliente.apellido_completo || '',
        telefono: cliente.telefono || '',
        email: cliente.correo || '',
        tipoDocumento: cliente.tipo_documento || '',
        numeroDocumento: cliente.numero_documento || '',
        fecha: fechaNormalizada,
        hora: horaNormalizada,
        servicio: servicio.nombre_servicio || '',
        notas: cita.observaciones || '',
        estado: cita.estado?.toLowerCase() || cita.estado_detalle?.nombre_estado?.toLowerCase() || 'programada',
        id: cita.id_cita || cita.id,
        id_cita: cita.id_cita || cita.id,
        id_servicio: servicio.id_servicio || cita.id_servicio,
        id_inmueble: cita.id_inmueble,
        id_persona: cita.id_persona
      });
    }
  }, [cita]);
  
// ✅ Validación para nombre
const validateNombre = (nombre) => {
  if (!nombre.trim()) return 'El nombre es requerido';
  if (nombre.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
  if (nombre.trim().length > 50) return 'El nombre no puede tener más de 50 caracteres';
  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nombre.trim())) return 'El nombre solo puede contener letras y espacios';
  return '';
};

// ✅ NUEVA: Validación para apellido
const validateApellido = (apellido) => {
  if (!apellido.trim()) return 'El apellido es requerido';
  if (apellido.trim().length < 2) return 'El apellido debe tener al menos 2 caracteres';
  if (apellido.trim().length > 50) return 'El apellido no puede tener más de 50 caracteres';
  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(apellido.trim())) return 'El apellido solo puede contener letras y espacios';
  return '';
};

  // Función para validar teléfono colombiano
  const validateTelefono = (telefono) => {
    if (!telefono.trim()) return 'El teléfono es requerido';

    // Limpiar el teléfono para validación (remover espacios, guiones, paréntesis)
    const telefonoLimpio = telefono.replace(/[\s\-\(\)]/g, '');

    // Validar que tenga el formato correcto: +57 seguido de 10 dígitos o solo 10 dígitos
    if (!/^(\+57)?[3][0-9]{9}$/.test(telefonoLimpio)) {
      return 'El teléfono debe tener formato colombiano (+57 XXX XXX XXXX o 3XX XXX XXXX)';
    }

    return '';
  };

  // Función para validar email
  const validateEmail = (email) => {
    if (!email.trim()) return 'El email es requerido';

    const trimmedEmail = email.trim().toLowerCase();

    // Verificar si hay dominios duplicados (ej: email.comcom)
    const atIndex = trimmedEmail.lastIndexOf('@');
    if (atIndex === -1) return 'El email debe contener @';

    const domain = trimmedEmail.substring(atIndex + 1);
    const parts = domain.split('.');

    // Verificar si hay dominios duplicados
    if (parts.length >= 3) {
      for (let i = 0; i < parts.length - 1; i++) {
        if (parts[i] === parts[i + 1]) {
          return 'El email contiene dominios duplicados';
        }
      }
    }

    // Validar formato básico del email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) return 'Ingresa un email válido';

    // Verificar longitud
    if (email.length > 254) return 'El email es demasiado largo';

    // Verificar que no termine con punto
    if (trimmedEmail.endsWith('.')) return 'El email no puede terminar con punto';

    // Verificar que no tenga múltiples @ (solo el último @ es válido)
    const firstAtIndex = trimmedEmail.indexOf('@');
    if (firstAtIndex !== atIndex) return 'El email no puede contener múltiples @';

    return '';
  };

  // Función para validar tipo de documento
  const validateTipoDocumento = (tipoDocumento) => {
    if (!tipoDocumento) return 'El tipo de documento es requerido';
    return '';
  };

  // Función para validar número de documento
  const validateNumeroDocumento = (numeroDocumento, tipoDocumento) => {
    if (!numeroDocumento || !numeroDocumento.trim()) return 'El número de documento es requerido';

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

    const fechaNormalizada = normalizeFechaToInput(fecha);
    if (!fechaNormalizada) return 'Ingresa una fecha v??lida';

    const fechaSeleccionada = new Date(fechaNormalizada);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaSeleccionada < hoy) {
      // Solo advertir, no bloquear
    }

    return '';
  };

  // Función para validar hora (horario laboral)
  const validateHora = (hora) => {
    if (!hora) return 'La hora es requerida';

    const opcionNormalizada = normalizeHoraToOption(hora);
    if (!opcionNormalizada) return 'Selecciona una hora v??lida';
    if (!horaOptions.includes(opcionNormalizada)) return 'Selecciona una hora v??lida de la lista';

    return '';
  };

  // Función para validar servicio
  const validateServicio = (servicio) => {
    if (!servicio || servicio.trim() === '') {
      return 'El servicio es requerido';
    }
    
    // ✅ Verificar que el servicio existe en la lista de objetos
    const servicioExiste = servicios.some(s => s.nombre_servicio === servicio);
    if (!servicioExiste) {
      return 'Selecciona un servicio válido de la lista';
    }
    
    return '';
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // ✅ Validar nombre y apellido por separado
    newErrors.nombre = validateNombre(formData.nombre);
    newErrors.apellido = validateApellido(formData.apellido);
    
    newErrors.telefono = validateTelefono(formData.telefono);
    newErrors.email = validateEmail(formData.email);
    newErrors.tipoDocumento = validateTipoDocumento(formData.tipoDocumento);
    newErrors.numeroDocumento = validateNumeroDocumento(formData.numeroDocumento, formData.tipoDocumento);
    newErrors.fecha = validateFecha(formData.fecha);
    newErrors.hora = validateHora(formData.hora);
    newErrors.servicio = validateServicio(formData.servicio);
    
    setErrors(newErrors);
    
    const hasErrors = Object.values(newErrors).some(error => error !== '');
    return !hasErrors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting) return;

    if (!validateForm()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    // Mostrar confirmación antes de proceder
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmDialog(false);
    
    try {
      // ✅ Preparar datos en formato correcto para el backend
      const dataParaEnviar = {
        // IDs necesarios
        id: formData.id_cita || formData.id || cita?.id_cita || cita?.id,
        id_cita: formData.id_cita || formData.id || cita?.id_cita || cita?.id,
        id_persona: formData.id_persona || cita?.id_persona,
        id_inmueble: formData.id_inmueble ?? cita?.id_inmueble ?? null,
        id_servicio: formData.id_servicio || cita?.id_servicio || cita?.servicio?.id_servicio,
        
        // ✅ Datos del cliente - campos separados
        tipo_documento: formData.tipoDocumento,
        numero_documento: formData.numeroDocumento,
        nombre_completo: formData.nombre.trim(),      // ✅ Desde campo nombre
        apellido_completo: formData.apellido.trim(),  // ✅ Desde campo apellido
        telefono: formData.telefono,
        email: formData.email,
        
        // Datos de la cita
        fecha_cita: normalizeFechaToInput(formData.fecha),
        hora_inicio: normalizeHoraToOption(formData.hora),
        observaciones: formData.notas,
        estado: formData.estado,
        
        // Mantener objetos anidados si existen
        cliente: {
          ...cita?.cliente,
          nombre_completo: formData.nombre.trim(),
          apellido_completo: formData.apellido.trim(),
          telefono: formData.telefono,
          correo: formData.email,
          tipo_documento: formData.tipoDocumento,
          numero_documento: formData.numeroDocumento
        },
        servicio: cita?.servicio,
        inmueble: cita?.inmueble
      };
      
      console.log("📤 Datos a enviar al backend:", dataParaEnviar);
      
      const result = await onSubmit(dataParaEnviar);
      
        
      toast({
        title: "¡Cita actualizada exitosamente!",
        description: "Los cambios han sido guardados correctamente.",
        variant: "default"
      });
      handleClose();
    } catch (error) {
      toast({
        title: "Error al actualizar la cita",
        description: `No se pudo actualizar la cita. Error: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
  };

  const handleClose = () => {
    setErrors({});
    setPrevPhone('');
    onClose();
  };

  const handlePhoneChange = (e) => {
    const newValue = e.target.value;
    const formatted = formatPhoneNumber(newValue, prevPhone, false);
    setPrevPhone(formatted);
    updateFormData('telefono', formatted);
  };

  const handlePhoneKeyDown = (e) => {
    if (e.key === 'Backspace') {
      const formatted = formatPhoneNumber(
        formData.telefono.slice(0, -1),
        formData.telefono,
        true
      );
      setPrevPhone(formatted);
      updateFormData('telefono', formatted);
      e.preventDefault();
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validación en tiempo real
    const newErrors = { ...errors };
    switch (field) {
      case 'nombre':  // ✅ CAMBIADO
        newErrors.nombre = validateNombre(value);
        break;
      case 'apellido':  // ✅ NUEVO
        newErrors.apellido = validateApellido(value);
        break;
      case 'telefono':
        newErrors.telefono = validateTelefono(value);
        break;
      case 'email':
        newErrors.email = validateEmail(value);
        break;
      case 'tipoDocumento':
        newErrors.tipoDocumento = validateTipoDocumento(value);
        if (formData.numeroDocumento) {
          newErrors.numeroDocumento = validateNumeroDocumento(formData.numeroDocumento, value);
        }
        break;
      case 'numeroDocumento':
        newErrors.numeroDocumento = validateNumeroDocumento(value, formData.tipoDocumento);
        break;
      case 'fecha':
        newErrors.fecha = validateFecha(value);
        break;
      case 'hora':
        newErrors.hora = validateHora(value);
        break;
      case 'servicio':
        newErrors.servicio = validateServicio(value);
        break;
    }
    
    setErrors(newErrors);
  };
  
  if (!isOpen || !cita) return null;

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
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Editar Cita</h2>
              <p className="text-slate-600 mt-1">Modifica la información de la cita</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </motion.button>
          </div>

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 min-h-0">
            <div className="space-y-6">
              {/* Cliente Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{/* Nombre y Apellido */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Nombre */}
  <div>
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
      <User className="w-4 h-4 text-slate-500" />
      Nombre *
    </label>
    <input
      type="text"
      value={formData.nombre}
      onChange={(e) => updateFormData('nombre', e.target.value)}
      placeholder="Ej: Juan"
      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
        errors.nombre ? 'border-red-500' : 'border-slate-300'
      }`}
    />
    {errors.nombre && (
      <span className="text-red-500 text-xs mt-1 block">{errors.nombre}</span>
    )}
  </div>

  {/* Apellido */}
  <div>
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
      <User className="w-4 h-4 text-slate-500" />
      Apellido *
    </label>
    <input
      type="text"
      value={formData.apellido}
      onChange={(e) => updateFormData('apellido', e.target.value)}
      placeholder="Ej: Pérez"
      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
        errors.apellido ? 'border-red-500' : 'border-slate-300'
      }`}
    />
    {errors.apellido && (
      <span className="text-red-500 text-xs mt-1 block">{errors.apellido}</span>
    )}
  </div>
</div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={handlePhoneChange}
                    onKeyDown={handlePhoneKeyDown}
                    placeholder="+57 300 123 4567"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                      errors.telefono ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.telefono && (
                    <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                    errors.email ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Tipo de Documento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Tipo de Documento *
                </label>
                <Select
                  value={formData.tipoDocumento}
                  onValueChange={(value) => updateFormData('tipoDocumento', value)}
                >
                  <SelectTrigger
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                      errors.tipoDocumento ? 'border-red-500' : 'border-slate-300'
                    }`}
                  >
                    <SelectValue placeholder="Seleccionar tipo de documento" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                    <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                    <SelectItem value="NIT">NIT</SelectItem>
                    <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                    <SelectItem value="TI">Tarjeta de Identidad (TI)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipoDocumento && (
                  <p className="text-red-500 text-sm mt-1">{errors.tipoDocumento}</p>
                )}
              </div>

              {/* Número de Documento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Hash className="w-4 h-4 inline mr-2" />
                  Número de Documento *
                </label>
                <input
                  type="text"
                  value={formData.numeroDocumento}
                  onChange={(e) => updateFormData('numeroDocumento', e.target.value)}
                  onKeyDown={(e) => {
                    const allowedKeys = [
                      '0','1','2','3','4','5','6','7','8','9',
                      ' ','-','.',
                      'Backspace','Tab','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete'
                    ];
                    if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Ej: 12345678"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                    errors.numeroDocumento ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.numeroDocumento && (
                  <p className="text-red-500 text-sm mt-1">{errors.numeroDocumento}</p>
                )}
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => updateFormData('fecha', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                      errors.fecha ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.fecha && (
                    <p className="text-red-500 text-sm mt-1">{errors.fecha}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Hora *
                  </label>
                  <Select
                    value={formData.hora}
                    onValueChange={(value) => updateFormData('hora', value)}
                  >
                    <SelectTrigger
                      className={errors.hora ? 'border-red-500' : ''}
                    >
                      <SelectValue placeholder="Selecciona una hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {horaOptions.map(hour => (
                        <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.hora && (
                    <p className="text-red-500 text-sm mt-1">{errors.hora}</p>
                  )}
                </div>
              </div>

              {/* Servicio */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Home className="w-4 h-4 inline mr-2" />
                  Servicio *
                </label>
                <Select 
                  value={formData.servicio} 
                  onValueChange={(value) => {
                    // ✅ Encontrar el servicio seleccionado para obtener su ID
                    const servicioSeleccionado = servicios.find(s => s.nombre_servicio === value);
                    updateFormData('servicio', value);
                    setFormData(prev => ({ ...prev, id_servicio: servicioSeleccionado?.id_servicio || prev.id_servicio || cita?.id_servicio || cita?.servicio?.id_servicio || null }));
                  }}
                >
                  <SelectTrigger className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                    errors.servicio ? 'border-red-500' : 'border-slate-300'
                  }`}>
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicios.map((servicio) => (
                      <SelectItem 
                        key={servicio.id_servicio} 
                        value={servicio.nombre_servicio} // ✅ Valor es string
                      >
                        {servicio.nombre_servicio} {/* ✅ Solo texto */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.servicio && (
                  <p className="text-red-500 text-sm mt-1">{errors.servicio}</p>
                )}
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Estado de la Cita
                </label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => updateFormData('estado', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="programada">Programada</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="solicitada">Solicitada</SelectItem>
                    <SelectItem value="re agendada">Re Agendada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" /> Observaciones </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => updateFormData('notas', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors resize-none"
                />
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                isSubmitting
                  ? 'bg-green-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </motion.button>
          </div>
        </motion.div>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showConfirmDialog}
          onClose={handleCancelConfirm}
          onConfirm={handleConfirmSubmit}
          title="Confirmar cambios"
          message="¿Estás seguro de que deseas guardar los cambios realizados en esta cita?"
          confirmText="Confirmar"
          cancelText="Cancelar"
          isLoading={isSubmitting}
          variant="warning"
        />
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default EditAppointmentModal;




