import React from "react";
import { FaEye, FaTimes } from "react-icons/fa";

export default function InterestedPeopleTable({ onClose }) {
  const people = [
    {
      id: 1,
      registro: "110010123456",
      inmueble: "Casa",
      nombre: "Juan Carlos Jaramillo Sossa",
      fecha: "22/05/2025",
      valor: "15.000.000$",
      estado: "Pagado",
    },
    {
      id: 2,
      registro: "760010789012",
      inmueble: "Apartamento",
      nombre: "Pablo Camargo Buitrago",
      fecha: "10/02/2025",
      valor: "32.500.000$",
      estado: "Pendiente",
    },
    {
      id: 3,
      registro: "050010345678",
      inmueble: "Apartaestudio",
      nombre: "Fernando Andres Patiño Sepulveda",
      fecha: "15/07/2025",
      valor: "28.000.000$",
      estado: "Debe",
    },
  ];

  return (
    // 🔑 Fondo del modal con desenfoque - CAMBIO PRINCIPAL
    <div 
      className="fixed inset-0 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm z-50 p-4"
      onClick={onClose}
    >
      {/* Contenido principal del modal */}
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl p-6 relative max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header con estilo del banner */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Personas Interesadas</h2>
          <p className="text-gray-600 text-sm">Lista de clientes interesados en propiedades</p>
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
        <div className="max-h-[65vh] overflow-y-auto pr-2">
          {/* Tabla */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-700">
                  <th className="p-4 font-semibold border-b border-gray-200">ID</th>
                  <th className="p-4 font-semibold border-b border-gray-200">Registro Inmobiliario</th>
                  <th className="p-4 font-semibold border-b border-gray-200">Tipo de Inmueble</th>
                  <th className="p-4 font-semibold border-b border-gray-200">Nombre Completo</th>
                  <th className="p-4 font-semibold border-b border-gray-200">Fecha</th>
                  <th className="p-4 font-semibold border-b border-gray-200 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p, index) => (
                  <tr 
                    key={p.id} 
                    className={`hover:bg-blue-50 transition duration-150 ${
                      index < people.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <td className="p-4 text-gray-900 font-medium">{p.id}</td>
                    <td className="p-4 text-gray-700">{p.registro}</td>
                    <td className="p-4 text-gray-700">{p.inmueble}</td>
                    <td className="p-4 text-gray-700">{p.nombre}</td>
                    <td className="p-4 text-gray-700">{p.fecha}</td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-center">
                        <button 
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition duration-150 transform hover:scale-[1.02] flex items-center gap-2"
                          title="Ver detalles"
                        >
                          <FaEye size={14} />
                          <span>Ver Detalles</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Información de resumen */}
          <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-700">Total registros: <strong className="text-blue-600">{people.length} personas</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-700">Mostrando: <strong>{people.length} de {people.length}</strong></span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Pie del modal con botón azul */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-400/50 hover:bg-blue-700 transition duration-150 transform hover:scale-[1.02]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}