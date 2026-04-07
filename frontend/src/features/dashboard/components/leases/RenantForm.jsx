import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import ReactDOM from "react-dom";
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { renantsApiService } from "../../../../shared/services/arrendatarioApiService";
import arriendoApiService from "../../../../shared/services/arriendoApiService";
import { inmueblesAPI } from "../../../../shared/services/propertyApidervice";
import { toast } from "../../../../shared/hooks/use-toast";

// Lista de campos que deben ser obligatorios segÃºn la solicitud del usuario (INCLUYE ARRENDATARIO, CODEUDOR, INMUEBLE Y CONTRATO)
const requiredFields = [
    // Arrendatario
    "tipoDocArrendatario", "numeroDocArrendatario", "primerNombreArrendatario",
    "primerApellidoArrendatario", "telefonoArrendatario", "correoArrendatario",
    // Codeudor
    "tipoDocCodeudor", "numeroDocCodeudor", "primerNombreCodeudor",
    "primerApellidoCodeudor", "telefonoCodeudor", "correoCodeudor",
    "actividadEconomicaCodeudor",
    // Inmueble (Todos los campos excepto Garaje)
    "tipoInmueble", "registroInmobiliario", "nombreInmueble",
    "departamento", "ciudad", "barrio",
    "direccion", "precioInmueble",
    // Contrato
    "fechaInicio", "fechaFinal", "fechaCobro", "precio",
];

// Opciones de documentos
const DOCUMENT_OPTIONS = [
    { value: "CC", label: "Cedula de Ciudadania (CC)" },
    { value: "CE", label: "Cedula de Extranjeria (CE)" },
    { value: "NIT", label: "NIT" },
    { value: "Pasaporte", label: "Pasaporte" },
    { value: "TI", label: "Tarjeta de Identidad (TI)" },
];

const FIXED_CHARGE_DAY = 5;

const normalizeTextValue = (value = "") =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

const isActiveStatus = (estado = "") => {
    const normalized = normalizeTextValue(estado);
    return normalized === "activo" || normalized === "activa" || estado === true;
};

const getRenantState = (renant = {}) =>
    renant.estado ?? renant.status ?? renant.raw?.estado ?? renant.persona?.estado;

const renantHasState = (renant = {}) =>
    getRenantState(renant) !== undefined && getRenantState(renant) !== null && getRenantState(renant) !== "";

const renantIsActive = (renant = {}) => isActiveStatus(getRenantState(renant));

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

const propertyIsMarkedForSale = (property = {}) => {
    const source = getPropertySource(property);
    const operacion = normalizeTextValue(
        property.operacion || source.operacion || source.tipo_operacion || property.tipoOperacion
    );
    const estadoTexto = normalizeTextValue(
        property.estado || source.estado || source.estado_frontend || source.estado_inmueble
    );
    return operacion.includes("venta") || operacion.includes("sale") || estadoTexto.includes("venta");
};

const propertyIsMarkedForRent = (property = {}) => {
    const source = getPropertySource(property);
    const operacion = normalizeTextValue(
        property.operacion || source.operacion || source.tipo_operacion || property.tipoOperacion
    );
    return (
        operacion.includes("arriendo") ||
        operacion.includes("alquiler") ||
        operacion.includes("rent") ||
        operacion.includes("lease")
    );
};

const propertyIsAvailable = (property = {}) => {
    const source = getPropertySource(property);
    const estadoTexto = normalizeTextValue(
        property.estado || source.estado || source.estado_frontend || source.estado_inmueble
    );
    if (!estadoTexto) return false;
    return estadoTexto.includes("disponible") || estadoTexto.includes("available");
};

const validateInmuebleForRent = (inmueble = {}) => {
    if (propertyIsSold(inmueble)) {
        return "Este inmueble ya fue vendido y no se puede arrendar.";
    }
    if (propertyIsMarkedForSale(inmueble)) {
        return "Este inmueble está marcado para venta, no se puede arrendar.";
    }
    if (!propertyIsMarkedForRent(inmueble)) {
        return "Solo puedes seleccionar inmuebles configurados para arriendo.";
    }
    if (!propertyIsAvailable(inmueble)) {
        return "El inmueble debe tener estado Disponible para poder arrendarlo.";
    }
    if (propertyHasActiveLease(inmueble)) {
        return "El inmueble ya tiene un arriendo activo.";
    }
    return null;
};

const isOnOrAfterToday = (dateString) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    if (Number.isNaN(d)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d.getTime() <= today.getTime();
};

const hasMinimumOneMonthTerm = (startDateString, endDateString) => {
    if (!startDateString || !endDateString) return true;
    const startDate = new Date(`${startDateString}T00:00:00`);
    const endDate = new Date(`${endDateString}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return true;

    const minimumEndDate = new Date(startDate.getTime());
    minimumEndDate.setMonth(minimumEndDate.getMonth() + 1);

    return endDate.getTime() >= minimumEndDate.getTime();
};

const combineNames = (first = "", second = "") => {
    return [first, second]
        .map((part) => (part || "").trim())
        .filter(Boolean)
        .join(" ");
};

const parseNumberField = (value) => {
    if (value === undefined || value === null) return undefined;
    const cleaned = value.toString().replace(/[^0-9]/g, "");
    if (cleaned === "") return undefined;
    const numeric = Number(cleaned);
    return Number.isNaN(numeric) ? undefined : numeric;
};

const sanitizeNumericString = (value) => {
    if (value === undefined || value === null) return "";
    return value.toString().replace(/[^0-9]/g, "");
};

const buildFixedChargeDate = (startDateString, chargeDay = FIXED_CHARGE_DAY) => {
    if (!startDateString) return "";
    const startDate = new Date(`${startDateString}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) return "";

    const year = startDate.getFullYear();
    const month = startDate.getMonth();
    const sameMonthChargeDate = new Date(year, month, chargeDay);

    if (startDate.getDate() <= chargeDay) {
        return sameMonthChargeDate.toISOString().slice(0, 10);
    }

    const nextMonthChargeDate = new Date(year, month + 1, chargeDay);
    return nextMonthChargeDate.toISOString().slice(0, 10);
};

const normalizePhone = (value = "") => {
    const digits = sanitizeNumericString(value);
    if (!digits) return "";
    if (digits.startsWith("57") && digits.length > 10) {
        // Mantener solo los últimos 10 dígitos si trae el indicativo
        return digits.slice(-10);
    }
    return digits.slice(-10);
};

/**
 * Payload SOLO para crear / actualizar Arrendatario (persona)
 * Ya NO mete datos del contrato aquÃ­.
 */
const buildArrendatarioPayload = (values = {}) => ({
    tipoDocumento: values.tipoDocArrendatario,
    documento: values.numeroDocArrendatario,
    primerNombre: values.primerNombreArrendatario,
    segundoNombre: values.segundoNombreArrendatario,
    primerApellido: values.primerApellidoArrendatario,
    segundoApellido: values.segundoApellidoArrendatario,
    correo: values.correoArrendatario,
    telefono: values.telefonoArrendatario,
    // Datos opcionales (si decides agregarlos luego al formulario)
    contactoEmergenciaNombre: values.contactoEmergenciaNombre,
    contactoEmergenciaTelefono: values.contactoEmergenciaTelefono,
    contactoEmergenciaParentesco: values.contactoEmergenciaParentesco,
    observaciones: values.observaciones,
    estado: "Activo",
});

/**
 * Payload para crear el ARRIENDO / CONTRATO
 * Intenta ser compatible con ambas convenciones (camelCase y snake_case)
 * para que el backend pueda mapear fÃ¡cilmente.
 */
