import React, { useState, useEffect, useMemo, useCallback } from "react";

import ReactDOM from 'react-dom';

import { motion } from 'framer-motion';

import { FaUsers, FaPlus, FaEye, FaChartBar, FaSearch, FaDollarSign, FaCalendarCheck, FaClipboardList } from "react-icons/fa";

import { Plus, Search, Filter, Eye, ListChecks, DollarSign, Calendar, Users, Home, Mail } from 'lucide-react';

import "../../../../shared/styles/globals.css";

import SaleForm from "../../components/sales/SaleForm";

import PurchaseTrackingModal from "../../components/sales/SalesTracking";

import InterestedPeopleTable from "../../components/sales/InterestedPeople";

import ViewSaleModal from "../../components/sales/ViewSale";

import ventaApiService from "../../../../shared/services/ventaApiService";

import { buyersApiService } from "../../../../shared/services/buyersApiService";

import { propertiesApiService } from "../../../../shared/services/propertiesApiService";


const STATUS_NORMALIZE = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const DEFAULT_STATUS_CATALOG = [
  { id_estado_venta: 1, nombre_estado: "Pagado", orden: 1, es_estado_final: 1 },
  { id_estado_venta: 2, nombre_estado: "Debe", orden: 2, es_estado_final: 0 },
  { id_estado_venta: 3, nombre_estado: "En espera", orden: 3, es_estado_final: 0 },
  { id_estado_venta: 4, nombre_estado: "Cancelado", orden: 4, es_estado_final: 1 },
  { id_estado_venta: 5, nombre_estado: "En negociación", orden: 5, es_estado_final: 0 },
  { id_estado_venta: 6, nombre_estado: "Completada", orden: 6, es_estado_final: 1 },
];

const mergeStatusCatalog = (apiStatuses = []) => {
  const merged = new Map();

  [...DEFAULT_STATUS_CATALOG, ...(Array.isArray(apiStatuses) ? apiStatuses : [])].forEach(
    (status, idx) => {
      if (!status || !status.nombre_estado) return;
      const key = STATUS_NORMALIZE(status.nombre_estado);
      const fallback = DEFAULT_STATUS_CATALOG.find(
        (s) => STATUS_NORMALIZE(s.nombre_estado) === key
      );
      const id = status.id_estado_venta ?? fallback?.id_estado_venta ?? idx + 1;
      const orden = status.orden ?? fallback?.orden ?? idx + 1;

      merged.set(key, {
        ...fallback,
        ...status,
        id_estado_venta: id,
        orden,
      });
    }
  );

  return Array.from(merged.values()).sort(
    (a, b) => (a.orden ?? 99) - (b.orden ?? 99)
  );
};



const INITIAL_VENTAS = [

  {

    id: 1,

    registro: "110010123456",

    tipo: "Casa",

    comprador: "Juan Carlos Jaramillo Sossa",

    fecha: "22/05/2025",

    valor: "15.000.000$",

    estado: "Pagado",

    estadoSeguimiento: "Finalizado",

  },

  {

    id: 2,

    registro: "760010789012",

    tipo: "Apartamento",

    comprador: "Pablo Camargo Buitrago",

    fecha: "10/02/2025",

    valor: "32.500.000$",

    estado: "Pendiente",

    estadoSeguimiento: "Iniciado",

  },

];



const toNumericValue = (value) => {

  if (typeof value === "number") return value;

  if (value === null || value === undefined) return 0;

  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));

  return Number.isFinite(parsed) ? parsed : 0;

};



const formatCurrencyValue = (value) => {

  const numericValue = toNumericValue(value);

  if (!numericValue) return "0$";

  return `${new Intl.NumberFormat("es-CO").format(Math.round(numericValue))}$`;

};



const formatPlainNumber = (value) => {

  const numeric = toNumericValue(value);

  if (!numeric) return "0";

  return new Intl.NumberFormat("es-CO").format(Math.round(numeric));

};



const formatDateDisplay = (value) => {

  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("es-CO");

};



const buildPersonName = (persona = {}) => {

  if (!persona) return "";

  if (persona.nombre_completo || persona.apellido_completo) {

    return [persona.nombre_completo, persona.apellido_completo]

      .filter(Boolean)

      .join(" ")

      .trim();

  }



  const parts = [

    persona.primer_nombre,

    persona.segundo_nombre,

    persona.primer_apellido,

    persona.segundo_apellido,

  ].filter(Boolean);



  return parts.join(" ").trim();

};



const buildBuyerFullName = (buyer = {}, fallback = "") => {

  const parts = [

    buyer.primerNombre,

    buyer.segundoNombre,

    buyer.primerApellido,

    buyer.segundoApellido,

  ].filter(Boolean);

  const name = parts.join(" ").trim();

  return name || fallback || "";

};



const mapEstadoUiToVentaEstado = (estado = "") => {
  const normalized = STATUS_NORMALIZE(estado);

  // Permitir estados de UI y retornarlos con mayúscula inicial
  const map = {
    pagado: "Pagado",
    pagada: "Pagado",
    completada: "Completada",
    finalizada: "Completada",
    debe: "Debe",
    "en espera": "En espera",
    "en negociacion": "En negociación",
    "en negociación": "En negociación",
    pendiente: "Pendiente",
    activa: "Activa"
  };

  if (map[normalized]) return map[normalized];

  // Si es otro valor, devolverlo con la primera letra en mayúscula
  if (estado && typeof estado === "string") {
    return estado.charAt(0).toUpperCase() + estado.slice(1);
  }

  return "Activa";
};



