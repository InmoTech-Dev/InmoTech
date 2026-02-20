import React from "react";
import { FaImage } from "react-icons/fa";

export default function BuyerView({ buyer, onClose }) {
  if (!buyer) return null;

  return (
    // 🔑 Fondo del modal con desenfoque - CAMBIO PRINCIPAL
    <div 
      className="fixed inset-0 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm z-50 p-4"
      onClick={onClose}
    >
      {/* Contenido principal del modal */}
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header con estilo del banner */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Información del Comprador</h2>
          <p className="text-gray-600 text-sm">Detalles completos del comprador y sus propiedades</p>
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
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          
          {/* --- Sección de Información Personal --- */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-lg font-bold text-blue-800 mb-3 pb-2 border-b border-blue-200">
              Información Personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Tipo de documento:</p>
                <p className="text-gray-900">{buyer.tipoDocumento}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Número de documento:</p>
                <p className="text-gray-900">{buyer.documento}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Primer nombre:</p>
                <p className="text-gray-900">{buyer.primerNombre}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Segundo nombre:</p>
                <p className="text-gray-900">{buyer.segundoNombre || '-'}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Primer apellido:</p>
                <p className="text-gray-900">{buyer.primerApellido}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Segundo apellido:</p>
                <p className="text-gray-900">{buyer.segundoApellido || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-700">Correo:</p>
                <a href={`mailto:${buyer.correo}`} className="text-blue-600 hover:text-blue-800 underline">
                  {buyer.correo}
                </a>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-700">Teléfono:</p>
                <p className="text-gray-900">{buyer.telefono}</p>
              </div>
            </div>
          </div>

          {/* --- Datos de la operación --- */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-lg font-bold text-green-800 mb-3 pb-2 border-b border-green-200">
              Datos de la operación
            </h3>
            {buyer.ultimaVenta ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-800">
                <div>
                  <p className="font-semibold text-gray-700">Fecha de compra:</p>
                  <p>{buyer.ultimaVenta.fecha_venta ? new Date(buyer.ultimaVenta.fecha_venta).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Valor de compra:</p>
                  <p>${Number(buyer.ultimaVenta.valor_venta || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Estado:</p>
                  <p>{buyer.ultimaVenta.estado || 'N/D'}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm italic">
                Aún no se ha registrado una operación de compra para este comprador.
              </div>
            )}
          </div>

          {/* --- Inmueble adquirido --- */}
          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">
              Inmueble adquirido
            </h3>
            {buyer.inmueble ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-800">
                <div className="col-span-1">
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200">
                      <FaImage size={28} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-700">Registro inmobiliario:</p>
                      <p>{buyer.inmueble.registro_inmobiliario || '-'}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Categoría:</p>
                  <p>{buyer.inmueble.categoria || buyer.inmueble.tipo || 'N/D'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="font-semibold text-gray-700">Dirección:</p>
                  <p>{buyer.inmueble.direccion || 'N/D'}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Ubicación:</p>
                  <p>
                    {buyer.inmueble.ciudad || 'N/D'}, {buyer.inmueble.departamento || 'N/D'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Estado:</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                    {buyer.inmueble.estado_frontend || buyer.inmueble.estado || 'N/D'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm italic">
                Sin inmuebles asignados
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
