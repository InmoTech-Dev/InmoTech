import React, { useState, useEffect } from "react";

export default function BuyerForm({ onSubmit, onClose, nextId, initialData }) {
    const [formData, setFormData] = useState({
        id: nextId,
        tipoDocumento: "CC",
        documento: "",
        primerNombre: "",
        segundoNombre: "",
        primerApellido: "",
        segundoApellido: "",
        correo: "",
        telefono: "",
    });

    const [errors, setErrors] = useState({});

    const isEditing = !!initialData;
    const formTitle = isEditing ? "Editar Comprador" : "Registro de Comprador";
    const buttonText = isEditing ? "Actualizar Comprador" : "Guardar Comprador";

    useEffect(() => {
        setFormData(
            initialData || {
                id: nextId,
                tipoDocumento: "CC",
                documento: "",
                primerNombre: "",
                segundoNombre: "",
                primerApellido: "",
                segundoApellido: "",
                correo: "",
                telefono: "",
            }
        );
        setErrors({});
    }, [initialData, nextId]);

    const requiredFields = [
        "documento",
        "primerNombre",
        "primerApellido",
        "correo",
        "telefono",
    ];

    const validateNameField = (value, isRequired = false) => {
        if (isRequired && value.trim() === "") {
            return "Este campo es obligatorio.";
        }
        if (value.trim() === "") return "";
        
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(value)) {
            return "Solo se permiten letras y espacios.";
        }
        return "";
    };

    const validateField = (name, value) => {
        const isRequired = requiredFields.includes(name);

        if (isRequired && value.trim() === "") {
            return "Este campo es obligatorio.";
        }
        if (!isRequired && value.trim() === "") {
            return "";
        }

        switch (name) {
            case "documento":
                if (!/^\d+$/.test(value)) return "Solo se permiten números.";
                if (value.length < 5) return "Debe tener al menos 5 dígitos.";
                break;

            case "primerNombre":
            case "segundoNombre":
            case "primerApellido":
            case "segundoApellido":
                return validateNameField(value, isRequired);

            case "correo":
                if (!/^.+@.+\..+$/.test(value)) {
                    return "Debe ser un correo electrónico válido.";
                }
                break;

            case "telefono":
                if (!/^\d+$/.test(value)) return "Solo se permiten números.";
                if (value.length < 7) return "Debe tener al menos 7 dígitos.";
                break;

            default:
                return "";
        }

        return "";
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        setErrors((prevErrors) => ({
            ...prevErrors,
            [name]: validateField(name, value),
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        let formErrors = {};
        let isFormValid = true;

        Object.keys(formData).forEach((name) => {
            if (name !== "tipoDocumento" && name !== "id") {
                const error = validateField(name, formData[name]);
                if (error) {
                    formErrors[name] = error;
                    isFormValid = false;
                }
            }
        });

        setErrors(formErrors);

        if (!isFormValid) {
             console.error("Formulario no válido. Revise los errores.");
             return;
        }

        if (onSubmit) onSubmit(formData);
        if (onClose) onClose();
    };

    const isButtonDisabled =
        Object.values(errors).some((err) => err) ||
        requiredFields.some((field) => !formData[field].trim());

    return (
        // Fondo del modal con desenfoque - ÚNICO CAMBIO PRINCIPAL
        <div 
            className="fixed inset-0 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm z-50 p-4" 
            onClick={onClose}
        >
            {/* Contenedor del formulario - MANTIENE TODOS LOS ESTILOS ORIGINALES */}
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6 relative transform transition-all duration-300 scale-100 overflow-y-auto max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Botón cerrar con estilo azul */}
                <button
                    onClick={onClose}
                    aria-label="Cerrar formulario"
                    className="absolute top-4 right-4 text-gray-500 hover:text-blue-600 transition duration-150 p-1 rounded-full"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>

                {/* Header con estilo del banner */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{formTitle}</h2>
                    <p className="text-gray-600 text-sm">
                        {isEditing ? "Actualice la información del comprador" : "Complete la información requerida para registrar un nuevo comprador"}
                    </p>
                </div>

                {/* Formulario - CONTENIDO ORIGINAL SIN CAMBIOS */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Tipo de documento y Documento */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Tipo de documento */}
                        <div>
                            <label htmlFor="tipoDocumento" className="block text-xs font-semibold text-gray-700 mb-1">
                                Tipo documento
                            </label>
                            <select
                                id="tipoDocumento"
                                name="tipoDocumento"
                                value={formData.tipoDocumento}
                                onChange={handleChange}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-150 shadow-sm text-sm text-gray-700 bg-white"
                            >
                                <option value="CC">Cédula de Ciudadanía (CC)</option>
                                <option value="CE">Cédula de Extranjería (CE)</option>
                                <option value="NIT">NIT</option>
                            </select>
                        </div>
                        
                        {/* Documento */}
                        <div className="md:col-span-2">
                            <label htmlFor="documento" className="block text-xs font-semibold text-gray-700 mb-1">
                                # Documento <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="documento"
                                type="text"
                                name="documento"
                                value={formData.documento}
                                onChange={handleChange}
                                className={`w-full p-2.5 border rounded-lg focus:outline-none transition duration-150 shadow-sm text-sm text-gray-700 bg-white ${
                                    errors.documento
                                        ? "border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500"
                                        : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                }`}
                                placeholder="Ej: 1020304050"
                            />
                            {errors.documento && <p className="text-red-500 text-xs mt-1 font-medium">{errors.documento}</p>}
                        </div>
                    </div>

                    {/* Nombres y Apellidos */}
                    <div className="grid grid-cols-2 gap-4"> 
                        {[
                            { id: "primerNombre", label: "Primer Nombre *", placeholder: "Ej: Juan" },
                            { id: "segundoNombre", label: "Segundo Nombre", placeholder: "Ej: David (opcional)" },
                            { id: "primerApellido", label: "Primer Apellido *", placeholder: "Ej: Pérez" },
                            { id: "segundoApellido", label: "Segundo Apellido", placeholder: "Ej: Serna (opcional)" },
                        ].map(({ id, label, placeholder }) => (
                            <div key={id}>
                                <label htmlFor={id} className="block text-xs font-semibold text-gray-700 mb-1">
                                    {label}
                                </label>
                                <input
                                    id={id}
                                    type="text"
                                    name={id}
                                    value={formData[id]}
                                    onChange={handleChange}
                                    className={`w-full p-2.5 border rounded-lg focus:outline-none transition duration-150 shadow-sm text-sm text-gray-700 bg-white ${
                                        errors[id]
                                            ? "border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500"
                                            : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    }`}
                                    placeholder={placeholder}
                                />
                                {errors[id] && <p className="text-red-500 text-xs mt-1 font-medium">{errors[id]}</p>}
                            </div>
                        ))}
                    </div>

                    {/* Correo y Teléfono */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
                        {/* Correo */}
                        <div>
                            <label htmlFor="correo" className="block text-xs font-semibold text-gray-700 mb-1">
                                Correo <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="correo"
                                type="email"
                                name="correo"
                                value={formData.correo}
                                onChange={handleChange}
                                className={`w-full p-2.5 border rounded-lg focus:outline-none transition duration-150 shadow-sm text-sm text-gray-700 bg-white ${
                                    errors.correo
                                        ? "border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500"
                                        : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                }`}
                                placeholder="ejemplo@dominio.com"
                            />
                            {errors.correo && <p className="text-red-500 text-xs mt-1 font-medium">{errors.correo}</p>}
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label htmlFor="telefono" className="block text-xs font-semibold text-gray-700 mb-1">
                                Teléfono <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="telefono"
                                type="tel"
                                name="telefono"
                                value={formData.telefono}
                                onChange={handleChange}
                                className={`w-full p-2.5 border rounded-lg focus:outline-none transition duration-150 shadow-sm text-sm text-gray-700 bg-white ${
                                    errors.telefono
                                        ? "border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500"
                                        : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                }`}
                                placeholder="Ej: 3001234567"
                            />
                            {errors.telefono && <p className="text-red-500 text-xs mt-1 font-medium">{errors.telefono}</p>}
                        </div>
                    </div>

                    {/* Botón guardar con estilo azul */}
                    <button
                        type="submit"
                        disabled={isButtonDisabled}
                        className={`px-6 py-3 rounded-lg w-full font-bold transition duration-200 shadow-lg mt-6 ${
                            isButtonDisabled
                                ? "bg-gray-400 text-gray-200 cursor-not-allowed shadow-none"
                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-400/50 transform hover:scale-[1.02]"
                        }`}
                    >
                        {buttonText}
                    </button>
                </form>
            </div>
        </div>
    );
}