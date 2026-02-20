import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Briefcase, CheckCircle, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import StepIndicator from '../StepIndicator';
import PersonalEditStep from './steps/PersonalEditStep';
import LaboralEditStep from './steps/LaboralEditStep';
import { useToast } from '../../../../shared/hooks/use-toast';

const EditAdministrativoModal = ({ isOpen, onClose, administrativo, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Paso 1: Información Personal
    nombreCompleto: '',
    apellidoCompleto: '',
    email: '',
    telefono: '',

    // Paso 2: Información Laboral
    rol: null,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentStep]);

  useEffect(() => {
    if (isOpen && administrativo) {
      setFormData({
        nombreCompleto: administrativo.persona?.nombre_completo || '',
        apellidoCompleto: administrativo.persona?.apellido_completo || '',
        email: administrativo.persona?.correo || '',
        telefono: administrativo.persona?.telefono || '',
        rol: administrativo.persona?.roles?.[0]?.id_rol || null,
      });
      setErrors({});
      setCurrentStep(1);
    }
  }, [isOpen, administrativo]);

  const steps = [
    { number: 1, title: 'Información Personal', icon: User },
    { number: 2, title: 'Información Laboral', icon: Briefcase },
    { number: 3, title: 'Confirmar Cambios', icon: CheckCircle }
  ];

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

  const validateRol = (rol) => {
    if (!rol) return 'El rol es requerido';
    return '';
  };

  const validateStep = (step) => {
    let newErrors = {};

    switch (step) {
      case 1:
        newErrors.nombreCompleto = validateNombre(formData.nombreCompleto);
        newErrors.apellidoCompleto = validateNombre(formData.apellidoCompleto);
        newErrors.email = validateEmail(formData.email);
        newErrors.telefono = validateTelefono(formData.telefono);
        break;
      case 2:
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
          nombreCompleto: validateNombre(formData.nombreCompleto),
          apellidoCompleto: validateNombre(formData.apellidoCompleto),
          email: validateEmail(formData.email),
          telefono: validateTelefono(formData.telefono)
        };
        return formData.nombreCompleto.trim() &&
               formData.apellidoCompleto.trim() &&
               formData.email.trim() &&
               formData.telefono.trim() &&
               Object.keys(step1Errors).every(key => !step1Errors[key]);
      }
      case 2: {
        const step2Errors = {
          rol: validateRol(formData.rol),
        };
        return Object.keys(step2Errors).every(key => !step2Errors[key]);
      }
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedToNextStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
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
    // Validate step 1
    allErrors = { ...allErrors, ...{
      nombreCompleto: validateNombre(formData.nombreCompleto),
      apellidoCompleto: validateNombre(formData.apellidoCompleto),
      email: validateEmail(formData.email),
      telefono: validateTelefono(formData.telefono)
    } };
    // Validate step 2
    allErrors = { ...allErrors, ...{
      rol: validateRol(formData.rol),
    } };
    setErrors(allErrors);
    return Object.values(allErrors).every(error => !error);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (validateAllSteps()) {
      setIsSubmitting(true);
      try {
        const updateData = {
          personaData: {
            nombre_completo: formData.nombreCompleto,
            apellido_completo: formData.apellidoCompleto,
            correo: formData.email,
            telefono: formData.telefono
          },
          administrativoData: {},
          rolId: formData.rol
        };

        if (typeof onSubmit !== 'function') {
          throw new Error('No se encontro el handler de guardado para editar administrativo');
        }

        await onSubmit(updateData);

        toast({
          title: 'Administrativo actualizado exitosamente',
          description: 'Los cambios han sido guardados correctamente.',
          variant: 'default'
        });

        handleClose();
      } catch (error) {
        console.error('Error al actualizar administrativo:', error);
        toast({
          title: 'Error al actualizar el administrativo',
          description: 'No se pudieron guardar los cambios. Por favor, intenta nuevamente.',
          variant: 'destructive'
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor corrige los errores antes de guardar',
        variant: 'destructive'
      });
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setCurrentStep(1);
    setFormData({
      nombreCompleto: '',
      apellidoCompleto: '',
      email: '',
      telefono: '',
      rol: null,
    });
    setErrors({});
    onClose();
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    const newErrors = { ...errors };

    switch (field) {
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
          <PersonalEditStep
            formData={formData}
            errors={errors}
            updateFormData={updateFormData}
            administrativo={administrativo}
          />
        );
      case 2:
        return (
          <LaboralEditStep
            formData={formData}
            errors={errors}
            updateFormData={updateFormData}
            administrativo={administrativo}
          />
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Confirmar Cambios</h3>
              <p className="text-slate-600 text-sm">Revisa los cambios antes de guardar</p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Edit className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Cambios a aplicar</p>
                  <p className="text-sm text-blue-700">
                    Se actualizarán los datos del administrativo {administrativo?.persona?.nombre_completo} {administrativo?.persona?.apellido_completo}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;
  const isNoScrollStep = currentStep === 1 || currentStep === 2;

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
              <h2 className="text-2xl font-bold text-slate-800">Editar Administrativo</h2>
              <p className="text-slate-600 mt-1">Modifica la información del administrativo</p>
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

          {/* Step Indicator */}
          <div className="px-6 py-4 border-b border-slate-200">
            <StepIndicator steps={steps} currentStep={currentStep} />
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            data-edit-admin-content="true"
            className={`flex-1 min-h-0 ${
              isNoScrollStep
                ? 'overflow-y-auto md:overflow-hidden px-6 py-4'
                : 'overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 p-6'
            }`}
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

          {/* Footer */}
          <div className={`flex items-center justify-between border-t border-slate-200 bg-slate-50 flex-shrink-0 ${isNoScrollStep ? 'p-4' : 'p-6'}`}>
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

              {currentStep < 3 ? (
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
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
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

export default EditAdministrativoModal;
