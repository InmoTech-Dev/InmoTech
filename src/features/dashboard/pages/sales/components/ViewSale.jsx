import React from "react";
import EstadoBadge from "./EstadoBadge";

export default function ViewSaleModal({ sale, onClose }) {
  if (!sale) return null;

  return (
    // 🔑 Fondo del modal con desenfoque - CAMBIO PRINCIPAL
    <div 
      className="fixed inset-0 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm z-50 p-4"
      onClick={onClose}
    >
      {/* Contenido principal del modal */}
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header con estilo del banner */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Detalle de la Venta</h2>
          <p className="text-gray-600 text-sm">Información completa de la transacción de venta</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">ID:</p>
                <p className="text-gray-900">{sale.id}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Registro:</p>
                <p className="text-gray-900">{sale.registro}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Tipo:</p>
                <p className="text-gray-900">{sale.tipo}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Fecha:</p>
                <p className="text-gray-900">{sale.fecha}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Valor:</p>
                <p className="text-gray-900 font-bold text-green-600">{sale.valor}</p>
              </div>
              
              {/* Estado movido hacia abajo con margen adicional */}
              <div className="mt-2">
                <p className="font-semibold text-gray-700">Estado:</p>
                <EstadoBadge estado={sale.estado} />
              </div>
              
              <div className="md:col-span-2 lg:col-span-3 mt-2">
                <p className="font-semibold text-gray-700">Seguimiento:</p>
                <p className="text-gray-900">{sale.estadoSeguimiento}</p>
              </div>
            </div>
          </div>

          {/* --- Sección del Comprador --- */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-lg font-bold text-green-800 mb-3 pb-2 border-b border-green-200">
              Información del Comprador
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Tipo de documento:</p>
                <p className="text-gray-900">{sale.compradorTipoDocumento}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Documento:</p>
                <p className="text-gray-900">{sale.compradorDocumento}</p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-700">Nombre completo:</p>
                <p className="text-gray-900">{sale.compradorNombreCompleto}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Correo:</p>
                <a href={`mailto:${sale.compradorCorreo}`} className="text-blue-600 hover:text-blue-800 underline">
                  {sale.compradorCorreo}
                </a>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Teléfono:</p>
                <p className="text-gray-900">{sale.compradorTelefono}</p>
              </div>
            </div>
          </div>

          {/* --- Sección del Vendedor --- */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="text-lg font-bold text-purple-800 mb-3 pb-2 border-b border-purple-200">
              Información del Vendedor
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Tipo de documento:</p>
                <p className="text-gray-900">{sale.vendedorTipoDocumento}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Documento:</p>
                <p className="text-gray-900">{sale.vendedorDocumento}</p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-700">Nombre completo:</p>
                <p className="text-gray-900">{sale.vendedorNombreCompleto}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Correo:</p>
                <a href={`mailto:${sale.vendedorCorreo}`} className="text-blue-600 hover:text-blue-800 underline">
                  {sale.vendedorCorreo}
                </a>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Teléfono:</p>
                <p className="text-gray-900">{sale.vendedorTelefono}</p>
              </div>
            </div>
          </div>

          {/* --- Sección del Inmueble --- */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h3 className="text-lg font-bold text-yellow-800 mb-3 pb-2 border-b border-yellow-200">
              Información del Inmueble
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Tipo:</p>
                <p className="text-gray-900">{sale.inmuebleTipo}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Registro:</p>
                <p className="text-gray-900">{sale.inmuebleRegistro}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Nombre:</p>
                <p className="text-gray-900">{sale.inmuebleNombre}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Área:</p>
                <p className="text-gray-900">{sale.inmuebleArea} m²</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Habitaciones:</p>
                <p className="text-gray-900">{sale.inmuebleHabitaciones}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Baños:</p>
                <p className="text-gray-900">{sale.inmuebleBanos}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Garaje:</p>
                <p className="text-gray-900">{sale.inmuebleGaraje ? "Sí" : "No"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Estrato:</p>
                <p className="text-gray-900">{sale.inmuebleEstrato}</p>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <p className="font-semibold text-gray-700">Dirección:</p>
                <p className="text-gray-900">{sale.inmuebleDireccion}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Barrio:</p>
                <p className="text-gray-900">{sale.inmuebleBarrio}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Ciudad:</p>
                <p className="text-gray-900">{sale.inmuebleCiudad}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Departamento:</p>
                <p className="text-gray-900">{sale.inmuebleDepartamento}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">País:</p>
                <p className="text-gray-900">{sale.inmueblePais}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Precio:</p>
                <p className="text-gray-900 font-bold text-green-600">{sale.inmueblePrecio} $</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Estado:</p>
                <p className="text-gray-900">{sale.inmuebleEstado}</p>
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