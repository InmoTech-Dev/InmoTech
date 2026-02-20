import React from "react";
import { FaTimes, FaImage } from "react-icons/fa";

export default function ViewRenant({ renant, onClose }) {
  if (!renant) return null;

  // Normalizar datos del arrendatario desde diferentes orígenes
  const persona =
    renant.arrendatarioRaw ||
    renant.arrendatarioPersona ||
    renant.persona ||
    renant.arrendatario?.persona ||
    renant.arrendatario ||
    {};

  const nombreCompleto = persona.nombre_completo || renant.nombreCompletoArrendatario || "";
  const [primerNombreArr, ...restNombres] = nombreCompleto.split(" ").filter(Boolean);
  const primerApellidoArr =
    (persona.apellido_completo || "").split(" ")[0] ||
    renant.primerApellidoArrendatario ||
    "";
  const segundoNombreArr = restNombres.join(" ") || renant.segundoNombreArrendatario || "";

  const tipoDocArr = persona.tipo_documento || renant.tipoDocArrendatario || renant.tipoDocInquilino || "";
  const numeroDocArr = persona.numero_documento || renant.numeroDocArrendatario || renant.numeroDocInquilino || "";
  const correoArr = persona.correo || renant.correoArrendatario || renant.correoInquilino || "";
  const telefonoArr = persona.telefono || renant.telefonoArrendatario || renant.telefonoInquilino || "";

  // Normalizar datos del codeudor
  const codeudorPersona =
    renant.codeudorRaw ||
    renant.codeudorPersona ||
    renant.codeudor?.persona ||
    (renant.codeudor && renant.codeudor.id_persona ? renant.codeudor : {}) ||
    {};
  const codeudorNombre = codeudorPersona.nombre_completo || "";
  const [primerNombreCod, ...restCod] = codeudorNombre.split(" ").filter(Boolean);
  const primerApellidoCod = (codeudorPersona.apellido_completo || "").split(" ")[0] || "";
  const segundoNombreCod = restCod.join(" ") || renant.segundoNombreCodeudor || "";
  const tipoDocCod = codeudorPersona.tipo_documento || renant.tipoDocCodeudor || "";
  const numeroDocCod = codeudorPersona.numero_documento || renant.numeroDocCodeudor || "";
  const correoCod = codeudorPersona.correo || renant.correoCodeudor || "";
  const telefonoCod = codeudorPersona.telefono || renant.telefonoCodeudor || "";

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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Información del Arriendo</h2>
          <p className="text-gray-600 text-sm">Detalles completos del contrato de arrendamiento</p>
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
                <p className="font-semibold text-gray-700">ID del Contrato:</p>
                <p className="text-gray-900">{renant.id}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Estado:</p>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  renant.estado === "Pagado" || renant.estado === "Activo"
                    ? "bg-green-100 text-green-700 border-green-400"
                    : renant.estado === "Pendiente"
                    ? "bg-yellow-100 text-yellow-700 border-yellow-400"
                    : "bg-red-100 text-red-700 border-red-400"
                }`}>
                  {renant.estado}
                </span>
              </div>
            </div>
          </div>

          {/* --- Sección del Arrendatario --- */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-lg font-bold text-green-800 mb-3 pb-2 border-b border-green-200">
              Información del Arrendatario
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Tipo de documento:</p>
                <p className="text-gray-900">{tipoDocArr}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Número de documento:</p>
                <p className="text-gray-900">{numeroDocArr}</p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-700">Nombre completo:</p>
                <p className="text-gray-900">
                  {[primerNombreArr, segundoNombreArr].filter(Boolean).join(" ")} {primerApellidoArr}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Teléfono:</p>
                <p className="text-gray-900">{telefonoArr}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Correo electrónico:</p>
                <a href={`mailto:${correoArr}`} className="text-blue-600 hover:text-blue-800 underline">
                  {correoArr}
                </a>
              </div>
            </div>
          </div>

          {/* --- Sección del Codeudor --- */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="text-lg font-bold text-purple-800 mb-3 pb-2 border-b border-purple-200">
              Información del Codeudor
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Tipo de documento:</p>
                <p className="text-gray-900">{tipoDocCod}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Número de documento:</p>
                <p className="text-gray-900">{numeroDocCod}</p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-700">Nombre completo:</p>
                <p className="text-gray-900">
                  {[primerNombreCod, segundoNombreCod].filter(Boolean).join(" ")} {primerApellidoCod}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Teléfono:</p>
                <p className="text-gray-900">{telefonoCod}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Correo electrónico:</p>
                <a href={`mailto:${correoCod}`} className="text-blue-600 hover:text-blue-800 underline">
                  {correoCod}
                </a>
              </div>
            </div>
          </div>

          {/* --- Sección del Inmueble --- */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h3 className="text-lg font-bold text-yellow-800 mb-3 pb-2 border-b border-yellow-200">
              Inmueble Arrendado
            </h3>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200">
                  <FaImage size={24} />
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-gray-800 text-base mb-2">{renant.nombreInmueble}</h4>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Área:</span>
                      <span>{renant.area} m²</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Habitaciones:</span>
                      <span>{renant.habitaciones}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Baños:</span>
                      <span>{renant.banos}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
                <div>
                  <p className="font-semibold text-gray-700">Registro inmobiliario:</p>
                  <p className="text-gray-900">{renant.registroInmobiliario}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Tipo de inmueble:</p>
                  <p className="text-gray-900">{renant.tipoInmueble}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="font-semibold text-gray-700">Dirección:</p>
                  <p className="text-gray-900">{renant.direccion}</p>
                </div>
              </div>
            </div>
          </div>

          {/* --- Sección del Contrato --- */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h3 className="text-lg font-bold text-red-800 mb-3 pb-2 border-b border-red-200">
              Información del Contrato
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Fecha de inicio:</p>
                <p className="text-gray-900">{renant.fechaInicio}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Fecha final:</p>
                <p className="text-gray-900">{renant.fechaFinal}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Fecha de cobro:</p>
                <p className="text-gray-900">{renant.fechaCobro}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Fecha límite pago:</p>
                <p className="text-gray-900">{renant.fechaLimite}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Valor mensual:</p>
                <p className="text-gray-900 font-bold text-green-600">{renant.valorMensual}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Precio del inmueble:</p>
                <p className="text-gray-900 font-bold text-green-600">{renant.precioInmueble}</p>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <p className="font-semibold text-gray-700">Precio total:</p>
                <p className="text-gray-900 font-bold text-green-600 text-lg">{renant.precio}</p>
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
