import React from "react";

export default function EstadoBadge({ estado }) {
  // Puedes personalizar colores y nombres según tus estados
  const estadoConfig = {
    completado: {
      color: "bg-green-500",
      label: "Completado",
    },
    pendiente: {
      color: "bg-yellow-500",
      label: "Pendiente",
    },
    cancelado: {
      color: "bg-red-500",
      label: "Cancelado",
    },
    en_proceso: {
      color: "bg-blue-500",
      label: "En proceso",
    },
  };

  const config = estadoConfig[estado?.toLowerCase()] || {
    color: "bg-gray-400",
    label: estado || "Desconocido",
  };

  return (
    <span className={`px-2 py-1 rounded text-white text-sm ${config.color}`}>
      {config.label}
    </span>
  );
}
