import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { X, User, Phone, Mail, FileText, CheckCircle } from 'lucide-react';
import { buyersApiService } from "../../../../shared/services/buyersApiService";
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
  telefono: "",
  observaciones: ""
};

const requiredFields = ["tipoDocumento", "documento", "primerNombre", "primerApellido", "correo", "telefono"];

const DOC_OPTIONS = [
  { value: "CC", label: "Cédula de Ciudadanía (CC)" },
  { value: "CE", label: "Cédula de Extranjería (CE)" },
  { value: "NIT", label: "NIT" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "TI", label: "Tarjeta de Identidad (TI)" },
];

export default function BuyerForm({
  onSubmit,
  onClose,
  nextId,
  initialData,
  isSubmitting = false,
}) {
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const { toast } = useToast();

  // Refs estilo TenantForm para evitar bloqueos al tipear
  const valuesRef = useRef({ ...defaultFormData, id: nextId });
  const displayValuesRef = useRef({ ...defaultFormData, id: nextId });
  const elRefs = useRef({});

  const isEditing = Boolean(initialData);
  const formTitle = isEditing ? "Editar Comprador" : "Registro de Comprador";
  const buttonText = isEditing ? "Actualizar Comprador" : "Guardar Comprador";

  // campos por tipo
  const nameFields = ["primerNombre", "segundoNombre", "primerApellido", "segundoApellido"];
  const docFields = ["documento"];
  const phoneFields = ["telefono"];
  const emailFields = ["correo"];
  const lookupTimeoutRef = useRef(null);

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
    const nextValue = value ?? "";
    valuesRef.current[name] = nextValue;
    displayValuesRef.current[name] = nextValue;
    const el = elRefs.current[name];
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = !!nextValue;
      return;
    }
    try {
      el.value = nextValue;
    } catch (_err) {
      // ignore
    }
  };

  const applyBuyerData = useCallback((buyer = {}) => {
    setValue("tipoDocumento", buyer.tipoDocumento || buyer.tipo_documento || valuesRef.current.tipoDocumento);
    setValue("documento", buyer.documento || buyer.numero_documento || "");
    setValue("primerNombre", buyer.primerNombre || "");
    setValue("segundoNombre", buyer.segundoNombre || "");
    setValue("primerApellido", buyer.primerApellido || "");
    setValue("segundoApellido", buyer.segundoApellido || "");
    setValue("correo", buyer.correo || "");
    setValue("telefono", normalizePhone(buyer.telefono));
  }, []);

  const clearAutofillFields = useCallback(() => {
    [
      "primerNombre",
      "segundoNombre",
      "primerApellido",
      "segundoApellido",
      "correo",
      "telefono",
    ].forEach((field) => setValue(field, ""));
  }, []);

  const cleanDocument = (value = "") => value.replace(/\D/g, "").trim();

  const lookupBuyer = useCallback(async () => {
    const tipoDocumento = (valuesRef.current.tipoDocumento || "").trim();
    const numeroDocumento = cleanDocument(displayValuesRef.current.documento || valuesRef.current.documento || "");

    if (!tipoDocumento || !numeroDocumento) {
      clearAutofillFields();
      return;
    }

    const validationError = validateDocument(tipoDocumento, numeroDocumento);
    if (validationError) {
      clearAutofillFields();
      setErrors((prev) => ({
        ...prev,
        documento: validationError,
      }));
      return;
    }

    try {
      const buyer = await buyersApiService.findByDocument(tipoDocumento, numeroDocumento);

      if (buyer) {
        applyBuyerData(buyer);
        toast({
          title: "Comprador encontrado",
          description: "Datos autocompletados correctamente.",
          variant: "default",
        });
      } else {
        clearAutofillFields();
      }
    } catch (err) {
      clearAutofillFields();
      toast({
        title: "Error al buscar",
        description: "No fue posible buscar el comprador. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  }, [applyBuyerData, clearAutofillFields]);

  const triggerLookup = useCallback(() => {
    if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);
    lookupTimeoutRef.current = setTimeout(lookupBuyer, 250);
  }, [lookupBuyer]);

  useEffect(() => {
    const newData = {
      ...defaultFormData,
      id: initialData?.id ?? nextId,
      ...initialData
    };
    valuesRef.current = newData;
    displayValuesRef.current = newData;
    Object.entries(newData).forEach(([field, value]) => {
      const el = elRefs.current[field];
      if (!el) return;
      if (el.type === "checkbox") {
        el.checked = !!value;
      } else {
        try {
          el.value = value ?? "";
        } catch (_err) {
          // ignore
        }
      }
    });
    setErrors({});
    setSubmitError(null);
  }, [initialData]);

  // Validación por tipo de documento (igual TenantForm)
  const validateDocument = (tipoDocumento, numeroDocumento) => {
    const numeroLimpio = numeroDocumento.replace(/[^0-9]/g, '');
    if (numeroLimpio.length < 7 || numeroLimpio.length > 10) {
      return 'El número de documento debe tener entre 7 y 10 caracteres';
    }
    switch (tipoDocumento) {
      case 'CC':
      case 'CE':
      case 'NIT':
      case 'PASAPORTE':
      case 'TI':
        if (!/^[0-9]+$/.test(numeroLimpio)) return 'El número de documento solo puede contener números';
        break;
      default:
        return 'Tipo de documento no válido';
    }
    return '';
  };

  const isValidName = (value) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(value);
  const isValidNameUnicode = (value) => /^[\p{L}\s]*$/u.test(value);
  const isValidNumeric = (value) => /^\d*$/.test(value);
  const isValidEmail = (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

  const setElRef = (name) => (el) => {
    if (!el) return;
    elRefs.current[name] = el;
    if (valuesRef.current[name] === undefined || valuesRef.current[name] === null) {
      valuesRef.current[name] = defaultFormData[name] ?? "";
    }
    displayValuesRef.current[name] = valuesRef.current[name];
    if (el.type === "checkbox") {
      el.checked = !!valuesRef.current[name];
      return;
    }
    try {
      el.value = displayValuesRef.current[name] ?? "";
    } catch (_err) {
      // ignore
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let cleanValue = value;
    let nextDisplayValue = value;
    if (docFields.includes(name) || phoneFields.includes(name)) {
      cleanValue = value.replace(/[^0-9]/g, '');
      nextDisplayValue = cleanValue;
    }
    valuesRef.current[name] = cleanValue;
    displayValuesRef.current[name] = nextDisplayValue;
    if (e.target.value !== nextDisplayValue) {
      e.target.value = nextDisplayValue;
    }

    if ((name === "documento" || name === "tipoDocumento")) {
      const tipoDocumento = name === "tipoDocumento" ? cleanValue : (valuesRef.current.tipoDocumento || "");
      const numeroDocumento = cleanDocument(name === "documento" ? cleanValue : (valuesRef.current.documento || ""));
      const validationError =
        tipoDocumento && numeroDocumento ? validateDocument(tipoDocumento, numeroDocumento) : "";

      if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);

      if (!tipoDocumento || !numeroDocumento || validationError) {
        clearAutofillFields();
      } else {
        triggerLookup();
      }
    }

    if (errors[name]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
  };

  const handleInputBlur = (e) => {
    const { name } = e.target;
    const value = valuesRef.current[name] || "";
    const isRequired = requiredFields.includes(name);
    let errorMessage = "";

    if (isRequired && !value.trim()) {
      errorMessage = "Este campo es obligatorio.";
    }

    if (!errorMessage && value.trim()) {
      if (nameFields.includes(name) && !isValidNameUnicode(displayValuesRef.current[name])) {
        errorMessage = "Solo se permiten letras y espacios.";
      } else if (docFields.includes(name)) {
        const tipoDocumento = valuesRef.current.tipoDocumento || "CC";
        if (!/^[A-Za-z0-9\s\-\.]*$/.test(displayValuesRef.current[name])) {
          errorMessage = "Solo se permiten letras, números, espacios, puntos y guiones";
        } else {
          errorMessage = validateDocument(tipoDocumento, value);
        }
      } else if (phoneFields.includes(name)) {
        if (!isValidNumeric(value)) errorMessage = "Solo se permiten números.";
        else if (value.length < 10) errorMessage = "El teléfono debe tener al menos 10 dígitos";
      } else if (emailFields.includes(name)) {
        if (!value.includes("@")) {
          errorMessage = "El correo debe contener @.";
        } else if (!isValidEmail(value)) {
          errorMessage = "El correo electrónico debe ser válido.";
        }
      }
    }

    setErrors((prev) => ({
      ...prev,
      [name]: errorMessage,
    }));

    // Al salir de tipo o documento, intentar autocompletar
    if ((name === "documento" || name === "tipoDocumento") && !errorMessage) {
      const tipoDocumento = (valuesRef.current.tipoDocumento || "").trim();
      const numeroDocumento = cleanDocument(displayValuesRef.current.documento || valuesRef.current.documento || "");
      if (!tipoDocumento || !numeroDocumento) {
        clearAutofillFields();
        return;
      }
      triggerLookup();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};

    // Validar requeridos
    requiredFields.forEach((field) => {
      if (!String(valuesRef.current[field] || "").trim()) {
        nextErrors[field] = "Este campo es obligatorio.";
      }
    });

    // Validar en bloque con las mismas reglas que blur
    nameFields.forEach((name) => {
      const v = valuesRef.current[name] || "";
      if (v && !isValidNameUnicode(displayValuesRef.current[name])) {
        nextErrors[name] = "Solo se permiten letras y espacios.";
      }
    });

    const docVal = valuesRef.current.documento || "";
    if (!nextErrors.documento && docVal) {
      const tipoDocumento = valuesRef.current.tipoDocumento || "CC";
      if (!/^[A-Za-z0-9\s\-\.]*$/.test(displayValuesRef.current.documento)) {
        nextErrors.documento = "Solo se permiten letras, números, espacios, puntos y guiones";
      } else {
        const msg = validateDocument(tipoDocumento, docVal);
        if (msg) nextErrors.documento = msg;
      }
    }

    const telVal = valuesRef.current.telefono || "";
    if (!nextErrors.telefono && telVal) {
      if (!isValidNumeric(telVal)) nextErrors.telefono = "Solo se permiten números.";
      else if (telVal.length < 7) nextErrors.telefono = "El teléfono debe tener al menos 7 dígitos";
    }

    const emailVal = valuesRef.current.correo || "";
    if (!nextErrors.correo && emailVal && !isValidEmail(emailVal)) {
      nextErrors.correo = "El correo electrónico debe ser válido.";
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    const sanitizedData = {
      ...valuesRef.current,
      correo: (valuesRef.current.correo || "").trim().toLowerCase(),
      documento: (valuesRef.current.documento || "").trim(),
      telefono: (valuesRef.current.telefono || "").trim(),
      primerNombre: (valuesRef.current.primerNombre || "").trim(),
      segundoNombre: (valuesRef.current.segundoNombre || "").trim(),
      primerApellido: (valuesRef.current.primerApellido || "").trim(),
      segundoApellido: (valuesRef.current.segundoApellido || "").trim(),
    };

    try {
      await onSubmit(sanitizedData);
    } catch (err) {
      setSubmitError(err?.message || "No se pudo guardar el comprador.");
    }
  };

  const getFieldClass = useCallback((fieldName) => {
    const baseClass = "w-full px-3 py-2 border rounded-lg focus:outline-none transition-colors";
    const errorClass = errors[fieldName]
      ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
      : "border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    return `${baseClass} ${errorClass}`;
  }, [errors]);

  // Solo visual (label/errores/layout). Inputs y handlers quedan iguales.
  const Field = ({ name, placeholder, type = "text", as = "input", options = [], icon: Icon, required }) => {
    const error = errors[name];
    const isRequired = required || requiredFields.includes(name);

    const Label = (
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {getLabel(name)} {isRequired && <span className="text-red-500">*</span>}
      </label>
    );

    if (as === "select") {
      return (
        <div>
          {Label}
          <select
            name={name}
            defaultValue={displayValuesRef.current[name] ?? ""}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            ref={setElRef(name)}
            className={getFieldClass(name)}
          >
            <option value="">Seleccione...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && <p className="text-red-500 text-sm mt-1 font-medium">{error}</p>}
        </div>
      );
    }

    const InputComponent = as === "textarea" ? "textarea" : "input";

    return (
      <div>
        {Label}
        <div className="relative">
          {Icon && (
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          )}
          <InputComponent
            name={name}
            type={type}
            defaultValue={displayValuesRef.current[name] ?? ""}
            placeholder={placeholder || getLabel(name)}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            ref={setElRef(name)}
            minLength={docFields.includes(name) ? 7 : undefined}
            maxLength={docFields.includes(name) ? 10 : undefined}
            className={`${getFieldClass(name)} ${Icon ? "pl-10" : ""} ${as === "textarea" ? "resize-none min-h-[100px]" : ""}`}
          />
        </div>
        {error && <p className="text-red-500 text-sm mt-1 font-medium">{error}</p>}
      </div>
    );
  };

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
      observaciones: "Observaciones"
    };
    return labels[name] ?? name;
  };

  const isButtonDisabled =
    isSubmitting ||
    Object.values(errors).some(Boolean) ||
    requiredFields.some((field) => !String(valuesRef.current[field] ?? "").trim());

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop (animado) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
        {/* Modal (animado) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{formTitle}</h2>
            <p className="text-slate-600 mt-1">
              {isEditing
                ? "Actualice la información del comprador"
                : "Complete la información requerida para registrar un nuevo comprador"}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-800">Datos del Comprador</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field as="select" name="tipoDocumento" options={DOC_OPTIONS} />
                <div className="md:col-span-2">
                  <Field name="documento" placeholder="Ej: 1234567 a 1234567890" icon={FileText} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field name="primerNombre" placeholder="Ej: María" icon={User} />
                <Field name="segundoNombre" placeholder="Opcional" icon={User} />
                <Field name="primerApellido" placeholder="Ej: García" icon={User} />
                <Field name="segundoApellido" placeholder="Opcional" icon={User} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field name="correo" type="email" placeholder="ejemplo@dominio.com" icon={Mail} />
                <Field name="telefono" placeholder="Ej: 3001234567" icon={Phone} />
              </div>

              {/* Observaciones existe en tu data; si lo usas luego, ya queda con el mismo look:
              <Field as="textarea" name="observaciones" placeholder="Opcional" />
              */}
            </section>

            {/* Error Message (TenantForm) */}
            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium">{submitError}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-6 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
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
  );
}
