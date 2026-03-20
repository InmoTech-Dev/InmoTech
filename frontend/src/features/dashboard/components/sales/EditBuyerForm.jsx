import React, { useState, useEffect } from "react";

export default function EditBuyerForm({ buyerData, onUpdate, onClose }) {
  const [formData, setFormData] = useState(buyerData);
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false); // Asumo un estado para el botón

  // Usa useEffect para actualizar el estado interno si el 'buyerData' cambia desde el padre.
  useEffect(() => {
    setFormData(buyerData);
    setErrors({}); // Limpia errores al cargar nuevos datos
  }, [buyerData]);

  // Función de validación para campos específicos
  const validateField = (name, value) => {
    let error = "";

    if (name === "documento") {
      if (value.length > 0 && !/^\d*$/.test(value)) {
        error = "Solo se permiten números en el documento.";
      } else if (value.length > 0 && value.length < 8) {
        error = "Mínimo 8 dígitos.";
      }
    } else if (name === "nombreCompleto") {
      if (value.length > 0 && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(value)) {
        error = "Solo se permiten letras en el nombre.";
      }
    } else if (name === "correo") {
      if (value.length > 0 && !/^.+@.+\..+$/.test(value)) {
        error = "Debe ser un correo válido (contener '@').";
      }
    } else if (name === "telefono") {
      if (value.length > 0 && !/^\d*$/.test(value)) {
        error = "Solo se permiten números en el teléfono.";
      }
    }
    
    // Validar que los campos requeridos no estén vacíos al final de la edición
    if ((name === "documento" || name === "nombreCompleto" || name === "correo" || name === "telefono") && value.trim() === "") {
        error = "Este campo es obligatorio.";
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({ ...formData, [name]: value });

    // Validar en tiempo real
    const error = validateField(name, value);
    setErrors(prevErrors => ({ ...prevErrors, [name]: error }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let formErrors = {};
    let isFormValid = true;
    
    // Revalidación final de todos los campos
    ["documento", "nombreCompleto", "correo", "telefono"].forEach(name => {
        const error = validateField(name, formData[name]);
        if (error) {
            formErrors[name] = error;
            isFormValid = false;
        }
    });

    setErrors(formErrors);

    if (!isFormValid) {
        console.error("Errores de validación en el formulario:", formErrors);
        return;
    }

    // El objeto final de datos mantiene el ID original
    const updatedBuyer = {
      ...formData,
      id: buyerData.id, // Asegura que se mantiene el ID original del comprador
    };

    // Llama a la función de actualización del componente padre
    if (onUpdate) onUpdate(updatedBuyer);
    if (onClose) onClose();
  };

  if (!formData) return <div>Cargando datos del comprador...</div>;

  // Determinar si hay errores para deshabilitar el botón
  const hasErrors = Object.values(errors).some(error => error !== "");

  // Clases de estilo dinámicas para el input
  const inputClass = (name) => `w-full rounded-md p-2 focus:outline-none focus:ring-2 transition duration-150 ${
    errors[name] ? 'border-2 border-red-500 focus:ring-red-500' : 'border border-gray-300 focus:ring-purple-500'
  }`;
  const errorText = (name) => errors[name] && (
    <p className="text-red-500 text-xs mt-1 font-semibold">{errors[name]}</p>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
        >
          ✖
        </button>

        <h2 className="text-xl font-bold text-center text-gray-900 mb-4">
          Editar Comprador (ID: {buyerData.id})
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold text-gray-900">Tipo documento</label>
            <select
              name="tipoDocumento"
              value={formData.tipoDocumento}
              onChange={handleChange}
              className="w-full border rounded p-2"
            >
              <option value="CC">CC</option>
              <option value="CE">CE</option>
              <option value="NIT">NIT</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-900"># Documento</label>
            <input
              type="text"
              name="documento"
              value={formData.documento}
              onChange={handleChange}
              className={inputClass("documento")}
              required
              inputMode="numeric"
            />
            {errorText("documento")}
          </div>

          <div>
            <label className="block font-bold text-gray-900">Nombre completo</label>
            <input
              type="text"
              name="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={handleChange}
              className={inputClass("nombreCompleto")}
              required
            />
            {errorText("nombreCompleto")}
          </div>

          <div>
            <label className="block font-bold text-gray-900">Correo</label>
            <input
              type="email"
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              className={inputClass("correo")}
              required
            />
            {errorText("correo")}
          </div>

          <div>
            <label className="block font-bold text-gray-900">Teléfono</label>
            <input
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className={inputClass("telefono")}
              required
              inputMode="tel"
            />
            {errorText("telefono")}
          </div>

          {/* Botón MODIFICADO: Ahora se deshabilita si hay errores */}
          <button
            type="submit"
            disabled={hasErrors}
            className={`text-white px-4 py-2 rounded w-full transition duration-150 shadow-lg shadow-purple-200/50
              ${hasErrors 
                ? 'bg-gray-400 cursor-not-allowed' 
                : (isEditing ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700')
              }`}
          >
            Actualizar Comprador
          </button>
        </form>
      </div>
    </div>
  );
}
