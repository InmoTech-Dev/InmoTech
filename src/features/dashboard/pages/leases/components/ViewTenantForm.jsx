import React from "react";
import { FaTimes, FaImage } from "react-icons/fa";

export default function ViewTenantModal({ tenant, onClose }) {
  if (!tenant) return null;

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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Información del Arrendatario</h2>
          <p className="text-gray-600 text-sm">Detalles completos del arrendatario y sus propiedades</p>
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
          
          {/* --- Sección de Información Personal --- */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-lg font-bold text-blue-800 mb-3 pb-2 border-b border-blue-200">
              Información Personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Tipo de documento:</p>
                <p className="text-gray-900">{tenant.tipoDocumento || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Número de documento:</p>
                <p className="text-gray-900">{tenant.documento || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Primer nombre:</p>
                <p className="text-gray-900">{tenant.primerNombre || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Segundo nombre:</p>
                <p className="text-gray-900">{tenant.segundoNombre || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Primer apellido:</p>
                <p className="text-gray-900">{tenant.primerApellido || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Segundo apellido:</p>
                <p className="text-gray-900">{tenant.segundoApellido || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Correo electrónico:</p>
                {tenant.correo ? (
                  <a href={`mailto:${tenant.correo}`} className="text-blue-600 hover:text-blue-800 underline">
                    {tenant.correo}
                  </a>
                ) : (
                  <p className="text-gray-900">-</p>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-700">Teléfono:</p>
                <p className="text-gray-900">{tenant.telefono || "-"}</p>
              </div>
            </div>
          </div>

          {/* --- Sección de Inmuebles Arrendados --- */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-lg font-bold text-green-800 mb-3 pb-2 border-b border-green-200">
              Inmuebles Arrendados
            </h3>
            
            {tenant.inmueblesArrendados && tenant.inmueblesArrendados.length > 0 ? (
              <div className="space-y-4">
                {tenant.inmueblesArrendados.map((inmueble, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition duration-150">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200">
                        <FaImage size={24} />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-gray-800 text-base mb-2">{inmueble.nombre}</h4>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">Área:</span>
                            <span>{inmueble.m2} m²</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">Habitaciones:</span>
                            <span>{inmueble.hab}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">Baños:</span>
                            <span>{inmueble.baños}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          inmueble.estado === "Activo" 
                            ? "bg-green-100 text-green-700 border-green-400" 
                            : "bg-yellow-100 text-yellow-700 border-yellow-400"
                        }`}>
                          {inmueble.estado}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm border-t border-gray-100 pt-3">
                      <div>
                        <p className="font-semibold text-gray-700">Registro inmobiliario:</p>
                        <p className="text-gray-900">{inmueble.registro}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Tipo de inmueble:</p>
                        <p className="text-gray-900">{inmueble.tipo}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="font-semibold text-gray-700">Dirección:</p>
                        <p className="text-gray-900">{inmueble.direccion}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-white rounded-lg border border-gray-200">
                <FaImage className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-gray-500 italic">No hay inmuebles registrados para este arrendatario.</p>
              </div>
            )}
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