const buildTrackingPayload = (updatedSale = {}, statusCatalog = []) => {
  const estadoSeguimiento =
    updatedSale.estadoSeguimiento ||
    updatedSale.estado ||
    statusCatalog[0]?.nombre_estado ||
    DEFAULT_STATUS_CATALOG[0].nombre_estado;

  let estadoId =
    updatedSale.id_estado_venta ||
    updatedSale.estadoSeguimientoId ||
    (statusCatalog.find(
      (s) => STATUS_NORMALIZE(s.nombre_estado) === STATUS_NORMALIZE(estadoSeguimiento)
    ) || {})
      .id_estado_venta ||
    null;

  const compradorId =
    updatedSale.id_comprador ??
    updatedSale.id_buyer ??
    updatedSale.buyerId ??
    updatedSale?.raw?.id_comprador ??
    updatedSale?.raw?.id_buyer ??
    updatedSale?.raw?.buyerId ??
    updatedSale?.comprador?.id_comprador ??
    updatedSale?.comprador?.id_buyer ??
    updatedSale?.comprador?.buyerId ??
    updatedSale?.raw?.comprador?.id_comprador ??
    updatedSale?.raw?.comprador?.id_buyer ??
    updatedSale?.raw?.comprador?.buyerId ??
    null;



  if (!estadoId) {
    // Si el estado no está en el mapa, usar un id neutro (En espera) y preservar el texto en la descripción
    const fallback =
      statusCatalog.find(
        (s) => STATUS_NORMALIZE(s.nombre_estado) === STATUS_NORMALIZE("En espera")
      ) ||
      DEFAULT_STATUS_CATALOG.find(
        (s) => STATUS_NORMALIZE(s.nombre_estado) === STATUS_NORMALIZE("En espera")
      );
    estadoId = fallback?.id_estado_venta ?? 3;
    updatedSale.descripcionSeguimiento = `[Estado personalizado: ${estadoSeguimiento}] ${updatedSale.descripcionSeguimiento || ""}`.trim();
  }

  if (!compradorId) return null;



  return {

    id_estado_venta: estadoId,

    id_comprador: compradorId,

    fecha_estado_seguimiento: new Date().toISOString(),

    descripcion: updatedSale.descripcionSeguimiento || "",

  };

};

const mapSeguimientoIdToEstado = {
  1: "Pagado",
  2: "Debe",
  3: "En espera",
  4: "Cancelado",
  5: "En negociación",
  6: "Completada",
  7: "Completada", // compatibilidad con datos antiguos
};



