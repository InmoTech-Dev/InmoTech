import React from "react";

export default function EstadoBadge({ estado }) {
  const normalized = (estado || "").toLowerCase();

  const estadoConfig = {
    pagado: { color: "bg-green-100 text-green-800 border border-green-400", label: "Pagado" },
    debe: { color: "bg-red-100 text-red-800 border border-red-400", label: "Debe" },
    "en espera": { color: "bg-amber-100 text-amber-800 border border-amber-400", label: "En espera" },
    cancelado: { color: "bg-rose-100 text-rose-800 border border-rose-400", label: "Cancelado" },
    "en negociación": { color: "bg-indigo-100 text-indigo-800 border border-indigo-400", label: "En negociación" },
    "en negociacion": { color: "bg-indigo-100 text-indigo-800 border border-indigo-400", label: "En negociación" },
    completada: { color: "bg-blue-100 text-blue-800 border border-blue-400", label: "Completada" },
    finalizada: { color: "bg-blue-100 text-blue-800 border border-blue-400", label: "Completada" },
    activa: { color: "bg-yellow-100 text-yellow-800 border border-yellow-400", label: "Activa" },
  };

  const config = estadoConfig[normalized] || {
    color: "bg-gray-200 text-gray-700 border border-gray-300",
    label: estado || "Desconocido",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.color}`}>
      {config.label}
    </span>
  );
}
