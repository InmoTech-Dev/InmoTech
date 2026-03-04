import React, { useRef, useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { buyersApiService } from "../../../../shared/services/buyersApiService";
import { inmueblesAPI } from "../../../../shared/services/propertyApidervice";
import { useToast } from "../../../../shared/hooks/use-toast";

// Lista de campos que deben ser obligatorios para el registro
const requiredFields = [
    // Vendedor
    "vendedorTipoDocumento", "vendedorDocumento", "vendedorNombreCompleto", "vendedorCorreo", "vendedorTelefono",
    // Comprador
    "compradorTipoDocumento", "compradorDocumento", "compradorNombreCompleto", "compradorCorreo", "compradorTelefono",
    // Inmueble
    "inmuebleTipo", "inmuebleRegistro", "inmuebleNombre",
    "inmueblePais", "inmuebleDepartamento", "inmuebleCiudad", "inmuebleDireccion",
    // Venta
    "fechaVenta", "medioPago", "inmueblePrecio",
];

// Nombres de los campos que requieren formato especial (Documento)
const VENDEDOR_DOC = "vendedorDocumento";
const COMPRADOR_DOC = "compradorDocumento";

const DOCUMENT_OPTIONS = [
    { value: "CC", label: "Cédula de Ciudadanía (CC)" },
    { value: "CE", label: "Cédula de Extranjería (CE)" },
    { value: "NIT", label: "NIT" },
    { value: "PASAPORTE", label: "Pasaporte" },
    { value: "TI", label: "Tarjeta de Identidad (TI)" },
];

const PAYMENT_OPTIONS = [
    { value: "efectivo", label: "Efectivo" },
    { value: "transferencia", label: "Transferencia" },
    { value: "mixto", label: "Mixto" },
];

const BUYER_AUTOFILL_FIELDS = [
    "compradorNombreCompleto",
    "compradorCorreo",
    "compradorTelefono",
];

// Estado inicial
const initial = {
    vendedorTipoDocumento: "",
    vendedorDocumento: "",
    vendedorNombreCompleto: "",
    vendedorCorreo: "",
    vendedorTelefono: "",
    compradorTipoDocumento: "",
    compradorDocumento: "",
    compradorPersonaId: "",
    compradorNombreCompleto: "",
    compradorCorreo: "",
    compradorTelefono: "",
    inmuebleTipo: "",
    inmuebleRegistro: "",
    inmuebleNombre: "",
    inmueblePais: "Colombia",
    inmuebleDepartamento: "",
    inmuebleCiudad: "",
    inmuebleBarrio: "",
    inmuebleDireccion: "",
    inmueblePrecio: "",
    inmuebleEstado: "Disponible",
    fechaVenta: new Date().toISOString().slice(0, 10),
    medioPago: "efectivo",
    medioPagoDescripcion: "",
    medioPagoEfectivo: "",
    medioPagoTransferencia: "",
};

// Helpers para validar restricciones de inmueble
const normalizeTextValue = (value = "") =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

const getPropertySource = (property = {}) =>
    property?.metadata?.raw || property?.raw || property || {};

const propertyHasActiveLease = (property = {}) => {
    const source = getPropertySource(property);
    const estadoTexto = normalizeTextValue(
        property.estado ||
        source.estado_frontend ||
        source.estado ||
        source.estado_inmueble
    );

    const leaseCollections = [
        source.arriendos,
        source.arrendamientos,
        source.leases,
        source.lease,
        source.inmueble_arriendos,
        source.arriendos_activos,
    ].filter(Array.isArray);

    const leaseList = leaseCollections.flat();

    const hasLeaseMarkedActive = leaseList.some((lease) => {
        const leaseState = normalizeTextValue(
            lease?.estado ||
            lease?.estado_contrato ||
            lease?.estado_arriendo ||
            lease?.status
        );
        return (
            leaseState === "activo" ||
            leaseState === "activa" ||
            leaseState.includes("vigente") ||
            leaseState.includes("en curso")
        );
    });

    return (
        estadoTexto.includes("arrend") ||
        estadoTexto.includes("alquil") ||
        hasLeaseMarkedActive
    );
};

const propertyIsOnlyForRent = (property = {}) => {
    const source = getPropertySource(property);
    const operacion = normalizeTextValue(
        property.operacion || source.operacion || source.tipo_operacion
    );
    return operacion === "arriendo" || operacion === "alquiler";
};

const propertyIsSold = (property = {}) => {
    const source = getPropertySource(property);
    const estadoTexto = normalizeTextValue(
        property.estado ||
        source.estado ||
        source.estado_inmueble ||
        source.estado_frontend ||
        property.estadoVenta ||
        source.estado_venta
    );
    const soldKeywords = ["vendido", "vendida", "vendidos", "sold", "cerrada", "completada"];
    return soldKeywords.some((kw) => estadoTexto.includes(kw));
};

const normalizeDocType = (value = "") => {
    const v = normalizeTextValue(value);
    if (!v) return "";
    if (["cc", "c.c", "cedula", "cédula", "cedula de ciudadania", "cédula de ciudadanía", "id"].includes(v)) return "CC";
    if (["ce", "c.e", "cedula de extranjeria", "cédula de extranjería", "extranjeria", "extranjería"].includes(v)) return "CE";
    if (["nit", "n.i.t", "tax id"].includes(v)) return "NIT";
    if (["pasaporte", "passport", "pp"].includes(v)) return "PASAPORTE";
    if (["ti", "t.i", "tarjeta de identidad"].includes(v)) return "TI";
    return value; // deja tal cual si no coincide; el select mostrará vacío si no existe la opción
};

// Separa posibles prefijos de tipo y limpia solo dígitos para el número
const splitDocTypeAndNumber = (rawNumber = "", rawType = "") => {
    const trimmed = String(rawNumber || "").trim();
    let inferredType = normalizeDocType(rawType);
    let numberOnly = trimmed.replace(/\D+/g, "");

    const match = trimmed.match(/^([A-Za-z]{1,4})[\s\-]*([0-9]+)$/);
    if (match) {
        inferredType = inferredType || normalizeDocType(match[1]);
        numberOnly = match[2];
    }

    return {
        tipo: inferredType,
        numero: numberOnly
    };
};

// Limpia el número de documento a solo dígitos (para validación y búsquedas)
const cleanDocument = (value = "") => value.toString().replace(/[^0-9]/g, "").trim();
const MIN_BUYER_DOC_LENGTH = 6;
const shouldTriggerBuyerLookup = (tipoDocumento = "", numeroDocumento = "") => {
    const cleaned = cleanDocument(numeroDocumento);
    return Boolean(tipoDocumento) && cleaned.length >= MIN_BUYER_DOC_LENGTH;
};

const getOwnerCandidate = (inmueble = {}) => {
    if (inmueble.propietario) return inmueble.propietario;
    if (Array.isArray(inmueble.propietarios) && inmueble.propietarios.length) return inmueble.propietarios[0];
    const source = getPropertySource(inmueble);
    return source?.propietario || source?.owner || null;
};

export default function SalesForm({ onClose, onSubmit }) {
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState({});
    const totalSteps = 4;
    const { toast } = useToast();

    // Refs para manejo eficiente de estado (igual que en el formulario de arriendos)
    const valuesRef = useRef({ ...initial });
    const displayValuesRef = useRef({ ...initial });
    const elRefs = useRef({});
    const errorFocusTimeout = useRef(null);
    const buyerLookupTimeoutRef = useRef(null);
    const buyerLookupRequestId = useRef(0);
    const selectedBuyerRef = useRef(null);
    const manuallyEditedBuyerFieldsRef = useRef(new Set());
    const buyerDocumentSnapshotRef = useRef({
        tipo: "",
        numero: "",
    });
    const [buyerLookupState, setBuyerLookupState] = useState({
        loading: false,
        message: "",
        error: null,
    });
    const [inmuebleLookupState, setInmuebleLookupState] = useState({
        loading: false,
        message: "",
        error: null,
    });

    // Campos estrictamente numéricos (solo dígitos)
    const strictNumericFields = [];

    const currencyFields = ["inmueblePrecio", "medioPagoEfectivo", "medioPagoTransferencia"];

    // Campos para validaciones de formato
    const nameFields = [
        "vendedorNombreCompleto", "compradorNombreCompleto",
    ];
    const docFields = [VENDEDOR_DOC, COMPRADOR_DOC];
const phoneFields = ["vendedorTelefono", "compradorTelefono"];
const emailFields = ["vendedorCorreo", "compradorCorreo"];

const sanitizeNumericString = (value) => {
    if (value === undefined || value === null) return "";
    return value.toString().replace(/[^0-9]/g, "");
};

const normalizePhone = (value = "") => {
    const digits = sanitizeNumericString(value);
    if (!digits) return "";
    if (digits.startsWith("57") && digits.length > 10) {
        return digits.slice(-10);
    }
    return digits.slice(-10);
};

    // Campos agrupados por paso para la validación
    // Orden de pasos: 1) inmueble, 2) vendedor (propietario), 3) comprador, 4) precio/pago
    const stepFields = {
        1: [
            "inmuebleTipo", "inmuebleRegistro", "inmuebleNombre",
            "inmueblePais", "inmuebleDepartamento", "inmuebleCiudad",
            "inmuebleBarrio", "inmuebleDireccion"
        ],
        2: [
            "vendedorTipoDocumento", VENDEDOR_DOC, "vendedorNombreCompleto", 
            "vendedorCorreo", "vendedorTelefono",
        ],
        3: [
            "compradorTipoDocumento", COMPRADOR_DOC, "compradorNombreCompleto", 
            "compradorCorreo", "compradorTelefono",
        ],
        4: [
            "fechaVenta", "medioPago", "medioPagoEfectivo", "medioPagoTransferencia", "inmueblePrecio"
        ]
    };

    useEffect(() => {
        return () => {
            if (buyerLookupTimeoutRef.current) {
                clearTimeout(buyerLookupTimeoutRef.current);
            }
            if (errorFocusTimeout.current) {
                clearTimeout(errorFocusTimeout.current);
            }
        };
    }, []);

    const getLabel = (name) => {
        const labels = {
            // Vendedor
            vendedorTipoDocumento: "Tipo Doc. Vendedor", 
            vendedorDocumento: "Número Doc. Vendedor",
            vendedorNombreCompleto: "Nombre Completo Vendedor", 
            vendedorCorreo: "Correo Vendedor",
            vendedorTelefono: "Teléfono Vendedor",

            // Comprador
            compradorTipoDocumento: "Tipo Doc. Comprador", 
            compradorDocumento: "Número Doc. Comprador",
            compradorNombreCompleto: "Nombre Completo Comprador", 
            compradorCorreo: "Correo Comprador",
            compradorTelefono: "Teléfono Comprador",

            // Inmueble
            inmuebleTipo: "Tipo de Inmueble", 
            inmuebleRegistro: "No. Registro Catastral",
            inmuebleNombre: "Nombre/Título Comercial", 
            inmueblePais: "País", 
            inmuebleDepartamento: "Departamento/Estado",
            inmuebleCiudad: "Ciudad", 
            inmuebleBarrio: "Barrio/Zona",
            inmuebleDireccion: "Dirección Completa",
            inmueblePrecio: "Precio de Venta (COP)", 


            // Venta
            fechaVenta: "Fecha de Venta",
            medioPago: "Medio de Pago",
            medioPagoDescripcion: "Descripción del pago mixto",
            medioPagoEfectivo: "Pago en efectivo",
            medioPagoTransferencia: "Pago por transferencia",
        };
        return labels[name] ?? name;
    };

    // === VALIDACIONES MEJORADAS PARA DOCUMENTOS ===

    // Función para validar documentos según el tipo
    const validateDocument = (tipoDocumento, numeroDocumento) => {
        const numeroLimpio = numeroDocumento.replace(/[^0-9]/g, '');
        
        switch (tipoDocumento) {
            case 'CC': // Cédula de Ciudadanía
                if (!/^[0-9]{8,10}$/.test(numeroLimpio)) {
                    return 'La cédula de ciudadanía debe tener entre 8 y 10 dígitos';
                }
                break;
                
            case 'CE': // Cédula de Extranjería
                if (!/^[0-9]{6,10}$/.test(numeroLimpio)) {
                    return 'La cédula de extranjería debe tener entre 6 y 10 dígitos';
                }
                break;
                
            case 'NIT': // NIT
                if (!/^[0-9]{9,10}$/.test(numeroLimpio)) {
                    return 'El NIT debe tener 9 o 10 dígitos';
                }
                break;
                
            case 'PASAPORTE': // Pasaporte
                if (numeroLimpio.length < 6 || numeroLimpio.length > 20) {
                    return 'El pasaporte debe tener entre 6 y 20 caracteres';
                }
                if (!/^[A-Za-z0-9]+$/.test(numeroLimpio)) {
                    return 'El pasaporte solo puede contener letras y números';
                }
                break;
                
            case 'TI': // Tarjeta de Identidad
                if (!/^[0-9]{10,11}$/.test(numeroLimpio)) {
                    return 'La tarjeta de identidad debe tener 10 u 11 dígitos';
                }
                break;
                
            default:
                return 'Tipo de documento no válido';
        }
        
        return '';
    };

    // Función para obtener la clase de estilo (incluyendo el resaltado de error)
    const getFieldClass = useCallback((fieldName) => {
        const errorClass = errors[fieldName] 
            ? 'border-red-500 ring-2 ring-red-500' 
            : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
        return `w-full p-3 border rounded-lg focus:outline-none transition duration-150 ${errorClass}`;
    }, [errors]);

    // Formateador de números con separadores de miles
    const formatNumberWithThousandsSeparator = (value) => {
        if (!value) return "";
        const cleanValue = value.replace(/[^0-9]/g, '');
        if (cleanValue === "") return "";
        
        const formatter = new Intl.NumberFormat('es-CO', { 
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        return formatter.format(cleanValue);
    };

    // Configuración de referencias de elementos
    const setElRef = (name) => (el) => {
        if (!el) return;
        elRefs.current[name] = el;
        
        if (valuesRef.current[name] === undefined || valuesRef.current[name] === null) {
            valuesRef.current[name] = initial[name] ?? "";
        }
        
        // Inicializar valor de visualización para campos de moneda
        if (currencyFields.includes(name) && valuesRef.current[name]) {
            displayValuesRef.current[name] = formatNumberWithThousandsSeparator(valuesRef.current[name].toString());
        } else {
            displayValuesRef.current[name] = valuesRef.current[name];
        }

        if (el.type === "checkbox") {
            el.checked = !!valuesRef.current[name];
        } else {
            if (displayValuesRef.current[name] !== undefined) {
                try { el.value = displayValuesRef.current[name]; } catch (err) { /* ignore */ }
            }
        }
    };

    // Manejador de cambios en inputs (sistema optimizado)
    const handleInputChange = (e) => {
        let { name, type, value, checked } = e.target;
        let cleanValue = value;
        const isDocFieldChange = docFields.includes(name);
        const isPhoneFieldChange = phoneFields.includes(name);

        if (type === "checkbox") {
            valuesRef.current[name] = checked;
        } else {
            // Formatear campos de moneda
            if (currencyFields.includes(name)) {
                cleanValue = value.replace(/[^0-9]/g, '');
                const formattedValue = formatNumberWithThousandsSeparator(cleanValue);
                
                displayValuesRef.current[name] = formattedValue;
                e.target.value = formattedValue;
            } else if (isDocFieldChange || isPhoneFieldChange) {
                // Sanitizar en vivo para que no "salte" el cursor
                cleanValue = cleanDocument(value);
                displayValuesRef.current[name] = cleanValue;
                if (e.target.value !== cleanValue) {
                    e.target.value = cleanValue;
                }
            } else {
                displayValuesRef.current[name] = value;
            }
            
            valuesRef.current[name] = cleanValue;

            // Reset de selección de comprador si cambian documentos
            if (name === COMPRADOR_DOC || name === "compradorTipoDocumento") {
                selectedBuyerRef.current = null;
                manuallyEditedBuyerFieldsRef.current.clear();
            }

            // Marcar campos editados manualmente
            if (BUYER_AUTOFILL_FIELDS.includes(name)) {
                manuallyEditedBuyerFieldsRef.current.add(name);
            }

            // Disparar búsqueda solo cuando hay datos mínimos (evita bloquear escritura)
            if (name === COMPRADOR_DOC || name === "compradorTipoDocumento") {
                const tipoDocActual =
                    name === "compradorTipoDocumento" ? cleanValue : (valuesRef.current.compradorTipoDocumento || "");
                const numeroDocActual =
                    name === COMPRADOR_DOC ? cleanValue : (valuesRef.current.compradorDocumento || "");

                buyerDocumentSnapshotRef.current = {
                    tipo: tipoDocActual,
                    numero: cleanDocument(numeroDocActual || ""),
                };

                if (shouldTriggerBuyerLookup(tipoDocActual, numeroDocActual)) {
                    triggerBuyerLookup(120);
                } else {
                    // Limpia mensajes de lookup mientras el usuario sigue escribiendo
                    setBuyerLookupState((prev) =>
                        prev.loading || prev.error || prev.message
                            ? { loading: false, message: "", error: null }
                            : prev
                    );
                }
            }
        }

        // Limpiar errores al escribir
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        // Si cambia el medio de pago a algo distinto de mixto, limpiar campos mixtos
        if (name === "medioPago" && cleanValue.toLowerCase() !== "mixto") {
            valuesRef.current.medioPagoDescripcion = "";
            displayValuesRef.current.medioPagoDescripcion = "";
            valuesRef.current.medioPagoEfectivo = "";
            valuesRef.current.medioPagoTransferencia = "";
            displayValuesRef.current.medioPagoEfectivo = "";
            displayValuesRef.current.medioPagoTransferencia = "";

            const descEl = elRefs.current.medioPagoDescripcion;
            const efEl = elRefs.current.medioPagoEfectivo;
            const trEl = elRefs.current.medioPagoTransferencia;
            if (descEl) {
                try { descEl.value = ""; } catch (_err) { /* ignore */ }
            }
            if (efEl) {
                try { efEl.value = ""; } catch (_err) { /* ignore */ }
            }
            if (trEl) {
                try { trEl.value = ""; } catch (_err) { /* ignore */ }
            }

            setErrors(prev => {
                const next = { ...prev };
                delete next.medioPagoDescripcion;
                delete next.medioPagoEfectivo;
                delete next.medioPagoTransferencia;
                return next;
            });
        }
    };

    const setFieldValue = (name, value) => {
        valuesRef.current[name] = value ?? "";
        displayValuesRef.current[name] = value ?? "";
        const el = elRefs.current[name];
        if (el) {
            if (el.type === "checkbox") {
                el.checked = !!value;
            } else {
                try { el.value = value ?? ""; } catch (_err) { /* ignore */ }
            }
        }
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    // Autocompleta vendedor con datos del propietario del inmueble
    const autofillVendedorDesdePropietario = (inmueble = {}) => {
        const owner = getOwnerCandidate(inmueble);
        if (!owner) return;

        const source = getPropertySource(inmueble);
        const raw = inmueble.metadata?.raw || {};
        const ownerRawList = Array.isArray(raw.propietarios) && raw.propietarios.length ? raw.propietarios[0] : null;
        const ownerRaw =
            raw.propietario ||
            raw.owner ||
            raw.propietario_principal ||
            raw.propietarioPrincipal ||
            ownerRawList ||
            raw ||
            {};

        const docNumero =
            owner.numero_documento || owner.numeroDocumento || owner.documento || owner.cedula || owner.identificacion || owner.identificación || owner.nit ||
            source?.propietario_documento || source?.documento_propietario ||
            source?.identificacion_propietario || source?.cedula_propietario || source?.nit_propietario || source?.documento ||
            ownerRaw.numero_documento || ownerRaw.numeroDocumento || ownerRaw.documento || ownerRaw.cedula || ownerRaw.cédula ||
            ownerRaw.identificacion || ownerRaw.identificación || ownerRaw.nit || ownerRaw.nro_documento_propietario || ownerRaw.doc_propietario;

        const docTipo =
            owner.tipo_documento || owner.tipoDocumento || owner.tipo_doc || owner.documento_tipo ||
            source?.propietario_tipo_documento || source?.tipo_documento_propietario || source?.documento_tipo || source?.tipo_doc || source?.tipoDocumento ||
            ownerRaw.tipo_documento || ownerRaw.tipoDocumento || ownerRaw.tipo_doc || ownerRaw.documento_tipo || ownerRaw.tipo || ownerRaw.clase_documento;

        const nombre =
            owner.nombreCompleto || owner.nombre_completo ||
            [owner.nombre, owner.apellido, owner.apellidos].filter(Boolean).join(" ").trim();

        const { tipo, numero } = splitDocTypeAndNumber(docNumero, docTipo);

        if (tipo) setFieldValue("vendedorTipoDocumento", tipo);
        if (numero) {
            setFieldValue(VENDEDOR_DOC, String(numero));
            // Guardar snapshot para que las validaciones/búsquedas no lo borren
            buyerDocumentSnapshotRef.current = {
                tipo: valuesRef.current.vendedorTipoDocumento || tipo || "",
                numero: String(numero)
            };
        }
        if (nombre) setFieldValue("vendedorNombreCompleto", nombre);
        if (owner.email || owner.correo) setFieldValue("vendedorCorreo", owner.email || owner.correo);
        if (owner.telefono || owner.celular) setFieldValue("vendedorTelefono", owner.telefono || owner.celular);
    };

    const autofillInmueble = (inmueble, { skipEstado = false } = {}) => {
        if (!inmueble) return;

        setFieldValue("inmuebleTipo", inmueble.categoria || inmueble.tipo || "");
        setFieldValue("inmuebleNombre", inmueble.titulo || "");
        setFieldValue("inmuebleRegistro", inmueble.registro || "");
        setFieldValue("inmuebleDireccion", inmueble.direccion || "");
        setFieldValue("inmuebleBarrio", inmueble.barrio || "");
        setFieldValue("inmuebleCiudad", inmueble.ciudad || "");
        setFieldValue("inmuebleDepartamento", inmueble.departamento || "");
        setFieldValue("inmueblePais", inmueble.pais || "Colombia");

        if (!skipEstado) {
            const estadoTexto = inmueble.estado_bool === false ? "No disponible" : "Disponible";
            setFieldValue("inmuebleEstado", estadoTexto === "Disponible" ? "Disponible" : "En Negociacion");
        }

        const precio =
            inmueble.precio_venta ??
            inmueble.precio_arriendo ??
            inmueble.precio ??
            "";
        if (precio !== "" && precio !== null && precio !== undefined) {
            const clean = String(precio).replace(/[^0-9]/g, "");
            valuesRef.current.inmueblePrecio = clean;
            const formatted = formatNumberWithThousandsSeparator(clean);
            displayValuesRef.current.inmueblePrecio = formatted;
            const priceEl = elRefs.current["inmueblePrecio"];
            if (priceEl) priceEl.value = formatted;
        }

        // Autocompletar vendedor con datos del propietario
        autofillVendedorDesdePropietario(inmueble);
    };

    const handleInmuebleLookup = useCallback(async (registro = "") => {
        const cleanRegistro = (registro || "").trim();
        if (!cleanRegistro) return;

        setInmuebleLookupState({ loading: true, message: "", error: null });

        try {
            const inmueble = await inmueblesAPI.getInmuebleByRegistro(cleanRegistro);

            if (inmueble && inmueble.id) {
                if (propertyIsSold(inmueble)) {
                    setInmuebleLookupState({ loading: false, message: "", error: null });
                    setErrors((prev) => {
                        const next = { ...prev };
                        next.inmuebleRegistro = "Este inmueble ya fue vendido y no puede registrarse otra venta.";
                        return next;
                    });
                    toast({
                        title: "Inmueble ya vendido",
                        description: "No se puede registrar una nueva venta para este inmueble.",
                        variant: "destructive",
                    });
                    return;
                }

                if (propertyHasActiveLease(inmueble)) {
                    setInmuebleLookupState({ loading: false, message: "", error: null });
                    setErrors((prev) => {
                        const next = { ...prev };
                        delete next.inmuebleRegistro; // evitamos mostrar texto de la API en el campo
                        return next;
                    });
                    toast({
                        title: "Inmueble con arriendo activo",
                        description: "No se puede vender: arriendo activo.",
                        variant: "destructive",
                    });
                    return;
                }

                if (propertyIsOnlyForRent(inmueble)) {
                    setInmuebleLookupState({ loading: false, message: "", error: null });
                    setErrors((prev) => {
                        const next = { ...prev };
                        delete next.inmuebleRegistro;
                        return next;
                    });
                    toast({
                        title: "Inmueble marcado solo para arriendo",
                        description: "No se puede vender este inmueble porque está para arriendo.",
                        variant: "destructive",
                    });
                    return;
                }

                autofillInmueble(inmueble, { skipEstado: true });
                setInmuebleLookupState({
                    loading: false,
                    message: "Datos del inmueble completados automáticamente.",
                    error: null,
                });
                toast({
                    title: "Inmueble encontrado",
                    description: "Datos del inmueble completados automáticamente.",
                    variant: "default",
                });
            } else {
                setInmuebleLookupState({
                    loading: false,
                    message: "",
                    error: "No encontramos un inmueble con ese registro.",
                });
                toast({
                    title: "Inmueble no encontrado",
                    description: "No encontramos un inmueble con ese registro.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            setInmuebleLookupState({
                loading: false,
                message: "",
                error: error?.message || "No fue posible buscar el inmueble.",
            });
            toast({
                title: "Error al buscar inmueble",
                description: error?.message || "No fue posible buscar el inmueble.",
                variant: "destructive",
            });
        }
    }, []);

    // Funciones de validación de formato
    const isValidName = (value) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(value);
    const isValidNumeric = (value) => /^\d*$/.test(value);
    const isValidEmail = (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

    // Manejador de blur para validación MEJORADO
    const handleInputBlur = async (e) => {
        const { name } = e.target;
        const value = valuesRef.current[name] || ""; 
        
        let errorMessage = null;
        const isRequired = requiredFields.includes(name);

        setErrors(prev => {
            const newErrors = { ...prev };

            // Validar campo obligatorio
            if (isRequired && !value.trim()) { 
                 errorMessage = "Este campo es obligatorio.";
            }

            // Validar formato y longitud (solo si no hay error de obligatoriedad y el campo tiene valor)
            if (!errorMessage && value.trim()) {
                if (nameFields.includes(name) && !isValidName(value)) {
                    errorMessage = `Solo se permiten letras.`;
                } 
                // VALIDACIÓN MEJORADA PARA DOCUMENTOS
                else if (docFields.includes(name)) {
                    let tipoDocumento = "";
                    
                    if (name === VENDEDOR_DOC) {
                        tipoDocumento = valuesRef.current.vendedorTipoDocumento || "CC";
                    } else if (name === COMPRADOR_DOC) {
                        tipoDocumento = valuesRef.current.compradorTipoDocumento || "CC";
                    }
                    
                    // Validar formato básico primero
                    if (!/^[A-Za-z0-9\s\-\.]*$/.test(displayValuesRef.current[name])) {
                        errorMessage = `Solo se permiten letras, números, espacios, puntos y guiones`;
                    } else {
                        // Validación específica por tipo de documento
                        errorMessage = validateDocument(tipoDocumento, value);
                    }
                } 
                else if (phoneFields.includes(name)) {
                    if (!isValidNumeric(value)) {
                        errorMessage = `Solo se permiten números.`;
                    } else if (value.length < 10) {
                        errorMessage = `El teléfono debe tener al menos 10 dígitos`;
                    }
                } 
                else if (emailFields.includes(name) && !isValidEmail(value)) {
                    errorMessage = `El correo electrónico debe ser válido.`;
                } 
            }

            // Aplicar o limpiar error
            if (errorMessage) {
                newErrors[name] = errorMessage;
            } else {
                delete newErrors[name];
            }

            return newErrors;
        });

        // Lookup de inmueble por registro para autocompletar
        if (name === "inmuebleRegistro" && !errorMessage && value.trim().length > 0) {
            await handleInmuebleLookup(value);
        }
        // Lógica de búsqueda de comprador
        if (name === COMPRADOR_DOC || name === "compradorTipoDocumento") {
            const currentTipo = valuesRef.current.compradorTipoDocumento || "";
            const normalizedDocumento = cleanDocument(valuesRef.current.compradorDocumento || "");
            const docReady = shouldTriggerBuyerLookup(currentTipo, normalizedDocumento);
            const previousSnapshot = { ...buyerDocumentSnapshotRef.current };

            if (!docReady) {
                buyerDocumentSnapshotRef.current = {
                    tipo: currentTipo,
                    numero: normalizedDocumento,
                };
                return;
            }

            const docChanged =
                previousSnapshot.tipo !== currentTipo ||
                previousSnapshot.numero !== normalizedDocumento;

            if (docChanged) {
                resetBuyerSelection({ resetState: true, resetFields: true });
            }

            buyerDocumentSnapshotRef.current = {
                tipo: currentTipo,
                numero: normalizedDocumento,
            };

            triggerBuyerLookup(name === COMPRADOR_DOC ? 0 : 200);
        }

        if (name === "compradorNombreCompleto") {
            const currentTipo = valuesRef.current.compradorTipoDocumento || "";
            const normalizedDocumento = cleanDocument(valuesRef.current.compradorDocumento || "");
            if (shouldTriggerBuyerLookup(currentTipo, normalizedDocumento) && !selectedBuyerRef.current) {
                triggerBuyerLookup(0);
            }
        }
    };

    // === FUNCIONES DE NORMALIZACIÓN ===
    const normalizeValueForStorage = (fieldName, value) => {
        if (typeof value === "boolean") return value;
        if (value === null || value === undefined) return "";
        if (value === 0) return "0";
        if (value === "") return "";

        // Para campos numéricos estrictos, solo mantener dígitos
        if (strictNumericFields.includes(fieldName)) {
            return value.toString().replace(/[^0-9]/g, '');
        }

        // Para campos de moneda, solo mantener dígitos (sin formato)
        if (currencyFields.includes(fieldName)) {
            return value.toString().replace(/[^0-9]/g, '');
        }

        if (docFields.includes(fieldName)) {
            return value.toString().replace(/[\s\-\.]/g, '');
        }

        if (phoneFields.includes(fieldName)) {
            return value.toString().replace(/[\s\-\(\)\+]/g, '');
        }

        // Para otros campos, solo trim
        return value.toString().trim();
    };

    const resetBuyerSelection = useCallback(
        ({ resetState = false, resetFields = false } = {}) => {
            selectedBuyerRef.current = null;
            manuallyEditedBuyerFieldsRef.current.clear();
            
            if (resetFields) {
                valuesRef.current.compradorPersonaId = "";
                valuesRef.current.compradorNombreCompleto = "";
                valuesRef.current.compradorCorreo = "";
                valuesRef.current.compradorTelefono = "";
                displayValuesRef.current.compradorNombreCompleto = "";
                displayValuesRef.current.compradorCorreo = "";
                displayValuesRef.current.compradorTelefono = "";
            }
            
            if (resetState) {
                setBuyerLookupState({
                    loading: false,
                    message: "",
                    error: null,
                });
            }
        },
        []
    );

    const applyBuyerData = useCallback((buyer) => {
        if (!buyer) return;

        selectedBuyerRef.current = buyer;

        const buildFullName = () => {
            const parts = [
                buyer.primerNombre,
                buyer.segundoNombre,
                buyer.primerApellido,
                buyer.segundoApellido,
            ].filter(Boolean);

            if (parts.length) return parts.join(" ").trim();
            const rawPersona = buyer.raw?.persona;
            if (rawPersona) {
                const composed = [
                    rawPersona.nombre_completo,
                    rawPersona.apellido_completo,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
                if (composed) return composed;
            }
            return "";
        };

        // Actualizar directamente las refs en lugar del estado
        valuesRef.current.compradorPersonaId = buyer.personaId || "";

        if (!manuallyEditedBuyerFieldsRef.current.has("compradorNombreCompleto")) {
            valuesRef.current.compradorNombreCompleto = buildFullName();
            displayValuesRef.current.compradorNombreCompleto = buildFullName();
        }
        if (!manuallyEditedBuyerFieldsRef.current.has("compradorCorreo")) {
            valuesRef.current.compradorCorreo = buyer.correo || buyer.raw?.persona?.correo || "";
            displayValuesRef.current.compradorCorreo = buyer.correo || buyer.raw?.persona?.correo || "";
        }
        if (!manuallyEditedBuyerFieldsRef.current.has("compradorTelefono")) {
            const normalizedPhone = normalizePhone(buyer.telefono || buyer.raw?.persona?.telefono || "");
            valuesRef.current.compradorTelefono = normalizedPhone;
            displayValuesRef.current.compradorTelefono = normalizedPhone;
        }

        // Forzar actualización de los inputs
        const nombreEl = elRefs.current.compradorNombreCompleto;
        const correoEl = elRefs.current.compradorCorreo;
        const telefonoEl = elRefs.current.compradorTelefono;

        if (nombreEl && !manuallyEditedBuyerFieldsRef.current.has("compradorNombreCompleto")) {
            nombreEl.value = valuesRef.current.compradorNombreCompleto;
        }
        if (correoEl && !manuallyEditedBuyerFieldsRef.current.has("compradorCorreo")) {
            correoEl.value = valuesRef.current.compradorCorreo;
        }
        if (telefonoEl && !manuallyEditedBuyerFieldsRef.current.has("compradorTelefono")) {
            telefonoEl.value = valuesRef.current.compradorTelefono;
        }

        // Limpiar errores
        setErrors((prev) => {
            const nextErrors = { ...prev };
            BUYER_AUTOFILL_FIELDS.forEach((field) => {
                if (!manuallyEditedBuyerFieldsRef.current.has(field)) {
                    delete nextErrors[field];
                }
            });
            return nextErrors;
        });
    }, []);

    const splitFullNameToParts = (fullName = "") => {
        const parts = fullName.trim().split(/\s+/).filter(Boolean);

        if (parts.length === 0) {
            return {
                primerNombre: "",
                segundoNombre: "",
                primerApellido: "",
                segundoApellido: "",
            };
        }

        if (parts.length === 1) {
            return {
                primerNombre: parts[0],
                segundoNombre: "",
                // Evita fallos en backend por apellido faltante: reutilizamos el mismo valor
                primerApellido: parts[0],
                segundoApellido: "",
            };
        }

        if (parts.length === 2) {
            return {
                primerNombre: parts[0],
                segundoNombre: "",
                primerApellido: parts[1],
                segundoApellido: "",
            };
        }

        if (parts.length === 3) {
            return {
                primerNombre: parts[0],
                segundoNombre: parts[1],
                primerApellido: parts[2],
                segundoApellido: "",
            };
        }

        // 4 o más palabras: dos últimos como apellidos, resto para nombres
        const primerApellido = parts[parts.length - 2];
        const segundoApellido = parts[parts.length - 1];
        const nombres = parts.slice(0, parts.length - 2);

        return {
            primerNombre: nombres[0] || "",
            segundoNombre: nombres.slice(1).join(" "),
            primerApellido,
            segundoApellido,
        };
    };

    const createBuyerFromForm = useCallback(async () => {
        const tipoDocumento = normalizeValueForStorage("compradorTipoDocumento", valuesRef.current.compradorTipoDocumento || "");
        const documento = cleanDocument(normalizeValueForStorage(COMPRADOR_DOC, valuesRef.current.compradorDocumento || ""));
        const nombreCompleto = (valuesRef.current.compradorNombreCompleto || "").trim();

        if (!tipoDocumento || !documento || !nombreCompleto) {
            throw new Error("Completa tipo, documento y nombre del comprador para crearlo.");
        }

        const { primerNombre, segundoNombre, primerApellido, segundoApellido } = splitFullNameToParts(nombreCompleto);

        setBuyerLookupState({ loading: true, message: "", error: null });
        try {
            const existingBuyer = await buyersApiService.findByDocument(tipoDocumento, documento);
            if (existingBuyer?.id || existingBuyer?.compradorId || existingBuyer?.raw?.id_comprador) {
                applyBuyerData(existingBuyer);
                setBuyerLookupState({
                    loading: false,
                    message: "Comprador encontrado y seleccionado.",
                    error: null,
                });
                return existingBuyer;
            }

            const createdBuyer = await buyersApiService.create({
                tipoDocumento,
                documento,
                primerNombre,
                segundoNombre,
                primerApellido,
                segundoApellido,
                correo: valuesRef.current.compradorCorreo || "",
                telefono: valuesRef.current.compradorTelefono || "",
            });

            applyBuyerData(createdBuyer);
            setBuyerLookupState({
                loading: false,
                message: "Comprador creado y seleccionado.",
                error: null,
            });
            toast({
                title: "Comprador creado",
                description: "Datos guardados y autocompletados.",
                variant: "default",
            });

            return createdBuyer;
        } catch (error) {
            setBuyerLookupState({
                loading: false,
                message: "",
                error: error?.message || "No se pudo crear el comprador.",
            });
            throw error;
        }
    }, [applyBuyerData]);

    const fetchBuyerByDocument = useCallback(async () => {
        const tipoDocumento = (valuesRef.current.compradorTipoDocumento || "").trim();
        const numeroDocumento = cleanDocument(valuesRef.current.compradorDocumento || "");
        // Guardar el valor limpio para futuras validaciones y llamadas
        valuesRef.current.compradorDocumento = numeroDocumento;
        displayValuesRef.current.compradorDocumento = numeroDocumento;

        if (!shouldTriggerBuyerLookup(tipoDocumento, numeroDocumento)) {
            resetBuyerSelection({ resetState: true, resetFields: true });
            setBuyerLookupState({ loading: false, message: "", error: null });
            return;
        }

        // Validar el documento antes de hacer la búsqueda
        const documentError = validateDocument(tipoDocumento, numeroDocumento);
        if (documentError) {
            setBuyerLookupState({
                loading: false,
                message: "",
                error: "Documento inválido. Corrija el formato antes de buscar.",
            });
            toast({
                title: "Documento inválido",
                description: "Corrige el tipo y número antes de buscar.",
                variant: "destructive",
            });
            return;
        }

        buyerLookupRequestId.current += 1;
        const requestId = buyerLookupRequestId.current;

        setBuyerLookupState({
            loading: true,
            message: "",
            error: null,
        });

        try {
            let buyer = await buyersApiService.findByDocument(
                tipoDocumento,
                numeroDocumento
            );

            // Fallback: buscar en tabla Personas si no existe como comprador
            if (!buyer) {
                buyer = await buyersApiService.findPersonaByDocument(
                    tipoDocumento,
                    numeroDocumento
                );
            }

            if (buyerLookupRequestId.current !== requestId) {
                return;
            }

            if (buyer) {
                applyBuyerData(buyer);

                // Si la persona existe pero no tiene registro de comprador, crearlo inmediatamente
                if (!buyer.id && !buyer.compradorId) {
                    // Asegurar nombre completo antes de crear
                    if (!valuesRef.current.compradorNombreCompleto?.trim()) {
                        const composedName = [buyer.primerNombre, buyer.segundoNombre, buyer.primerApellido, buyer.segundoApellido]
                            .filter(Boolean)
                            .join(" ")
                            .trim();
                        if (composedName) {
                            valuesRef.current.compradorNombreCompleto = composedName;
                            displayValuesRef.current.compradorNombreCompleto = composedName;
                            const nombreEl = elRefs.current.compradorNombreCompleto;
                            if (nombreEl) {
                                try { nombreEl.value = composedName; } catch (_err) { /* ignore */ }
                            }
                        }
                    }

                    try {
                        await createBuyerFromForm();
                        return;
                    } catch (_err) {
                        // Si falla la creaciÃ³n, continuamos mostrando los datos de persona encontrados
                    }
                }

                setBuyerLookupState({
                    loading: false,
                    message: "Persona encontrada y datos autocompletados.",
                    error: null,
                });
                toast({
                    title: "Comprador encontrado",
                    description: "Datos autocompletados correctamente.",
                    variant: "default",
                });
                return;
            }

            // Si no existe comprador, crearlo automÃ¡ticamente usando los datos digitados
            const nombreCompleto = (valuesRef.current.compradorNombreCompleto || "").trim();
            if (!nombreCompleto) {
                resetBuyerSelection();
                setBuyerLookupState({
                    loading: false,
                    message: "",
                    error: "No encontramos un comprador con ese documento. Ingresa el nombre para crearlo automÃ¡ticamente.",
                });
                toast({
                    title: "Comprador no encontrado",
                    description: "Agrega el nombre completo para crear y seleccionar al comprador.",
                    variant: "destructive",
                });
                return;
            }

            try {
                await createBuyerFromForm();
            } catch (_err) {
                // createBuyerFromForm ya muestra el error, solo aseguramos reset de loading si no se manejÃ³
                if (buyerLookupRequestId.current === requestId) {
                    setBuyerLookupState((prev) => ({ ...prev, loading: false }));
                }
            }
        } catch (error) {
            if (buyerLookupRequestId.current !== requestId) {
                return;
            }
            resetBuyerSelection();
            setBuyerLookupState({
                loading: false,
                message: "",
                error: "No fue posible buscar el comprador. Intenta de nuevo.",
            });
            toast({
                title: "Error al buscar comprador",
                description: "No fue posible buscar el comprador. Intenta de nuevo.",
                variant: "destructive",
            });
        }
    }, [applyBuyerData, resetBuyerSelection, createBuyerFromForm]);

    const triggerBuyerLookup = useCallback(
        (delay = 250) => {
            if (buyerLookupTimeoutRef.current) {
                clearTimeout(buyerLookupTimeoutRef.current);
            }

            buyerLookupTimeoutRef.current = setTimeout(() => {
                fetchBuyerByDocument();
            }, delay);
        },
        [fetchBuyerByDocument]
    );

    // Validación centralizada MEJORADA
    const runValidation = (fieldsToCheck) => {
        let currentErrors = { ...errors };
        let hasError = false;
        let firstErrorField = null;
        
        const medioPagoActual = (valuesRef.current.medioPago || "").toLowerCase();

        for (const fieldName of fieldsToCheck) {
            const value = valuesRef.current[fieldName] || "";
            let error = null;

            const isPaymentDescription = fieldName === "medioPagoDescripcion";
            const isCashSplit = fieldName === "medioPagoEfectivo";
            const isTransferSplit = fieldName === "medioPagoTransferencia";
            const isMixto = medioPagoActual === "mixto";
            const isRequired =
                requiredFields.includes(fieldName) ||
                (isMixto && (isCashSplit || isTransferSplit));
            
            // Validación de obligatoriedad
            if (isRequired && !value.toString().trim()) { 
                error = "Este campo es obligatorio.";
            } 
            
            // Validación de números estrictos
            if (isRequired && (strictNumericFields.includes(fieldName) || isCashSplit || isTransferSplit)) {
                 if (!value.toString().trim() || parseFloat(value) <= 0 || isNaN(parseFloat(value))) {
                     error = "Este campo es obligatorio y debe ser mayor a 0";
                 }
            }

            // Validación de formato MEJORADA
            if (!error && value.toString().trim()) {
                if (nameFields.includes(fieldName) && !isValidName(value)) {
                    error = `Solo se permiten letras, espacios y acentos.`;
                } 
                // VALIDACIÓN MEJORADA PARA DOCUMENTOS
                else if (docFields.includes(fieldName)) {
                    let tipoDocumento = "";
                    
                    if (fieldName === VENDEDOR_DOC) {
                        tipoDocumento = valuesRef.current.vendedorTipoDocumento || "CC";
                    } else if (fieldName === COMPRADOR_DOC) {
                        tipoDocumento = valuesRef.current.compradorTipoDocumento || "CC";
                    }
                    
                    error = validateDocument(tipoDocumento, value);
                } 
                else if (phoneFields.includes(fieldName)) {
                    if (!isValidNumeric(value)) {
                        error = `Solo se permiten dígitos.`;
                    } else if (value.length < 10) {
                        error = `El teléfono debe tener al menos 10 dígitos`;
                    }
                } 
                else if (emailFields.includes(fieldName) && !isValidEmail(value)) {
                    error = `Debe ser un correo electrónico válido.`;
                }
                else if (strictNumericFields.includes(fieldName) && !isValidNumeric(value)) { 
                    error = `Solo se permiten números enteros.`;
                }
                else if (isMixto && (isCashSplit || isTransferSplit)) {
                    if (!isValidNumeric(value)) {
                        error = "Solo se permiten números enteros.";
                    }
                }
            }
            
            // Actualizar errores
            if (error) {
                currentErrors[fieldName] = error;
                hasError = true;
                if (!firstErrorField) {
                    firstErrorField = fieldName;
                }
            } else {
                delete currentErrors[fieldName];
            }
        }
        
        return { currentErrors, hasError, firstErrorField };
    };

    // Navegación entre pasos
    const handleNextStep = () => {
        let fieldsToValidate = stepFields[step];
        
        const { currentErrors, hasError, firstErrorField } = runValidation(fieldsToValidate);

        setErrors(currentErrors);

        if (hasError) {
            if (errorFocusTimeout.current) clearTimeout(errorFocusTimeout.current);
            errorFocusTimeout.current = setTimeout(() => {
                const el = elRefs.current[firstErrorField];
                if (el) el.focus();
            }, 50);
            return;
        }

        setStep((s) => Math.min(s + 1, totalSteps));
    };

    const prevStep = () => setStep((s) => Math.max(s - 1, 1));

    const asNumber = (val) => {
        const clean = (val ?? "").toString().replace(/[^0-9]/g, "");
        return clean ? Number(clean) : 0;
    };

    // Envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const allFieldsToValidate = Object.values(stepFields).flat();
        const { currentErrors, hasError, firstErrorField } = runValidation(allFieldsToValidate);

        setErrors(currentErrors);

        if (hasError) {
            let targetStep = 1;
            if (stepFields[2].includes(firstErrorField)) targetStep = 2;
            else if (stepFields[3].includes(firstErrorField)) targetStep = 3;
            else if (stepFields[4].includes(firstErrorField)) targetStep = 4;
            
            setStep(targetStep);
            
            if (errorFocusTimeout.current) clearTimeout(errorFocusTimeout.current);
            errorFocusTimeout.current = setTimeout(() => {
                const el = elRefs.current[firstErrorField];
                if (el) el.focus();
            }, 50);
            
            return;
        }

        const medioPagoActual = (valuesRef.current.medioPago || "").toLowerCase();
        if (medioPagoActual === "mixto") {
            const efectivo = asNumber(valuesRef.current.medioPagoEfectivo);
            const transferencia = asNumber(valuesRef.current.medioPagoTransferencia);
            const total = asNumber(valuesRef.current.inmueblePrecio);

            const mixErrors = {};
            if (!efectivo) mixErrors.medioPagoEfectivo = "Ingresa el valor en efectivo (mayor a 0).";
            if (!transferencia) mixErrors.medioPagoTransferencia = "Ingresa el valor por transferencia (mayor a 0).";
            if (efectivo && transferencia && total && efectivo + transferencia !== total) {
                mixErrors.medioPagoTransferencia = "La suma de efectivo y transferencia debe igualar el precio de venta.";
            }

            if (Object.keys(mixErrors).length) {
                setErrors((prev) => ({ ...prev, ...mixErrors }));
                setStep(4);
                const first = Object.keys(mixErrors)[0];
                const el = elRefs.current[first];
                if (el) el.focus();
                return;
            }
        }

        let buyerRef = selectedBuyerRef.current;

        if (!buyerRef) {
            try {
                buyerRef = await createBuyerFromForm();
            } catch (_error) {
                return;
            }
        }

        const normalizedValues = Object.keys(valuesRef.current).reduce((acc, fieldName) => {
            const currentValue = valuesRef.current[fieldName] ?? "";
            acc[fieldName] = normalizeValueForStorage(fieldName, currentValue);
            return acc;
        }, {});

        const payload = {
            ...normalizedValues,
            selectedBuyer: buyerRef,
        };

        if (medioPagoActual === "mixto") {
            const efectivo = asNumber(valuesRef.current.medioPagoEfectivo);
            const transferencia = asNumber(valuesRef.current.medioPagoTransferencia);
            const formattedEfectivo = formatNumberWithThousandsSeparator(efectivo.toString());
            const formattedTransferencia = formatNumberWithThousandsSeparator(transferencia.toString());
            payload.medioPagoDescripcion = `Efectivo: $ ${formattedEfectivo} | Transferencia: $ ${formattedTransferencia}`;
        }
        
        if (onSubmit) onSubmit(payload);
        onClose?.();
    };

    // Componente Field reutilizable (con validaciones mejoradas)
    const Field = ({ name, as = "input", options = [], placeholder, type = "text" }) => {
        const label = getLabel(name);
        const errorMessage = errors[name];
        const medioPagoActual = (valuesRef.current.medioPago || "").toLowerCase();
        const isMixto = medioPagoActual === "mixto";
        const isPaymentDescription = name === "medioPagoDescripcion";
        const isCashSplit = name === "medioPagoEfectivo";
        const isTransferSplit = name === "medioPagoTransferencia";
        const isRequired =
            requiredFields.includes(name) ||
            (isMixto && (isCashSplit || isTransferSplit));

        const isDocField = docFields.includes(name);
        const isPhoneField = phoneFields.includes(name);
        const isEmailField = emailFields.includes(name);
        const isStrictNumeric = strictNumericFields.includes(name);
        const isNameField = nameFields.includes(name);

        const needsBlurValidation = isDocField || isNameField || isPhoneField || isEmailField || isRequired || isStrictNumeric;
        const onBlurHandler = needsBlurValidation ? handleInputBlur : undefined;
        
        let inputType = type;
        if (isDocField || isPhoneField || isStrictNumeric) {
            if (type !== 'date' && type !== 'email') {
                inputType = "tel";
            }
        }
        else if (isEmailField) {
            inputType = "email";
        }

        const inputMode = (isDocField || isPhoneField || isStrictNumeric) ? "numeric" : undefined;
        const pattern = (isDocField || isPhoneField || isStrictNumeric) ? "[0-9]*" : undefined;

        // Placeholders mejorados para documentos
        let fieldPlaceholder = placeholder;
        if (isDocField) {
            fieldPlaceholder = "Ej: 1234567890 (8-10 dígitos según el tipo)";
        }

        if (type === "checkbox") {
            return (
                <label htmlFor={name} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                        id={name}
                        name={name}
                        ref={setElRef(name)}
                        type="checkbox"
                        defaultChecked={!!initial[name]}
                        onChange={handleInputChange}
                        onBlur={onBlurHandler}
                        className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>{label} {isRequired && <span className="text-red-500 ml-1">*</span>}</span>
                </label>
            );
        }

        const LabelContent = (
            <label htmlFor={name} className="block text-sm font-semibold text-gray-700 mb-2">
                {label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
        );

        if (as === "select") {
            return (
                <div>
                    {LabelContent}
                    <select
                        id={name}
                        name={name}
                        ref={setElRef(name)}
                        className={getFieldClass(name)}
                        defaultValue={initial[name] ?? ""}
                        onChange={handleInputChange}
                        onBlur={onBlurHandler}
                    >
                        <option value="">Seleccione...</option>
                        {options.map((op) => (
                            <option key={op.value} value={op.value}>
                                {op.label}
                            </option>
                        ))}
                    </select>
                    {errorMessage && (
                        <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
                    )}
                </div>
            );
        }

        if (as === "textarea") {
            return (
                <div className="col-span-1 sm:col-span-2">
                    {LabelContent}
                    <textarea
                        id={name}
                        name={name}
                        ref={setElRef(name)}
                        className={`${getFieldClass(name)} h-20 resize-none`}
                        placeholder={fieldPlaceholder}
                        defaultValue={initial[name] ?? ""}
                        onChange={handleInputChange}
                        onBlur={onBlurHandler}
                    />
                    {errorMessage && (
                        <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
                    )}
                </div>
            );
        }

        return (
            <div>
                {LabelContent}
                <input
                    id={name}
                    name={name}
                    ref={setElRef(name)}
                    className={getFieldClass(name)}
                    type={inputType}
                    inputMode={inputMode}
                    pattern={pattern}
                    placeholder={fieldPlaceholder}
                    defaultValue={initial[name] ?? ""}
                    onChange={handleInputChange}
                    onBlur={onBlurHandler}
                />
                {errorMessage && (
                    <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
                )}
            </div>
        );
    };

    const formattedPrice = formatNumberWithThousandsSeparator(valuesRef.current.inmueblePrecio || 0);

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm z-50 p-3 md:p-6 overflow-y-auto md:overflow-hidden"
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-3 md:p-4 relative my-3 max-h-[88vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                >

                <motion.button onClick={onClose} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="absolute top-6 right-6 text-gray-500 hover:text-blue-600 p-1 rounded-full transition duration-150" aria-label="Cerrar">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </motion.button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Nueva venta</h2>
                    <p className="text-gray-600 text-sm">Complete la información requerida para registrar una nueva venta</p>
                </div>

                <div className="mb-6">
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500 ease-in-out shadow-lg shadow-blue-400/50"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-blue-700 font-bold mt-2 text-center">
                        Paso {step} de {totalSteps}:{" "}
                        <span className="font-semibold text-gray-600">
                            {step === 1 ? "Datos del Inmueble" : 
                             step === 2 ? "Datos del Vendedor (Propietario)" : 
                             step === 3 ? "Datos del Comprador" : "Precio y Medio de Pago"}
                        </span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1 md:pr-2">
                    {/* PASO 1: Datos del Inmueble */}
                    {step === 1 && (
                        <div>
                            <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">1. Detalles y Ubicación del Inmueble</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2 md:gap-y-3">
                                <Field
                                    name="inmuebleTipo"
                                    as="select"
                                    options={[
                                        { value: "Casa", label: "Casa" },
                                        { value: "Apartamento", label: "Apartamento" },
                                        { value: "Oficina", label: "Oficina" },
                                        { value: "Lote", label: "Lote/Terreno" },
                                    ]}
                                />
                                <Field name="inmuebleRegistro" placeholder="No. de matrícula inmobiliaria" />
                                {(inmuebleLookupState.loading || inmuebleLookupState.error || inmuebleLookupState.message) && (
                                    <div className="md:col-span-2">
                                        <p
                                            className={`text-sm ${
                                                inmuebleLookupState.loading
                                                    ? "text-blue-600"
                                                    : inmuebleLookupState.error
                                                    ? "text-red-600"
                                                    : "text-green-700"
                                            }`}
                                        >
                                            {inmuebleLookupState.loading && "Buscando inmueble..."}
                                            {!inmuebleLookupState.loading && inmuebleLookupState.error && inmuebleLookupState.error}
                                            {!inmuebleLookupState.loading && !inmuebleLookupState.error && inmuebleLookupState.message}
                                        </p>
                                    </div>
                                )}
                                <div className="md:col-span-2">
                                    <Field name="inmuebleNombre" placeholder="Ej: Apartamento 501, Edificio La Torre" />
                                </div>
                                <Field name="inmueblePais" placeholder="País" />
                                <Field name="inmuebleDepartamento" placeholder="Departamento o Estado" />
                                <Field name="inmuebleCiudad" placeholder="Ciudad" />
                                <Field name="inmuebleBarrio" placeholder="Barrio o Zona" />
                                <div className="md:col-span-2">
                                    <Field name="inmuebleDireccion" as="textarea" placeholder="Dirección completa, ej: Carrera 10 # 25-50" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASO 2: Datos del Vendedor */}
                    {step === 2 && (
                        <div>
                            <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">2. Información del Vendedor (Propietario)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2 md:gap-y-3">
                                <Field
                                    name="vendedorTipoDocumento"
                                    as="select"
                                    options={DOCUMENT_OPTIONS}
                                />
                                <Field name={VENDEDOR_DOC} placeholder="Ej: 1234567890 (8-10 dígitos según el tipo)" />
                                <Field name="vendedorNombreCompleto" placeholder="Solo letras y espacios." />
                                <Field name="vendedorCorreo" placeholder="correo@dominio.com" type="email" />
                                <Field name="vendedorTelefono" placeholder="Solo números. Mínimo 10 dígitos." />
                            </div>
                        </div>
                    )}

                    {/* PASO 3: Datos del Comprador */}
                    {step === 3 && (
                        <div>
                            <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">3. Información del Comprador</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2 md:gap-y-3">
                                <Field
                                    name="compradorTipoDocumento"
                                    as="select"
                                    options={DOCUMENT_OPTIONS}
                                />
                                <Field name={COMPRADOR_DOC} placeholder="Ej: 1234567890 (8-10 dígitos según el tipo)" />
                                <Field name="compradorNombreCompleto" placeholder="Solo letras y espacios." />
                                <Field name="compradorCorreo" placeholder="correo@dominio.com" type="email" />
                                <Field name="compradorTelefono" placeholder="Solo números. Mínimo 10 dígitos." />
                                {(buyerLookupState.loading || buyerLookupState.error || buyerLookupState.message) && (
                                    <div className="md:col-span-2">
                                        <p
                                            className={`text-sm ${
                                                buyerLookupState.loading
                                                    ? "text-blue-600"
                                                    : buyerLookupState.error
                                                        ? "text-red-600"
                                                        : "text-green-700"
                                            }`}
                                        >
                                            {buyerLookupState.loading && "Buscando compradorâ€¦"}
                                            {!buyerLookupState.loading && buyerLookupState.error && buyerLookupState.error}
                                            {!buyerLookupState.loading && !buyerLookupState.error && buyerLookupState.message}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PASO 4: Precio de Venta */}
                    {step === 4 && (
                        <div>
                            <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">4. Precio de Venta</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2 md:gap-y-3 mb-4 max-w-xl mx-auto">
                                <Field name="fechaVenta" type="date" />
                                <Field
                                    name="medioPago"
                                    as="select"
                                    options={PAYMENT_OPTIONS}
                                />
                                {(valuesRef.current.medioPago || "").toLowerCase() === "mixto" && (
                                    <>
                                        <Field
                                            name="medioPagoEfectivo"
                                            placeholder="Valor en efectivo (COP)"
                                        />
                                        <Field
                                            name="medioPagoTransferencia"
                                            placeholder="Valor por transferencia (COP)"
                                        />
                                    </>
                                )}
                                <Field name="inmueblePrecio" placeholder="Ej: 150000000 (Solo números enteros mayores a 0)." />
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-inner text-gray-800 max-w-xl mx-auto">
                                <h4 className="text-base font-semibold mb-2 text-slate-900 border-b border-slate-200 pb-1">Resumen de la Propiedad</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <p className="font-medium text-gray-700">Tipo/Nombre:</p>
                                        <p className="text-right font-medium text-gray-900">{valuesRef.current.inmuebleTipo || "N/A"} - {valuesRef.current.inmuebleNombre || "N/A"}</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="font-medium text-gray-700">Ubicación:</p>
                                        <p className="text-right font-medium text-gray-900">{valuesRef.current.inmuebleCiudad || "N/A"}</p>
                                    </div>
                                    <div className="border-t border-slate-300 pt-2 flex justify-between items-center font-bold text-lg mt-2">
                                        <span className="text-gray-900">PRECIO FINAL:</span>
                                        <span className="text-indigo-700">$ {formattedPrice}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t mt-6 flex justify-between">
                        {step > 1 && (
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={prevStep}
                                className="px-5 py-2 text-sm bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300 transition duration-150"
                            >
                                Atrás
                            </motion.button>
                        )}
                        {step === 1 && <div />}

                        {step < totalSteps && (
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleNextStep}
                                className="px-6 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-400/50 hover:bg-blue-700 transition duration-150 transform hover:scale-[1.02]"
                            >
                                Siguiente
                            </motion.button>
                        )}

                        {step === totalSteps && (
                            <motion.button
                                type="submit"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-6 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-400/50 hover:bg-blue-700 transition duration-150 transform hover:scale-[1.02]"
                            >
                                Registrar Venta
                            </motion.button>
                        )}
                    </div>
                </form>
            </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}








