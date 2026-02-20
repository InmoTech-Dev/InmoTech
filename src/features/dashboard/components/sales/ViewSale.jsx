import React from "react";

export default function ViewSaleModal({ sale, onClose }) {
  if (!sale) return null;

  const raw = sale.raw || {};
  const show = (value, fallback = "N/D") =>
    value === null || value === undefined || value === "" ? fallback : value;
  const snapshot = sale.formSnapshot || {};
  const vendedor = sale.vendedor || sale.seller || {};
  const vendedorPersona = vendedor.persona || vendedor.Persona || {};

  const pick = (...values) => values.find((v) => v !== null && v !== undefined && v !== "");

  const buildPersonName = (persona = {}) => {
    const full = [persona.nombre_completo, persona.apellido_completo]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (full) return full;

    return [
      persona.primer_nombre,
      persona.segundo_nombre,
      persona.primer_apellido,
      persona.segundo_apellido,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  };

  // Priorizar siempre los campos crudos (raw) sobre los normalizados para evitar valores "N/D" que vengan de fallback
  const vendedorTipoDocumento = pick(
    raw.vendedorTipoDocumento,
    raw.tipo_documento_vendedor,
    raw.vendedor_tipo_documento,
    raw.tipo_doc_vendedor,
    sale.tipo_documento_vendedor,
    sale.vendedor_tipo_documento,
    sale.tipo_doc_vendedor,
    sale.vendedorTipoDocumento,
    snapshot.vendedorTipoDocumento,
    snapshot.tipo_documento_vendedor,
    snapshot.tipo_doc_vendedor,
    vendedor.tipo_documento,
    vendedorPersona.tipo_documento
  );

  const vendedorDocumento = pick(
    raw.vendedorDocumento,
    raw.vendedor_numero_documento,
    raw.numero_doc_vendedor,
    raw.documento_vendedor,
    sale.vendedor_numero_documento,
    sale.numero_doc_vendedor,
    sale.documento_vendedor,
    sale.vendedorDocumento,
    snapshot.vendedorDocumento,
    snapshot.vendedor_numero_documento,
    snapshot.numero_doc_vendedor,
    snapshot.documento_vendedor,
    vendedor.numero_documento,
    vendedorPersona.numero_documento
  );

  const vendedorNombreCompleto =
    pick(
      raw.vendedorNombreCompleto,
      raw.vendedor_nombre_completo,
      raw.vendedor_nombre,
      raw.nombre_vendedor,
      raw.nombreVendedor,
      raw.nombre_completo_vendedor,
      sale.vendedor_nombre_completo,
      sale.vendedor_nombre,
      sale.nombre_vendedor,
      sale.nombreVendedor,
      sale.nombre_completo_vendedor,
      sale.vendedorNombreCompleto,
      snapshot.vendedorNombreCompleto,
      snapshot.vendedor_nombre_completo,
      snapshot.vendedor_nombre,
      snapshot.nombre_vendedor,
      snapshot.nombre_completo_vendedor,
      vendedor.nombre_completo
    ) ||
    buildPersonName(vendedor) ||
    buildPersonName(vendedorPersona);

  const vendedorCorreo = pick(
    raw.vendedorCorreo,
    raw.vendedor_correo,
    raw.correo_vendedor,
    sale.vendedor_correo,
    sale.correo_vendedor,
    sale.vendedorCorreo,
    snapshot.vendedorCorreo,
    snapshot.vendedor_correo,
    snapshot.correo_vendedor,
    vendedor.correo,
    vendedorPersona.correo
  );

  const vendedorTelefono = pick(
    raw.vendedorTelefono,
    raw.vendedor_telefono,
    raw.telefono_vendedor,
    sale.vendedor_telefono,
    sale.telefono_vendedor,
    sale.vendedorTelefono,
    snapshot.vendedorTelefono,
    snapshot.vendedor_telefono,
    snapshot.telefono_vendedor,
    vendedor.telefono,
    vendedorPersona.telefono
  );

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
                <p className="font-semibold text-gray-700">Registro:</p>
                <p className="text-gray-900">{show(sale.registro || snapshot.inmuebleRegistro)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Tipo:</p>
                <p className="text-gray-900">{show(sale.tipo || snapshot.inmuebleTipo)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Fecha:</p>
                <p className="text-gray-900">{show(sale.fecha)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Valor:</p>
                <p className="text-gray-900 font-bold text-green-600">{show(sale.valor, "$ 0")}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Medio de pago:</p>
                <p className="text-gray-900">{show(sale.medioPago || raw.medio_pago || snapshot.medioPago)}</p>
              </div>
              {(sale.medioPago || raw.medio_pago || snapshot.medioPago || "").toLowerCase() === "mixto" && (
                <div className="md:col-span-2 lg:col-span-3">
                  <p className="font-semibold text-gray-700">Descripción pago mixto:</p>
                  <p className="text-gray-900 whitespace-pre-line">
                    {show(
                      raw.descripcion_pago ||
                        raw.medio_pago_descripcion ||
                        sale.medioPagoDescripcion ||
                        snapshot.medioPagoDescripcion ||
                        sale.descripcionPagoMixto,
                      "Sin descripción"
                    )}
                  </p>
                </div>
              )}
              
              {/* Estado movido hacia abajo con margen adicional */}
              <div className="mt-2">
                <p className="font-semibold text-gray-700">Estado:</p>
                <p className="text-gray-900 text-sm font-semibold">{show(sale.estado)}</p>
              </div>
              
              <div className="md:col-span-2 lg:col-span-3">
                <p className="font-semibold text-gray-700">Descripción de seguimiento:</p>
                <p className="text-gray-900 whitespace-pre-line">
                  {show(
                    sale.descripcionSeguimiento ||
                      sale.descripcion_seguimiento ||
                      snapshot.descripcionSeguimiento,
                    "Sin descripción"
                  )}
                </p>
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
                <p className="text-gray-900">{show(sale.compradorTipoDocumento || snapshot.compradorTipoDocumento)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Documento:</p>
                <p className="text-gray-900">{show(sale.compradorDocumento || snapshot.compradorDocumento)}</p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-700">Nombre completo:</p>
                <p className="text-gray-900">{show(sale.compradorNombreCompleto || snapshot.compradorNombreCompleto, "Sin comprador")}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Correo:</p>
                <a href={`mailto:${sale.compradorCorreo}`} className="text-blue-600 hover:text-blue-800 underline">
                  {show(sale.compradorCorreo || snapshot.compradorCorreo, "Sin correo")}
                </a>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Teléfono:</p>
                <p className="text-gray-900">{show(sale.compradorTelefono || snapshot.compradorTelefono, "Sin teléfono")}</p>
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
                <p className="text-gray-900">{show(vendedorTipoDocumento)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Documento:</p>
                <p className="text-gray-900">{show(vendedorDocumento)}</p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-700">Nombre completo:</p>
                <p className="text-gray-900">{show(vendedorNombreCompleto, "Sin vendedor")}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Correo:</p>
                <a href={`mailto:${vendedorCorreo || ""}`} className="text-blue-600 hover:text-blue-800 underline">
                  {show(vendedorCorreo, "Sin correo")}
                </a>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Teléfono:</p>
                <p className="text-gray-900">{show(vendedorTelefono, "Sin teléfono")}</p>
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
                <p className="text-gray-900">{show(sale.inmuebleTipo)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Registro:</p>
                <p className="text-gray-900">{show(sale.inmuebleRegistro)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Nombre:</p>
                <p className="text-gray-900">{show(sale.inmuebleNombre)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Habitaciones:</p>
                <p className="text-gray-900">{show(sale.inmuebleHabitaciones || snapshot.inmuebleHabitaciones)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Baños:</p>
                <p className="text-gray-900">{show(sale.inmuebleBanos || snapshot.inmuebleBanos)}</p>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <p className="font-semibold text-gray-700">Dirección:</p>
                <p className="text-gray-900">{show(sale.inmuebleDireccion)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Barrio:</p>
                <p className="text-gray-900">{show(sale.inmuebleBarrio || snapshot.inmuebleBarrio)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Ciudad:</p>
                <p className="text-gray-900">{show(sale.inmuebleCiudad || snapshot.inmuebleCiudad)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Departamento:</p>
                <p className="text-gray-900">{show(sale.inmuebleDepartamento || snapshot.inmuebleDepartamento)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">País:</p>
                <p className="text-gray-900">{show(sale.inmueblePais || snapshot.inmueblePais)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Precio:</p>
                <p className="text-gray-900 font-bold text-green-600">
                  {show(
                    sale.valor ||
                      sale.inmueblePrecio ||
                      snapshot.inmueblePrecio,
                    "$ 0"
                  )}
                </p>
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
