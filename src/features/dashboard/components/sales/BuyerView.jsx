import React from "react";
import { FaImage, FaMapMarkerAlt, FaMoneyBillWave } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";

export default function BuyerView({ buyer, onClose }) {
  const fullName = [
    buyer?.primerNombre,
    buyer?.segundoNombre,
    buyer?.primerApellido,
    buyer?.segundoApellido
  ]
    .filter(Boolean)
    .join(" ");

  const operacion =
    buyer?.ultimaVenta || buyer?.compra || buyer?.venta || buyer?.sale || buyer?.raw?.venta || null;
  const rawVenta = buyer?.raw?.venta || buyer?.raw || {};

  const inmueble = buyer?.inmueble || operacion?.inmueble || null;

  const registroInmobiliario =
    inmueble?.registro || inmueble?.registro_inmobiliario || inmueble?.registroInmobiliario || "-";

  const imagenInmueble =
    inmueble?.image ||
    inmueble?.imagen_principal ||
    inmueble?.imagen_portada ||
    inmueble?.portada ||
    (Array.isArray(inmueble?.imagenes) ? inmueble.imagenes[0] : "") ||
    "";

  const formatCurrency = (value) => {
    if (!value && value !== 0) return "-";
    return Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(Number(value));
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("es-CO");
  };

  const fechaCompra =
    operacion?.fecha_venta || operacion?.fechaCompra || operacion?.fecha || buyer?.fechaCompra || null;
  const valorCompra =
    operacion?.valor_venta || operacion?.valorCompra || operacion?.valor || buyer?.valorCompra || null;
  const medioPago =
    operacion?.medio_pago ||
    operacion?.medioPago ||
    operacion?.descripcion_pago ||
    operacion?.medio_pago_descripcion ||
    operacion?.medioPagoDescripcion ||
    rawVenta?.medio_pago ||
    rawVenta?.medioPago ||
    rawVenta?.descripcion_pago ||
    rawVenta?.medio_pago_descripcion ||
    rawVenta?.medioPagoDescripcion ||
    buyer?.medioPago ||
    buyer?.medio_pago ||
    buyer?.descripcion_pago ||
    buyer?.medioPagoDescripcion ||
    buyer?.medio_pago_descripcion ||
    null;
  const estadoVenta =
    operacion?.estado || operacion?.estado_venta || buyer?.estado_venta || buyer?.estado || null;

  return (
    <AnimatePresence>
      {buyer && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm z-50 p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6 relative max-h-[88vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25 }}
          >
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-5 right-5 text-gray-500 hover:text-blue-600 transition duration-150 p-1 rounded-full"
              aria-label="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </motion.button>

            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Información del comprador</h2>
                <p className="text-sm text-gray-600">
                  Detalles completos del comprador, el inmueble y la operación realizada.
                </p>
              </div>

              {/* Info personal */}
              <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Información personal</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Nombre completo:</p>
                    <p className="text-gray-900">{fullName || "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Documento:</p>
                    <p className="text-gray-900">
                      {buyer?.tipoDocumento} - {buyer?.documento}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Teléfono:</p>
                    <p className="text-gray-900">{buyer?.telefono || "-"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="font-semibold text-gray-700">Correo electrónico:</p>
                    {buyer?.correo ? (
                      <a href={`mailto:${buyer.correo}`} className="text-blue-600 hover:text-blue-800 underline">
                        {buyer.correo}
                      </a>
                    ) : (
                      <p className="text-gray-900">-</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Operación */}
              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FaMoneyBillWave className="text-green-600" />
                  Datos de la operación
                </h3>

                {operacion ? (
                  <div className="space-y-3 text-sm text-gray-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                      <div>
                        <p className="font-semibold text-gray-700">Fecha de compra:</p>
                        <p className="text-gray-900">{formatDate(fechaCompra)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Valor de compra:</p>
                        <p className="text-gray-900 font-semibold">{formatCurrency(valorCompra)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                      <div>
                        <p className="font-semibold text-gray-700">Medio de pago:</p>
                        <p className="text-gray-900">{medioPago || "-"}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Estado de la venta:</p>
                        <p className="text-gray-900">{estadoVenta || "-"}</p>
                      </div>
                    </div>

                    {(operacion?.observaciones || buyer?.observaciones) && (
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">Observaciones:</p>
                        <p className="text-gray-900 bg-white rounded-lg p-3 border border-gray-200">
                          {operacion?.observaciones || buyer?.observaciones}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FaImage size={36} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 italic">
                      Aún no se ha registrado una operación de compra para este comprador.
                    </p>
                  </div>
                )}
              </section>

              {/* Inmueble */}
              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-blue-600" />
                  Inmueble adquirido
                </h3>

                {inmueble ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200 overflow-hidden">
                        {imagenInmueble ? (
                          <img src={imagenInmueble} alt="Inmueble" className="w-full h-full object-cover" />
                        ) : (
                          <FaImage size={24} />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-700">Registro inmobiliario:</p>
                        <p className="text-gray-900">{registroInmobiliario}</p>
                        <p className="font-semibold text-gray-700">Categoría / Tipo:</p>
                        <p className="text-gray-900">
                          {inmueble?.categoria || inmueble?.tipo || inmueble?.categoriaInmueble || "N/D"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-gray-700">Dirección:</p>
                        <p className="text-gray-900">{inmueble?.direccion || "N/D"}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Ubicación:</p>
                        <p className="text-gray-900">
                          {inmueble?.ciudad || "N/D"}, {inmueble?.departamento || "N/D"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm italic">Sin inmuebles asignados</div>
                )}
              </section>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
              >
                Cerrar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
