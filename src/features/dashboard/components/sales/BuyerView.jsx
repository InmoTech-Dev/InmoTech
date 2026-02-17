import React from "react";
import { FaImage, FaMapMarkerAlt, FaMoneyBillWave } from "react-icons/fa";

export default function BuyerView({ buyer, onClose }) {
  if (!buyer) return null;

  const fullName = [
    buyer.primerNombre,
    buyer.segundoNombre,
    buyer.primerApellido,
    buyer.segundoApellido
  ]
    .filter(Boolean)
    .join(" ");

  const inmueble = buyer.inmueble || null;
  const hasOperacion = Boolean(
    buyer.fechaCompra ||
      buyer.valorCompra ||
      buyer.entidadFinanciera ||
      buyer.numeroCredito ||
      buyer.montoFinanciado ||
      buyer.observaciones ||
      (buyer.tipoCompra &&
        `${buyer.tipoCompra}`.trim().toLowerCase() !== "directa")
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 pr-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Informacion del comprador</h2>
          <p className="text-gray-600 text-sm">
            Detalles completos del comprador, el inmueble y la operacion realizada.
          </p>
        </div>

        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-500 hover:text-blue-600 transition duration-150 p-1 rounded-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2">
          <section className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-lg font-bold text-blue-800 mb-3 pb-2 border-b border-blue-200">
              Informacion personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Nombre completo:</p>
                <p className="text-gray-900">{fullName || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Documento:</p>
                <p className="text-gray-900">
                  {buyer.tipoDocumento} - {buyer.documento}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Correo electronico:</p>
                {buyer.correo ? (
                  <a href={`mailto:${buyer.correo}`} className="text-blue-600 hover:text-blue-800 underline">
                    {buyer.correo}
                  </a>
                ) : (
                  <p className="text-gray-900">-</p>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-700">Telefono:</p>
                <p className="text-gray-900">{buyer.telefono || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Ciudad de residencia:</p>
                <p className="text-gray-900">{buyer.ciudadResidencia || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Direccion anterior:</p>
                <p className="text-gray-900">{buyer.direccionAnterior || "-"}</p>
              </div>
            </div>
          </section>

          <section className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-lg font-bold text-green-800 mb-3 pb-2 border-b border-green-200 flex items-center gap-2">
              <FaMoneyBillWave className="text-green-600" />
              Datos de la operacion
            </h3>

            {hasOperacion ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Fecha de compra:</p>
                    <p className="text-gray-900">
                      {buyer.fechaCompra ? new Date(buyer.fechaCompra).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Tipo de compra:</p>
                    <p className="text-gray-900">{buyer.tipoCompra || "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Valor de compra:</p>
                    <p className="text-gray-900 font-semibold">
                      {buyer.valorCompra ? Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: "COP",
                        maximumFractionDigits: 0
                      }).format(Number(buyer.valorCompra)) : "-"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
                  <div>
                    <p className="font-semibold text-gray-700">Entidad financiera:</p>
                    <p className="text-gray-900">{buyer.entidadFinanciera || "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Numero de credito:</p>
                    <p className="text-gray-900">{buyer.numeroCredito || "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Monto financiado:</p>
                    <p className="text-gray-900">
                      {buyer.montoFinanciado
                        ? Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: "COP",
                            maximumFractionDigits: 0
                          }).format(Number(buyer.montoFinanciado))
                        : "-"}
                    </p>
                  </div>
                </div>

                {buyer.observaciones && (
                  <div className="mt-4 text-sm">
                    <p className="font-semibold text-gray-700 mb-1">Observaciones:</p>
                    <p className="text-gray-900 bg-white rounded-lg p-3 border border-gray-200">{buyer.observaciones}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <FaImage size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 italic">Aun no se ha registrado una operacion de compra para este comprador.</p>
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100 flex items-center gap-2">
              <FaMapMarkerAlt className="text-blue-600" />
              Inmueble adquirido
            </h3>

            {inmueble ? (
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-shrink-0 w-full md:w-40 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200">
                  <FaImage size={32} />
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Registro inmobiliario:</p>
                    <p className="text-gray-900">{inmueble.registro || "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Categoria:</p>
                    <p className="text-gray-900">{inmueble.categoria || "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Direccion:</p>
                    <p className="text-gray-900">{inmueble.direccion || "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Ubicacion:</p>
                    <p className="text-gray-900">
                      {[inmueble.ciudad, inmueble.departamento].filter(Boolean).join(", ") || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Estado:</p>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${
                        inmueble.estado === "Activo"
                          ? "bg-green-100 text-green-700 border-green-400"
                          : "bg-yellow-100 text-yellow-700 border-yellow-400"
                      }`}
                    >
                      {inmueble.estado}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <FaImage size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 italic">Aun no se ha vinculado un inmueble a este comprador.</p>
              </div>
            )}
          </section>
        </div>

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
