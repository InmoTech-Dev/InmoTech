import React, { useState } from "react";
import { FaTimes, FaSave } from "react-icons/fa";

export default function EditTenantForm({ tenant, onClose, onUpdate }) {
  const [formData, setFormData] = useState({ ...tenant });
  const [errors, setErrors] = useState({});

  if (!tenant) return null;

  // 🔹 Manejo de cambios
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validación rápida por campo
    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, [name]: "Este campo es obligatorio" }));
    } else {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // 🔹 Guardar cambios
  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    ["primerNombre", "primerApellido", "correo", "telefono"].forEach((field) => {
      if (!formData[field] || !formData[field].trim()) {
        newErrors[field] = "Este campo es obligatorio";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onUpdate(formData);
    onClose();
  };

  return (
    // Fondo del modal con estilo consistente
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 z-50 p-4">
      {/* Contenido principal del modal */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-hidden">
        
        {/* Header con estilo del banner */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Editar Arrendatario</h2>
          <p className="text-gray-600 text-sm">Actualice la información del arrendatario</p>
        </div>

        {/* Botón cerrar con estilo azul */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-500 hover:text-blue-600 transition duration-150 p-1 rounded-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-4">
            
            {/* Primer Nombre */}
            <div>
              <label htmlFor="primerNombre" className="block font-semibold text-gray-700 mb-2">
                Primer nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="primerNombre"
                type="text"
                name="primerNombre"
                value={formData.primerNombre}
                onChange={handleChange}
                className={`w-full border rounded-lg p-3 transition duration-150 ${
                  errors.primerNombre
                    ? "border-red-500 ring-2 ring-red-500"
                    : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                }`}
                placeholder="Ej: Juan"
              />
              {errors.primerNombre && (
                <p className="text-red-500 text-sm mt-1">{errors.primerNombre}</p>
              )}
            </div>

            {/* Primer Apellido */}
            <div>
              <label htmlFor="primerApellido" className="block font-semibold text-gray-700 mb-2">
                Primer apellido <span className="text-red-500">*</span>
              </label>
              <input
                id="primerApellido"
                type="text"
                name="primerApellido"
                value={formData.primerApellido}
                onChange={handleChange}
                className={`w-full border rounded-lg p-3 transition duration-150 ${
                  errors.primerApellido
                    ? "border-red-500 ring-2 ring-red-500"
                    : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                }`}
                placeholder="Ej: Pérez"
              />
              {errors.primerApellido && (
                <p className="text-red-500 text-sm mt-1">{errors.primerApellido}</p>
              )}
            </div>

            {/* Correo */}
            <div>
              <label htmlFor="correo" className="block font-semibold text-gray-700 mb-2">
                Correo electrónico <span className="text-red-500">*</span>
              </label>
              <input
                id="correo"
                type="email"
                name="correo"
                value={formData.correo}
                onChange={handleChange}
                className={`w-full border rounded-lg p-3 transition duration-150 ${
                  errors.correo
                    ? "border-red-500 ring-2 ring-red-500"
                    : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                }`}
                placeholder="ejemplo@dominio.com"
              />
              {errors.correo && (
                <p className="text-red-500 text-sm mt-1">{errors.correo}</p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label htmlFor="telefono" className="block font-semibold text-gray-700 mb-2">
                Teléfono <span className="text-red-500">*</span>
              </label>
              <input
                id="telefono"
                type="text"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className={`w-full border rounded-lg p-3 transition duration-150 ${
                  errors.telefono
                    ? "border-red-500 ring-2 ring-red-500"
                    : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                }`}
                placeholder="Ej: 3001234567"
              />
              {errors.telefono && (
                <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>
              )}
            </div>

          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition duration-150 transform hover:scale-[1.02]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-400/50 hover:bg-blue-700 transition duration-150 transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <FaSave size={16} />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}