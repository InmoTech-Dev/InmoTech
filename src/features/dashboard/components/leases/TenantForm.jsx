import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Mail, FileText, CheckCircle } from 'lucide-react';
import { renantsApiService as tenantsApiService } from "../../../../shared/services/arrendatarioApiService";
import { useToast } from "../../../../shared/hooks/use-toast";

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
  { value: "CC", label: "Cedula de Ciudadania (CC)" },
  { value: "CE", label: "Cedula de Extranjeria (CE)" },
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
  const [lookupState, setLookupState] = useState({ loading: false, message: "", error: null });
  const lookupTimeoutRef = useRef(null);
  const { toast } = useToast();
  
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

  const sanitizeNumericString = (value) => {
    if (value === undefined || value === null) return "";
    return value.toString().replace(/[^0-9]/g, "");
  };

  const normalizePhone = (value = "") => {
    const digits = sanitizeNumericString(value);
    if (!digits) return "";
    if (digits.startsWith("57") && digits.length > 10) {
      return digits.slice(-10);
    }
    return digits.slice(-10);
  };

  const setValue = (name, value) => {
    valuesRef.current[name] = value;
    displayValuesRef.current[name] = value;
    if (elRefs.current[name]) {
      try { elRefs.current[name].value = value; } catch (e) {}
    }
  };

  const cleanDocument = (value = "") => value.replace(/\D/g, "").trim();

  const applyTenantData = useCallback((tenant = {}) => {
    setValue("tipoDocumento", tenant.tipoDocumento || tenant.tipo_documento || valuesRef.current.tipoDocumento);
    setValue("documento", tenant.documento || tenant.numero_documento || "");
    setValue("primerNombre", tenant.primerNombre || "");
    setValue("segundoNombre", tenant.segundoNombre || "");
    setValue("primerApellido", tenant.primerApellido || "");
    setValue("segundoApellido", tenant.segundoApellido || "");
    setValue("correo", tenant.correo || "");
    setValue("telefono", normalizePhone(tenant.telefono));
  }, []);

  // Limpia los campos de datos personales/contacto (no toca tipo/documento)
  const clearPersonFields = useCallback(() => {
    [
      "primerNombre",
      "segundoNombre",
      "primerApellido",
      "segundoApellido",
      "correo",
      "telefono"
    ].forEach((field) => setValue(field, ""));
  }, []);

  const lookupTenant = useCallback(async () => {
    const tipoDocumento = (valuesRef.current.tipoDocumento || "").trim();
    const numeroDocumento = cleanDocument(displayValuesRef.current.documento || valuesRef.current.documento || "");

    if (!tipoDocumento || !numeroDocumento) return;

    const validationError = validateDocument(tipoDocumento, numeroDocumento);
    if (validationError) {
      setLookupState({ loading: false, message: "", error: null });
      toast({
        title: "Documento invalido",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setLookupState({ loading: true, message: "", error: null });
    clearPersonFields();
    try {
      let tenant = await tenantsApiService.findByDocument(tipoDocumento, numeroDocumento);
      if (!tenant) {
        tenant = await tenantsApiService.findPersonaByDocument(tipoDocumento, numeroDocumento);
      }

      if (tenant) {
        applyTenantData(tenant);
        setLookupState({
          loading: false,
          message: "",
          error: null
        });
        toast({
          title: "Arrendatario encontrado",
          description: "Datos autocompletados correctamente.",
          variant: "default",
        });
      } else {
        clearPersonFields();
        setLookupState({
          loading: false,
          message: "",
          error: null
        });
        toast({
          title: "No encontrado",
          description: "No se encontro una persona con ese documento.",
          variant: "destructive",
        });
      }
    } catch (err) {
      clearPersonFields();
      setLookupState({
        loading: false,
        message: "",
        error: null
      });
      toast({
        title: "Error al buscar",
        description: "No fue posible buscar el arrendatario. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  }, [applyTenantData, clearPersonFields, toast]);

  const triggerLookup = useCallback(() => {
    if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);
    lookupTimeoutRef.current = setTimeout(lookupTenant, 250);
  }, [lookupTenant]);

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

  // Funcion para validar documentos segun el tipo
  const validateDocument = (tipoDocumento, numeroDocumento) => {
    const numeroLimpio = numeroDocumento.replace(/[^0-9]/g, '');
    switch (tipoDocumento) {
      case "CC":
        if (!/^[0-9]{8,10}$/.test(numeroLimpio)) return "La cedula de ciudadania debe tener entre 8 y 10 digitos";
        break;
      case "CE":
        if (!/^[0-9]{6,10}$/.test(numeroLimpio)) return "La cedula de extranjeria debe tener entre 6 y 10 digitos";
        break;
      case "NIT":
        if (!/^[0-9]{9,10}$/.test(numeroLimpio)) return "El NIT debe tener 9 o 10 digitos";
        break;
      case "PASAPORTE":
        if (numeroLimpio.length < 6 || numeroLimpio.length > 20) return "El pasaporte debe tener entre 6 y 20 caracteres";
        if (!/^[A-Za-z0-9]+$/.test(numeroLimpio)) return "El pasaporte solo puede contener letras y numeros";
        break;
      case "TI":
        if (!/^[0-9]{10,11}$/.test(numeroLimpio)) return "La tarjeta de identidad debe tener 10 u 11 digitos";
        break;
      default:
        return "Tipo de documento no valido";
    }
    return "";
  };

  // Funcion para obtener la clase de estilo
  const getFieldClass = useCallback((fieldName) => {
    const baseClass = "w-full px-3 py-2 border rounded-lg focus:outline-none transition-colors";
    const errorClass = errors[fieldName] 
      ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent" 
      : "border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    return `${baseClass} ${errorClass}`;
  }, [errors]);

  // Configuracin de referencias de elementos
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

    // Para campos de documento y telefono, limpiar caracteres no numericos
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

    // Funciones de validacion de formato
    const isValidName = (value) => /^[a-zA-Z\s]*$/.test(value);
  const isValidNumeric = (value) => /^\d*$/.test(value);
  const isValidEmail = (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

    // Manejador de blur para validacion mejorado
  const handleInputBlur = (e) => {
    const { name } = e.target;
    const value = valuesRef.current[name] || ""; 
    
    let errorMessage = null;
    const isRequired = requiredFields.includes(name);

    // Validar obligatorio
    if (isRequired && !value.trim()) { 
      errorMessage = "Este campo es obligatorio.";
    }

    // Validar formato y longitud
    if (!errorMessage && value.trim()) {
      if (nameFields.includes(name) && !isValidName(displayValuesRef.current[name])) {
        errorMessage = `Solo se permiten letras y espacios.`;
      } 
      else if (docFields.includes(name)) {
        const tipoDocumento = valuesRef.current.tipoDocumento || "CC";
        
        if (!/^[A-Za-z0-9\s\-\.]*$/.test(displayValuesRef.current[name])) {
          errorMessage = `Solo se permiten letras, numeros, espacios, puntos y guiones`;
        } else {
          errorMessage = validateDocument(tipoDocumento, value);
        }
      } 
      else if (phoneFields.includes(name)) {
        if (!isValidNumeric(value)) {
          errorMessage = `Solo se permiten numeros.`;
        } else if (value.length < 10) {
          errorMessage = `El telefono debe tener al menos 10 digitos`;
        }
      } 
      else if (emailFields.includes(name)) {
        if (!value.includes("@")) {
          errorMessage = `El correo debe contener @.`;
        } else if (!isValidEmail(value)) {
          errorMessage = `El correo electronico debe ser valido.`;
        }
      }
    }

    setErrors(prev => {
      const newErrors = { ...prev };
      if (errorMessage) newErrors[name] = errorMessage;
      else delete newErrors[name];
      return newErrors;
    });

    // Si blur en doc/tipo sin error -> lookup
    if ((name === "documento" || name === "tipoDocumento") && !errorMessage) {
      triggerLookup();
    }
  };

  // Validacion centralizada MEJORADA
  const runValidation = (fieldsToCheck) => {
    let currentErrors = { ...errors };
    let hasError = false;
    let firstErrorField = null;
    
    for (const fieldName of fieldsToCheck) {
      const value = valuesRef.current[fieldName] || "";
      let error = null;

      const isRequired = requiredFields.includes(fieldName);
      
      // Validacion de obligatoriedad
      if (isRequired && !value.toString().trim()) { 
        error = "Este campo es obligatorio.";
      }

      // Validacion de formato MEJORADA
      if (!error && value.toString().trim()) {
        if (nameFields.includes(fieldName) && !isValidName(displayValuesRef.current[fieldName])) {
          error = `Solo se permiten letras, espacios y acentos.`;
        } 
        // VALIDACIN MEJORADA PARA DOCUMENTOS
        else if (docFields.includes(fieldName)) {
          const tipoDocumento = valuesRef.current.tipoDocumento || "CC";
          error = validateDocument(tipoDocumento, value);
        } 
        else if (phoneFields.includes(fieldName)) {
          if (!isValidNumeric(value)) {
            error = `Solo se permiten digitos.`;
          } else if (value.length < 10) {
            error = `El telefono debe tener al menos 10 digitos`;
          }
        } 
        else if (emailFields.includes(fieldName) && !isValidEmail(value)) {
          error = `Debe ser un correo electronico valido.`;
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
      fieldPlaceholder = "Ej: 1234567890 (8-10 digitos segun el tipo)";
    }
    if (isPhoneField) {
      fieldPlaceholder = "Ej: 3001234567 (10 digitos minimo)";
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

  // Funcion para obtener etiquetas
  const getLabel = (name) => {
    const labels = {
      tipoDocumento: "Tipo de Documento",
      documento: "Numero de Documento",
      primerNombre: "Primer Nombre",
      segundoNombre: "Segundo Nombre", 
      primerApellido: "Primer Apellido",
      segundoApellido: "Segundo Apellido",
      correo: "Correo Electronico",
      telefono: "Telefono",
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{formTitle}</h2>
              <p className="text-slate-600 mt-1">
                {isEditing
                  ? "Actualice la informacion del arrendatario"
                  : "Complete la informacion requerida para registrar un nuevo arrendatario"}
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
                  placeholder="Ej: 1234567890 (8-10 digitos segun el tipo)"
                  icon={FileText}
                  className="md:col-span-2"
                />
              </div>

                {/* Nombres y Apellidos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    name="primerNombre"
                    placeholder="Ej: Mara"
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
                    placeholder="Ej: Garca"
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
                    placeholder="Ej: 3001234567 (10 digitos minimo)"
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

