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

const CreateAdministrativoModal = ({ isOpen, onClose }) => {
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
    estado: 'programada'
  });
  const [errors, setErrors] = useState({});
  const { toast } = useToast();
  const { createAdministrativo } = useAdministrativos();
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentStep]);

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

  const handleNext = () => {
    if (canProceedToNextStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      validateStep(currentStep);
      toast({
        title: 'Campos requeridos',
        description: 'Por favor corrige los errores antes de continuar',
        variant: 'destructive'
      });
    }
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
      fechaIngreso: validateFechaIngreso(formData.fechaIngreso),
      cargo: null,
      departamento: null
    } };
    allErrors = { ...allErrors, ...{ rol: validateRol(formData.rol) } };
    setErrors(allErrors);
    return Object.values(allErrors).every(error => !error);
  };

  const handleSubmit = async () => {
    if (validateAllSteps()) {
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
          cargo: null,
          departamento: null,
          id_rol: parseInt(formData.rol, 10)
        };

        await createAdministrativo(administrativoData);

        toast({
          title: 'Administrativo creado exitosamente',
          description: 'Se envió un correo para que el nuevo administrativo defina su contraseña.',
          variant: 'default'
        });

        handleClose();
      } catch (error) {
        console.error('Error al crear administrativo:', error);
        toast({
          title: 'Error al crear el administrativo',
          description: error.message || 'No se pudo registrar el administrativo. Por favor, intenta nuevamente.',
          variant: 'destructive'
        });
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
    setCurrentStep(1);
    setFormData({
      tipoDocumento: '',
      numeroDocumento: '',
      nombreCompleto: '',
      apellidoCompleto: '',
      email: '',
      telefono: '',
      fechaIngreso: '',
      cargo: undefined,
      departamento: undefined,
      rol: '',
      estado: 'programada'
    });
    setErrors({});
    onClose();
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    const newErrors = { ...errors };

    switch (field) {
      case 'tipoDocumento':
        newErrors.tipoDocumento = validateTipoDocumento(value);
        if (formData.numeroDocumento) {
          newErrors.numeroDocumento = validateNumeroDocumento(formData.numeroDocumento, value);
        }
        break;
      case 'numeroDocumento':
        newErrors.numeroDocumento = validateNumeroDocumento(value, formData.tipoDocumento);
        break;
      case 'nombreCompleto':
      case 'apellidoCompleto':
        newErrors[field] = validateNombre(value);
        break;
      case 'email':
        newErrors.email = validateEmail(value);
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
      default:
        break;
    }

    setErrors(newErrors);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalStep
            formData={formData}
            errors={errors}
            updateFormData={updateFormData}
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
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </motion.button>
          </div>

          <div className="px-6 py-4 border-b border-slate-200">
            <StepIndicator steps={steps} currentStep={currentStep} />
          </div>

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

          <div className={`flex items-center justify-between border-t border-slate-200 bg-slate-50 flex-shrink-0 ${currentStep === 1 ? 'p-4 pt-3' : 'p-6'}`}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePrev}
              disabled={currentStep === 1}
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
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </motion.button>

              {currentStep < 4 ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Crear Administrativo
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