const buildArriendoPayload = (values = {}, renant = {}) => {
    const idArrendatario =
        // Priorizar siempre el identificador propio del arrendatario (no el de persona)
        renant.id_arrendatario ||
        renant.idArrendatario ||
        renant.id ||
        values.id_arrendatario ||
        values.idArrendatario;

    // Preparar datos del codeudor (persona). Se enviarÃ¡n para que el backend cree/busque el registro y asigne id_codeudor.
    const codeudorPayload = {
        tipo_documento: values.tipoDocCodeudor,
        numero_documento: values.numeroDocCodeudor,
        nombre_completo: combineNames(values.primerNombreCodeudor, values.segundoNombreCodeudor),
        apellido_completo: combineNames(values.primerApellidoCodeudor, values.segundoApellidoCodeudor),
        correo: values.correoCodeudor,
        telefono: values.telefonoCodeudor,
        actividad_economica: values.actividadEconomicaCodeudor
    };

    const valorMensual =
        parseNumberField(values.precio) ?? parseNumberField(values.precioInmueble);

    const valorGarantia = parseNumberField(values.valorGarantia);

    const idInmueble = values.idInmueble ? Number(values.idInmueble) : undefined;

    return {
        // RelaciÃ³n con Arrendatario/cliente
        id_cliente: idArrendatario,
        idCliente: idArrendatario,
        id_arrendatario: idArrendatario,
        idArrendatario: idArrendatario,

        // Inmueble
        id_inmueble: idInmueble,
        idInmueble,

        // Fechas
        fecha_inicio: values.fechaInicio,
        fecha_finalizacion: values.fechaFinal,
        fecha_cobro: values.fechaCobro,
        fechaInicio: values.fechaInicio,
        fechaFin: values.fechaFinal,
        fechaCobro: values.fechaCobro,

        // Valores
        valor_mensual: valorMensual,
        valorMensual: valorMensual,

        // GarantÃ­a (opcional)
        tipo_garantia: values.tipoGarantia,
        tipoGarantia: values.tipoGarantia,
        valor_garantia: valorGarantia,
        valorGarantia: valorGarantia,
        descripcion_garantia: values.descripcionGarantia,
        descripcionGarantia: values.descripcionGarantia,

        // Codeudor (persona) - el backend lo resolverÃ¡ a id_codeudor
        codeudor: codeudorPayload,

        // Estado del contrato
        estado: values.estado || values.estadoContrato || "Activo",
    };
};

