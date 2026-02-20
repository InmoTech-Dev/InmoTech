import React, { useMemo, useState } from "react";

/**
 * Modal de seguimiento / cambio de estado de venta.
 * Usa el catálogo de estados entregado por la API (Estados_venta).
 */
export default function PurchaseTrackingModal({
  venta,
  statusOptions = [],
  onClose,
  onUpdate,
}) {
  if (!venta) return null;

  const statusList = useMemo(() => {
    if (!Array.isArray(statusOptions)) return [];
    return [...statusOptions]
      .filter(Boolean)
      .sort(
        (a, b) =>
          (a.orden ?? a.id_estado_venta ?? 0) -
          (b.orden ?? b.id_estado_venta ?? 0)
      );
  }, [statusOptions]);

  const normalize = (value = "") =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const findStatusId = (name) => {
    const target = normalize(name);
    const found = statusList.find((s) => normalize(s.nombre_estado) === target);
    return found?.id_estado_venta ?? statusList[0]?.id_estado_venta ?? null;
  };

  const displayStatusName = (id) =>
    statusList.find((s) => Number(s.id_estado_venta) === Number(id))?.nombre_estado ||
    "Sin estado";

  const initialEstadoId =
    venta.id_estado_venta ||
    venta.estadoSeguimientoId ||
    findStatusId(venta.estadoSeguimiento || venta.estado || "");

  const [estadoId, setEstadoId] = useState(initialEstadoId);
  const [tempEstadoId, setTempEstadoId] = useState(initialEstadoId);
  const [descripcion, setDescripcion] = useState(
    venta.descripcionSeguimiento || ""
  );
  const [saving, setSaving] = useState(false);
  const [confirmData, setConfirmData] = useState(null);

  const openConfirm = (value, label) => {
    setConfirmData({ value, label });
  };

  const handleConfirm = () => {
    if (!confirmData) return;
    setEstadoId(confirmData.value);
    setTempEstadoId(confirmData.value);
    setConfirmData(null);
  };

  const handleCancelConfirm = () => {
    setTempEstadoId(estadoId);
    setConfirmData(null);
  };

  const handleSave = async () => {
    if (confirmData) return; // espera confirmación
    setSaving(true);
    const updatedVenta = {
      ...venta,
      id: venta.id || venta.id_venta,
      id_venta: venta.id_venta || venta.id,
      id_estado_venta: estadoId,
      estado: displayStatusName(estadoId),
      estadoSeguimiento: displayStatusName(estadoId),
      descripcionSeguimiento: descripcion,
    };

    try {
      await onUpdate(updatedVenta);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const getEstadoStyle = (estado) => {
    switch (estado) {
      case "Pagado":
        return "bg-green-100 text-green-700 border border-green-400";
      case "Debe":
        return "bg-red-100 text-red-700 border border-red-400";
      case "En espera":
        return "bg-yellow-100 text-yellow-700 border border-yellow-400";
      case "Completada":
      case "Finalizada":
        return "bg-blue-100 text-blue-700 border border-blue-400";
      case "Cancelado":
      case "Cancelada":
        return "bg-red-100 text-red-700 border border-red-400";
      case "Iniciada":
      case "En negociación":
        return "bg-green-100 text-green-700 border border-green-400";
      default:
        return "bg-gray-100 text-gray-700 border";
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Seguimiento de la Compra
          </h2>
          <p className="text-gray-600 text-sm">
            Gestión y actualización del estado de la transacción
          </p>
        </div>

        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-500 hover:text-blue-600 transition duration-150 p-1 rounded-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-lg font-bold text-blue-800 mb-3 pb-2 border-b border-blue-200">
              Información General
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Registro:</p>
                <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                  {venta.registro || "N/A"}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Tipo:</p>
                <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                  {venta.tipo || "N/A"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-700">Comprador:</p>
                <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                  {venta.comprador || "N/A"}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Fecha:</p>
                <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                  {venta.fecha || "N/A"}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Valor:</p>
                <p className="text-gray-900 font-bold text-green-600 bg-white p-2 rounded border border-gray-200">
                  {venta.valor || "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="text-lg font-bold text-purple-800 mb-3 pb-2 border-b border-purple-200">
              Estado de Venta
            </h3>
            <div className="mb-4">
              <label className="block font-semibold text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={tempEstadoId ?? ""}
                disabled={!statusList.length}
                onChange={(e) => {
                  const newVal = Number(e.target.value);
                  setTempEstadoId(newVal);
                  openConfirm(newVal, "Estado de la venta");
                }}
                className={`p-3 rounded-lg w-full font-semibold cursor-pointer transition duration-150 ${getEstadoStyle(
                  displayStatusName(estadoId)
                )}`}
              >
                {statusList.length === 0 && (
                  <option value="">Cargando estados...</option>
                )}
                {statusList.map((opt) => (
                  <option
                    key={opt.id_estado_venta}
                    value={opt.id_estado_venta}
                    className="bg-white text-gray-800"
                  >
                    {opt.nombre_estado}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-lg font-bold text-green-800 mb-3 pb-2 border-b border-green-200">
              Seguimiento
            </h3>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-700">Responsable:</p>
                <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                  {venta.responsable || "Admin"}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-2">
                  Descripción / Notas
                </label>
                <textarea
                  className="text-gray-900 bg-white p-2 rounded border border-gray-200 min-h-[80px] w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Agrega comentarios o detalles del seguimiento"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition duration-150 transform hover:scale-[1.02] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-400/50 hover:bg-blue-700 transition duration-150 transform hover:scale-[1.02] disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>

      {confirmData && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h4 className="text-lg font-bold text-gray-800">Confirmar cambio</h4>
            <p className="text-gray-700">
              ¿Confirmas cambiar {confirmData.label} a{" "}
              <strong>{displayStatusName(confirmData.value)}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                No, cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                Sí, confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
