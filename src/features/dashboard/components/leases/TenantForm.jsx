import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Mail, FileText, CheckCircle } from 'lucide-react';

const defaultFormData = {
  id: null,
  tipoDocumento: "",
  documento: "",
  primerNombre: "",
  segundoNombre: "",
  primerApellido: "",
  segundoApellido: "",
  correo: "",
  telefono: ""
};

const requiredFields = ["tipoDocumento", "documento", "primerNombre", "primerApellido", "correo", "telefono"];

// Opciones de documentos
const DOCUMENT_OPTIONS = [
  { value: "CC", label: "Cédula de Ciudadanía (CC)" },
  { value: "CE", label: "Cédula de Extranjería (CE)" },
  { value: "NIT", label: "NIT" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "TI", label: "Tarjeta de Identidad (TI)" },
];

export default function TenantForm({
  onSubmit,
  onClose,
  nextId,
  initialData,
  isSubmitting = false
}) {
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  
  // Refs para manejo eficiente de estado
  const valuesRef = useRef({ ...defaultFormData, id: nextId });
  const displayValuesRef = useRef({ ...defaultFormData, id: nextId });
  const elRefs = useRef({});
  const errorFocusTimeout = useRef(null);

  const isEditing = Boolean(initialData);
  const formTitle = isEditing ? "Editar Arrendatario" : "Registro de Arrendatario";
  const buttonText = isEditing ? "Actualizar Arrendatario" : "Guardar Arrendatario";

  // Campos para validaciones
  const nameFields = ["primerNombre", "segundoNombre", "primerApellido", "segundoApellido"];
  const docFields = ["documento"];
  const phoneFields = ["telefono"];
  const emailFields = ["correo"];

  useEffect(() => {
    const newData = {
      ...defaultFormData,
      id: initialData?.id ?? nextId,
      ...initialData
    };
    
    valuesRef.current = newData;
    displayValuesRef.current = newData;
    setErrors({});
    setSubmitError(null);
  }, [initialData, nextId]);

  // === SISTEMA DE VALIDACIONES MEJORADO ===

  // Función para validar documentos según el tipo
  const validateDocument = (tipoDocumento, numeroDocumento) => {
    const numeroLimpio = numeroDocumento.replace(/[^0-9]/g, '');
    
    switch (tipoDocumento) {
      case 'CC': // Cédula de Ciudadanía
        if (!/^[0-9]{8,10}$/.test(numeroLimpio)) {
          return 'La cédula de ciudadanía debe tener entre 8 y 10 dígitos';
        }
        break;
        
      case 'CE': // Cédula de Extranjería
        if (!/^[0-9]{6,10}$/.test(numeroLimpio)) {
          return 'La cédula de extranjería debe tener entre 6 y 10 dígitos';
        }
        break;
        
      case 'NIT': // NIT
        if (!/^[0-9]{9,10}$/.test(numeroLimpio)) {
          return 'El NIT debe tener 9 o 10 dígitos';
        }
        break;
        
      case 'PASAPORTE': // Pasaporte
        if (numeroLimpio.length < 6 || numeroLimpio.length > 20) {
          return 'El pasaporte debe tener entre 6 y 20 caracteres';
        }
        if (!/^[A-Za-z0-9]+$/.test(numeroLimpio)) {
          return 'El pasaporte solo puede contener letras y números';
        }
        break;
        
      case 'TI': // Tarjeta de Identidad
        if (!/^[0-9]{10,11}$/.test(numeroLimpio)) {
          return 'La tarjeta de identidad debe tener 10 u 11 dígitos';
        }
        break;
        
      default:
        return 'Tipo de documento no válido';
    }
    
    return '';
  };

  // Función para obtener la clase de estilo
  const getFieldClass = useCallback((fieldName) => {
    const baseClass = "w-full px-3 py-2 border rounded-lg focus:outline-none transition-colors";
    const errorClass = errors[fieldName] 
      ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent" 
      : "border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    return `${baseClass} ${errorClass}`;
  }, [errors]);

  // Configuración de referencias de elementos
  const setElRef = (name) => (el) => {
    if (!el) return;
    elRefs.current[name] = el;
    
    if (valuesRef.current[name] === undefined || valuesRef.current[name] === null) {
      valuesRef.current[name] = defaultFormData[name] ?? "";
    }
    
    displayValuesRef.current[name] = valuesRef.current[name];

    if (el.type === "checkbox") {
      el.checked = !!valuesRef.current[name];
    } else {
      if (displayValuesRef.current[name] !== undefined) {
        try { el.value = displayValuesRef.current[name]; } catch (err) { /* ignore */ }
      }
    }
  };

  // Manejador de cambios en inputs
  const handleInputChange = (e) => {
    let { name, value } = e.target;
    let cleanValue = value;

    // Para campos de documento y teléfono, limpiar caracteres no numéricos
    if (docFields.includes(name) || phoneFields.includes(name)) {
      cleanValue = value.replace(/[^0-9]/g, '');
      displayValuesRef.current[name] = value; // Mantener display original
    } else {
      displayValuesRef.current[name] = value;
    }
    
    valuesRef.current[name] = cleanValue;

    // Limpiar errores al escribir
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Funciones de validación de formato
  const isValidName = (value) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(value);
  const isValidNumeric = (value) => /^\d*$/.test(value);
  const isValidEmail = (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

  // Manejador de blur para validación MEJORADO
  const handleInputBlur = (e) => {
    const { name } = e.target;
    const value = valuesRef.current[name] || ""; 
    
    let errorMessage = null;
    const isRequired = requiredFields.includes(name);

    setErrors(prev => {
      const newErrors = { ...prev };

      // Validar campo obligatorio
      if (isRequired && !value.trim()) { 
        errorMessage = "Este campo es obligatorio.";
      }

      // Validar formato y longitud (solo si no hay error de obligatoriedad y el campo tiene valor)
      if (!errorMessage && value.trim()) {
        if (nameFields.includes(name) && !isValidName(displayValuesRef.current[name])) {
          errorMessage = `Solo se permiten letras y espacios.`;
        } 
        // VALIDACIÓN MEJORADA PARA DOCUMENTOS
        else if (docFields.includes(name)) {
          const tipoDocumento = valuesRef.current.tipoDocumento || "CC";
          
          // Validar formato básico primero
          if (!/^[A-Za-z0-9\s\-\.]*$/.test(displayValuesRef.current[name])) {
            errorMessage = `Solo se permiten letras, números, espacios, puntos y guiones`;
          } else {
            // Validación específica por tipo de documento
            errorMessage = validateDocument(tipoDocumento, value);
          }
        } 
        else if (phoneFields.includes(name)) {
          if (!isValidNumeric(value)) {
            errorMessage = `Solo se permiten números.`;
          } else if (value.length < 10) {
            errorMessage = `El teléfono debe tener al menos 10 dígitos`;
          }
        } 
        else if (emailFields.includes(name)) {
          if (!value.includes("@")) {
            errorMessage = `El correo debe contener @.`;
          } else if (!isValidEmail(value)) {
            errorMessage = `El correo electrónico debe ser válido.`;
          }
        }
      }

      // Aplicar o limpiar error
      if (errorMessage) {
        newErrors[name] = errorMessage;
      } else {
        delete newErrors[name];
      }

      return newErrors;
    });
  };

  // Validación centralizada MEJORADA
  const runValidation = (fieldsToCheck) => {
    let currentErrors = { ...errors };
    let hasError = false;
    let firstErrorField = null;
    
    for (const fieldName of fieldsToCheck) {
      const value = valuesRef.current[fieldName] || "";
      let error = null;

      const isRequired = requiredFields.includes(fieldName);
      
      // Validación de obligatoriedad
      if (isRequired && !value.toString().trim()) { 
        error = "Este campo es obligatorio.";
      }

      // Validación de formato MEJORADA
      if (!error && value.toString().trim()) {
        if (nameFields.includes(fieldName) && !isValidName(displayValuesRef.current[fieldName])) {
          error = `Solo se permiten letras, espacios y acentos.`;
        } 
        // VALIDACIÓN MEJORADA PARA DOCUMENTOS
        else if (docFields.includes(fieldName)) {
          const tipoDocumento = valuesRef.current.tipoDocumento || "CC";
          error = validateDocument(tipoDocumento, value);
        } 
        else if (phoneFields.includes(fieldName)) {
          if (!isValidNumeric(value)) {
            error = `Solo se permiten dígitos.`;
          } else if (value.length < 10) {
            error = `El teléfono debe tener al menos 10 dígitos`;
          }
        } 
        else if (emailFields.includes(fieldName) && !isValidEmail(value)) {
          error = `Debe ser un correo electrónico válido.`;
        }
      }
      
      // Actualizar errores
      if (error) {
        currentErrors[fieldName] = error;
        hasError = true;
        if (!firstErrorField) {
          firstErrorField = fieldName;
        }
      } else {
        delete currentErrors[fieldName];
      }
    }
    
    return { currentErrors, hasError, firstErrorField };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);

    // Validar todos los campos
    const allFieldsToValidate = Object.keys(defaultFormData).filter(key => key !== "id");
    const { currentErrors, hasError, firstErrorField } = runValidation(allFieldsToValidate);

    setErrors(currentErrors);

    if (hasError) {
      // Enfocar el primer campo con error
      if (errorFocusTimeout.current) clearTimeout(errorFocusTimeout.current);
      errorFocusTimeout.current = setTimeout(() => {
        const el = elRefs.current[firstErrorField];
        if (el) el.focus();
      }, 50);
      return;
    }

    try {
      await onSubmit(valuesRef.current);
    } catch (error) {
      setSubmitError(error.message || "No fue posible guardar el arrendatario.");
    }
  };

  // Componente Field reutilizable con validaciones mejoradas
  const Field = ({ name, as = "input", options = [], placeholder, type = "text", icon: Icon, required = false, className = "" }) => {
    const errorMessage = errors[name];
    const isRequired = requiredFields.includes(name) || required;

    const isDocField = docFields.includes(name);
    const isPhoneField = phoneFields.includes(name);
    const isEmailField = emailFields.includes(name);
    const isNameField = nameFields.includes(name);

    const needsBlurValidation = isDocField || isNameField || isPhoneField || isEmailField || isRequired;
    const onBlurHandler = needsBlurValidation ? handleInputBlur : undefined;
    
    let inputType = type;
    if (isDocField || isPhoneField) {
      if (type !== 'email') {
        inputType = "tel";
      }
    }
    else if (isEmailField) {
      inputType = "email";
    }

    // Placeholders mejorados
    let fieldPlaceholder = placeholder;
    if (isDocField) {
      fieldPlaceholder = "Ej: 1234567890 (8-10 dígitos según el tipo)";
    }
    if (isPhoneField) {
      fieldPlaceholder = "Ej: 3001234567 (10 dígitos mínimo)";
    }

    const LabelContent = (
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-2">
        {getLabel(name)} {isRequired && <span className="text-red-500">*</span>}
      </label>
    );

    if (as === "select") {
      return (
        <div className={className}>
          {LabelContent}
          <select
            id={name}
            name={name}
            ref={setElRef(name)}
            className={getFieldClass(name)}
            defaultValue={defaultFormData[name] ?? ""}
            onChange={handleInputChange}
            onBlur={onBlurHandler}
          >
            <option value="">Seleccione...</option>
            {options.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
          {errorMessage && (
            <p className="text-red-500 text-sm mt-1 font-medium">{errorMessage}</p>
          )}
        </div>
      );
    }

    if (as === "textarea") {
      return (
        <div className={className}>
          {LabelContent}
          <textarea
            id={name}
            name={name}
            ref={setElRef(name)}
            className={`${getFieldClass(name)} resize-none`}
            placeholder={fieldPlaceholder}
            rows={3}
            defaultValue={defaultFormData[name] ?? ""}
            onChange={handleInputChange}
            onBlur={onBlurHandler}
          />
          {errorMessage && (
            <p className="text-red-500 text-sm mt-1 font-medium">{errorMessage}</p>
          )}
        </div>
      );
    }

    return (
      <div className={className}>
        {LabelContent}
        <div className="relative">
          <input
            id={name}
            name={name}
            ref={setElRef(name)}
            className={`${getFieldClass(name)} ${Icon ? 'pl-10' : ''}`}
            type={inputType}
            placeholder={fieldPlaceholder}
            defaultValue={defaultFormData[name] ?? ""}
            onChange={handleInputChange}
            onBlur={onBlurHandler}
          />
          {Icon && (
            <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          )}
        </div>
        {errorMessage && (
          <p className="text-red-500 text-sm mt-1 font-medium">{errorMessage}</p>
        )}
      </div>
    );
  };

  // Función para obtener etiquetas
  const getLabel = (name) => {
    const labels = {
      tipoDocumento: "Tipo de Documento",
      documento: "Número de Documento",
      primerNombre: "Primer Nombre",
      segundoNombre: "Segundo Nombre", 
      primerApellido: "Primer Apellido",
      segundoApellido: "Segundo Apellido",
      correo: "Correo Electrónico",
      telefono: "Teléfono",
      // observaciones: "Observaciones"
    };
    return labels[name] ?? name;
  };

  const isButtonDisabled =
    isSubmitting ||
    Object.values(errors).some(Boolean) ||
    requiredFields.some((field) => !String(valuesRef.current[field] ?? "").trim());

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{formTitle}</h2>
              <p className="text-slate-600 mt-1">
                {isEditing
                  ? "Actualice la información del arrendatario"
                  : "Complete la información requerida para registrar un nuevo arrendatario"}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Datos Personales Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Datos Personales</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field
                    name="tipoDocumento"
                    as="select"
                    options={DOCUMENT_OPTIONS}
                    className=""
                  />

                  <Field 
                    name="documento"
                    placeholder="Ej: 1234567890 (8-10 dígitos según el tipo)"
                    icon={FileText}
                    className="md:col-span-2"
                  />
                </div>

                {/* Nombres y Apellidos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    name="primerNombre"
                    placeholder="Ej: María"
                    icon={User}
                    required={true}
                  />
                  <Field
                    name="segundoNombre"
                    placeholder="Opcional"
                    icon={User}
                  />
                  <Field
                    name="primerApellido"
                    placeholder="Ej: García"
                    icon={User}
                    required={true}
                  />
                  <Field
                    name="segundoApellido"
                    placeholder="Opcional"
                    icon={User}
                  />
                </div>

                {/* Contacto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    name="correo"
                    type="email"
                    placeholder="ejemplo@dominio.com"
                    icon={Mail}
                    required={true}
                  />
                  <Field
                    name="telefono"
                    placeholder="Ej: 3001234567 (10 dígitos mínimo)"
                    icon={Phone}
                    required={true}
                  />
                </div>
              </section>

              {/* Observaciones Section - removed */}

              {/* Error Message */}
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <p className="text-red-700 text-sm font-medium">{submitError}</p>
                </motion.div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-6 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={isButtonDisabled}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                isButtonDisabled
                  ? "bg-slate-400 text-slate-200 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {buttonText}
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
