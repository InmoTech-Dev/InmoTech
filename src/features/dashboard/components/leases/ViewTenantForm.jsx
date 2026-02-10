import React from "react";
import { FaImage, FaPhoneAlt, FaShieldAlt } from "react-icons/fa";

const formatCurrency = (value) => {
  if (!value && value !== 0) return "-";
  return Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value));
};

export default function ViewTenantModal({ tenant, onClose }) {
  if (!tenant) return null;

  const fullName = [
    tenant.primerNombre,
    tenant.segundoNombre,
    tenant.primerApellido,
    tenant.segundoApellido
  ]
    .filter(Boolean)
    .join(" ");

  const inmueble = tenant.inmueble || null;
  const hasLeaseInfo = Boolean(
    tenant.fechaInicio ||
      tenant.fechaFin ||
      tenant.valorMensual ||
      tenant.tipoGarantia ||
      tenant.valorGarantia ||
      tenant.descripcionGarantia ||
      (tenant.estado && `${tenant.estado}`.trim().toLowerCase() !== "activo")
  );
  const hasEmergencyContact = Boolean(
    tenant.contactoEmergenciaNombre ||
      tenant.contactoEmergenciaTelefono ||
      tenant.contactoEmergenciaParentesco
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
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Informacion del arrendatario</h2>
          <p className="text-gray-600 text-sm">
            Resumen del arrendatario, su contrato y el inmueble asociado.
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
                  {tenant.tipoDocumento} - {tenant.documento}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Correo electronico:</p>
                {tenant.correo ? (
                  <a href={`mailto:${tenant.correo}`} className="text-blue-600 hover:text-blue-800 underline">
                    {tenant.correo}
                  </a>
                ) : (
                  <p className="text-gray-900">-</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <FaPhoneAlt className="text-gray-500" />
                <div>
                  <p className="font-semibold text-gray-700">Telefono:</p>
                  <p className="text-gray-900">{tenant.telefono || "-"}</p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Estado:</p>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${
                    tenant.estado === "Activo"
                      ? "bg-green-100 text-green-700 border-green-400"
                      : tenant.estado === "Moroso"
                      ? "bg-red-100 text-red-700 border-red-400"
                      : "bg-yellow-100 text-yellow-700 border-yellow-400"
                  }`}
                >
                  {tenant.estado}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-lg font-bold text-green-800 mb-3 pb-2 border-b border-green-200">
              Datos del arrendamiento
            </h3>
            {hasLeaseInfo ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Fecha inicio:</p>
                    <p className="text-gray-900">
                      {tenant.fechaInicio ? new Date(tenant.fechaInicio).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Fecha fin:</p>
                    <p className="text-gray-900">
                      {tenant.fechaFin ? new Date(tenant.fechaFin).toLocaleDateString() : "No definida"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Canon mensual:</p>
                    <p className="text-gray-900 font-semibold">
                      {formatCurrency(tenant.valorMensual)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
                  <div className="flex items-center gap-2">
                    <FaShieldAlt className="text-gray-500" />
                    <div>
                      <p className="font-semibold text-gray-700">Tipo de garantia:</p>
                      <p className="text-gray-900">{tenant.tipoGarantia || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Valor garantia:</p>
                    <p className="text-gray-900">{tenant.valorGarantia ? formatCurrency(tenant.valorGarantia) : "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Estado del contrato:</p>
                    <p className="text-gray-900">{tenant.estado || "-"}</p>
                  </div>
                </div>

                {tenant.descripcionGarantia && (
                  <div className="mt-4 text-sm">
                    <p className="font-semibold text-gray-700 mb-1">Descripcion de la garantia:</p>
                    <p className="text-gray-900 bg-white rounded-lg p-3 border border-gray-200">
                      {tenant.descripcionGarantia}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <FaImage size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 italic">Aun no se ha registrado un contrato de arrendamiento para este arrendatario.</p>
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100">
              Contacto de emergencia
            </h3>
            {hasEmergencyContact ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-700">Nombre:</p>
                  <p className="text-gray-900">{tenant.contactoEmergenciaNombre || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Telefono:</p>
                  <p className="text-gray-900">{tenant.contactoEmergenciaTelefono || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Parentesco:</p>
                  <p className="text-gray-900">{tenant.contactoEmergenciaParentesco || "-"}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <FaImage size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 italic">Aun no se ha agregado un contacto de emergencia para este arrendatario.</p>
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100">
              Inmueble arrendado
            </h3>

            {inmueble ? (
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-shrink-0 w-full md:w-40 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200">
                  <FaImage size={32} />
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Registro:</p>
                    <p className="text-gray-900">{inmueble.registro || "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Categoria:</p>
                    <p className="text-gray-900">{inmueble.categoria || "-"}</p>
                  </div>
                  <div className="md:col-span-2">
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
                <p className="text-gray-500 italic">Aun no se ha vinculado un inmueble a este arrendatario.</p>
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