export default function RentForm({ onClose, onSubmit }) {
    const [step, setStep] = useState(1);
    // Estado para manejar los errores en lÃ­nea. Usa { fieldName: errorMessage }
    const [errors, setErrors] = useState({});
    const [submissionState, setSubmissionState] = useState({
        isSubmitting: false,
        error: null
    });
    const arrendatarioAutoFillFields = useMemo(
        () => [
            "primerNombreArrendatario",
            "segundoNombreArrendatario",
            "primerApellidoArrendatario",
            "segundoApellidoArrendatario",
            "correoArrendatario",
            "telefonoArrendatario"
        ],
        []
    );
    const [arrendatarioLookupState, setArrendatarioLookupState] = useState({
        loading: false,
        message: "",
        error: null
    });
    const arrendatarioLookupTimeoutRef = useRef(null);
    const arrendatarioLookupRequestId = useRef(0);
    const manuallyEditedArrendatarioFieldsRef = useRef(new Set());
    const arrendatarioMatchedDocumentRef = useRef({
        tipo: "",
        numero: "",
    });
    const [inmuebleLookupState, setInmuebleLookupState] = useState({
        loading: false,
        message: "",
        error: null
    });
    const [, setLeaseUiVersion] = useState(0);
    const inmuebleLookupRequestId = useRef(0);
    const inmuebleRegistroSnapshotRef = useRef("");
    const totalSteps = 4;

    const initial = {
        // Por defecto usar CC para que el lookup tenga tipo desde el inicio (igual que en Compradores)
        tipoDocArrendatario: "", numeroDocArrendatario: "", primerNombreArrendatario: "", segundoNombreArrendatario: "",
        primerApellidoArrendatario: "", segundoApellidoArrendatario: "", correoArrendatario: "", telefonoArrendatario: "",

        tipoDocCodeudor: "", numeroDocCodeudor: "", primerNombreCodeudor: "", segundoNombreCodeudor: "",
        primerApellidoCodeudor: "", segundoApellidoCodeudor: "", correoCodeudor: "", telefonoCodeudor: "",
        actividadEconomicaCodeudor: "",

        tipoInmueble: "", registroInmobiliario: "", nombreInmueble: "",
        departamento: "", ciudad: "", barrio: "", direccion: "", precioInmueble: "",

        fechaInicio: "", fechaFinal: "", fechaCobro: "", precio: "", estado: "Activo",
    };

    // refs para mantener TODOS los valores sin causar re-renders en cada letra
    const valuesRef = useRef({ ...initial });
    // Ref para mantener los valores formateados visibles en los inputs, si son diferentes del valor numÃ©rico
    const displayValuesRef = useRef({ ...initial });
    const elRefs = useRef({});
    const errorFocusTimeout = useRef(null); // Usado para enfocar el primer campo con error

    // Constantes para los nombres de los campos de documento
    const NUMERO_DOC_ARR = "numeroDocArrendatario";
    const NUMERO_DOC_COD = "numeroDocCodeudor";
    const MIN_DOC_LOOKUP_LENGTH = 6;

    // Lista de campos que deben ser estrictamente numÃ©ricos (solo dÃ­gitos)
    const strictNumericFields = [
        "precioInmueble", "precio"
    ];

    // Campos que requieren formato de miles
    const currencyFields = ["precioInmueble", "precio"];

    // Campos agrupados por paso para la validaciÃ³n de 'Siguiente'
    const stepFields = {
        1: [
            "tipoDocArrendatario", NUMERO_DOC_ARR, "primerNombreArrendatario", "segundoNombreArrendatario",
            "primerApellidoArrendatario", "segundoApellidoArrendatario", "correoArrendatario", "telefonoArrendatario",
        ],
        2: [
            "tipoDocCodeudor", NUMERO_DOC_COD, "primerNombreCodeudor", "segundoNombreCodeudor",
            "primerApellidoCodeudor", "segundoApellidoCodeudor", "correoCodeudor", "telefonoCodeudor",
            "actividadEconomicaCodeudor",
        ],
        3: [
            "tipoInmueble", "registroInmobiliario", "nombreInmueble",
            "departamento", "ciudad", "barrio", "direccion", "precioInmueble"
        ],
        4: ["fechaInicio", "fechaFinal", "fechaCobro", "precio"],
    };

    // Lista de campos que deben contener solo letras (y acentos/espacios)
    const nameFields = [
        "primerNombreArrendatario", "segundoNombreArrendatario", "primerApellidoArrendatario", "segundoApellidoArrendatario",
        "primerNombreCodeudor", "segundoNombreCodeudor", "primerApellidoCodeudor", "segundoApellidoCodeudor",
    ];

    // Lista de campos que deben contener solo nÃºmeros (documentos)
    const docFields = [
        NUMERO_DOC_ARR, NUMERO_DOC_COD,
    ];

    const cleanDocument = (value = "") => value.toString().replace(/[^0-9]/g, "").trim();
    const cleanDocumentByType = (tipoDocumento = "", value = "") => {
        const normalizedType = String(tipoDocumento || "").trim().toUpperCase();
        const rawValue = value.toString().trim();
        if (normalizedType === "PASAPORTE" || normalizedType === "PAS") {
            return rawValue.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        }
        return cleanDocument(rawValue);
    };

    const shouldTriggerArrLookup = (tipo = "", numero = "") => {
        const clean = cleanDocumentByType(tipo, numero);
        return Boolean((tipo || "").trim()) && clean.length >= MIN_DOC_LOOKUP_LENGTH;
    };

    // Lista de campos que deben contener solo nÃºmeros (telÃ©fonos)
    const phoneFields = [
        "telefonoArrendatario", "telefonoCodeudor",
    ];

    // Lista de campos de email
    const emailFields = [
        "correoArrendatario", "correoCodeudor",
    ];

    // === VALIDACIONES MEJORADAS PARA DOCUMENTOS ===

    // FunciÃ³n para validar documentos segÃºn el tipo
    const validateDocument = (tipoDocumento, numeroDocumento) => {
        const numeroLimpio = cleanDocumentByType(tipoDocumento, numeroDocumento);

        if (numeroLimpio.length < 7 || numeroLimpio.length > 10) {
            return 'El número de documento debe tener entre 7 y 10 caracteres';
        }

        switch (tipoDocumento) {
            case 'CC': // Cedula de Ciudadania
            case 'CE': // Cedula de Extranjeria
            case 'NIT': // NIT
            case 'PASAPORTE': // Pasaporte
                if (!/^[A-Za-z0-9]+$/.test(numeroLimpio)) {
                    return 'El pasaporte solo puede contener letras y números';
                }
                break;
            case 'TI': // Tarjeta de Identidad
                break;

            default:
                return 'Tipo de documento no valido';
        }

        return '';
    };

    const getLabel = (name) => {
        const labels = {
            tipoDocArrendatario: "Tipo de Documento", numeroDocArrendatario: "Numero de Documento", primerNombreArrendatario: "Primer Nombre",
            segundoNombreArrendatario: "Segundo Nombre", primerApellidoArrendatario: "Primer Apellido", segundoApellidoArrendatario: "Segundo Apellido",
            correoArrendatario: "Correo Electronico", telefonoArrendatario: "Telefono", tipoDocCodeudor: "Tipo de Documento Codeudor",
            numeroDocCodeudor: "Numero de Documento Codeudor", primerNombreCodeudor: "Primer Nombre Codeudor",
            segundoNombreCodeudor: "Segundo Nombre Codeudor", primerApellidoCodeudor: "Primer Apellido Codeudor",
            segundoApellidoCodeudor: "Segundo Apellido Codeudor", correoCodeudor: "Correo Electronico Codeudor",
            telefonoCodeudor: "Telefono Codeudor", actividadEconomicaCodeudor: "Actividad Economica", tipoInmueble: "Tipo de Inmueble",
            registroInmobiliario: "Registro Inmobiliario", nombreInmueble: "Nombre del Inmueble",
            departamento: "Departamento", ciudad: "Ciudad", barrio: "Barrio", direccion: "Direccion",
            precioInmueble: "Precio del Inmueble",
            fechaInicio: "Fecha de Inicio", fechaFinal: "Fecha de Finalizacion", fechaCobro: "Fecha de Cobro",
            precio: "Precio del Arriendo",
        };
        return labels[name] ?? name;
    };

    // FunciÃ³n para obtener la clase de estilo (incluyendo el resaltado de error)
    const getFieldClass = useCallback((fieldName) => {
        const hasFieldError =
            Boolean(errors[fieldName]) ||
            (fieldName === NUMERO_DOC_ARR && Boolean(arrendatarioLookupState.error)) ||
            (fieldName === "registroInmobiliario" && Boolean(inmuebleLookupState.error));
        const errorClass = hasFieldError
            ? "border-red-500 ring-2 ring-red-200"
            : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200";
        return `w-full rounded-xl bg-white px-3 py-2 text-sm shadow-sm focus:outline-none transition ${errorClass}`;
    }, [errors, arrendatarioLookupState.error, inmuebleLookupState.error]);

    // Formatea un nÃºmero con separadores de miles
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

    const setElRef = (name) => (el) => {
        if (!el) return;
        elRefs.current[name] = el;
        if (valuesRef.current[name] === undefined || valuesRef.current[name] === null) {
            valuesRef.current[name] = initial[name] ?? "";
        }
        // No autoseleccionar opción; mantener "Seleccione..."
        if (el.tagName === "SELECT") {
            displayValuesRef.current[name] = valuesRef.current[name];
            el.value = valuesRef.current[name] ?? "";
        } else {
            displayValuesRef.current[name] = valuesRef.current[name];
        }

        // Inicializar el valor de visualizaciÃ³n si es un campo de moneda
        if (currencyFields.includes(name) && valuesRef.current[name]) {
            displayValuesRef.current[name] = formatNumberWithThousandsSeparator(valuesRef.current[name].toString());
        }

        if (el.type === "checkbox") {
            el.checked = !!valuesRef.current[name];
        } else {
            if (displayValuesRef.current[name] !== undefined) {
                try { el.value = displayValuesRef.current[name]; } catch (err) { /* ignore */ }
            }
        }
    };

    const setFieldValue = useCallback((name, value) => {
        const el = elRefs.current[name];
        if (currencyFields.includes(name)) {
            const clean = sanitizeNumericString(value);
            const formatted = clean ? formatNumberWithThousandsSeparator(clean) : "";
            valuesRef.current[name] = clean;
            displayValuesRef.current[name] = formatted;
            if (el) {
                try { el.value = formatted; } catch (_err) { /* ignore */ }
            }
        } else if (el?.type === "checkbox") {
            const checkedValue = Boolean(value);
            valuesRef.current[name] = checkedValue;
            displayValuesRef.current[name] = checkedValue;
            el.checked = checkedValue;
        } else {
            const nextValue = value ?? "";
            valuesRef.current[name] = nextValue;
            displayValuesRef.current[name] = nextValue;
            if (el) {
                try { el.value = nextValue; } catch (_err) { /* ignore */ }
            }
        }

        if (errors[name]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    }, [errors]);

    const resetArrendatarioManualFields = () => {
        manuallyEditedArrendatarioFieldsRef.current.clear();
    };

    const syncChargeDateWithStartDate = useCallback((startDateValue) => {
        const nextChargeDate = buildFixedChargeDate(startDateValue, FIXED_CHARGE_DAY);
        setFieldValue("fechaCobro", nextChargeDate);
        setLeaseUiVersion((version) => version + 1);
    }, [setFieldValue]);

    const clearArrendatarioAutofill = useCallback((options = {}) => {
        const { resetValidation = true } = options;
        arrendatarioMatchedDocumentRef.current = {
            tipo: "",
            numero: "",
        };
        [
            "primerNombreArrendatario",
            "segundoNombreArrendatario",
            "primerApellidoArrendatario",
            "segundoApellidoArrendatario",
            "correoArrendatario",
            "telefonoArrendatario",
        ].forEach((field) => setFieldValue(field, ""));

        if (resetValidation) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next.numeroDocArrendatario;
                return next;
            });
        }
    }, [setFieldValue]);

    const applyArrendatarioData = useCallback((renant) => {
        if (!renant) return;
        if (!renantIsActive(renant)) {
            const inactiveMsg = "No se puede asociar un arriendo a un arrendatario en estado inactivo.";
            setArrendatarioLookupState({
                loading: false,
                message: "",
                error: inactiveMsg,
            });
            setErrors((prev) => ({
                ...prev,
                numeroDocArrendatario: inactiveMsg,
            }));
            toast({
                title: "Arrendatario inactivo",
                description: inactiveMsg,
                variant: "destructive",
            });
            return;
        }

        arrendatarioMatchedDocumentRef.current = {
            tipo: String(renant.tipoDocumento || renant.raw?.persona?.tipo_documento || "").trim().toUpperCase(),
            numero: cleanDocumentByType(
                renant.tipoDocumento || renant.raw?.persona?.tipo_documento || "",
                renant.documento || renant.raw?.persona?.numero_documento || ""
            ),
        };

        const replacements = {
            primerNombreArrendatario: renant.primerNombre || "",
            segundoNombreArrendatario: renant.segundoNombre || "",
            primerApellidoArrendatario: renant.primerApellido || "",
            segundoApellidoArrendatario: renant.segundoApellido || "",
            correoArrendatario: renant.correo || "",
            telefonoArrendatario: normalizePhone(renant.telefono)
        };

        arrendatarioAutoFillFields.forEach((field) => {
            if (manuallyEditedArrendatarioFieldsRef.current.has(field)) return;
            const value = replacements[field] || "";
            valuesRef.current[field] = value;
            displayValuesRef.current[field] = value;
            const el = elRefs.current[field];
            if (el) {
                el.value = value;
            }
        });

        setErrors((prev) => {
            const next = { ...prev };
            arrendatarioAutoFillFields.forEach((field) => {
                delete next[field];
            });
            delete next.numeroDocArrendatario;
            return next;
        });
    }, [arrendatarioAutoFillFields]);

    const autofillInmueble = useCallback((inmueble = {}) => {
        if (!inmueble) return;

        const raw = inmueble.metadata?.raw || {};
        valuesRef.current.idInmueble = inmueble.id ?? inmueble.id_inmueble ?? valuesRef.current.idInmueble;
        inmuebleRegistroSnapshotRef.current = (inmueble.registro || inmueble.registro_inmobiliario || "").trim().toLowerCase();

        setFieldValue("tipoInmueble", inmueble.categoria || inmueble.tipo || "");
        setFieldValue("nombreInmueble", inmueble.titulo || inmueble.nombre || inmueble.nombre_comercial || raw.nombre || "");
        setFieldValue("registroInmobiliario", inmueble.registro || inmueble.registro_inmobiliario || "");
        setFieldValue("departamento", inmueble.departamento || raw.departamento || "");
        setFieldValue("ciudad", inmueble.ciudad || raw.ciudad || "");
        setFieldValue("barrio", inmueble.barrio || raw.barrio || "");
        setFieldValue("direccion", inmueble.direccion || raw.direccion || "");

        const precioAutoFill =
            inmueble.precio_arriendo ??
            inmueble.precio ??
            inmueble.precio_venta ??
            raw.precio_arriendo ??
            raw.precio ??
            "";
        setFieldValue("precioInmueble", precioAutoFill);
        setFieldValue("precio", precioAutoFill);

    }, [setFieldValue]);

    const clearInmuebleAutofill = useCallback(() => {
        inmuebleRegistroSnapshotRef.current = "";
        valuesRef.current.idInmueble = undefined;
        [
            "tipoInmueble",
            "nombreInmueble",
            "departamento",
            "ciudad",
            "barrio",
            "direccion",
            "precioInmueble",
            "precio",
        ].forEach((field) => setFieldValue(field, ""));
    }, [setFieldValue]);

    const handleInmuebleLookup = useCallback(async (registro = "") => {
        const cleanRegistro = (registro || "").trim();
        if (!cleanRegistro) return;

        inmuebleLookupRequestId.current += 1;
        const requestId = inmuebleLookupRequestId.current;
        setInmuebleLookupState({ loading: true, message: "", error: null });

        try {
            const inmueble = await inmueblesAPI.getInmuebleByRegistro(cleanRegistro);

            if (inmuebleLookupRequestId.current !== requestId) return;

            if (inmueble && (inmueble.id || inmueble.id_inmueble)) {
                const validationError = validateInmuebleForRent(inmueble);
                if (validationError) {
                    valuesRef.current.idInmueble = undefined;
                    setInmuebleLookupState({
                        loading: false,
                        message: "",
                        error: validationError
                    });
                    toast({
                        title: "Inmueble no válido para arriendo",
                        description: validationError,
                        variant: "destructive",
                    });
                    return;
                }

                autofillInmueble(inmueble);
                setInmuebleLookupState({
                    loading: false,
                    message: "",
                    error: null
                });
                toast({
                    title: "Inmueble encontrado",
                    description: "Datos del inmueble completados automaticamente.",
                    variant: "default",
                });
            } else {
                valuesRef.current.idInmueble = undefined;
                setInmuebleLookupState({
                    loading: false,
                    message: "",
                    error: "No encontramos un inmueble con ese registro."
                });
                toast({
                    title: "Inmueble no encontrado",
                    description: "No encontramos un inmueble con ese registro.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            if (inmuebleLookupRequestId.current !== requestId) return;
            valuesRef.current.idInmueble = undefined;
            setInmuebleLookupState({
                loading: false,
                message: "",
                error: error?.message || "No fue posible buscar el inmueble."
            });
            toast({
                title: "Error al buscar inmueble",
                description: error?.message || "No fue posible buscar el inmueble.",
                variant: "destructive",
            });
        }
    }, [autofillInmueble]);

    const fetchArrendatarioByDocument = useCallback(async () => {
        const tipoDocumento = (valuesRef.current.tipoDocArrendatario || "").trim().toUpperCase();
        const numeroDocumento = cleanDocumentByType(tipoDocumento, valuesRef.current.numeroDocArrendatario);

        if (!tipoDocumento || !numeroDocumento) {
            setArrendatarioLookupState({ loading: false, message: "", error: null });
            return;
        }

        console.log("[Arrendatario lookup] tipo:", tipoDocumento, "numero:", numeroDocumento);

        const documentError = validateDocument(tipoDocumento, numeroDocumento);
        if (documentError) {
            setArrendatarioLookupState({
                loading: false,
                message: "",
                error: documentError
            });
            toast({
                title: "Documento inválido",
                description: documentError,
                variant: "destructive",
            });
            return;
        }

        arrendatarioLookupRequestId.current += 1;
        const requestId = arrendatarioLookupRequestId.current;

        setArrendatarioLookupState({ loading: true, message: "", error: null });

        try {
            let match = await renantsApiService.findByDocument(tipoDocumento, numeroDocumento);
            if (!match) {
                match = await renantsApiService.findPersonaByDocument(tipoDocumento, numeroDocumento);
            }
            if (!match) {
                const results = await renantsApiService.getAll();
                const list = Array.isArray(results) ? results : results?.data || [];
                match = list.find((renant) => {
                    const storedDoc = cleanDocumentByType(tipoDocumento, renant.documento);
                    const tipo = (renant.tipoDocumento || "").toString().trim().toUpperCase();
                    return storedDoc === numeroDocumento && tipo === tipoDocumento;
                });
            }

            if (arrendatarioLookupRequestId.current !== requestId) return;

            if (match) {
                // Si el match no trae estado, intentamos obtenerlo desde el servicio de arrendatarios
                if (!renantHasState(match)) {
                    const renantWithState = await renantsApiService.findPersonaByDocument(tipoDocumento, numeroDocumento);
                    if (renantWithState) {
                        match = { ...renantWithState, ...match };
                    }
                }

                if (!renantIsActive(match)) {
                    const inactiveMsg = "No se puede asociar un arriendo a un arrendatario en estado inactivo.";
                    setArrendatarioLookupState({
                        loading: false,
                        message: "",
                        error: inactiveMsg,
                    });
                    setErrors((prev) => ({
                        ...prev,
                        numeroDocArrendatario: inactiveMsg,
                    }));
                    toast({
                        title: "Arrendatario inactivo",
                        description: inactiveMsg,
                        variant: "destructive",
                    });
                } else {
                    applyArrendatarioData(match);
                    setArrendatarioLookupState({
                        loading: false,
                        message: "",
                        error: null
                    });
                    toast({
                        title: "Arrendatario encontrado",
                        description: "Datos autocompletados correctamente.",
                        variant: "default",
                    });
                }
            } else {
                setArrendatarioLookupState({
                    loading: false,
                    message: "",
                    error: "No encontramos un arrendatario con ese documento."
                });
                toast({
                    title: "Arrendatario no encontrado",
                    description: "No encontramos un arrendatario con ese documento.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            if (arrendatarioLookupRequestId.current !== requestId) return;
            setArrendatarioLookupState({
                loading: false,
                message: "",
                error: "No fue posible buscar el arrendatario. Intenta de nuevo."
            });
            toast({
                title: "Error al buscar arrendatario",
                description: "No fue posible buscar el arrendatario. Intenta de nuevo.",
                variant: "destructive",
            });
        }
    }, [applyArrendatarioData]);

    const triggerArrendatarioLookup = useCallback(
        (delay = 400) => {
            if (arrendatarioLookupTimeoutRef.current) {
                clearTimeout(arrendatarioLookupTimeoutRef.current);
            }
            arrendatarioLookupTimeoutRef.current = setTimeout(() => {
                fetchArrendatarioByDocument();
            }, delay);
        },
        [fetchArrendatarioByDocument]
    );

    useEffect(() => {
        return () => {
            if (arrendatarioLookupTimeoutRef.current) {
                clearTimeout(arrendatarioLookupTimeoutRef.current);
            }
        };
    }, []);

    // handler que NO hace setState, solo actualiza ref (sin re-render)
    const handleInputChange = (e) => {
        let { name, type, value, checked } = e.target;
        let cleanValue = value;

        if (type === "checkbox") {
            valuesRef.current[name] = checked;
        } else {
            // Si es un campo de moneda, limpiamos el valor antes de guardarlo en valuesRef
            if (currencyFields.includes(name)) {
                cleanValue = value.replace(/[^0-9]/g, ''); // Solo dÃ­gitos
                const formattedValue = formatNumberWithThousandsSeparator(cleanValue);

                // Actualizar el valor a mostrar en el input (lo que ve el usuario)
                displayValuesRef.current[name] = formattedValue;
                e.target.value = formattedValue; // Forzar la actualizaciÃ³n visual
            } else if (docFields.includes(name) || phoneFields.includes(name)) {
                cleanValue = sanitizeNumericString(value);
                displayValuesRef.current[name] = cleanValue;
                if (e.target.value !== cleanValue) {
                    e.target.value = cleanValue;
                }
            } else {
                displayValuesRef.current[name] = value;
            }

            // Guardar siempre el valor LIMPIO (solo dÃ­gitos si es numÃ©rico con formato) o el valor original
            valuesRef.current[name] = cleanValue;

            if (name === "registroInmobiliario") {
                valuesRef.current.idInmueble = undefined;
                const normalizedRegistro = String(cleanValue || "").trim().toLowerCase();
                if (
                    inmuebleRegistroSnapshotRef.current &&
                    normalizedRegistro !== inmuebleRegistroSnapshotRef.current
                ) {
                    clearInmuebleAutofill();
                } else if (!normalizedRegistro) {
                    clearInmuebleAutofill();
                }
            }
        }

        // Limpieza de error en vivo al escribir, solo si ya existÃ­a un error
        if (errors[name] && cleanValue.length === 0) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
        if (arrendatarioAutoFillFields.includes(name) && type !== "checkbox") {
            manuallyEditedArrendatarioFieldsRef.current.add(name);
        }

        if (name === "numeroDocArrendatario" || name === "tipoDocArrendatario") {
            const tipo = String(
                name === "tipoDocArrendatario" ? cleanValue : valuesRef.current.tipoDocArrendatario || ""
            ).trim().toUpperCase();
            const numero = cleanDocumentByType(tipo,
                name === "numeroDocArrendatario" ? cleanValue : valuesRef.current.numeroDocArrendatario || ""
            );

            if (
                arrendatarioMatchedDocumentRef.current.numero &&
                (
                    arrendatarioMatchedDocumentRef.current.tipo !== tipo ||
                    arrendatarioMatchedDocumentRef.current.numero !== numero
                )
            ) {
                if (arrendatarioLookupTimeoutRef.current) {
                    clearTimeout(arrendatarioLookupTimeoutRef.current);
                }
                clearArrendatarioAutofill({ resetValidation: false });
            } else if (!shouldTriggerArrLookup(tipo, numero)) {
                if (arrendatarioLookupTimeoutRef.current) {
                    clearTimeout(arrendatarioLookupTimeoutRef.current);
                }
                clearArrendatarioAutofill({ resetValidation: false });
            }
        }

        if (name === "tipoDocArrendatario" || name === NUMERO_DOC_ARR) {
            resetArrendatarioManualFields();
        }
    };

    // === Date picker estilo agenda ===
    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const parseYMDToLocalDate = (value) => {
        if (!value) return null;
        const parts = value.split("-").map(Number);
        if (parts.length < 3 || parts.some(Number.isNaN)) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]);
    };

    const formatDateForDisplay = (value) => {
        if (!value) return "";
        const date = parseYMDToLocalDate(value);
        if (!date) return value;
        return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const prevDate = new Date(year, month, -i);
            days.push({ date: prevDate, isCurrentMonth: false, isDisabled: true });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(year, month, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            days.push({
                date: d,
                isCurrentMonth: true,
                isDisabled: false,
                isToday: d.toDateString() === today.toDateString(),
            });
        }

        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            const nextDate = new Date(year, month + 1, day);
            days.push({ date: nextDate, isCurrentMonth: false, isDisabled: true });
        }

        return days;
    };

    const FancyDatePicker = ({ name, label, locked = false, helperText = "" }) => {
        const errorMessage =
            errors[name] ||
            (name === NUMERO_DOC_ARR
                ? arrendatarioLookupState.error
                : name === "registroInmobiliario"
                    ? inmuebleLookupState.error
                    : "");
        const [open, setOpen] = useState(false);
        const [panelStyle, setPanelStyle] = useState(null);
        const triggerRef = useRef(null);
        const panelRef = useRef(null);
        const selectedValue = valuesRef.current[name];
        const selectedDate = parseYMDToLocalDate(selectedValue);
        const initialMonth = selectedDate || new Date();
        const [currentMonth, setCurrentMonth] = useState(initialMonth);
        const [days, setDays] = useState(getDaysInMonth(initialMonth));

        useEffect(() => {
            setDays(getDaysInMonth(currentMonth));
        }, [currentMonth]);

        useEffect(() => {
            if (selectedValue) {
                const d = parseYMDToLocalDate(selectedValue);
                if (d) {
                    setCurrentMonth(d);
                    setDays(getDaysInMonth(d));
                }
            }
        }, [selectedValue]);

        useEffect(() => {
            if (!open) return undefined;

            const handleOutsideClick = (event) => {
                if (triggerRef.current?.contains(event.target)) return;
                if (panelRef.current?.contains(event.target)) return;
                setOpen(false);
            };

            setPanelStyle({
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(420px, calc(100vw - 2rem))",
                zIndex: 1100,
            });
            document.addEventListener("mousedown", handleOutsideClick);

            return () => {
                document.removeEventListener("mousedown", handleOutsideClick);
            };
        }, [open]);

        const handleSelect = (day) => {
            if (day.isDisabled) return;
            const formatted = formatDateForInput(day.date);
            setFieldValue(name, formatted);
            if (name === "fechaInicio") {
                syncChargeDateWithStartDate(formatted);
            }
            setOpen(false);
        };

        const monthLabel = `${currentMonth.toLocaleString("es-ES", { month: "long" })} ${currentMonth.getFullYear()}`;
        const displayText = selectedValue ? formatDateForDisplay(selectedValue) : "Selecciona fecha";

        return (
            <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {label} <span className="text-red-500">*</span>
                </label>
                <button
                    type="button"
                    ref={triggerRef}
                    onClick={() => {
                        if (locked) return;
                        setOpen((v) => !v);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${locked ? "cursor-not-allowed bg-gray-50 text-gray-500" : "hover:border-blue-400"} ${errorMessage ? "border-red-400" : ""}`}
                    disabled={locked}
                >
                    <span className={selectedValue ? "text-slate-800" : "text-slate-400"}>{displayText}</span>
                    <CalendarIcon className="w-4 h-4 text-slate-500" />
                </button>
                {errorMessage && <p className="text-red-500 text-xs mt-1">{errorMessage}</p>}
                {!errorMessage && helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}

                {open && panelStyle && ReactDOM.createPortal(
                    <div ref={panelRef} style={panelStyle} className="rounded-2xl border border-gray-200 bg-white shadow-2xl p-3">
                        <div className="flex items-center justify-between mb-3">
                            <button
                                type="button"
                                onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                                className="p-2 hover:bg-slate-100 rounded-lg transition"
                            >
                                <ChevronLeft className="w-4 h-4 text-slate-600" />
                            </button>
                            <span className="text-sm font-semibold text-slate-800 capitalize">{monthLabel}</span>
                            <button
                                type="button"
                                onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                                className="p-2 hover:bg-slate-100 rounded-lg transition"
                            >
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                                <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">
                                    {d}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day, idx) => {
                                const isSelected = selectedValue === formatDateForInput(day.date);
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelect(day)}
                                        disabled={day.isDisabled}
                                        className={`h-9 rounded-lg text-xs font-semibold transition-all
                                            ${day.isDisabled ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-blue-50"}
                                            ${!day.isCurrentMonth ? "text-slate-400" : ""}
                                            ${day.isToday ? "bg-blue-100 text-blue-600" : ""}
                                            ${isSelected ? "bg-blue-600 text-white shadow-md" : ""}`}
                                    >
                                        {day.date.getDate()}
                                    </button>
                                );
                            })}
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        );
    };

    // Funciones de validaciÃ³n de formato
    const isValidName = (value) => /^[\p{L}\s]*$/u.test(value);
    const isValidNumeric = (value) => /^\d*$/.test(value);
    const isValidEmail = (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

    // Handler para verificar obligatoriedad, longitud y formato al salir del campo - MEJORADO
    const handleInputBlur = (e) => {
        const { name } = e.target;
        // Tomamos el valor limpio de la ref, no del e.target.value (que podrÃ­a estar formateado)
        const value = valuesRef.current[name] || "";

        let errorMessage = null;
        const isRequired = requiredFields.includes(name);
        const conflictErrorMsg = "El número de documento del Arrendatario no puede ser igual al del Codeudor.";

        setErrors(prev => {
            const newErrors = { ...prev };

            // 1. Validar OBLIGATORIO
            if (isRequired && !value.trim()) {
                errorMessage = "Este campo es obligatorio.";
            }

            // 2. Validar formato y longitud (solo si no hay un error de obligatoriedad y el campo tiene valor) - MEJORADO
            if (!errorMessage && value.trim()) {
                if (nameFields.includes(name) && !isValidName(displayValuesRef.current[name])) {
                    errorMessage = `Solo se permiten letras y espacios.`;
                }
                // VALIDACIÃ“N MEJORADA PARA DOCUMENTOS
                else if (docFields.includes(name)) {
                    let tipoDocumento = "";

                    if (name === NUMERO_DOC_ARR) {
                        tipoDocumento = valuesRef.current.tipoDocArrendatario || "CC";
                    } else if (name === NUMERO_DOC_COD) {
                        tipoDocumento = valuesRef.current.tipoDocCodeudor || "CC";
                    }

                    // Validar formato bÃ¡sico primero
                    if (!/^[A-Za-z0-9\s\-\.]*$/.test(displayValuesRef.current[name])) {
                        errorMessage = `Solo se permiten letras, números, espacios, puntos y guiones`;
                    } else {
                        // ValidaciÃ³n especÃ­fica por tipo de documento
                        errorMessage = validateDocument(tipoDocumento, value);
                    }
                }
                else if (phoneFields.includes(name)) {
                    if (!isValidNumeric(value)) {
                        errorMessage = `Solo se permiten números.`;
                    } else if (value.length !== 10) {
                        errorMessage = "El teléfono debe tener exactamente 10 digitos";
                    }
                }
                else if (emailFields.includes(name) && !isValidEmail(value)) {
                    errorMessage = `El correo electrónico debe ser valido.`;
                }
                else if (strictNumericFields.includes(name) && !isValidNumeric(value)) {
                    errorMessage = `Solo se permiten números enteros.`;
                }

                // Validaciones especÃ­ficas para campos numÃ©ricos
                if (!errorMessage && strictNumericFields.includes(name)) {
                    const numericValue = parseInt(value);

                    if ((name === "precioInmueble" || name === "precio") && numericValue <= 0) {
                        errorMessage = `Debe ser un número mayor a 0`;
                    }
                }
            }

            // 3. Validar CONFLICTO DE DOCUMENTO (solo si es un campo de documento y no tiene otro error mÃ¡s grave)
            if (!errorMessage && docFields.includes(name)) {
                const otherDocName = name === NUMERO_DOC_ARR ? NUMERO_DOC_COD : NUMERO_DOC_ARR;
                const otherDocValue = valuesRef.current[otherDocName] || "";

                if (value.trim() && otherDocValue.trim() && value === otherDocValue) {
                    errorMessage = conflictErrorMsg;
                    // Si hay conflicto, actualiza el error en el otro campo inmediatamente
                    if (newErrors[otherDocName] !== conflictErrorMsg) {
                        newErrors[otherDocName] = conflictErrorMsg;
                    }
                } else if (newErrors[otherDocName] === conflictErrorMsg) {
                    // Si el otro campo tenÃ­a el error de conflicto, lo limpiamos
                    delete newErrors[otherDocName];
                }
            }

            // Aplicar el error (si lo hay) o limpiar el error existente
            if (errorMessage) {
                newErrors[name] = errorMessage;
            } else {
                delete newErrors[name];
            }

            return newErrors;
        });

        if (!errorMessage && (name === NUMERO_DOC_ARR || name === "tipoDocArrendatario")) {
            const tipo = valuesRef.current.tipoDocArrendatario || "";
            const numero = valuesRef.current.numeroDocArrendatario || "";
            if (shouldTriggerArrLookup(tipo, numero)) {
                fetchArrendatarioByDocument();
            } else {
                clearArrendatarioAutofill();
                setArrendatarioLookupState({ loading: false, message: "", error: null });
            }
        }

        if (name === "registroInmobiliario") {
            if (!value.trim()) {
                clearInmuebleAutofill();
                setInmuebleLookupState({ loading: false, message: "", error: null });
            } else if (!errorMessage) {
                handleInmuebleLookup(value);
            }
        }
    };

    // --- LÃ“GICA DE VALIDACIÃ“N CENTRAL MEJORADA ---
    const runValidation = (fieldsToCheck) => {
        let currentErrors = { ...errors };
        let hasError = false;
        let firstErrorField = null;

        // 1. Iterar sobre los campos del paso actual o todos para validaciones individuales
        for (const fieldName of fieldsToCheck) {
            // Siempre usamos el valor LIMPIO de valuesRef para la validaciÃ³n
            const value = valuesRef.current[fieldName] || "";
            let error = null;

            const isRequired = requiredFields.includes(fieldName);

            // A. ValidaciÃ³n de Obligatoriedad
            if (isRequired && !value.toString().trim()) {
                error = "Este campo es obligatorio.";
            }

            // B. ValidaciÃ³n de Obligatoriedad y > 0 para nÃºmeros estrictos
            if (isRequired && strictNumericFields.includes(fieldName)) {
                if (!value.toString().trim() || parseFloat(value) <= 0 || isNaN(parseFloat(value))) {
                    error = "Este campo es obligatorio y debe ser mayor a 0";
                }
            }

            // C. ValidaciÃ³n de Formato MEJORADA
            if (!error && value.toString().trim()) {
                if (nameFields.includes(fieldName) && !isValidName(displayValuesRef.current[fieldName])) {
                    error = `Solo se permiten letras, espacios y acentos.`;
                }
                // VALIDACIÃ“N MEJORADA PARA DOCUMENTOS
                else if (docFields.includes(fieldName)) {
                    let tipoDocumento = "";

                    if (fieldName === NUMERO_DOC_ARR) {
                        tipoDocumento = valuesRef.current.tipoDocArrendatario || "CC";
                    } else if (fieldName === NUMERO_DOC_COD) {
                        tipoDocumento = valuesRef.current.tipoDocCodeudor || "CC";
                    }

                    error = validateDocument(tipoDocumento, value);
                }
                else if (phoneFields.includes(fieldName) && !isValidNumeric(value)) {
                    error = `Solo se permiten di­gitos.`;
                }
                else if (phoneFields.includes(fieldName) && value.length !== 10) {
                    error = "El teléfono debe tener exactamente 10 digitos";
                }
                else if (emailFields.includes(fieldName) && !isValidEmail(value)) {
                    error = `Debe ser un correo electrónico valido.`;
                }
                else if (strictNumericFields.includes(fieldName) && !isValidNumeric(value)) {
                    error = `Solo se permiten números enteros.`;
                }

                // Validaciones especÃ­ficas para campos numÃ©ricos
                if (!error && strictNumericFields.includes(fieldName)) {
                    const numericValue = parseInt(value);

                    if (fieldName === "precioInmueble" && numericValue <= 0) {
                        error = `Debe ser un número mayor a 0`;
                    }
                }
            }

            // D. Actualizar el estado de errores
            if (error) {
                currentErrors[fieldName] = error;
                hasError = true;
                if (!firstErrorField) {
                    firstErrorField = fieldName;
                }
            } else {
                // Limpiar el error si el campo es vÃ¡lido (pero no tocar el error de CONFLICTO si ya existe)
                const isConflictError = currentErrors[fieldName] === "El número de documento del Arrendatario no puede ser igual al del Codeudor.";
                if (!isConflictError) {
                    delete currentErrors[fieldName];
                }
            }
        }

        // 2. ValidaciÃ³n de CONFLICTO DE DOCUMENTO (Cross-field validation)
        const docArrValue = valuesRef.current[NUMERO_DOC_ARR] || "";
        const docCodValue = valuesRef.current[NUMERO_DOC_COD] || "";
        const conflictErrorMsg = "El número de documento del Arrendatario no puede ser igual al del Codeudor.";

        if (docArrValue.trim() && docCodValue.trim() && docArrValue === docCodValue) {

            const fieldNames = [NUMERO_DOC_ARR, NUMERO_DOC_COD];

            for (const name of fieldNames) {
                if (fieldsToCheck.includes(name)) {
                    if (!currentErrors[name] || currentErrors[name] === conflictErrorMsg) {
                        currentErrors[name] = conflictErrorMsg;
                        hasError = true;
                        if (!firstErrorField) firstErrorField = name;
                    }
                }
            }

        } else {
            // Si son diferentes, limpiamos el error de conflicto de ambos campos, sin tocar otros errores (obligatorio/formato)
            if (currentErrors[NUMERO_DOC_ARR] === conflictErrorMsg) {
                delete currentErrors[NUMERO_DOC_ARR];
            }
            if (currentErrors[NUMERO_DOC_COD] === conflictErrorMsg) {
                delete currentErrors[NUMERO_DOC_COD];
            }
        }

        const shouldValidateLeaseDates =
            fieldsToCheck.includes("fechaInicio") || fieldsToCheck.includes("fechaFinal");
        if (shouldValidateLeaseDates) {
            const fechaInicio = valuesRef.current.fechaInicio || "";
            const fechaFinal = valuesRef.current.fechaFinal || "";

            if (
                fechaInicio &&
                fechaFinal &&
                !currentErrors.fechaInicio &&
                !currentErrors.fechaFinal &&
                !hasMinimumOneMonthTerm(fechaInicio, fechaFinal)
            ) {
                const termError = "La duración mínima del contrato debe ser de un mes.";
                currentErrors.fechaFinal = termError;
                hasError = true;
                if (!firstErrorField) firstErrorField = "fechaFinal";
            }
        }

        // Re-evaluar firstErrorField en caso de que se haya limpiado o establecido un error cruzado
        if (!firstErrorField) {
            for (const fieldName of fieldsToCheck) {
                if (currentErrors[fieldName]) {
                    firstErrorField = fieldName;
                    break;
                }
            }
        }

        return { currentErrors, hasError, firstErrorField };
    };

    const handleNextStep = () => {
        // Validar solo los campos del paso actual, asegurando incluir ambos documentos si son relevantes
        let fieldsToValidate = stepFields[step];

        // AÃ±adir el campo de documento cruzado para validar el conflicto al cambiar de paso 1 a 2
        if (step === 1 && (valuesRef.current[NUMERO_DOC_COD] || "").trim()) {
            if (!fieldsToValidate.includes(NUMERO_DOC_COD)) fieldsToValidate.push(NUMERO_DOC_COD);
        }
        if (step === 2 && (valuesRef.current[NUMERO_DOC_ARR] || "").trim()) {
            if (!fieldsToValidate.includes(NUMERO_DOC_ARR)) fieldsToValidate.push(NUMERO_DOC_ARR);
        }

        const { currentErrors, hasError, firstErrorField } = runValidation(fieldsToValidate);

        setErrors(currentErrors);

        if (hasError) {
            // Enfocar el primer campo con error
            if (errorFocusTimeout.current) clearTimeout(errorFocusTimeout.current);
            errorFocusTimeout.current = setTimeout(() => {
                const el = elRefs.current[firstErrorField];
                if (el) el.focus();
            }, 50);
            return; // Bloquea el avance
        }

        // Si no hay errores, avanza al siguiente paso
        setStep((s) => Math.min(s + 1, totalSteps));
    };

    const prevStep = () => setStep((s) => Math.max(s - 1, 1));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submissionState.isSubmitting) return;

        // En el envÃ­o final, validamos TODOS los campos obligatorios
        const allFieldsToValidate = Object.values(stepFields)
            .flat()
            .filter(f => requiredFields.includes(f));
        const { currentErrors, hasError, firstErrorField } = runValidation(allFieldsToValidate);

        setErrors(currentErrors);

        if (hasError) {
            // Determinar a quÃ© paso debe volver para mostrar el error y enfocar el campo
            let targetStep = 1;
            if (stepFields[2].includes(firstErrorField)) targetStep = 2;
            else if (stepFields[3].includes(firstErrorField)) targetStep = 3;
            else if (stepFields[4].includes(firstErrorField)) targetStep = 4;

            setStep(targetStep);

            // Enfocar el primer campo con error
            if (errorFocusTimeout.current) clearTimeout(errorFocusTimeout.current);
            errorFocusTimeout.current = setTimeout(() => {
                const el = elRefs.current[firstErrorField];
                if (el) el.focus();
            }, 50);

            return; // Bloquea el envÃ­o
        }

        // ValidaciÃ³n adicional: asegurar que tenemos un inmueble resuelto a ID
        if (!valuesRef.current.idInmueble) {
            const msg = "Selecciona un inmueble valido desde el registro inmobiliario.";
            setErrors((prev) => ({ ...prev, registroInmobiliario: msg }));
            setStep(3);
            const el = elRefs.current.registroInmobiliario;
            if (el) el.focus();
            return;
        }

        setSubmissionState({ isSubmitting: true, error: null });
        const estadoCalculado = isOnOrAfterToday(valuesRef.current.fechaCobro) ? "Debe" : "Activo";
        valuesRef.current.estado = estadoCalculado;
        const rawValues = { ...valuesRef.current, estado: estadoCalculado };

        try {
            // 1ï¸âƒ£ Asegurar ARRRENDATARIO (crear o reutilizar)
            const arrendatarioPayload = buildArrendatarioPayload(rawValues);
            let renant;

            try {
                // Intentar crear el arrendatario
                renant = await renantsApiService.create(arrendatarioPayload);
            } catch (error) {
                const duplicateMsg = "ya esta registrada como arrendatario";
                if (error?.message?.toLowerCase().includes(duplicateMsg)) {
                    // Ya existe â†’ lo buscamos y reutilizamos
                    const tipoDocumento = (rawValues.tipoDocArrendatario || "").trim();
                    const numeroDocumento = cleanDocumentByType(tipoDocumento, rawValues.numeroDocArrendatario);

                    const existing = await renantsApiService.getAll({
                        tipo_documento: tipoDocumento,
                        numero_documento: numeroDocumento
                    });

                    const matched = Array.isArray(existing) ? existing[0] : existing?.data?.[0];
                    if (!matched) {
                        throw error; // no pudimos recuperarlo, dejamos que caiga al catch general
                    }
                    renant = matched;
                } else {
                    throw error;
                }
            }

            // 2ï¸âƒ£ Crear ARRIENDO ligado al arrendatario obtenido/creado
            const arriendoPayload = buildArriendoPayload(rawValues, renant);
            const arriendoCreated = await arriendoApiService.crearArriendo(arriendoPayload);

            // 3ï¸âƒ£ Notificar al padre â†’ RenantManagementPage harÃ¡ fetchArriendos()
            await onSubmit?.({
                renant,
                arriendo: arriendoCreated,
                formData: rawValues
            });

            setSubmissionState({ isSubmitting: false, error: null });
            onClose?.();
            console.log("Formulario Enviado:", { renant, arriendoCreated });

        } catch (error) {
            console.error(error);
            setSubmissionState({
                isSubmitting: false,
                error: error?.message || "No fue posible crear el arriendo"
            });
        }
    };

    // Field: componente auxiliar MEJORADO
    const Field = ({ name, as = "input", options = [], placeholder, type = "text" }) => {
        const label = getLabel(name);
        const errorMessage = errors[name];
        const isRequired = requiredFields.includes(name);

        // Determinar el tipo de campo
        const isDocField = docFields.includes(name);
        const isPhoneField = phoneFields.includes(name);
        const isEmailField = emailFields.includes(name);
        const isStrictNumeric = strictNumericFields.includes(name);
        const isCurrencyField = currencyFields.includes(name);
        const isNameField = nameFields.includes(name);
        const isReadOnlyField = name === "precio" || name === "precioInmueble";

        // Determinar si necesita validaciÃ³n en blur (incluye los requeridos para feedback inmediato)
        const needsBlurValidation = isDocField || isNameField || isPhoneField || isEmailField || isRequired || isStrictNumeric;
        const onBlurHandler = needsBlurValidation ? handleInputBlur : undefined;

        // Establecer el tipo de input para sugerir teclado numÃ©rico
        let inputType = type;
        if (isDocField || isPhoneField || (isStrictNumeric && !isCurrencyField)) {
            if (type !== 'date' && type !== 'email') {
                inputType = "tel";
            }
        }
        else if (isEmailField) {
            inputType = "email";
        }

        // Para campos de moneda dejamos texto libre para permitir separadores visuales
        const inputMode = (isDocField || isPhoneField || (isStrictNumeric && !isCurrencyField)) ? "numeric" : undefined;
        const pattern = (isDocField || isPhoneField || (isStrictNumeric && !isCurrencyField)) ? "[0-9]*" : undefined;

        // Placeholders mejorados
        let fieldPlaceholder = placeholder;
        if (isDocField) {
            fieldPlaceholder = "Ej: 1234567 a 1234567890";
        }
        if (isPhoneField) {
            fieldPlaceholder = "Ej: 3001234567 (10 digitos mi­nimo)";
        }

        if (type === "checkbox") {
            return (
                <label htmlFor={name} className="col-span-3 flex items-center gap-2 text-sm font-semibold text-gray-700 mt-2">
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

        return (
            <div>
                {LabelContent}
                <input
                    id={name}
                    name={name}
                    ref={setElRef(name)}
                    className={`${getFieldClass(name)} ${isReadOnlyField ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
                    type={inputType}
                    inputMode={inputMode}
                    pattern={pattern}
                    placeholder={fieldPlaceholder}
                    defaultValue={(displayValuesRef.current[name] || initial[name]) ?? ""}
                    onChange={isReadOnlyField ? undefined : handleInputChange}
                    onBlur={onBlurHandler}
                    readOnly={isReadOnlyField}
                    minLength={isDocField ? 7 : undefined}
                    maxLength={isDocField ? 10 : undefined}
                />
                {errorMessage && (
                    <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
                )}
            </div>
        );
    };

    return (
        // ðŸ”‘ Fondo del modal con desenfoque - CAMBIO PRINCIPAL
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Contenido principal del modal */}
            <motion.div
                role="dialog"
                aria-modal="true"
                className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 w-full max-w-5xl relative flex flex-col"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                transition={{ duration: 0.25 }}
            >
                {/* Header sticky */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-5 flex items-start gap-4">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900">Crear Arriendo</h2>
                        <p className="text-sm text-gray-600 mt-1">Complete la información del nuevo contrato de arrendamiento</p>
                        <div className="mt-4">
                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${(step / totalSteps) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 mt-2">
                                <span className="font-semibold text-gray-900">Paso {step} de {totalSteps}</span>:{" "}
                                {step === 1 ? "Datos del Arrendatario" : step === 2 ? "Datos del Codeudor" : step === 3 ? "Datos del Inmueble" : "Datos del Contrato y Pago"}
                                {" "} (Campos obligatorios marcados con *)
                            </p>
                        </div>
                    </div>
                    <motion.button
                        aria-label="Cerrar"
                        onClick={onClose}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </motion.button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                    <div className="max-h-[72vh] overflow-y-auto px-4 sm:px-6 py-5 space-y-4">

                        {/* PASO 1 */}
                        {step === 1 && (
                            <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Datos del Arrendatario</h3>
                                    <p className="text-xs text-gray-600 mt-1">Identifica al arrendatario principal</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Field
                                        name="tipoDocArrendatario"
                                        as="select"
                                        options={DOCUMENT_OPTIONS}
                                    />
                                    <Field name={NUMERO_DOC_ARR} placeholder="Ej: 1234567 a 1234567890" />
                                    <Field name="primerNombreArrendatario" placeholder="Solo letras y espacios." />
                                    <Field name="segundoNombreArrendatario" placeholder="Solo letras y espacios. (Opcional)" />
                                    <Field name="primerApellidoArrendatario" placeholder="Solo letras y espacios." />
                                    <Field name="segundoApellidoArrendatario" placeholder="Solo letras y espacios. (Opcional)" />
                                    <Field name="correoArrendatario" placeholder="correo@dominio.com" type="email" />
                                    <Field name="telefonoArrendatario" placeholder="Ej: 3001234567 (10 dígitos mínimo)" />
                                </div>
                            </section>
                        )}

                        {/* PASO 2 */}
                        {step === 2 && (
                            <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Datos del Codeudor</h3>
                                    <p className="text-xs text-gray-600 mt-1">Información de respaldo financiero</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Field
                                        name="tipoDocCodeudor"
                                        as="select"
                                        options={DOCUMENT_OPTIONS}
                                    />
                                    <Field name={NUMERO_DOC_COD} placeholder="Ej: 1234567 a 1234567890" />
                                    <Field name="primerNombreCodeudor" placeholder="Solo letras y espacios." />
                                    <Field name="segundoNombreCodeudor" placeholder="Solo letras y espacios. (Opcional)" />
                                    <Field name="primerApellidoCodeudor" placeholder="Solo letras y espacios." />
                                    <Field name="segundoApellidoCodeudor" placeholder="Solo letras y espacios. (Opcional)" />
                                    <Field name="correoCodeudor" placeholder="correo@dominio.com" type="email" />
                                    <Field name="telefonoCodeudor" placeholder="Ej: 3009876543 (10 dígitos mínimo)" />
                                    <Field
                                        name="actividadEconomicaCodeudor"
                                        as="select"
                                        options={[
                                            { value: "Empleado", label: "Empleado" },
                                            { value: "Independiente", label: "Independiente" },
                                        ]}
                                    />
                                </div>
                            </section>
                        )}

                        {/* PASO 3 */}
                        {step === 3 && (
                            <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Datos del Inmueble</h3>
                                    <p className="text-xs text-gray-600 mt-1">Selecciona y valida el inmueble</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Field
                                        name="tipoInmueble"
                                        as="select"
                                        options={[
                                            { value: "Casa", label: "Casa" },
                                            { value: "Apartamento", label: "Apartamento" },
                                            { value: "Apartaestudio", label: "Apartaestudio" },
                                        ]}
                                    />
                                    <Field name="registroInmobiliario" placeholder="Ej: 12345-ABC" />
                                    <Field name="nombreInmueble" placeholder="Ej: Edificio Central" />
                                    <Field name="departamento" placeholder="Ej: Antioquia" />
                                    <Field name="ciudad" placeholder="Ej: Medellín" />
                                    <Field name="barrio" placeholder="Ej: El Poblado" />
                                    <Field name="direccion" placeholder="Ej: Calle 10 # 45-20" />
                                    <Field name="precioInmueble" placeholder="Ej: 150000000 (Solo números enteros mayores a 0)." />
                                </div>
                            </section>
                        )}

                        {/* PASO 4 */}
                        {step === 4 && (
                            <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Datos del Contrato y Pago</h3>
                                    <p className="text-xs text-gray-600 mt-1">Define fechas y valor mensual</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FancyDatePicker name="fechaInicio" label="Fecha de Inicio" />
                                    <FancyDatePicker name="fechaFinal" label="Fecha de Finalización" />
                                    <FancyDatePicker
                                        name="fechaCobro"
                                        label="Fecha de Cobro"
                                        locked
                                        helperText="Se fija automáticamente al día 5 de cada mes."
                                    />
                                    <Field name="precio" placeholder="Ej: 1500000 (Solo números enteros mayores a 0)." />
                                </div>
                            </section>
                        )}

                    </div>

                    <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
                        {step > 1 ? (
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={prevStep}
                                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm"
                            >
                                Anterior
                            </motion.button>
                        ) : <div />}

                        {step < totalSteps && (
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleNextStep}
                                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                            >
                                Siguiente
                            </motion.button>
                        )}

                        {step === totalSteps && (
                            <motion.button
                                type="submit"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={submissionState.isSubmitting}
                                className="px-5 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 ml-auto"
                            >
                                {submissionState.isSubmitting ? "Creando..." : "Crear Arriendo"}
                            </motion.button>
                        )}
                    </div>
                    {submissionState.error && (
                        <p className="px-4 sm:px-6 pb-4 text-sm text-red-600">{submissionState.error}</p>
                    )}
                </form>
            </motion.div>
        </motion.div>
    );
}