const normalizeSaleRecord = (sale = {}, fallback = {}) => {

  const inmueble = sale.inmueble || sale.property || {};

  const comprador = sale.comprador || sale.buyer || {};

  const vendedor = sale.vendedor || sale.seller || {};

  const amenidades =
    inmueble.comodidades ||
    inmueble.caracteristicas ||
    inmueble.amenities ||
    inmueble.amenities_json ||
    inmueble.metadata?.raw?.comodidades ||
    [];

  const fallbackPrice = fallback.inmueblePrecio ?? fallback.valor;

  const numericPrice = toNumericValue(

    sale.valor_venta ?? sale.precio_venta ?? sale.valor ?? fallbackPrice

  );

  const compradorNombre = buildPersonName(comprador);

  const vendedorNombre = buildPersonName(vendedor);

  const findAmenityCount = (aliases = []) => {
    const normalized = aliases.map((a) => a.toLowerCase());
    if (!Array.isArray(amenidades)) return null;
    const found = amenidades.find((a) =>
      normalized.includes((a.nombre || a.label || "").toLowerCase())
    );
    if (!found) return null;
    // Sequelize include returns cantidad/seleccionada dentro de la tabla pivote
    const through = found.Inmueble_Comodidades || found.inmueble_comodidades || {};
    const selected = through.seleccionada ?? through.selected ?? true;
    if (selected === false) return null;
    return found.cantidad ?? through.cantidad ?? null;
  };



  const trackingList =
    sale.tracking ||
    sale.tracking_history ||
    sale.seguimientos ||
    [];

  let trackingEstado = null;
  let trackingEstadoId = null;
  let trackingDescripcion = null;
  if (Array.isArray(trackingList) && trackingList.length) {
    // Tomar el más reciente asumiendo que la API devuelve orden DESC
    const latest = trackingList[0] || {};
    const estadoId =
      latest.id_estado_venta ||
      latest.id_estado ||
      latest.estado_id ||
      latest.id_estado_seguimiento ||
      null;
    const estadoTexto =
      latest.estado ||
      latest.estado_seguimiento ||
      latest.nombre_estado ||
      latest.estado_venta ||
      null;
    trackingDescripcion =
      latest.descripcion ||
      latest.descripcion_seguimiento ||
      latest.detalle ||
      null;
    trackingEstado = estadoTexto || (estadoId ? mapSeguimientoIdToEstado[estadoId] : null);
    trackingEstadoId = estadoId;
  } else if (!Array.isArray(trackingList) && sale.estado_seguimiento) {
    trackingEstado = sale.estado_seguimiento;
    trackingEstadoId = sale.id_estado_venta || null;
    trackingDescripcion =
      sale.descripcion_seguimiento ||
      sale.descripcionSeguimiento ||
      fallback.descripcionSeguimiento ||
      null;
  }

  return {

    // Guardamos el objeto crudo para que el modal pueda priorizarlo
    raw: sale,

    ...fallback,

    id_comprador:
      sale.id_comprador ??
      sale.id_buyer ??
      sale.buyerId ??
      comprador.id_comprador ??
      comprador.id_buyer ??
      comprador.buyerId ??
      fallback.id_comprador ??
      fallback.id_buyer ??
      fallback.buyerId ??
      sale?.raw?.id_comprador ??
      sale?.raw?.id_buyer ??
      sale?.raw?.buyerId ??
      sale?.raw?.comprador?.id_comprador ??
      null,

    id: sale.id ?? sale.id_venta ?? fallback.id ?? Date.now(),

    registro:

      fallback.inmuebleRegistro ??

      sale.registro ??

      sale.registro_inmobiliario ??

      inmueble.registro_inmobiliario ??

      "Sin registro",

    tipo:
      fallback.inmuebleTipo ??
      sale.tipo ??
      sale.categoria ??
      inmueble.categoria ??
      "Sin tipo",

    comprador:

      (fallback.comprador ??

        fallback.compradorNombreCompleto ??

        compradorNombre) || "Sin comprador",

    fecha: formatDateDisplay(sale.fecha_venta || sale.fecha || fallback.fecha),

    valor: formatCurrencyValue(numericPrice || fallbackPrice),

    medioPago:
      sale.medio_pago ??
      sale.medioPago ??
      fallback.medioPago ??
      fallback.medio_pago ??
      null,

    medioPagoDescripcion:
      sale.medio_pago_descripcion ??
      sale.descripcion_pago ??
      sale.medioPagoDescripcion ??
      fallback.medioPagoDescripcion ??
      fallback.descripcion_pago ??
      null,

    estado: trackingEstado || sale.estado || fallback.estado || "Pendiente",

    estadoSeguimiento:
      trackingEstado ??
      fallback.estadoSeguimiento ??
      sale.estadoSeguimiento ??
      sale.estado_seguimiento ??
      sale.estado_seguimiento ??
      sale.ultimo_estado_seguimiento ??
      sale.estado_tracking ??
      sale.estado_tracing ??
      sale.estado_venta ??
      "Sin seguimiento",

    descripcionSeguimiento:
      trackingDescripcion ??
      sale.descripcionSeguimiento ??
      sale.descripcion_seguimiento ??
      fallback.descripcionSeguimiento ??
      "Sin descripción",

    compradorTipoDocumento:

      comprador.tipo_documento ?? fallback.compradorTipoDocumento ?? "N/D",

    compradorDocumento:

      comprador.numero_documento ?? fallback.compradorDocumento ?? "N/D",

        compradorNombreCompleto:

      (fallback.compradorNombreCompleto ?? compradorNombre) || "Sin comprador",

    compradorCorreo: comprador.correo ?? fallback.compradorCorreo ?? "Sin correo",

    compradorTelefono:

      comprador.telefono ?? fallback.compradorTelefono ?? "Sin teléfono",

    vendedor: vendedor && Object.keys(vendedor).length
      ? vendedor
      : {
          tipo_documento:
            sale.tipo_doc_vendedor ||
            sale.tipo_documento_vendedor ||
            sale.vendedor_tipo_documento ||
            fallback.vendedorTipoDocumento ||
            null,
          numero_documento:
            sale.numero_doc_vendedor ||
            sale.vendedor_numero_documento ||
            sale.documento_vendedor ||
            fallback.vendedorDocumento ||
            null,
          nombre_completo:
            sale.nombre_vendedor ||
            sale.vendedor_nombre ||
            sale.vendedor_nombre_completo ||
            fallback.vendedorNombreCompleto ||
            null,
          correo:
            sale.correo_vendedor ||
            sale.vendedor_correo ||
            fallback.vendedorCorreo ||
            null,
          telefono:
            sale.telefono_vendedor ||
            sale.vendedor_telefono ||
            fallback.vendedorTelefono ||
            null
        },

    vendedorTipoDocumento:

      sale.tipo_documento_vendedor ??

      sale.vendedor_tipo_documento ??

      sale.tipo_doc_vendedor ??

      vendedor.tipo_documento ??

      fallback.vendedorTipoDocumento ??

      "N/D",

    vendedorDocumento:

      sale.numero_doc_vendedor ??

      sale.vendedor_numero_documento ??

      sale.documento_vendedor ??

      vendedor.numero_documento ??

      fallback.vendedorDocumento ??

      "N/D",

    vendedorNombreCompleto:

      sale.vendedor_nombre_completo ??

      sale.vendedor_nombre ??

      sale.nombre_vendedor ??

      fallback.vendedorNombreCompleto ?? vendedorNombre ?? "Sin vendedor",

    vendedorCorreo:

      sale.vendedor_correo ??

      sale.correo_vendedor ??

      vendedor.correo ??

      fallback.vendedorCorreo ??

      "Sin correo",

    vendedorTelefono:

      sale.vendedor_telefono ??

      sale.telefono_vendedor ??

      vendedor.telefono ??

      fallback.vendedorTelefono ??

      "Sin telefono",

    inmuebleTipo:

      fallback.inmuebleTipo ?? inmueble.categoria ?? fallback.tipo ?? "Sin tipo",

    inmuebleRegistro:

      fallback.inmuebleRegistro ??

      inmueble.registro_inmobiliario ??

      sale.registro_inmobiliario ??

      sale.registro ??

      "Sin registro",

    inmuebleNombre:

      fallback.inmuebleNombre ??

      inmueble.nombre ??

      inmueble.titulo ??

      sale.titulo ??

      sale.nombre_inmueble ??

      inmueble.direccion ??

      sale.direccion ??

      fallback.tipo ??

      "Sin nombre",

    inmuebleArea: fallback.inmuebleArea ?? inmueble.area ?? "N/D",

    inmuebleHabitaciones:

      fallback.inmuebleHabitaciones ??
      inmueble.habitaciones ??
      sale.habitaciones ??
      inmueble.num_habitaciones ??
      inmueble.dormitorios ??
      findAmenityCount(["habitaciones", "cuartos", "dormitorios"]) ??
      "N/D",

    inmuebleBanos:
      fallback.inmuebleBanos ??
      inmueble.banos ??
      inmueble.baños ??
      sale.banos ??
      sale.baños ??
      inmueble.num_banos ??
      inmueble.wc ??
      findAmenityCount(["baños", "banos", "baño"]) ??
      "N/D",

    inmueblePais: fallback.inmueblePais ?? inmueble.pais ?? sale.pais ?? "N/D",

    inmuebleDepartamento:

      fallback.inmuebleDepartamento ?? inmueble.departamento ?? sale.departamento ?? "N/D",

    inmuebleCiudad: fallback.inmuebleCiudad ?? inmueble.ciudad ?? sale.ciudad ?? "N/D",

    inmuebleBarrio: fallback.inmuebleBarrio ?? inmueble.barrio ?? "N/D",

    inmuebleEstrato: fallback.inmuebleEstrato ?? inmueble.estrato ?? "N/D",

    inmuebleDireccion:

      fallback.inmuebleDireccion ??
      inmueble.direccion ??
      sale.direccion ??
      sale.inmueble_direccion ??
      "Sin dirección",

    inmueblePrecio: formatCurrencyValue(
      toNumericValue(
        fallback.inmueblePrecio ??
        inmueble.precio_venta ??
        inmueble.precio_arriendo ??
        numericPrice
      )
    ),

    inmuebleGaraje: fallback.inmuebleGaraje ?? Boolean(inmueble.garaje),

    inmuebleEstado:

      fallback.inmuebleEstado ?? inmueble.estado ?? sale.estado ?? "Pendiente",

    // Estado de seguimiento e ID de catálogo (para modal)
    estadoSeguimientoId: trackingEstadoId || sale.id_estado_venta || fallback.estadoSeguimientoId || null,
    id_estado_venta: trackingEstadoId || sale.id_estado_venta || fallback.id_estado_venta || null,

  };

};



