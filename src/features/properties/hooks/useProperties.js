import { useEffect, useMemo, useState } from "react";
import { inmueblesAPI } from "@/shared/services/propertyApidervice";

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return number.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });
};

export function useProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: "Todos los tipos",
    location: "Todas las ubicaciones",
    status: "Todos",
    search: ""
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const allItems = [];
        let page = 1;
        const limit = 100;
        const maxPages = 3;

        while (page <= maxPages) {
          const { items, pagination } = await inmueblesAPI.getPublicInmuebles({ pagina: page, limite: limit });
          allItems.push(...(items || []));
          const totalPages = pagination?.paginas_totales || pagination?.totalPages || 1;
          if (page >= totalPages) break;
          page += 1;
        }

        // normalizar valores usados en la UI
        const normalized = allItems.map((item) => {
          const operacionLower = (item.operacion || "").toLowerCase();
          const statusLower = (item.estado || "").toLowerCase();
          const hasVenta = operacionLower.includes("venta") || statusLower.includes("venta");
          const hasArriendo = operacionLower.includes("arriendo") || statusLower.includes("arriendo");
          let operationTag = "otros";
          if (hasVenta && hasArriendo) {
            operationTag = "venta y arriendo";
          } else if (hasVenta) {
            operationTag = "venta";
          } else if (hasArriendo) {
            operationTag = "arriendo";
          }

          return {
            ...item,
            operationTag,
            priceLabel: item.precio_venta
              ? formatPrice(item.precio_venta)
              : item.precio_arriendo
                ? `${formatPrice(item.precio_arriendo)}/mes`
                : formatPrice(item.precio || 0),
            locationLabel: [item.ciudad, item.departamento].filter(Boolean).join(", "),
            mainImage: item.imagenes?.[0]?.url || item.imagenes?.[0] || "/images/property/propiedad-1.jpg"
          };
        });
        setProperties(normalized);
        setError(null);
      } catch (err) {
        console.error("Error cargando propiedades públicas:", err);
        setError(err.message || "No se pudieron cargar los inmuebles.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const matchesType =
        filters.type === "Todos los tipos" ||
        (property.tipo || property.categoria || "").toLowerCase() === filters.type.toLowerCase();

      const matchesLocation =
        filters.location === "Todas las ubicaciones" ||
        property.locationLabel.toLowerCase().includes(filters.location.toLowerCase());

      const matchesStatus = (() => {
        if (filters.status === "Todos") return true;
        const tag = (property.operationTag || property.operacion || property.estado || "").toLowerCase();
        if (filters.status === "venta") {
          return tag.includes("venta");
        }
        if (filters.status === "arriendo") {
          return tag.includes("arriendo");
        }
        return true;
      })();

      const term = filters.search.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        (property.titulo || "").toLowerCase().includes(term) ||
        (property.direccion || "").toLowerCase().includes(term) ||
        property.locationLabel.toLowerCase().includes(term);

      return matchesType && matchesLocation && matchesStatus && matchesSearch;
    });
  }, [properties, filters]);

  const featuredProperties = useMemo(() => {
    return filteredProperties.slice(0, 6);
  }, [filteredProperties]);

  const getPropertyById = (id) => properties.find((p) => p.id === Number(id));

  const getSimilarProperties = (id, limit = 3) => {
    const current = getPropertyById(id);
    if (!current) return filteredProperties.slice(0, limit);
    return filteredProperties
      .filter(
        (p) =>
          p.id !== current.id &&
          ((p.tipo && p.tipo === current.tipo) || p.ciudad === current.ciudad)
      )
      .slice(0, limit);
  };

  return {
    properties: filteredProperties,
    allProperties: properties,
    featuredProperties,
    loading,
    error,
    filters,
    setFilters,
    getPropertyById,
    getSimilarProperties,
    totalCount: filteredProperties.length
  };
}
