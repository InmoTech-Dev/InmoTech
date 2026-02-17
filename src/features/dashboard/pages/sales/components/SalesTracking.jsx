import React, { useState } from "react";

export default function PurchaseTrackingModal({ venta, onClose, onUpdate }) {
  if (!venta) return null;

  // Estado local editable
  const [estado, setEstado] = useState(venta.estado || "Pendiente");
  const [estadoSeguimiento, setEstadoSeguimiento] = useState(
    venta.estadoSeguimiento || "Iniciado"
  );

  const handleSave = () => {
    const updatedVenta = {
      ...venta,
      estado,
      estadoSeguimiento,
    };
    onUpdate(updatedVenta);
    onClose();
  };

  // 🔹 Estilos dinámicos para el estado
  const getEstadoStyle = (estado) => {
    switch (estado) {
      case "Pagado":
        return "bg-green-100 text-green-700 border border-green-400";
      case "Pendiente":
        return "bg-yellow-100 text-yellow-700 border border-yellow-400";
      case "Debe":
        return "bg-red-100 text-red-700 border border-red-400";
      default:
        return "bg-gray-100 text-gray-700 border";
    }
  };

  return (
    // 🔑 Fondo del modal con desenfoque - CAMBIO PRINCIPAL
    <div 
      className="fixed inset-0 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm z-50 p-4"
      onClick={onClose}
    >
      {/* Contenido principal del modal */}
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header con estilo del banner */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Seguimiento de la Compra</h2>
          <p className="text-gray-600 text-sm">Gestión y actualización del estado de la transacción</p>
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

        {/* Contenido desplazable */}
        <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2">
          
          {/* --- Sección de Información General --- */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-lg font-bold text-blue-800 mb-3 pb-2 border-b border-blue-200">
              Información General
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Registro:</p>
                <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                  {venta.registro || "N/A"}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Tipo:</p>
                <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                  {venta.tipo || "N/A"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-700">Comprador:</p>
                <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                  {venta.comprador || "N/A"}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Fecha:</p>
                <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                  {venta.fecha || "N/A"}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Valor:</p>
                <p className="text-gray-900 font-bold text-green-600 bg-white p-2 rounded border border-gray-200">
                  {venta.valor || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* --- Sección de Estado Editable --- */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="text-lg font-bold text-purple-800 mb-3 pb-2 border-b border-purple-200">
              Estado de Pago
            </h3>
            <div className="mb-4">
              <label className="block font-semibold text-gray-700 mb-2">Estado del Pago</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className={`p-3 rounded-lg w-full font-semibold cursor-pointer transition duration-150 ${getEstadoStyle(
                  estado
                )}`}
              >
                <option value="Pagado" className="bg-green-100 text-green-700">
                  Pagado
                </option>
                <option value="Pendiente" className="bg-yellow-100 text-yellow-700">
                  Pendiente
                </option>
                <option value="Debe" className="bg-red-100 text-red-700">
                  Debe
                </option>
              </select>
            </div>
          </div>

          {/* --- Sección de Seguimiento --- */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-lg font-bold text-green-800 mb-3 pb-2 border-b border-green-200">
              Seguimiento
            </h3>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-700">Responsable:</p>
                <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                  {venta.responsable || "Admin"}
                </p>
              </div>
              
              <div>
                <label className="block font-semibold text-gray-700 mb-2">
                  Estado del Seguimiento
                </label>
                <select
                  value={estadoSeguimiento}
                  onChange={(e) => setEstadoSeguimiento(e.target.value)}
                  className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                >
                  <option value="Iniciado">Iniciado</option>
                  <option value="En proceso">En proceso</option>
                  <option value="Completado">Completado</option>
                </select>
              </div>
              
              <div>
                <p className="font-semibold text-gray-700">Fecha de Seguimiento:</p>
                <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                  {venta.fechaSeguimiento || "22/05/2025"}
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-gray-700">Descripción:</p>
                <p className="text-gray-900 bg-white p-2 rounded border border-gray-200 min-h-[60px]">
                  {venta.descripcionSeguimiento || "Documentación en revisión"}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Pie del modal con botones */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition duration-150 transform hover:scale-[1.02]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-400/50 hover:bg-blue-700 transition duration-150 transform hover:scale-[1.02]"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}