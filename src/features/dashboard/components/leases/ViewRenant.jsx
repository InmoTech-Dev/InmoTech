import React from "react";
import { FaTimes, FaImage } from "react-icons/fa";

export default function ViewRenant({ renant, onClose }) {
  if (!renant) return null;

  const descripcionContrato =
    renant.ultimoSeguimientoDescripcion ||
    renant.ultimoSeguimientoComentario ||
    renant.ultimo_seguimiento_descripcion ||
    renant.ultimo_seguimiento_comentario ||
    renant.comentario ||
    renant.descripcion ||
    renant.descripcionContrato ||
    renant.descripcion_arriendo ||
    renant.descripcion_garantia ||
    renant.observaciones ||
    renant.descripcionInmueble ||
    "";

  // Normalizar datos del arrendatario
  const persona =
    renant.arrendatarioRaw ||
    renant.arrendatarioPersona ||
    renant.persona ||
    renant.arrendatario?.persona ||
    renant.arrendatario ||
    {};

  const tipoDocArr = persona.tipo_documento || renant.tipoDocArrendatario || renant.tipoDocInquilino || "";
  const numeroDocArr = persona.numero_documento || renant.numeroDocArrendatario || renant.numeroDocInquilino || "";
  const correoArr = persona.correo || renant.correoArrendatario || renant.correoInquilino || "";
  const telefonoArr = persona.telefono || renant.telefonoArrendatario || renant.telefonoInquilino || "";
  const nombreArr = persona.nombre_completo || renant.nombreCompletoArrendatario || "";

  // Codeudor
  const codeudorPersona =
    renant.codeudorRaw ||
    renant.codeudorPersona ||
    renant.codeudor?.persona ||
    (renant.codeudor && renant.codeudor.id_persona ? renant.codeudor : {}) ||
    renant.codeudor_persona ||
    renant.codeudorPersona ||
    {};
  const tipoDocCod = codeudorPersona.tipo_documento || renant.tipoDocCodeudor || "";
  const numeroDocCod = codeudorPersona.numero_documento || renant.numeroDocCodeudor || "";
  const correoCod = codeudorPersona.correo || renant.correoCodeudor || "";
  const telefonoCod = codeudorPersona.telefono || renant.telefonoCodeudor || "";
  const nombreCod = codeudorPersona.nombre_completo || renant.nombreCodeudor || "";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6 relative max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-blue-600 transition duration-150 p-1 rounded-full"
        >
          <FaTimes />
        </button>

        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Información del Arriendo</h2>
          <p className="text-sm text-gray-600">Detalles completos del contrato de arrendamiento.</p>
        </div>

        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* General contrato */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Información general del contrato</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Estado:</p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    renant.estado === "Pagado" || renant.estado === "Activo"
                      ? "bg-green-100 text-green-700 border-green-400"
                      : renant.estado === "Pendiente"
                      ? "bg-yellow-100 text-yellow-700 border-yellow-400"
                      : "bg-red-100 text-red-700 border-red-400"
                  }`}
                >
                  {renant.estado}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Fecha de inicio:</p>
                <p className="text-gray-900">{renant.fechaInicio}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Fecha final:</p>
                <p className="text-gray-900">{renant.fechaFinal}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Valor mensual:</p>
                <p className="text-gray-900 font-bold text-green-600">{renant.valorMensual}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Fecha de cobro:</p>
                <p className="text-gray-900">{renant.fechaCobro || "No especificada"}</p>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="font-semibold text-gray-700">Descripción:</p>
                <p className="text-gray-900 whitespace-pre-wrap">{descripcionContrato || "Sin descripción"}</p>
              </div>
            </div>
          </div>

          {/* Arrendatario */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Información del Arrendatario</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Tipo de documento:</p>
                <p className="text-gray-900">{tipoDocArr}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Número de documento:</p>
                <p className="text-gray-900">{numeroDocArr}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="font-semibold text-gray-700">Nombre completo:</p>
                <p className="text-gray-900">{nombreArr}</p>
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

          {/* Codeudor */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Información del Codeudor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Tipo de documento:</p>
                <p className="text-gray-900">{tipoDocCod}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Número de documento:</p>
                <p className="text-gray-900">{numeroDocCod}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="font-semibold text-gray-700">Nombre completo:</p>
                <p className="text-gray-900">{nombreCod}</p>
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

          {/* Inmueble */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Inmueble arrendado</h3>
            <div className="bg-white rounded-lg p-0">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-shrink-0 w-full md:w-24 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200">
                  <FaImage size={24} />
                </div>
                <div className="flex-grow space-y-2">
                  <h4 className="font-bold text-gray-800 text-base">{renant.nombreInmueble}</h4>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>Área: {renant.area} m²</span>
                    <span>Habitaciones: {renant.habitaciones}</span>
                    <span>Baños: {renant.banos}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
                <div>
                  <p className="font-semibold text-gray-700">Registro inmobiliario:</p>
                  <p className="text-gray-900">{renant.registroInmobiliario}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Tipo de inmueble:</p>
                  <p className="text-gray-900">{renant.tipoInmueble}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="font-semibold text-gray-700">Dirección:</p>
                  <p className="text-gray-900">{renant.direccion}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
