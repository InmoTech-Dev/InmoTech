import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, User, Phone, Mail, Calendar, Clock, FileText, Hash, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useToast } from '../../../../shared/hooks/use-toast';
import { formatPhoneNumber } from '../../../../shared/utils/phoneFormatter';
import { formatTimeTo12Hour } from '../../../../shared/utils/time';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../shared/components/ui/select';
import ConfirmationDialog from '../../../../shared/components/ui/ConfirmationDialog';
import DetailsStep from './steps/DetailsStep';

const servicios = [
  { id_servicio: 1, nombre_servicio: 'Visita a Propiedad' },
  { id_servicio: 2, nombre_servicio: 'Aval\u00FAos' },
  { id_servicio: 3, nombre_servicio: 'Gesti\u00F3n de Alquileres' },
  { id_servicio: 4, nombre_servicio: 'Asesor\u00EDa Legal' }
];
const documentTypeOptions = [
  { value: 'CC', label: 'CC - Cedula de Ciudadania' },
  { value: 'CE', label: 'CE - Cedula de Extranjeria' },
  { value: 'TI', label: 'TI - Tarjeta de Identidad' },
  { value: 'PASAPORTE', label: 'PASAPORTE - Pasaporte' },
  { value: 'NIT', label: 'NIT - NIT' }
];

const normalizeText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const getServicioIdFromNombre = (nombreServicio = '') => {
  const target = normalizeText(nombreServicio);
  const found = servicios.find((servicio) => normalizeText(servicio.nombre_servicio) === target);
  return found?.id_servicio || null;
};