const toISODate = (value) => {

  if (!value) return new Date().toISOString();

  const directDate = new Date(value);

  if (!Number.isNaN(directDate.getTime())) {

    return directDate.toISOString();

  }

  const dateOnly = new Date(`${value}T00:00:00`);

  if (!Number.isNaN(dateOnly.getTime())) {

    return dateOnly.toISOString();

  }

  return new Date().toISOString();

};



const mapPaymentToPurchaseType = (medioPago = "") => {

  const normalized = medioPago.toLowerCase();

  if (normalized === "credito") return "Financiada";

  if (normalized === "mixto") return "Mixta";

  return normalized === "transferencia" ? "Directa" : "Directa";

};



const buildSalePayload = (saleData = {}, buyerInfo, propertyInfo) => {

  const numericPrice = toNumericValue(saleData.inmueblePrecio);

  const medioPago = (saleData.medioPago || "efectivo").toLowerCase();

  const fechaVentaISO = toISODate(saleData.fechaVenta);

  const firstNames = [buyerInfo?.primerNombre, buyerInfo?.segundoNombre]

    .filter(Boolean)

    .join(" ")

    .trim();

  const lastNames = [buyerInfo?.primerApellido, buyerInfo?.segundoApellido]

    .filter(Boolean)

    .join(" ")

    .trim();



  return {

    id_comprador: buyerInfo?.id ?? buyerInfo?.compradorId ?? buyerInfo?.raw?.id_comprador ?? buyerInfo?.raw?.buyerId ?? null,

    id_persona: buyerInfo?.personaId ?? buyerInfo?.raw?.personaId ?? buyerInfo?.raw?.persona?.id_persona,

    id_inmueble: Number(propertyInfo?.id ?? propertyInfo?.raw?.id_inmueble),

    fecha_venta: fechaVentaISO,

    valor_venta: numericPrice,

    medio_pago: medioPago,
    medio_pago_descripcion:
      medioPago === "mixto"
        ? saleData.medioPagoDescripcion || saleData.descripcionPagoMixto || null
        : null,

    estado: saleData.estado || "Activa",

    // Datos "congelados" del vendedor al momento de la venta
    tipo_doc_vendedor: saleData.vendedorTipoDocumento || saleData.tipo_documento_vendedor || null,
    numero_doc_vendedor: saleData.vendedorDocumento || saleData.numero_doc_vendedor || null,
    nombre_vendedor: saleData.vendedorNombreCompleto || saleData.nombre_vendedor || null,
    correo_vendedor: saleData.vendedorCorreo || saleData.correo_vendedor || null,
    telefono_vendedor: saleData.vendedorTelefono || saleData.telefono_vendedor || null,

    comprador: {

      tipo_documento: buyerInfo?.tipoDocumento,

      numero_documento: buyerInfo?.documento,

      nombre_completo:

        firstNames ||

        saleData.compradorNombreCompleto ||

        buyerInfo?.raw?.persona?.nombre_completo ||

        "",

      apellido_completo:

        lastNames ||

        buyerInfo?.raw?.persona?.apellido_completo ||

        "",

      correo:

        saleData.compradorCorreo ||

        buyerInfo?.correo ||

        buyerInfo?.raw?.persona?.correo ||

        "",

      telefono:

        saleData.compradorTelefono ||

        buyerInfo?.telefono ||

        buyerInfo?.raw?.persona?.telefono ||

        "",

    },

  };

};



// 🔹 Componente que da color según estado

const EstadoBadge = ({ estado }) => {

  let colorClass = "bg-gray-200 text-gray-700";



  switch (estado) {
    case "Pagado":
      colorClass = "bg-green-100 text-green-800 border border-green-400";
      break;
    case "Completada":
    case "Finalizada":
      colorClass = "bg-blue-100 text-blue-800 border border-blue-400";
      break;
    case "Pendiente":
    case "Activa":
      colorClass = "bg-yellow-100 text-yellow-800 border border-yellow-400";
      break;
    case "Debe":
      colorClass = "bg-red-100 text-red-800 border border-red-400";
      break;
    case "En negociación":
      colorClass = "bg-indigo-100 text-indigo-800 border border-indigo-400";
      break;
    case "En espera":
      colorClass = "bg-amber-100 text-amber-800 border border-amber-400";
      break;
    case "Cancelado":
      colorClass = "bg-rose-100 text-rose-800 border border-rose-400";
      break;
    default:
      colorClass = "bg-gray-200 text-gray-700";
  }



  return (

    <span

      className={`px-3 py-1 rounded-full text-sm font-semibold ${colorClass}`}

    >

      {estado}

    </span>

  );

};



