import React, { useEffect, useState } from "react";

const DEFAULT_FORM = {
  id: null,
  tipoDocumento: "CC",
  documento: "",
  primerNombre: "",
  segundoNombre: "",
  primerApellido: "",
  segundoApellido: "",
  correo: "",
  telefono: "",
};

const REQUIRED = ["documento", "primerNombre", "primerApellido", "correo", "telefono"];

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
  const [formData, setFormData] = useState({ ...DEFAULT_FORM, id: nextId });
  const [errors, setErrors] = useState({});

  const isEditing = Boolean(initialData);
  const formTitle = isEditing ? "Editar Comprador" : "Registro de Comprador";
  const buttonText = isEditing ? "Actualizar Comprador" : "Guardar Comprador";

  useEffect(() => {
    setFormData({ ...DEFAULT_FORM, id: initialData?.id ?? nextId, ...initialData });
    setErrors({});
  }, [initialData, nextId]);

  const validateName = (value, required) => {
    if (required && !value.trim()) return "Este campo es obligatorio.";
    if (!value.trim()) return "";
    if (!/^[a-zA-ZÁÉÍÓÚÜáéíóúüñÑ'\\s]*$/.test(value)) {
      return "Solo se permiten letras y espacios.";
    }
    return "";
  };

  const validateField = (name, value) => {
    if (REQUIRED.includes(name) && !value.trim()) return "Este campo es obligatorio.";

    switch (name) {
      case "documento":
        if (value && !/^[0-9]+$/.test(value)) return "Solo números.";
        if (value && value.length < 5) return "Debe tener al menos 5 dígitos.";
        break;
      case "primerNombre":
      case "segundoNombre":
      case "primerApellido":
      case "segundoApellido":
        return validateName(value, name === "primerNombre" || name === "primerApellido");
      case "correo":
        if (value) {
          const trimmedEmail = value.trim().toLowerCase();
          if (!/^[\w.!#$%&'*+/=?`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i.test(trimmedEmail)) {
            return "Correo inválido.";
          }
        }
        break;
      case "telefono":
        if (value && !/^[0-9]+$/.test(value)) return "Solo números.";
        if (value && value.length < 7) return "Debe tener al menos 7 dígitos.";
        break;
      default:
        break;
    }
    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = name === "documento" || name === "telefono" ? value.replace(/[^0-9]/g, "") : value;
    setFormData((prev) => ({ ...prev, [name]: cleanValue }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {};
    Object.keys(formData).forEach((key) => {
      const message = validateField(key, formData[key] ?? "");
      if (message) nextErrors[key] = message;
    });

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const sanitizedData = {
      ...formData,
      correo: formData.correo?.trim().toLowerCase() || "",
      documento: formData.documento?.trim() || "",
      telefono: formData.telefono?.trim() || "",
      primerNombre: formData.primerNombre?.trim() || "",
      segundoNombre: formData.segundoNombre?.trim() || "",
      primerApellido: formData.primerApellido?.trim() || "",
      segundoApellido: formData.segundoApellido?.trim() || "",
    };

    await onSubmit(sanitizedData);
  };

  const Field = ({ label, name, type = "text", as = "input", options = [] }) => {
    const error = errors[name];
    const required = REQUIRED.includes(name);

    if (as === "select") {
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            name={name}
            value={formData[name] ?? ""}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 ${
              error ? "border-red-500 ring-1 ring-red-500" : "border-slate-300 focus:ring-2 focus:ring-blue-500"
            }`}
          >
            <option value="">Seleccione...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={type}
          name={name}
          value={formData[name] ?? ""}
          onChange={handleChange}
          className={`w-full border rounded-lg px-3 py-2 ${
            error ? "border-red-500 ring-1 ring-red-500" : "border-slate-300 focus:ring-2 focus:ring-blue-500"
          }`}
          placeholder={label}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{formTitle}</h2>
            <p className="text-slate-500 text-sm">
              Completa los datos del comprador para guardarlo en el sistema.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field as="select" label="Tipo de documento" name="tipoDocumento" options={DOC_OPTIONS} />
            <Field label="Número de documento" name="documento" />
            <Field label="Primer nombre" name="primerNombre" />
            <Field label="Segundo nombre" name="segundoNombre" />
            <Field label="Primer apellido" name="primerApellido" />
            <Field label="Segundo apellido" name="segundoApellido" />
            <Field label="Correo" name="correo" type="email" />
            <Field label="Teléfono" name="telefono" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-lg text-white font-semibold ${
                isSubmitting
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 shadow-md"
              }`}
            >
              {isSubmitting ? "Guardando..." : buttonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