const EditAppointmentModal = ({ isOpen, onClose, cita, onSubmit }) => {
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', telefono: '', email: '', tipoDocumento: '', numeroDocumento: '',
    fecha: '', hora: '', servicio: '', notas: '', estado: 'programada',
    inmueble_label: '',
    id: null, id_cita: null, id_servicio: null, id_inmueble: null, id_persona: null
  });
  const [errors, setErrors] = useState({});
  const [prevPhone, setPrevPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();

  const availableHours = useMemo(() => [
    '08:00 am', '08:30 am', '09:00 am', '09:30 am', '10:00 am', '10:30 am',
    '11:00 am', '11:30 am', '12:00 pm', '12:30 pm', 
    '02:00 pm', '02:30 pm', '03:00 pm', '03:30 pm',
    '04:00 pm', '04:30 pm'
  ], []);

  const normalizeFechaToInput = (fecha) => {
    if (!fecha) return '';
    if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) return fecha.toISOString().split('T')[0];
    if (typeof fecha === 'string') {
      const clean = fecha.includes('T') ? fecha.split('T')[0] : fecha;
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
      const parsed = new Date(clean);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    }
    return '';
  };

  const normalizeHoraToOption = (hora) => {
    if (!hora) return '';

    // Si es un objeto Date o una cadena ISO, extraer componentes locales
    if (typeof hora === 'object' || (typeof hora === 'string' && hora.includes('T'))) {
      const date = new Date(hora);
      if (!isNaN(date.getTime())) {
        const h = date.getHours();
        const m = date.getMinutes();
        const isPM = h >= 12;
        const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
        return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${isPM ? 'pm' : 'am'}`;
      }
    }

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
    let base = [...availableHours];

    // Filtrar si es el día de hoy (margen de 2 horas)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isToday = formData.fecha === todayStr;

    if (isToday) {
      const currentTotalMinutes = today.getHours() * 60 + today.getMinutes();

      base = base.filter(time12 => {
        // Convertir formato 12h a minutos
        const [timePart, period] = time12.split(' ');
        let [h, m] = timePart.split(':').map(Number);
        if (period === 'pm' && h !== 12) h += 12;
        if (period === 'am' && h === 12) h = 0;

        const appointmentTotalMinutes = h * 60 + m;
        return (appointmentTotalMinutes - currentTotalMinutes) >= 120;
      });
    }

    // Siempre incluir la hora agendada originalmente si la fecha coincide con la de la cita
    const originalDate = normalizeFechaToInput(cita?.fecha_cita || cita?.fecha);
    if (horaAgendadaOpcion && !base.includes(horaAgendadaOpcion) && formData.fecha === originalDate) {
      base.unshift(horaAgendadaOpcion);
      // Opcional: ordenar base si es necesario, pero unshift suele ser suficiente para "mantener la seleccion actual"
    }

    return base;
  }, [availableHours, horaAgendadaOpcion, formData.fecha, cita?.fecha_cita, cita?.fecha]);

  useEffect(() => {
    if (!cita) return;
    const cliente = cita.cliente || {};
    const servicio = cita.servicio || {};
    setCurrentStep(1);
    setShowConfirmDialog(false);
    setErrors({});
    setFormData({
      nombre: cliente.nombre_completo || '',
      apellido: cliente.apellido_completo || '',
      telefono: cliente.telefono || '',
      email: cliente.correo || '',
      tipoDocumento: cliente.tipo_documento || '',
      numeroDocumento: cliente.numero_documento || '',
      fecha: normalizeFechaToInput(cita.fecha_cita || cita.fecha),
      hora: normalizeHoraToOption(cita.hora_inicio || cita.hora),
      servicio: servicio.nombre_servicio || '',
      notas: cita.observaciones || '',
      estado: cita.estado?.toLowerCase() || cita.estado_detalle?.nombre_estado?.toLowerCase() || 'programada',
      inmueble_label: cita?.inmueble?.titulo || cita?.inmueble?.direccion || '',
      id: cita.id_cita || cita.id,
      id_cita: cita.id_cita || cita.id,
      id_servicio: servicio.id_servicio || cita.id_servicio,
      id_inmueble: cita.id_inmueble,
      id_persona: cita.id_persona
    });
  }, [cita]);

  const validateNombre = (v) => (!v.trim() ? 'El nombre es requerido' : (v.trim().length < 2 ? 'El nombre debe tener al menos 2 caracteres' : (v.trim().length > 50 ? 'El nombre no puede tener mas de 50 caracteres' : (!/^[A-Za-z\u00C0-\u017F\s]+$/.test(v.trim()) ? 'El nombre solo puede contener letras y espacios' : ''))));
  const validateApellido = (v) => (!v.trim() ? 'El apellido es requerido' : (v.trim().length < 2 ? 'El apellido debe tener al menos 2 caracteres' : (v.trim().length > 50 ? 'El apellido no puede tener mas de 50 caracteres' : (!/^[A-Za-z\u00C0-\u017F\s]+$/.test(v.trim()) ? 'El apellido solo puede contener letras y espacios' : ''))));
  const validateTelefono = (v) => (!v.trim() ? 'El telefono es requerido' : (!/^(\+57)?[3][0-9]{9}$/.test(v.replace(/[\s\-\(\)]/g, '')) ? 'El telefono debe tener formato colombiano (+57 XXX XXX XXXX o 3XX XXX XXXX)' : ''));
  const validateEmail = (email) => {
    if (!email.trim()) return 'El email es requerido';
    const trimmed = email.trim().toLowerCase();
    const at = trimmed.lastIndexOf('@');
    if (at === -1) return 'El email debe contener @';
    const domain = trimmed.substring(at + 1);
    const parts = domain.split('.');
    if (parts.length >= 3) {
      for (let i = 0; i < parts.length - 1; i += 1) {
        if (parts[i] === parts[i + 1]) return 'El email contiene dominios duplicados';
      }
    }
    const firstAt = trimmed.indexOf('@');
    if (firstAt !== at) return 'El email no puede contener multiples @';
    if (email.length > 254) return 'El email es demasiado largo';
    if (trimmed.endsWith('.')) return 'El email no puede terminar con punto';
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) return 'Ingresa un email valido';
    return '';
  };
  const validateTipoDocumento = (v) => (!v ? 'El tipo de documento es requerido' : '');
  const validateNumeroDocumento = (v, t) => {
    if (!v || !v.trim()) return 'El numero de documento es requerido';
    const n = v.replace(/[\s\-.]/g, '');
    if (t === 'CC' && !/^[0-9]{8,10}$/.test(n)) return 'La cedula debe tener entre 8 y 10 digitos';
    if (t === 'CE' && !/^[0-9]{6,10}$/.test(n)) return 'La cedula de extranjeria debe tener entre 6 y 10 digitos';
    if (t === 'NIT' && !/^[0-9]{8,10}$/.test(n)) return 'El NIT debe tener entre 8 y 10 digitos';
    if (t === 'TI' && !/^[0-9]{10,11}$/.test(n)) return 'La tarjeta de identidad debe tener 10 u 11 digitos';
    if (t === 'PASAPORTE' && (!/^[A-Za-z0-9]+$/.test(n) || n.length < 6 || n.length > 20)) return 'El pasaporte debe tener entre 6 y 20 caracteres alfanumericos';
    return '';
  };
  const validateFecha = (v) => (!v ? 'La fecha es requerida' : (normalizeFechaToInput(v) ? '' : 'Ingresa una fecha valida'));
  const validateHora = (v) => {
    if (!v) return 'La hora es requerida';
    const n = normalizeHoraToOption(v);
    if (!n) return 'Selecciona una hora valida';
    return horaOptions.includes(n) ? '' : 'Las citas solo se pueden agendar entre las 8:00 am - 1:00 pm y 2:00 pm - 5:00 pm';
  };
  const validateServicio = (v) => {
    if (!v || v.trim() === '') return 'El servicio es requerido';
    const serviceId = getServicioIdFromNombre(v);
    return serviceId ? '' : 'Selecciona un servicio valido de la lista';
  };
  const validateInmueble = (idInmueble, servicioNombre) => {
    const serviceId = getServicioIdFromNombre(servicioNombre);
    if (serviceId === 1 && !idInmueble) return 'Selecciona un inmueble para este servicio';
    return '';
  };

  const applyStepValidation = (step) => {
    const e = {};
    if (step === 1) {
      e.nombre = validateNombre(formData.nombre);
      e.apellido = validateApellido(formData.apellido);
      e.telefono = validateTelefono(formData.telefono);
      e.email = validateEmail(formData.email);
      e.tipoDocumento = validateTipoDocumento(formData.tipoDocumento);
      e.numeroDocumento = validateNumeroDocumento(formData.numeroDocumento, formData.tipoDocumento);
    } else {
      e.fecha = validateFecha(formData.fecha);
      e.hora = validateHora(formData.hora);
      e.servicio = validateServicio(formData.servicio);
      e.id_inmueble = validateInmueble(formData.id_inmueble, formData.servicio);
    }
    setErrors((prev) => ({ ...prev, ...e }));
    return Object.values(e).every((x) => x === '');
  };

  const validateForm = () => applyStepValidation(1) && applyStepValidation(2);

  const updateFormData = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'servicio') {
        const nextServicioId = getServicioIdFromNombre(value);
        const prevServicioId = getServicioIdFromNombre(prev.servicio);

        if (nextServicioId !== prevServicioId) {
          next.hora = '';
        }

        next.id_servicio = nextServicioId || prev.id_servicio || null;

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
    const next = { ...errors };
    switch (field) {
      case 'nombre': next.nombre = validateNombre(value); break;
      case 'apellido': next.apellido = validateApellido(value); break;
      case 'telefono': next.telefono = validateTelefono(value); break;
      case 'email': next.email = validateEmail(value); break;
      case 'tipoDocumento':
        next.tipoDocumento = validateTipoDocumento(value);
        if (formData.numeroDocumento) next.numeroDocumento = validateNumeroDocumento(formData.numeroDocumento, value);
        break;
      case 'numeroDocumento': next.numeroDocumento = validateNumeroDocumento(value, formData.tipoDocumento); break;
      case 'fecha': next.fecha = validateFecha(value); break;
      case 'hora': next.hora = validateHora(value); break;
      case 'servicio':
        next.servicio = validateServicio(value);
        next.id_inmueble = validateInmueble(formData.id_inmueble, value);
        break;
      case 'id_inmueble':
        next.id_inmueble = validateInmueble(value, formData.servicio);
        break;
      default: break;
    }
    setErrors(next);
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value, prevPhone, false);
    setPrevPhone(formatted);
    updateFormData('telefono', formatted);
  };

  const handlePhoneKeyDown = (e) => {
    if (e.key !== 'Backspace') return;
    const formatted = formatPhoneNumber(formData.telefono.slice(0, -1), formData.telefono, true);
    setPrevPhone(formatted);
    updateFormData('telefono', formatted);
    e.preventDefault();
  };

  const handleNext = () => {
    if (isSubmitting) return;
    if (applyStepValidation(1)) {
      setShowConfirmDialog(false);
      setCurrentStep(2);
      return;
    }
    toast({ title: 'Campos requeridos', description: 'Completa correctamente los datos del cliente para continuar.', variant: 'destructive' });
  };

  const handlePrev = () => {
    if (isSubmitting) return;
    setCurrentStep(1);
  };

  const handleFinalSubmit = (e) => {
    if (e) e.preventDefault();
    if (currentStep !== 2) return;
    if (isSubmitting) return;
    if (!validateForm()) {
      toast({ title: 'Campos requeridos', description: 'Por favor completa todos los campos obligatorios', variant: 'destructive' });
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentStep !== 2) return;
    handleFinalSubmit();
  };

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirmDialog(false);
    try {
      const dataParaEnviar = {
        id: formData.id_cita || formData.id || cita?.id_cita || cita?.id,
        id_cita: formData.id_cita || formData.id || cita?.id_cita || cita?.id,
        id_persona: formData.id_persona || cita?.id_persona,
        id_inmueble: formData.id_inmueble ?? cita?.id_inmueble ?? null,
        id_servicio: formData.id_servicio || cita?.id_servicio || cita?.servicio?.id_servicio,
        tipo_documento: formData.tipoDocumento,
        numero_documento: formData.numeroDocumento,
        nombre_completo: formData.nombre.trim(),
        apellido_completo: formData.apellido.trim(),
        telefono: formData.telefono,
        email: formData.email,
        fecha_cita: normalizeFechaToInput(formData.fecha),
        hora_inicio: normalizeHoraToOption(formData.hora),
        observaciones: formData.notas,
        estado: formData.estado,
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
      await onSubmit(dataParaEnviar);
      toast({ title: 'Cita actualizada exitosamente', description: 'Los cambios han sido guardados correctamente.', variant: 'default' });
      handleClose();
    } catch (error) {
      toast({ title: 'Error al actualizar la cita', description: `No se pudo actualizar la cita. Error: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setErrors({});
    setPrevPhone('');
    setCurrentStep(1);
    setShowConfirmDialog(false);
    onClose();
  };

  const inputClass = (err) => `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${err ? 'border-red-500' : 'border-slate-300'}`;

  if (!isOpen || !cita) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10100]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        <div className="relative min-h-full flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6 max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Editar Cita</h2>
                <p className="text-slate-600 mt-1">Modifica la informacion de la cita</p>
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

            <div className="px-5 py-4 md:px-6 border-b border-slate-200">
              <div className="relative">
                <div className="absolute top-5 left-6 right-6 h-0.5 bg-slate-200" />
                <div
                  className="absolute top-5 left-6 h-0.5 bg-blue-500 transition-all duration-300"
                  style={{ width: currentStep === 2 ? 'calc(100% - 3rem)' : '0%' }}
                />
                <div className="relative flex items-center justify-between">
                  {[
                    { step: 1, label: 'Cliente', icon: User },
                    { step: 2, label: 'Cita', icon: Calendar }
                  ].map(({ step, label, icon: Icon }) => {
                    const isActive = currentStep === step;
                    const isCompleted = currentStep > step;
                    return (
                      <div key={step} className="flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white transition-colors ${isActive ? 'border-blue-600 text-blue-600' : isCompleted ? 'border-green-600 text-green-600' : 'border-slate-300 text-slate-400'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-xs font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-slate-500'}`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <form
              id="edit-appointment-form"
              onSubmit={handleSubmit}
              data-edit-appointment-content="true"
              className="flex-1 min-h-0 p-5 md:p-6 overflow-y-auto"
            >
              <AnimatePresence mode="wait">
                {currentStep === 1 ? (
                  <motion.div
                    key="step-cliente"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <h3 className="text-sm font-semibold text-slate-800 mb-1">Datos del cliente</h3>
                      <p className="text-xs text-slate-500">Completa la informacion de contacto y documento.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2"><FileText className="w-4 h-4 inline mr-2" />Tipo de Documento *</label>
                        <Select value={formData.tipoDocumento} onValueChange={(value) => updateFormData('tipoDocumento', value)}>
                          <SelectTrigger className={inputClass(errors.tipoDocumento)}><SelectValue placeholder="Seleccionar tipo de documento" /></SelectTrigger>
                          <SelectContent
                            className="z-[10001]"
                            constrainToBoundary={true}
                            boundarySelector='[data-edit-appointment-content="true"]'
                            bottomOffset={80}
                          >
                            {documentTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.tipoDocumento && <p className="text-red-500 text-sm mt-1">{errors.tipoDocumento}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2"><Hash className="w-4 h-4 inline mr-2" />Numero de Documento *</label>
                        <input
                          type="text"
                          value={formData.numeroDocumento}
                          onChange={(e) => updateFormData('numeroDocumento', e.target.value)}
                          onKeyDown={(e) => {
                            const allowed = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '-', '.', 'Backspace', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete'];
                            if (!allowed.includes(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
                          }}
                          placeholder="Ej: 12345678"
                          className={inputClass(errors.numeroDocumento)}
                        />
                        {errors.numeroDocumento && <p className="text-red-500 text-sm mt-1">{errors.numeroDocumento}</p>}
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2"><User className="w-4 h-4 text-slate-500" />Nombre *</label>
                        <input type="text" value={formData.nombre} onChange={(e) => updateFormData('nombre', e.target.value)} placeholder="Ej: Juan" className={inputClass(errors.nombre)} />
                        {errors.nombre && <span className="text-red-500 text-xs mt-1 block">{errors.nombre}</span>}
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2"><User className="w-4 h-4 text-slate-500" />Apellido *</label>
                        <input type="text" value={formData.apellido} onChange={(e) => updateFormData('apellido', e.target.value)} placeholder="Ej: Perez" className={inputClass(errors.apellido)} />
                        {errors.apellido && <span className="text-red-500 text-xs mt-1 block">{errors.apellido}</span>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2"><Phone className="w-4 h-4 inline mr-2" />Telefono *</label>
                        <input type="tel" value={formData.telefono} onChange={handlePhoneChange} onKeyDown={handlePhoneKeyDown} placeholder="+57 300 123 4567" className={inputClass(errors.telefono)} />
                        {errors.telefono && <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2"><Mail className="w-4 h-4 inline mr-2" />Email *</label>
                        <input type="email" value={formData.email} onChange={(e) => updateFormData('email', e.target.value)} className={inputClass(errors.email)} />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-cita"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <h3 className="text-sm font-semibold text-slate-800 mb-1">Datos de la cita</h3>
                      <p className="text-xs text-slate-500">Ajusta horario, servicio, estado y observaciones.</p>
                    </div>

                    <DetailsStep
                      formData={formData}
                      errors={errors}
                      updateFormData={updateFormData}
                      showHeader={false}
                      showNotes={false}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Estado de la Cita</label>
                        <Select value={formData.estado} onValueChange={(value) => updateFormData('estado', value)}>
                          <SelectTrigger><SelectValue placeholder="Selecciona un estado" /></SelectTrigger>
                          <SelectContent
                            className="z-[10001]"
                            constrainToBoundary={true}
                            boundarySelector='[data-edit-appointment-content="true"]'
                            bottomOffset={92}
                            maxListHeight={220}
                          >
                            <SelectItem value="programada">Programada</SelectItem>
                            <SelectItem value="confirmada">Confirmada</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                            <SelectItem value="completada">Completada</SelectItem>
                            <SelectItem value="solicitada">Solicitada</SelectItem>
                            <SelectItem value="re agendada">Re Agendada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2"><Calendar className="w-4 h-4 inline mr-2" />Fecha *</label>
                        <input type="date" value={formData.fecha} onChange={(e) => updateFormData('fecha', e.target.value)} className={inputClass(errors.fecha)} />
                        {errors.fecha && <p className="text-red-500 text-sm mt-1">{errors.fecha}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2"><Clock className="w-4 h-4 inline mr-2" />Hora *</label>
                        <Select value={formData.hora} onValueChange={(value) => updateFormData('hora', value)}>
                          <SelectTrigger className={errors.hora ? 'border-red-500' : ''}><SelectValue placeholder="Selecciona una hora" /></SelectTrigger>
                          <SelectContent
                            constrainToBoundary={true}
                            boundarySelector='[data-edit-appointment-content="true"]'
                            bottomOffset={92}
                          >
                            {horaOptions.map((hour) => <SelectItem key={hour} value={hour}>{hour}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {errors.hora && <p className="text-red-500 text-sm mt-1">{errors.hora}</p>}
                      </div>
                    </div>

                    <div className="mt-1">
                      <label className="block text-sm font-medium text-slate-700 mb-2"><FileText className="w-4 h-4 inline mr-2" />Observaciones</label>
                      <textarea value={formData.notas} onChange={(e) => updateFormData('notas', e.target.value)} rows={4} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors resize-none" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            <div className="flex items-center justify-between gap-3 p-4 md:p-6 border-t border-slate-200 bg-slate-50 flex-shrink-0">
              <div>
                {currentStep === 2 && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handlePrev} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />Anterior
                  </motion.button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleClose} disabled={isSubmitting} className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Cancelar</motion.button>
                {currentStep === 1 ? (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleNext} type="button" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Siguiente<ChevronRight className="w-4 h-4" />
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFinalSubmit}
                    type="button"
                    disabled={isSubmitting}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${isSubmitting ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white`}
                  >
                    <Save className="w-4 h-4" />{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          <ConfirmationDialog
            isOpen={showConfirmDialog}
            onClose={() => {
              if (isSubmitting) return;
              setShowConfirmDialog(false);
            }}
            onConfirm={handleConfirmSubmit}
            title="Confirmar cambios"
            message="Estas seguro de que deseas guardar los cambios realizados en esta cita?"
            confirmText="Confirmar"
            cancelText="Cancelar"
            isLoading={isSubmitting}
            variant="warning"
          />
        </div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default EditAppointmentModal;