export function SalesManagementPage() {

  const [ventas, setVentas] = useState(INITIAL_VENTAS);

  const [loadingVentas, setLoadingVentas] = useState(false);

  const [savingVenta, setSavingVenta] = useState(false);

  const [statusMessage, setStatusMessage] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [viewingSale, setViewingSale] = useState(null);

  const [trackingSale, setTrackingSale] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [showInterestedPeople, setShowInterestedPeople] = useState(false);

  const [propertiesCatalog, setPropertiesCatalog] = useState([]);

  const [loadingProperties, setLoadingProperties] = useState(false);

  const [propertiesError, setPropertiesError] = useState(null);

  const [statusCatalog, setStatusCatalog] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [statusesError, setStatusesError] = useState(null);



  const nextId = useMemo(() => {

    if (!ventas.length) return 1;

    const numericIds = ventas.map((v) => Number(v.id) || 0);

    return Math.max(...numericIds) + 1;

  }, [ventas]);



  const resolvePropertyFromSale = useCallback(

    (saleData) => {

      const target = (saleData?.inmuebleRegistro || "")

        .toString()

        .trim()

        .toLowerCase();



      if (!target) return null;



      return propertiesCatalog.find((property) => {

        const candidates = [

          property.registro,

          property.label,

          property.raw?.registro_inmobiliario,

          property.raw?.registro,

          property.raw?.registro_catastral,

          property.id?.toString(),

        ]

          .filter(Boolean)

          .map((candidate) => candidate.toString().trim().toLowerCase());



        return candidates.includes(target);

      });

    },

    [propertiesCatalog]

  );



  const loadProperties = useCallback(async () => {

    setLoadingProperties(true);

    setPropertiesError(null);

    try {

      const catalog = await propertiesApiService.getAll();

      setPropertiesCatalog(catalog);

    } catch (error) {

      setPropertiesError(

        error?.message ||

          "No fue posible cargar el catálogo de inmuebles. Intenta recargar antes de crear una venta."

      );

    } finally {

      setLoadingProperties(false);

    }

  }, []);

  const loadStatusCatalog = useCallback(async () => {
    setLoadingStatuses(true);
    setStatusesError(null);
    try {
      const response = await ventaApiService.obtenerCatalogoEstados();
      const data = response?.data?.data || response?.data || [];
      const merged = mergeStatusCatalog(data);
      setStatusCatalog(merged);
    } catch (error) {
      setStatusesError(
        error?.message ||
        "No fue posible cargar el catálogo de estados de venta."
      );
      setStatusCatalog(DEFAULT_STATUS_CATALOG);
    } finally {
      setLoadingStatuses(false);
    }
  }, []);



  const fetchVentas = useCallback(async () => {

    setLoadingVentas(true);

    setStatusMessage(null);

    try {

      const response = await ventaApiService.obtenerVentas();

      const payload = Array.isArray(response?.data)

        ? response.data

        : Array.isArray(response?.data?.data)

          ? response.data.data

          : Array.isArray(response)

            ? response

            : [];



      if (Array.isArray(payload)) {

        const normalized = payload.map((venta) =>

          normalizeSaleRecord(venta)

        );

        setVentas(normalized);

      }

    } catch (error) {

      console.error("Error cargando ventas:", error);

      setStatusMessage({

        type: "error",

        text:

          error?.message ||

          "No se pudieron cargar las ventas desde la API. Intenta nuevamente.",

      });

    } finally {

      setLoadingVentas(false);

    }

  }, []);



  useEffect(() => {

    fetchVentas();

  }, [fetchVentas]);



  useEffect(() => {

    loadProperties();

  }, [loadProperties]);

  useEffect(() => {
    loadStatusCatalog();
  }, [loadStatusCatalog]);



  const handleViewClick = async (sale) => {
    if (!sale?.id && !sale?.id_venta) {
      setViewingSale(sale || null);
      return;
    }

    try {
      setStatusMessage({ type: "info", text: "Cargando detalle de la venta..." });
      const resp = await ventaApiService.obtenerVenta(sale.id || sale.id_venta);
      const apiSale = resp?.data?.data || resp?.data || resp;
      const normalized = normalizeSaleRecord(apiSale, sale);

      // Forzar que los campos de vendedor queden seteados directamente (por si el fallback normalizado quedó con "N/D")
      const vendedorOverrides = {
        vendedorTipoDocumento:
          apiSale?.tipo_doc_vendedor ||
          apiSale?.tipo_documento_vendedor ||
          apiSale?.vendedor_tipo_documento ||
          normalized.vendedorTipoDocumento,
        vendedorDocumento:
          apiSale?.numero_doc_vendedor ||
          apiSale?.vendedor_numero_documento ||
          apiSale?.documento_vendedor ||
          normalized.vendedorDocumento,
        vendedorNombreCompleto:
          apiSale?.nombre_vendedor ||
          apiSale?.vendedor_nombre ||
          apiSale?.vendedor_nombre_completo ||
          normalized.vendedorNombreCompleto,
        vendedorCorreo:
          apiSale?.correo_vendedor ||
          apiSale?.vendedor_correo ||
          normalized.vendedorCorreo,
        vendedorTelefono:
          apiSale?.telefono_vendedor ||
          apiSale?.vendedor_telefono ||
          normalized.vendedorTelefono,
        vendedor:
          apiSale?.vendedor ||
          apiSale?.seller ||
          normalized.vendedor || {
            tipo_documento: apiSale?.tipo_doc_vendedor,
            numero_documento: apiSale?.numero_doc_vendedor,
            nombre_completo: apiSale?.nombre_vendedor,
            correo: apiSale?.correo_vendedor,
            telefono: apiSale?.telefono_vendedor,
          },
      };

      setViewingSale({ ...normalized, ...vendedorOverrides, raw: apiSale });
      setStatusMessage(null);
    } catch (error) {
      console.error("Error obteniendo venta por id:", error);
      setStatusMessage({
        type: "error",
        text: "No se pudo cargar el detalle actualizado de la venta.",
      });
      // Como fallback, mostrar la venta que ya teníamos
      setViewingSale(sale);
    }
  };



  const handleEditClick = (sale) => {
    setTrackingSale(sale);
  };

  const handleCloseForm = () => {

    setShowForm(false);

  };



  const handleSaveSale = async (saleData) => {

    setSavingVenta(true);

    setStatusMessage(null);



    const buyerInfo = saleData?.selectedBuyer;

    if (!buyerInfo?.personaId) {

      setSavingVenta(false);

      setStatusMessage({

        type: "error",

        text: "Debes ingresar un comprador registrado (tipo y número de documento) para continuar.",

      });

      return;

    }



    if (loadingProperties) {

      setSavingVenta(false);

      setStatusMessage({

        type: "error",

        text: "Esperamos a que cargue el catálogo de inmuebles. Intenta registrar la venta en unos segundos.",

      });

      return;

    }



    if (!propertiesCatalog.length) {

      setSavingVenta(false);

      setStatusMessage({

        type: "error",

        text: "No hay inmuebles disponibles en el catálogo. Registra o activa uno antes de crear la venta.",

      });

      return;

    }



    const matchedProperty = resolvePropertyFromSale(saleData);

    if (!matchedProperty) {

      setSavingVenta(false);

      setStatusMessage({

        type: "error",

        text: "No encontramos un inmueble que coincida con el registro ingresado. Verifica el número de matrícula.",

      });

      return;

    }



    const payload = buildSalePayload(saleData, buyerInfo, matchedProperty);



    if (!payload.id_inmueble || Number.isNaN(payload.id_inmueble)) {

      setSavingVenta(false);

      setStatusMessage({

        type: "error",

        text: "El inmueble seleccionado no tiene un identificador válido.",

      });

      return;

    }



    const buyerFullName =

      saleData.compradorNombreCompleto || buildBuyerFullName(buyerInfo, "Sin comprador");



    const fallbackSale = {

      id: nextId,

      id_comprador:

        buyerInfo?.id ??

        buyerInfo?.compradorId ??

        buyerInfo?.raw?.id_comprador ??

        buyerInfo?.raw?.buyerId ??

        null,

      registro: matchedProperty.registro || saleData.inmuebleRegistro || "Sin registro",

      tipo:

        matchedProperty.raw?.categoria ||

        matchedProperty.raw?.tipo ||

        saleData.inmuebleTipo ||

        "Sin tipo",

      comprador: buyerFullName,

      fecha: formatDateDisplay(saleData.fechaVenta || new Date()),

      valor: formatCurrencyValue(payload.valor_venta || saleData.inmueblePrecio),

      estado: "Pendiente",

      estadoSeguimiento: "Iniciado",

      compradorTipoDocumento: buyerInfo.tipoDocumento,

      compradorDocumento: buyerInfo.documento,

      compradorNombreCompleto: buyerFullName,

      compradorCorreo: saleData.compradorCorreo || buyerInfo.correo || "Sin correo",

      compradorTelefono:

        saleData.compradorTelefono || buyerInfo.telefono || "Sin tel�fono",

      inmuebleTipo:

        matchedProperty.raw?.categoria || matchedProperty.raw?.tipo || saleData.inmuebleTipo,

      inmuebleRegistro: matchedProperty.registro || saleData.inmuebleRegistro,

      inmuebleNombre:

        matchedProperty.raw?.nombre ||

        matchedProperty.raw?.titulo ||

        saleData.inmuebleNombre ||

        "Sin nombre",

      inmuebleCiudad: matchedProperty.raw?.ciudad || saleData.inmuebleCiudad || "N/D",

      inmuebleDireccion:

        matchedProperty.raw?.direccion || saleData.inmuebleDireccion || "Sin dirección",

      inmueblePrecio: payload.valor_venta,

      id_inmueble: payload.id_inmueble,

    };



    try {

      const response = await ventaApiService.crearVenta(payload);

      const apiSale = response?.data ?? response;

      const normalizedSale = normalizeSaleRecord(apiSale, fallbackSale);



      let buyerUpdateError = null;

      try {

        await buyersApiService.updatePurchaseData(buyerInfo.personaId, {

          id_inmueble: payload.id_inmueble,

          id_venta: apiSale?.id_venta || apiSale?.id || normalizedSale.id,

          fecha_compra: payload.fecha_venta,

          valor_compra: payload.valor_venta,

          tipo_compra: mapPaymentToPurchaseType(payload.medio_pago),

        });

      } catch (error) {

        buyerUpdateError = error;

        console.error("No fue posible actualizar al comprador:", error);

      }



      setVentas((prev) => [...prev, normalizedSale]);

      setStatusMessage({

        type: "success",

        text: buyerUpdateError

          ? "Venta registrada, pero no se pudo actualizar la ficha del comprador. Revisa el módulo de compradores."

          : "Venta registrada correctamente.",

      });

      handleCloseForm();

    } catch (error) {

      console.error("Error guardando la venta:", error);

      setStatusMessage({

        type: "error",

        text:

          error?.message ||

          "No se pudo registrar la venta en la API. Revisa los datos e intenta nuevamente.",

      });

    } finally {

      setSavingVenta(false);

    }

  };



  const handleUpdateTracking = async (updatedSale) => {

    const saleId = updatedSale?.id || updatedSale?.id_venta;

    if (!saleId) {

      setStatusMessage({

        type: "error",

        text: "No se pudo identificar la venta para actualizar.",

      });

      return;

    }



    const existingSale = ventas.find((v) => String(v.id) === String(saleId)) || {};

    const mergedPayload = {

      ...existingSale,

      ...updatedSale,

      raw: existingSale?.raw || updatedSale?.raw,

    };

    if (!mergedPayload.estado) mergedPayload.estado = existingSale?.estado || "En espera";

    if (!mergedPayload.estadoSeguimiento)

      mergedPayload.estadoSeguimiento = mergedPayload.estado || "Iniciada";



    try {

      setStatusMessage({ type: "info", text: "Guardando cambios..." });



      // Optimista

      setVentas((prevVentas) =>

        prevVentas.map((v) =>

          String(v.id) === String(saleId)

            ? { ...v, estado: mergedPayload.estado, estadoSeguimiento: mergedPayload.estadoSeguimiento, descripcionSeguimiento: mergedPayload.descripcionSeguimiento }

            : v

        )

      );



      // Registrar seguimiento + cambio de estado con catÃ¡logo

      const trackingPayload = buildTrackingPayload(mergedPayload, statusCatalog);

      if (!trackingPayload) {

        setStatusMessage({

          type: "error",

          text: "No se pudo registrar seguimiento: falta id_comprador o estado.",

        });

        return;

      }

      await ventaApiService.cambiarEstado(saleId, {
        ...trackingPayload,
        descripcion: mergedPayload.descripcionSeguimiento || trackingPayload.descripcion,
      });


      // Refrescar desde API

      const refreshed = await ventaApiService.obtenerVenta(saleId);

      const apiSale = refreshed?.data?.data || refreshed?.data || refreshed;

      const normalized = normalizeSaleRecord(apiSale, mergedPayload);

      const merged = {

        ...normalized,

        estado: mergedPayload.estado || normalized.estado,

        estadoSeguimiento: mergedPayload.estadoSeguimiento || normalized.estadoSeguimiento,

        descripcionSeguimiento:

          mergedPayload.descripcionSeguimiento ?? normalized.descripcionSeguimiento,

      };



      setVentas((prevVentas) =>

        prevVentas.map((v) =>

          String(v.id) === String(saleId) ? { ...v, ...merged, raw: apiSale } : v

        )

      );



      setStatusMessage({

        type: "success",

        text: "Estados guardados correctamente.",

      });

    } catch (error) {

      console.error("Error actualizando estados:", error);

      setStatusMessage({

        type: "error",

        text: error?.message || "No se pudo actualizar el estado. Intenta nuevamente.",

      });

    } finally {

      setTrackingSale(null);

    }

  };



  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredVentas = ventas.filter((v) => {
    if (!normalizedSearch) return true;

    const registro = v.registro ? v.registro.toLowerCase() : "";
    const comprador = v.comprador ? v.comprador.toLowerCase() : "";
    const compradorCorreo = v.compradorCorreo ? v.compradorCorreo.toLowerCase() : "";
    const compradorDocumento = v.compradorDocumento ? String(v.compradorDocumento).toLowerCase() : "";
    const tipo = v.tipo ? v.tipo.toLowerCase() : "";
    const estado = v.estado ? v.estado.toLowerCase() : "";
    const fecha = v.fecha ? String(v.fecha).toLowerCase() : "";
    const valor = v.valor ? String(v.valor).toLowerCase() : "";

    return (
      registro.includes(normalizedSearch) ||
      comprador.includes(normalizedSearch) ||
      compradorCorreo.includes(normalizedSearch) ||
      compradorDocumento.includes(normalizedSearch) ||
      tipo.includes(normalizedSearch) ||
      estado.includes(normalizedSearch) ||
      fecha.includes(normalizedSearch) ||
      valor.includes(normalizedSearch)
    );
  });



  // Calcular estadísticas

  const stats = {

    total: filteredVentas.length,

    pagadas: filteredVentas.filter(v => v.estado === 'Pagado').length,

    pendientes: filteredVentas.filter(v => v.estado === 'Pendiente').length,

    totalValor: filteredVentas.reduce((sum, v) => sum + toNumericValue(v.valor), 0)

  };



  // 🔑 --- FUNCIONES PARA RENDERIZAR MODALES CON PORTAL ---

  const renderFormModal = () => {

    if (!showForm) return null;



    const modalContent = (

      <SaleForm onSubmit={handleSaveSale} onClose={handleCloseForm} />

    );



    return ReactDOM.createPortal(

      modalContent,

      document.getElementById('modal-root') || document.body

    );

  };



  const renderViewModal = () => {

    if (!viewingSale) return null;



    const modalContent = (

      <ViewSaleModal

        sale={viewingSale}

        onClose={() => setViewingSale(null)}

      />

    );



    return ReactDOM.createPortal(

      modalContent,

      document.getElementById('modal-root') || document.body

    );

  };



  const renderInterestedPeopleModal = () => {

    if (!showInterestedPeople) return null;



    const modalContent = (

      <InterestedPeopleTable

        onClose={() => setShowInterestedPeople(false)}

      />

    );



    return ReactDOM.createPortal(

      modalContent,

      document.getElementById('modal-root') || document.body

    );

  };



  const renderTrackingModal = () => {

    if (!trackingSale) return null;



    const modalContent = (

        <PurchaseTrackingModal

          venta={trackingSale}

          statusOptions={statusCatalog.length ? statusCatalog : DEFAULT_STATUS_CATALOG}

          onClose={() => setTrackingSale(null)}

          onUpdate={handleUpdateTracking}

        />

    );



    return ReactDOM.createPortal(

      modalContent,

      document.getElementById('modal-root') || document.body

    );

  };



  return (

    <>

      <div className="p-6 space-y-6">

        {/* HEADER CON NUEVO ESTILO */}

        <motion.div

          initial={{ opacity: 0, y: 20 }}

          animate={{ opacity: 1, y: 0 }}

          transition={{ duration: 0.5 }}

          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"

        >

          <div>

            <h1 className="text-3xl font-bold text-slate-800">Gestión de Ventas</h1>

            <p className="text-slate-600 mt-1">Administra todas las transacciones de venta de tus propiedades</p>

          </div>

          

          {/* BOTÓN CREAR VENTA EN POSICIÓN DESTACADA - COLOR AZUL */}

          <motion.button

            whileHover={{ scale: 1.02 }}

            whileTap={{ scale: 0.98 }}

            onClick={() => setShowForm(true)}

            disabled={savingVenta}

            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${

              savingVenta 

                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 

                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'

            }`}

          >

            <Plus className="w-5 h-5" />

            {savingVenta ? "Guardando..." : "Crear Venta"}

          </motion.button>

        </motion.div>



        {propertiesError && (

          <motion.div

            initial={{ opacity: 0, y: 20 }}

            animate={{ opacity: 1, y: 0 }}

            className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 flex items-start justify-between gap-4"

          >

            <span>{propertiesError}</span>

            <motion.button

              whileHover={{ scale: 1.05 }}

              whileTap={{ scale: 0.95 }}

              type="button"

              onClick={loadProperties}

              className="text-xs font-semibold uppercase tracking-wide text-yellow-700 hover:text-yellow-900"

            >

              Reintentar

            </motion.button>

          </motion.div>

        )}



        {statusMessage && (

          <motion.div

            initial={{ opacity: 0, y: 20 }}

            animate={{ opacity: 1, y: 0 }}

            className={`rounded-lg border px-4 py-3 text-sm font-medium ${

              statusMessage.type === "error"

                ? "border-red-200 bg-red-50 text-red-700"

                : "border-green-200 bg-green-50 text-green-700"

            }`}

          >

            <div className="flex items-center justify-between gap-4">

              <span>{statusMessage.text}</span>

              {statusMessage.type === "error" && (

                <motion.button

                  whileHover={{ scale: 1.05 }}

                  whileTap={{ scale: 0.95 }}

                  type="button"

                  className="text-xs font-semibold uppercase tracking-wide text-red-600 hover:text-red-800"

                  onClick={fetchVentas}

                >

                  Reintentar

                </motion.button>

              )}

            </div>

          </motion.div>

        )}



        {/* SEARCH AND FILTERS - SIN BOTÓN CREAR VENTA AQUÍ */}

        <motion.div

          initial={{ opacity: 0, y: 20 }}

          animate={{ opacity: 1, y: 0 }}

          transition={{ duration: 0.5, delay: 0.2 }}

          className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"

        >

          <div className="flex-1 max-w-md">

            <div className="relative">

              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />

              <input

                type="text"

                placeholder="Buscar por registro, comprador o tipo..."

                value={searchTerm}

                onChange={(e) => setSearchTerm(e.target.value)}

                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-150 shadow-sm bg-white"

              />

            </div>

          </div>

          
        </motion.div>



        {/* CONTENT AREA */}

        <motion.div

          initial={{ opacity: 0, y: 20 }}

          animate={{ opacity: 1, y: 0 }}

          transition={{ duration: 0.5, delay: 0.3 }}

        >

          {/* TABLA CON ESTILO UNIFICADO */}

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-slate-50 border-b border-slate-200">

                  <tr>

                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Registro</th>

                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>

                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Comprador</th>

                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>

                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Valor</th>

                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>

                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-200">

                  {loadingVentas ? (

                    <tr>

                      <td

                        colSpan="7"

                        className="px-6 py-8 text-center text-slate-500"

                      >

                        <div className="flex items-center justify-center gap-2">

                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>

                          Cargando ventas desde la API...

                        </div>

                      </td>

                    </tr>

                  ) : filteredVentas.length > 0 ? (

                    filteredVentas.map((v) => (

                      <tr

                        key={v.id}

                        className="hover:bg-slate-50 transition-colors"

                      >

                        <td className="px-6 py-4 text-center text-sm text-slate-700">{v.registro}</td>

                        <td className="px-6 py-4 text-center text-sm text-slate-700">{v.tipo}</td>

                        <td className="px-6 py-4 text-center text-sm text-slate-700">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-semibold text-slate-800 truncate max-w-[200px]">{v.comprador}</span>
                            <span className="text-xs text-slate-500 flex items-center justify-center gap-1">
                              <Mail className="w-3 h-3" />
                              {v.compradorCorreo || "Sin correo"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center text-sm text-slate-700">{v.fecha}</td>

                        <td className="px-6 py-4 text-center text-sm font-semibold text-purple-700">

                          {v.valor}

                        </td>

                        <td className="px-6 py-4 text-center">

                          <div className="flex flex-col items-center justify-center">

                            <EstadoBadge estado={v.estado} />

                          </div>

                        </td>

                        <td className="px-6 py-4 text-center">

                          <div className="flex gap-2 justify-center">

                            <motion.button

                              whileHover={{ scale: 1.1 }}

                              whileTap={{ scale: 0.9 }}

                              aria-label="Ver detalles de la venta"

                              className="p-2 text-blue-600 hover:text-blue-800 transition-colors"

                              onClick={() => handleViewClick(v)}

                            >

                              <Eye className="w-4 h-4" />

                            </motion.button>

                            <motion.button

                              whileHover={{ scale: 1.1 }}

                              whileTap={{ scale: 0.9 }}

                              aria-label="Seguimiento de venta"

                              className="p-2 text-amber-600 hover:text-amber-800 transition-colors"

                              onClick={() => handleEditClick(v)}

                            >

                              <ListChecks className="w-4 h-4" />

                            </motion.button>

                            {/* Acción de eliminar deshabilitada porque una venta no se borra */}

                          </div>

                        </td>

                      </tr>

                    ))

                  ) : (

                    <tr>

                      <td

                        colSpan="7"

                        className="px-6 py-8 text-center text-slate-500"

                      >

                        <div className="flex flex-col items-center gap-2">

                          <Home className="w-8 h-8 text-slate-400" />

                          <p>No se encontraron resultados</p>

                        </div>

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </motion.div>

      </div>



      {/* --- MODALES RENDERIZADOS CON PORTAL --- */}

      {renderFormModal()}

      {renderViewModal()}

      {renderInterestedPeopleModal()}

      {renderTrackingModal()}

    </>

  );

}



































