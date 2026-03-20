import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Briefcase, CheckCircle, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import StepIndicator from '../StepIndicator';
import PersonalStep from './steps/PersonalStep';
import LaboralStep from './steps/LaboralStep';
import RoleStep from './steps/RoleStep';
import SummaryStep from './steps/SummaryStep';
import { useToast } from '../../../../shared/hooks/use-toast';
import { useAdministrativos } from '../../../../shared/contexts/AdministrativosContext';
import administrativosApiService from '../../../../shared/services/administrativosApiService';

const CreateAdministrativoModal = ({ isOpen, onClose }) => {
  const DUPLICATE_DOCUMENT_ERROR = 'Ya existe un administrativo con este tipo y numero de documento';
  const DUPLICATE_EMAIL_ERROR = 'Ya existe un administrativo con este correo electronico';
  const DEBOUNCE_MS = 600;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    tipoDocumento: '',
    numeroDocumento: '',
    nombreCompleto: '',
    apellidoCompleto: '',
    email: '',
    telefono: '',
    fechaIngreso: '',
    rol: '',
    rolNombre: '',
    estado: 'programada'
  });
  const [errors, setErrors] = useState({});
  const [isCheckingEmailDuplicate, setIsCheckingEmailDuplicate] = useState(false);
  const [isCheckingDocumentoDuplicate, setIsCheckingDocumentoDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { createAdministrativo } = useAdministrativos();
  const contentRef = useRef(null);
  const emailDebounceRef = useRef(null);
  const documentoDebounceRef = useRef(null);
  const emailRequestIdRef = useRef(0);
  const documentoRequestIdRef = useRef(0);
  const isNoScrollStep = currentStep === 3 || currentStep === 4;

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentStep]);

  useEffect(() => () => {
    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
    }
    if (documentoDebounceRef.current) {
      clearTimeout(documentoDebounceRef.current);
    }
  }, []);

  const normalizeDocumentoNumero = (numeroDocumento = '') => numeroDocumento.replace(/[\s\-\.]/g, '').trim();
  const normalizeEmail = (email = '') => email.trim().toLowerCase();

  const setFieldError = (field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldErrorIfMatches = (field, message) => {
    setErrors((prev) => {
      if (prev[field] !== message) return prev;
      const nextErrors = { ...prev };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const isBlockingIdentityError = (message = '') => {
    const normalizedMessage = String(message || '').toLowerCase();
    return (
      normalizedMessage.includes('administrativo') ||
      normalizedMessage.includes('no es administrativa') ||
      normalizedMessage.includes('pertenecen a personas diferentes')
    );
  };

  const hasDuplicateErrors = () =>
    isBlockingIdentityError(errors.numeroDocumento) || isBlockingIdentityError(errors.email);

  const getApiErrorMessage = (error) => (
    error?.response?.data?.message ||
    error?.message ||
    'No se pudo registrar el administrativo. Por favor, intenta nuevamente.'
  );

  const mapBackendErrorToFieldErrors = (message) => {
    const normalizedMessage = String(message || '').toLowerCase();
    const nextFieldErrors = {};

    if (normalizedMessage.includes('documento y el correo pertenecen a personas diferentes')) {
      nextFieldErrors.numeroDocumento = 'El documento pertenece a una persona diferente al correo';
      nextFieldErrors.email = 'El correo pertenece a una persona diferente al documento';
      return nextFieldErrors;
    }

    if (normalizedMessage.includes('documento y correo')) {
      nextFieldErrors.numeroDocumento = message;
      nextFieldErrors.email = message;
      return nextFieldErrors;
    }

    if (normalizedMessage.includes('tipo y numero de documento')) {
      nextFieldErrors.numeroDocumento = message;
    }

    if (normalizedMessage.includes('correo electronico') || normalizedMessage.includes('correo')) {
      nextFieldErrors.email = message;
    }

    return nextFieldErrors;
  };

  const checkDocumentoDuplicateRealtime = async (tipoDocumentoInput, numeroDocumentoInput) => {
    const tipoDocumentoValue = (tipoDocumentoInput || '').trim().toUpperCase();
    const numeroDocumentoValue = numeroDocumentoInput || '';
    const numeroLimpio = normalizeDocumentoNumero(numeroDocumentoValue);
    const tipoError = validateTipoDocumento(tipoDocumentoInput);
    const numeroError = validateNumeroDocumento(numeroDocumentoValue, tipoDocumentoInput);

    if (!tipoDocumentoValue || !numeroLimpio || tipoError || numeroError) {
      documentoRequestIdRef.current += 1;
      setIsCheckingDocumentoDuplicate(false);
      clearFieldErrorIfMatches('numeroDocumento', DUPLICATE_DOCUMENT_ERROR);
      return true;
    }

    const requestId = ++documentoRequestIdRef.current;
    setIsCheckingDocumentoDuplicate(true);

    try {
      const response = await administrativosApiService.verificarDocumentoAdministrativoExistente(tipoDocumentoValue, numeroLimpio);
      if (requestId !== documentoRequestIdRef.current) return true;

      const existe = Boolean(response?.data?.data?.existe ?? response?.data?.existe);

      if (existe) {
        setFieldError('numeroDocumento', DUPLICATE_DOCUMENT_ERROR);
        return false;
      }

      clearFieldErrorIfMatches('numeroDocumento', DUPLICATE_DOCUMENT_ERROR);
      return true;
    } catch (error) {
      if (requestId !== documentoRequestIdRef.current) return true;
      console.error('Error verificando duplicado de documento:', error);
      return true;
    } finally {
      if (requestId === documentoRequestIdRef.current) {
        setIsCheckingDocumentoDuplicate(false);
      }
    }
  };

  const checkEmailDuplicateRealtime = async (emailInput) => {
    const emailValue = emailInput || '';
    const normalized = normalizeEmail(emailValue);
    const emailError = validateEmail(emailValue);

    if (!normalized || emailError) {
      emailRequestIdRef.current += 1;
      setIsCheckingEmailDuplicate(false);
      clearFieldErrorIfMatches('email', DUPLICATE_EMAIL_ERROR);
      return true;
    }

    const requestId = ++emailRequestIdRef.current;
    setIsCheckingEmailDuplicate(true);

    try {
      const response = await administrativosApiService.verificarCorreoAdministrativoExistente(normalized);
      if (requestId !== emailRequestIdRef.current) return true;

      const existe = Boolean(response?.data?.data?.existe ?? response?.data?.existe);

      if (existe) {
        setFieldError('email', DUPLICATE_EMAIL_ERROR);
        return false;
      }

      clearFieldErrorIfMatches('email', DUPLICATE_EMAIL_ERROR);
      return true;
    } catch (error) {
      if (requestId !== emailRequestIdRef.current) return true;
      console.error('Error verificando duplicado de email:', error);
      return true;
    } finally {
      if (requestId === emailRequestIdRef.current) {
        setIsCheckingEmailDuplicate(false);
      }
    }
  };

  const scheduleDocumentoDuplicateCheck = (tipoDocumentoValue, numeroDocumentoValue) => {
    if (documentoDebounceRef.current) {
      clearTimeout(documentoDebounceRef.current);
    }

    const tipoError = validateTipoDocumento(tipoDocumentoValue);
    const numeroError = validateNumeroDocumento(numeroDocumentoValue || '', tipoDocumentoValue);
    const numeroLimpio = normalizeDocumentoNumero(numeroDocumentoValue || '');

    if (tipoError || numeroError || !tipoDocumentoValue || !numeroLimpio) {
      documentoRequestIdRef.current += 1;
      setIsCheckingDocumentoDuplicate(false);
      clearFieldErrorIfMatches('numeroDocumento', DUPLICATE_DOCUMENT_ERROR);
      return;
    }

    documentoDebounceRef.current = setTimeout(() => {
      checkDocumentoDuplicateRealtime(tipoDocumentoValue, numeroDocumentoValue);
    }, DEBOUNCE_MS);
  };

  const scheduleEmailDuplicateCheck = (emailValue) => {
    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
    }

    const normalized = normalizeEmail(emailValue || '');
    const emailError = validateEmail(emailValue || '');
    if (emailError || !normalized) {
      emailRequestIdRef.current += 1;
      setIsCheckingEmailDuplicate(false);
      clearFieldErrorIfMatches('email', DUPLICATE_EMAIL_ERROR);
      return;
    }

    emailDebounceRef.current = setTimeout(() => {
      checkEmailDuplicateRealtime(emailValue);
    }, DEBOUNCE_MS);
  };

  const flushDocumentoDuplicateCheck = async () => {
    if (documentoDebounceRef.current) {
      clearTimeout(documentoDebounceRef.current);
      documentoDebounceRef.current = null;
    }
    return checkDocumentoDuplicateRealtime(formData.tipoDocumento, formData.numeroDocumento);
  };

  const flushEmailDuplicateCheck = async () => {
    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
      emailDebounceRef.current = null;
    }
    return checkEmailDuplicateRealtime(formData.email);
  };

  const steps = [
    { number: 1, title: 'Información Personal', icon: User },
    { number: 2, title: 'Información Laboral', icon: Briefcase },
    { number: 3, title: 'Rol Administrativo', icon: Users },
    { number: 4, title: 'Resumen', icon: CheckCircle }
  ];

  const validateTipoDocumento = (tipoDocumento) => {
    if (!tipoDocumento) return 'El tipo de documento es requerido';
    return '';
  };

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

  const validateNombre = (nombre) => {
    if (!nombre.trim()) return 'El nombre completo es requerido';
    if (nombre.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
    if (nombre.trim().length > 100) return 'El nombre no puede tener más de 100 caracteres';
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nombre.trim())) return 'El nombre solo puede contener letras y espacios';
    return '';
  };

  const validateEmail = (email) => {
    if (!email.trim()) return 'El email es requerido';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) return 'Ingresa un email válido';
    if (email.length > 254) return 'El email es demasiado largo';
    return '';
  };

  const validateTelefono = (telefono) => {
    if (!telefono.trim()) return 'El teléfono es requerido';
    const telefonoLimpio = telefono.replace(/[\s\-\(\)]/g, '');
    if (!/^(\+57|57)?[3][0-9]{9}$/.test(telefonoLimpio)) {
      return 'El teléfono debe tener formato colombiano (+57 XXX XXX XXXX o 3XX XXX XXXX)';
    }
    return '';
  };

  const validateFechaIngreso = (fecha) => {
    if (!fecha) return 'La fecha de ingreso es requerida';
    const fechaSeleccionada = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaSeleccionada > hoy) return 'La fecha de ingreso no puede ser futura';
    return '';
  };

  const validateRol = (rol) => {
    if (!rol) return 'Debe seleccionar un rol administrativo';
    return '';
  };

  const validateStep = (step) => {
    let newErrors = {};

    switch (step) {
      case 1:
        newErrors.tipoDocumento = validateTipoDocumento(formData.tipoDocumento);
        newErrors.numeroDocumento = validateNumeroDocumento(formData.numeroDocumento, formData.tipoDocumento);
        newErrors.nombreCompleto = validateNombre(formData.nombreCompleto);
        newErrors.apellidoCompleto = validateNombre(formData.apellidoCompleto);
        newErrors.email = validateEmail(formData.email);
        newErrors.telefono = validateTelefono(formData.telefono);
        break;
      case 2:
        newErrors.fechaIngreso = validateFechaIngreso(formData.fechaIngreso);
        break;
      case 3:
        newErrors.rol = validateRol(formData.rol);
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canProceedToNextStep = (step) => {
    switch (step) {
      case 1: {
        const step1Errors = {
          tipoDocumento: validateTipoDocumento(formData.tipoDocumento),
          numeroDocumento: validateNumeroDocumento(formData.numeroDocumento, formData.tipoDocumento),
          nombreCompleto: validateNombre(formData.nombreCompleto),
          apellidoCompleto: validateNombre(formData.apellidoCompleto),
          email: validateEmail(formData.email),
          telefono: validateTelefono(formData.telefono)
        };
        return formData.tipoDocumento &&
               formData.numeroDocumento.trim() &&
               formData.nombreCompleto.trim() &&
               formData.apellidoCompleto.trim() &&
               formData.email.trim() &&
               formData.telefono.trim() &&
               Object.keys(step1Errors).every(key => !step1Errors[key]);
      }
      case 2: {
        const step2Errors = {
          fechaIngreso: validateFechaIngreso(formData.fechaIngreso)
        };
        return formData.fechaIngreso &&
               Object.keys(step2Errors).every(key => !step2Errors[key]);
      }
      case 3: {
        const step3Errors = {
          rol: validateRol(formData.rol)
        };
        return formData.rol &&
               Object.keys(step3Errors).every(key => !step3Errors[key]);
      }
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!canProceedToNextStep(currentStep)) {
      validateStep(currentStep);
      toast({
        title: 'Campos requeridos',
        description: 'Por favor corrige los errores antes de continuar',
        variant: 'destructive'
      });
      return;
    }

    if (currentStep === 1) {
      const [isDocumentoAvailable, isEmailAvailable] = await Promise.all([
        flushDocumentoDuplicateCheck(),
        flushEmailDuplicateCheck()
      ]);

      if (!isDocumentoAvailable || !isEmailAvailable || hasDuplicateErrors()) {
        toast({
          title: 'Datos duplicados',
          description: 'El documento o el correo no estan disponibles para crear el administrativo',
          variant: 'destructive'
        });
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateAllSteps = () => {
    let allErrors = {};
    allErrors = { ...allErrors, ...{
      tipoDocumento: validateTipoDocumento(formData.tipoDocumento),
      numeroDocumento: validateNumeroDocumento(formData.numeroDocumento, formData.tipoDocumento),
      nombreCompleto: validateNombre(formData.nombreCompleto),
      apellidoCompleto: validateNombre(formData.apellidoCompleto),
      email: validateEmail(formData.email),
      telefono: validateTelefono(formData.telefono)
    } };
    allErrors = { ...allErrors, ...{
      fechaIngreso: validateFechaIngreso(formData.fechaIngreso)
    } };
    allErrors = { ...allErrors, ...{ rol: validateRol(formData.rol) } };
    setErrors(allErrors);
    return Object.values(allErrors).every(error => !error);
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (validateAllSteps()) {
      setIsSubmitting(true);
      try {
        const telefonoLimpio = formData.telefono.replace(/[\s\-\(\)\+]/g, '');

        const administrativoData = {
          tipo_documento: formData.tipoDocumento,
          numero_documento: formData.numeroDocumento.replace(/[\s\-\.]/g, ''),
          nombre_completo: formData.nombreCompleto.trim(),
          apellido_completo: formData.apellidoCompleto.trim(),
          email: formData.email.trim().toLowerCase(),
          telefono: telefonoLimpio,
          fecha_ingreso: formData.fechaIngreso,
          id_rol: parseInt(formData.rol, 10)
        };

        await createAdministrativo(administrativoData);

        toast({
          title: 'Administrativo creado exitosamente',
          description: 'La invitacion se creo y el envio de correo esta en proceso.',
          variant: 'default'
        });

        handleClose();
      } catch (error) {
        console.error('Error al crear administrativo:', error);
        const backendMessage = getApiErrorMessage(error);
        const backendFieldErrors = mapBackendErrorToFieldErrors(backendMessage);

        if (Object.keys(backendFieldErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...backendFieldErrors }));
          setCurrentStep(1);
        }

        toast({
          title: 'Error al crear el administrativo',
          description: backendMessage,
          variant: 'destructive'
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor corrige los errores antes de crear el administrativo',
        variant: 'destructive'
      });
    }
  };
  
  const handleClose = () => {
    if (isSubmitting) return;
    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
      emailDebounceRef.current = null;
    }
    if (documentoDebounceRef.current) {
      clearTimeout(documentoDebounceRef.current);
      documentoDebounceRef.current = null;
    }
    emailRequestIdRef.current += 1;
    documentoRequestIdRef.current += 1;
    setIsCheckingEmailDuplicate(false);
    setIsCheckingDocumentoDuplicate(false);
    setCurrentStep(1);
    setFormData({
      tipoDocumento: '',
      numeroDocumento: '',
      nombreCompleto: '',
      apellidoCompleto: '',
      email: '',
      telefono: '',
      fechaIngreso: '',
      rol: '',
      rolNombre: '',
      estado: 'programada'
    });
    setErrors({});
    onClose();
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    const newErrors = { ...errors };
    let shouldUpdateErrors = true;
    let shouldScheduleDocumentCheck = false;
    let shouldScheduleEmailCheck = false;
    let tipoDocumentoForCheck = formData.tipoDocumento;
    let numeroDocumentoForCheck = formData.numeroDocumento;
    let emailForCheck = formData.email;

    switch (field) {
      case 'tipoDocumento':
        newErrors.tipoDocumento = validateTipoDocumento(value);
        newErrors.numeroDocumento = formData.numeroDocumento
          ? validateNumeroDocumento(formData.numeroDocumento, value)
          : newErrors.numeroDocumento;
        tipoDocumentoForCheck = value;
        numeroDocumentoForCheck = formData.numeroDocumento;
        shouldScheduleDocumentCheck = true;
        break;
      case 'numeroDocumento':
        newErrors.numeroDocumento = validateNumeroDocumento(value, formData.tipoDocumento);
        numeroDocumentoForCheck = value;
        shouldScheduleDocumentCheck = true;
        break;
      case 'nombreCompleto':
      case 'apellidoCompleto':
        newErrors[field] = validateNombre(value);
        break;
      case 'email':
        newErrors.email = validateEmail(value);
        emailForCheck = value;
        shouldScheduleEmailCheck = true;
        break;
      case 'telefono':
        newErrors.telefono = validateTelefono(value);
        break;
      case 'fechaIngreso':
        newErrors.fechaIngreso = validateFechaIngreso(value);
        break;
      case 'rol':
        newErrors.rol = validateRol(value);
        break;
      case 'rolNombre':
        shouldUpdateErrors = false;
        break;
      default:
        shouldUpdateErrors = false;
        break;
    }

    if (shouldUpdateErrors) {
      setErrors(newErrors);
    }

    if (shouldScheduleDocumentCheck) {
      scheduleDocumentoDuplicateCheck(tipoDocumentoForCheck, numeroDocumentoForCheck);
    }

    if (shouldScheduleEmailCheck) {
      scheduleEmailDuplicateCheck(emailForCheck);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalStep
            formData={formData}
            errors={errors}
            updateFormData={updateFormData}
            onDocumentoBlur={flushDocumentoDuplicateCheck}
            onEmailBlur={flushEmailDuplicateCheck}
            isCheckingDocumentoDuplicate={isCheckingDocumentoDuplicate}
            isCheckingEmailDuplicate={isCheckingEmailDuplicate}
          />
        );
      case 2:
        return (
          <LaboralStep
            formData={formData}
            errors={errors}
            updateFormData={updateFormData}
          />
        );
      case 3:
        return (
          <RoleStep
            formData={formData}
            errors={errors}
            updateFormData={updateFormData}
          />
        );
      case 4:
        return (
          <SummaryStep formData={formData} />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Nuevo Administrativo</h2>
              <p className="text-slate-600 mt-1">Registra un nuevo miembro del personal administrativo</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-slate-500" />
            </motion.button>
          </div>

          <div className="px-6 py-4 border-b border-slate-200">
            <StepIndicator steps={steps} currentStep={currentStep} />
          </div>

          <div
            ref={contentRef}
            data-create-admin-content="true"
            className={`flex-1 min-h-0 ${isNoScrollStep ? 'overflow-hidden' : 'overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100'} ${currentStep === 1 ? 'p-6 pb-2' : 'p-6'}`}
          >
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

          <div className={`flex items-center justify-between border-t border-slate-200 bg-slate-50 flex-shrink-0 ${currentStep === 1 ? 'p-4 pt-3' : 'p-6'}`}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePrev}
              disabled={currentStep === 1 || isSubmitting}
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
                disabled={isSubmitting}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </motion.button>

              {currentStep < 4 ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isSubmitting ? 'Creando...' : 'Crear Administrativo'}
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

export default CreateAdministrativoModal;


