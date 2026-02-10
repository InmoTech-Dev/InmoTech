import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { motion } from 'framer-motion';
import { renantsApiService } from "../../../../shared/services/arrendatarioApiService";
import arriendoApiService from "../../../../shared/services/arriendoApiService";
import { inmueblesAPI } from "../../../../shared/services/propertyApidervice";

// Lista de campos que deben ser obligatorios según la solicitud del usuario (INCLUYE ARRENDATARIO, CODEUDOR, INMUEBLE Y CONTRATO)
const requiredFields = [
    // Arrendatario
    "tipoDocArrendatario", "numeroDocArrendatario", "primerNombreArrendatario",
    "primerApellidoArrendatario", "telefonoArrendatario", "correoArrendatario",
    // Codeudor
    "tipoDocCodeudor", "numeroDocCodeudor", "primerNombreCodeudor",
    "primerApellidoCodeudor", "telefonoCodeudor", "correoCodeudor",
    "estabilidadLaboral",
    // Inmueble (Todos los campos excepto Garaje)
    "tipoInmueble", "registroInmobiliario", "nombreInmueble",
    "departamento", "ciudad", "barrio",
    "direccion", "precioInmueble",
    // Contrato
    "fechaInicio", "fechaFinal", "fechaCobro", "precio",
];

// Opciones de documentos
const DOCUMENT_OPTIONS = [
    { value: "CC", label: "Cédula de Ciudadanía (CC)" },
    { value: "CE", label: "Cédula de Extranjería (CE)" },
    { value: "NIT", label: "NIT" },
    { value: "Pasaporte", label: "Pasaporte" },
    { value: "TI", label: "Tarjeta de Identidad (TI)" },
];

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

/**
 * Payload SOLO para crear / actualizar Arrendatario (persona)
 * Ya NO mete datos del contrato aquí.
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
 * para que el backend pueda mapear fácilmente.
 */
const buildArriendoPayload = (values = {}, renant = {}) => {
    const idArrendatario =
        // Priorizar siempre el identificador propio del arrendatario (no el de persona)
        renant.id_arrendatario ||
        renant.idArrendatario ||
        renant.id ||
        values.id_arrendatario ||
        values.idArrendatario;

    // Preparar datos del codeudor (persona). Se enviarán para que el backend cree/busque el registro y asigne id_codeudor.
    const codeudorPayload = {
        tipo_documento: values.tipoDocCodeudor,
        numero_documento: values.numeroDocCodeudor,
        nombre_completo: combineNames(values.primerNombreCodeudor, values.segundoNombreCodeudor),
        apellido_completo: combineNames(values.primerApellidoCodeudor, values.segundoApellidoCodeudor),
        correo: values.correoCodeudor,
        telefono: values.telefonoCodeudor
    };

    const valorMensual =
        parseNumberField(values.precio) ?? parseNumberField(values.precioInmueble);

    const valorGarantia = parseNumberField(values.valorGarantia);

    const idInmueble = values.idInmueble ? Number(values.idInmueble) : undefined;

    return {
        // Relación con Arrendatario/cliente
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
        fechaInicio: values.fechaInicio,
        fechaFin: values.fechaFinal,

        // Valores
        valor_mensual: valorMensual,
        valorMensual: valorMensual,

        // Garantía (opcional)
        tipo_garantia: values.tipoGarantia,
        tipoGarantia: values.tipoGarantia,
        valor_garantia: valorGarantia,
        valorGarantia: valorGarantia,
        descripcion_garantia: values.descripcionGarantia,
        descripcionGarantia: values.descripcionGarantia,

        // Codeudor (persona) - el backend lo resolverá a id_codeudor
        codeudor: codeudorPayload,

        // Estado del contrato
        estado: "Activo",
    };
};

export default function RentForm({ onClose, onSubmit }) {
    const [step, setStep] = useState(1);
    // Estado para manejar los errores en línea. Usa { fieldName: errorMessage }
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
    const [inmuebleLookupState, setInmuebleLookupState] = useState({
        loading: false,
        message: "",
        error: null
    });
    const inmuebleLookupRequestId = useRef(0);
    const totalSteps = 4;

    const initial = {
        tipoDocArrendatario: "", numeroDocArrendatario: "", primerNombreArrendatario: "", segundoNombreArrendatario: "",
        primerApellidoArrendatario: "", segundoApellidoArrendatario: "", correoArrendatario: "", telefonoArrendatario: "",

        tipoDocCodeudor: "", numeroDocCodeudor: "", primerNombreCodeudor: "", segundoNombreCodeudor: "",
        primerApellidoCodeudor: "", segundoApellidoCodeudor: "", correoCodeudor: "", telefonoCodeudor: "",
        estabilidadLaboral: "",

        tipoInmueble: "", registroInmobiliario: "", nombreInmueble: "",
        departamento: "", ciudad: "", barrio: "", direccion: "", precioInmueble: "", garaje: false,

        fechaInicio: "", fechaFinal: "", fechaCobro: "", precio: "", estado: "Activo",
    };

    // refs para mantener TODOS los valores sin causar re-renders en cada letra
    const valuesRef = useRef({ ...initial });
    // Ref para mantener los valores formateados visibles en los inputs, si son diferentes del valor numérico
    const displayValuesRef = useRef({ ...initial });
    const elRefs = useRef({});
    const errorFocusTimeout = useRef(null); // Usado para enfocar el primer campo con error

    // Constantes para los nombres de los campos de documento
    const NUMERO_DOC_ARR = "numeroDocArrendatario";
    const NUMERO_DOC_COD = "numeroDocCodeudor";

    // Lista de campos que deben ser estrictamente numéricos (solo dígitos)
    const strictNumericFields = [
        "precioInmueble", "precio"
    ];
    
    // Campos que requieren formato de miles
    const currencyFields = ["precioInmueble", "precio"];

    // Campos agrupados por paso para la validación de 'Siguiente'
    const stepFields = {
        1: [
            "tipoDocArrendatario", NUMERO_DOC_ARR, "primerNombreArrendatario", "segundoNombreArrendatario",
            "primerApellidoArrendatario", "segundoApellidoArrendatario", "correoArrendatario", "telefonoArrendatario",
        ],
        2: [
            "tipoDocCodeudor", NUMERO_DOC_COD, "primerNombreCodeudor", "segundoNombreCodeudor",
            "primerApellidoCodeudor", "segundoApellidoCodeudor", "correoCodeudor", "telefonoCodeudor",
            "estabilidadLaboral",
        ],
        3: [
            "tipoInmueble", "registroInmobiliario", "nombreInmueble",
            "departamento", "ciudad", "barrio", "direccion", "precioInmueble", "garaje"
        ],
        4: ["fechaInicio", "fechaFinal", "fechaCobro", "precio"],
    };

    // Lista de campos que deben contener solo letras (y acentos/espacios)
    const nameFields = [
        "primerNombreArrendatario", "segundoNombreArrendatario", "primerApellidoArrendatario", "segundoApellidoArrendatario",
        "primerNombreCodeudor", "segundoNombreCodeudor", "primerApellidoCodeudor", "segundoApellidoCodeudor",
    ];

    // Lista de campos que deben contener solo números (documentos)
    const docFields = [
        NUMERO_DOC_ARR, NUMERO_DOC_COD,
    ];

    // Lista de campos que deben contener solo números (teléfonos)
    const phoneFields = [
        "telefonoArrendatario", "telefonoCodeudor",
    ];

    // Lista de campos de email
    const emailFields = [
        "correoArrendatario", "correoCodeudor",
    ];

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

    const getLabel = (name) => {
        const labels = {
            tipoDocArrendatario: "Tipo de Documento", numeroDocArrendatario: "Número de Documento", primerNombreArrendatario: "Primer Nombre",
            segundoNombreArrendatario: "Segundo Nombre", primerApellidoArrendatario: "Primer Apellido", segundoApellidoArrendatario: "Segundo Apellido",
            correoArrendatario: "Correo Electrónico", telefonoArrendatario: "Teléfono", tipoDocCodeudor: "Tipo de Documento Codeudor",
            numeroDocCodeudor: "Número de Documento Codeudor", primerNombreCodeudor: "Primer Nombre Codeudor",
            segundoNombreCodeudor: "Segundo Nombre Codeudor", primerApellidoCodeudor: "Primer Apellido Codeudor",
            segundoApellidoCodeudor: "Segundo Apellido Codeudor", correoCodeudor: "Correo Electrónico Codeudor",
            telefonoCodeudor: "Teléfono Codeudor", estabilidadLaboral: "Estabilidad Económica", tipoInmueble: "Tipo de Inmueble",
            registroInmobiliario: "Registro Inmobiliario", nombreInmueble: "Nombre del Inmueble",
            departamento: "Departamento", ciudad: "Ciudad", barrio: "Barrio", direccion: "Dirección",
            precioInmueble: "Precio del Inmueble",
            garaje: "Garaje", fechaInicio: "Fecha de Inicio", fechaFinal: "Fecha de Finalización", fechaCobro: "Fecha de Cobro",
            precio: "Precio del Arriendo",
        };
        return labels[name] ?? name;
    };

    // Función para obtener la clase de estilo (incluyendo el resaltado de error)
    const getFieldClass = useCallback((fieldName) => {
        const errorClass = errors[fieldName] ? 'border-red-500 ring-2 ring-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
        return `w-full p-3 border rounded-lg focus:outline-none transition duration-150 ${errorClass}`;
    }, [errors]);

    // Formatea un número con separadores de miles
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
        
        // Inicializar el valor de visualización si es un campo de moneda
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

    const applyArrendatarioData = useCallback((renant) => {
        if (!renant) return;

        const replacements = {
            primerNombreArrendatario: renant.primerNombre || "",
            segundoNombreArrendatario: renant.segundoNombre || "",
            primerApellidoArrendatario: renant.primerApellido || "",
            segundoApellidoArrendatario: renant.segundoApellido || "",
            correoArrendatario: renant.correo || "",
            telefonoArrendatario: renant.telefono || ""
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
            return next;
        });
    }, [arrendatarioAutoFillFields]);

    const autofillInmueble = useCallback((inmueble = {}) => {
        if (!inmueble) return;

        const raw = inmueble.metadata?.raw || {};
        valuesRef.current.idInmueble = inmueble.id ?? inmueble.id_inmueble ?? valuesRef.current.idInmueble;

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

        const garajeSource = raw.garaje ?? raw.parqueaderos ?? raw.garajes ?? inmueble.garaje ?? inmueble.parqueaderos;
        if (garajeSource !== undefined) {
            const garageDigits = sanitizeNumericString(garajeSource);
            const hasGarage = garageDigits ? garageDigits !== "0" : Boolean(garajeSource);
            setFieldValue("garaje", hasGarage);
        }
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
                autofillInmueble(inmueble);
                setInmuebleLookupState({
                    loading: false,
                    message: "Datos del inmueble completados automáticamente.",
                    error: null
                });
            } else {
                valuesRef.current.idInmueble = undefined;
                setInmuebleLookupState({
                    loading: false,
                    message: "",
                    error: "No encontramos un inmueble con ese registro."
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
        }
    }, [autofillInmueble]);

    const cleanDocument = (value = "") => value.toString().replace(/[^0-9]/g, "").trim();

    const fetchArrendatarioByDocument = useCallback(async () => {
        const tipoDocumento = (valuesRef.current.tipoDocArrendatario || "").trim();
        const numeroDocumento = cleanDocument(valuesRef.current.numeroDocArrendatario);

        if (!tipoDocumento || !numeroDocumento) {
            setArrendatarioLookupState({ loading: false, message: "", error: null });
            return;
        }

        const documentError = validateDocument(tipoDocumento, numeroDocumento);
        if (documentError) {
            setArrendatarioLookupState({
                loading: false,
                message: "",
                error: documentError
            });
            return;
        }

        arrendatarioLookupRequestId.current += 1;
        const requestId = arrendatarioLookupRequestId.current;

        setArrendatarioLookupState({ loading: true, message: "", error: null });

        try {
            const results = await renantsApiService.getAll({
                tipo_documento: tipoDocumento,
                numero_documento: numeroDocumento
            });

            if (arrendatarioLookupRequestId.current !== requestId) return;

            const matchingRenant = results.find((renant) => {
                const storedDoc = cleanDocument(renant.documento);
                return (
                    storedDoc === numeroDocumento &&
                    (renant.tipoDocumento || "").toString().trim() === tipoDocumento
                );
            });

            if (matchingRenant) {
                applyArrendatarioData(matchingRenant);
                setArrendatarioLookupState({
                    loading: false,
                    message: "Datos completados automáticamente.",
                    error: null
                });
            } else {
                setArrendatarioLookupState({
                    loading: false,
                    message: "",
                    error: "No encontramos un arrendatario con ese documento."
                });
            }
        } catch (error) {
            if (arrendatarioLookupRequestId.current !== requestId) return;
            setArrendatarioLookupState({
                loading: false,
                message: "",
                error: error?.message || "No fue posible buscar el arrendatario."
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
                cleanValue = value.replace(/[^0-9]/g, ''); // Solo dígitos
                const formattedValue = formatNumberWithThousandsSeparator(cleanValue);
                
                // Actualizar el valor a mostrar en el input (lo que ve el usuario)
                displayValuesRef.current[name] = formattedValue;
                e.target.value = formattedValue; // Forzar la actualización visual
            } else {
                displayValuesRef.current[name] = value;
            }
            
            // Guardar siempre el valor LIMPIO (solo dígitos si es numérico con formato) o el valor original
            valuesRef.current[name] = cleanValue;

            if (name === "registroInmobiliario") {
                valuesRef.current.idInmueble = undefined;
                setInmuebleLookupState((prev) => {
                    if (!prev.loading && !prev.message && !prev.error) return prev;
                    return { loading: false, message: "", error: null };
                });
            }
        }

        // Limpieza de error en vivo al escribir, solo si ya existía un error
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

        if (name === "tipoDocArrendatario" || name === NUMERO_DOC_ARR) {
            resetArrendatarioManualFields();
            setArrendatarioLookupState((prev) => {
                if (!prev.loading && !prev.message && !prev.error) return prev;
                return { loading: false, message: "", error: null };
            });
            triggerArrendatarioLookup();
        }
    };

    // Funciones de validación de formato
    const isValidName = (value) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(value);
    const isValidNumeric = (value) => /^\d*$/.test(value);
    const isValidEmail = (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

    // Handler para verificar obligatoriedad, longitud y formato al salir del campo - MEJORADO
    const handleInputBlur = (e) => {
        const { name } = e.target;
        // Tomamos el valor limpio de la ref, no del e.target.value (que podría estar formateado)
        const value = valuesRef.current[name] || ""; 
        
        let errorMessage = null;
        const isRequired = requiredFields.includes(name);
        const conflictErrorMsg = "El número de documento del Arrendatario no puede ser igual al del Codeudor.";

        setErrors(prev => {
            const newErrors = { ...prev };

            // 1. Validar OBLIGATORIO
            if (isRequired && !value.trim() && name !== 'garaje') { 
                 errorMessage = "Este campo es obligatorio.";
            }

            // 2. Validar formato y longitud (solo si no hay un error de obligatoriedad y el campo tiene valor) - MEJORADO
            if (!errorMessage && value.trim()) {
                if (nameFields.includes(name) && !isValidName(displayValuesRef.current[name])) {
                    errorMessage = `Solo se permiten letras y espacios.`;
                } 
                // VALIDACIÓN MEJORADA PARA DOCUMENTOS
                else if (docFields.includes(name)) {
                    let tipoDocumento = "";
                    
                    if (name === NUMERO_DOC_ARR) {
                        tipoDocumento = valuesRef.current.tipoDocArrendatario || "CC";
                    } else if (name === NUMERO_DOC_COD) {
                        tipoDocumento = valuesRef.current.tipoDocCodeudor || "CC";
                    }
                    
                    // Validar formato básico primero
                    if (!/^[A-Za-z0-9\s\-\.]*$/.test(displayValuesRef.current[name])) {
                        errorMessage = `Solo se permiten letras, números, espacios, puntos y guiones`;
                    } else {
                        // Validación específica por tipo de documento
                        errorMessage = validateDocument(tipoDocumento, value);
                    }
                } 
                else if (phoneFields.includes(name) && !isValidNumeric(value)) {
                    errorMessage = `Solo se permiten números.`;
                } 
                else if (emailFields.includes(name) && !isValidEmail(value)) {
                    errorMessage = `El correo electrónico debe ser válido.`;
                } 
                else if (strictNumericFields.includes(name) && !isValidNumeric(value)) { 
                    errorMessage = `Solo se permiten números enteros.`;
                }
                
                // Validaciones específicas para campos numéricos
                if (!errorMessage && strictNumericFields.includes(name)) {
                    const numericValue = parseInt(value);
                    
                    if ((name === "precioInmueble" || name === "precio") && numericValue <= 0) {
                        errorMessage = `Debe ser un número mayor a 0`;
                    }
                }
            }

            // 3. Validar CONFLICTO DE DOCUMENTO (solo si es un campo de documento y no tiene otro error más grave)
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
                    // Si el otro campo tenía el error de conflicto, lo limpiamos
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

        if (name === "registroInmobiliario" && !errorMessage && value.trim().length > 0) {
            handleInmuebleLookup(value);
        }
    };

    // --- LÓGICA DE VALIDACIÓN CENTRAL MEJORADA ---
    const runValidation = (fieldsToCheck) => {
        let currentErrors = { ...errors };
        let hasError = false;
        let firstErrorField = null;
        
        // 1. Iterar sobre los campos del paso actual o todos para validaciones individuales
        for (const fieldName of fieldsToCheck) {
            // Siempre usamos el valor LIMPIO de valuesRef para la validación
            const value = valuesRef.current[fieldName] || "";
            let error = null;

            const isRequired = requiredFields.includes(fieldName);
            
            // A. Validación de Obligatoriedad
            if (isRequired && !value.toString().trim() && fieldName !== 'garaje') { 
                error = "Este campo es obligatorio.";
            } 
            
            // B. Validación de Obligatoriedad y > 0 para números estrictos
            if (isRequired && strictNumericFields.includes(fieldName)) {
                 if (!value.toString().trim() || parseFloat(value) <= 0 || isNaN(parseFloat(value))) {
                     error = "Este campo es obligatorio y debe ser mayor a 0";
                 }
            }

            // C. Validación de Formato MEJORADA
            if (!error && value.toString().trim()) {
                if (nameFields.includes(fieldName) && !isValidName(displayValuesRef.current[fieldName])) {
                    error = `Solo se permiten letras, espacios y acentos.`;
                } 
                // VALIDACIÓN MEJORADA PARA DOCUMENTOS
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
                    error = `Solo se permiten dígitos.`;
                } 
                else if (emailFields.includes(fieldName) && !isValidEmail(value)) {
                    error = `Debe ser un correo electrónico válido.`;
                } 
                else if (strictNumericFields.includes(fieldName) && !isValidNumeric(value)) { 
                    error = `Solo se permiten números enteros.`;
                }
                
                // Validaciones específicas para campos numéricos
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
                 // Limpiar el error si el campo es válido (pero no tocar el error de CONFLICTO si ya existe)
                 const isConflictError = currentErrors[fieldName] === "El número de documento del Arrendatario no puede ser igual al del Codeudor.";
                 if (!isConflictError) {
                    delete currentErrors[fieldName];
                 }
            }
        }
        
        // 2. Validación de CONFLICTO DE DOCUMENTO (Cross-field validation)
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
        let fieldsToValidate = stepFields[step].filter(f => f !== 'garaje' || requiredFields.includes('garaje'));
        
        // Añadir el campo de documento cruzado para validar el conflicto al cambiar de paso 1 a 2
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
        
        // En el envío final, validamos TODOS los campos obligatorios
        const allFieldsToValidate = Object.values(stepFields)
            .flat()
            .filter(f => f !== 'garaje' || requiredFields.includes('garaje'));
        const { currentErrors, hasError, firstErrorField } = runValidation(allFieldsToValidate);

        setErrors(currentErrors);

        if (hasError) {
            // Determinar a qué paso debe volver para mostrar el error y enfocar el campo
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
            
            return; // Bloquea el envío
        }

        // Validación adicional: asegurar que tenemos un inmueble resuelto a ID
        if (!valuesRef.current.idInmueble) {
            const msg = "Selecciona un inmueble válido desde el registro inmobiliario.";
            setErrors((prev) => ({ ...prev, registroInmobiliario: msg }));
            setStep(3);
            const el = elRefs.current.registroInmobiliario;
            if (el) el.focus();
            return;
        }

        setSubmissionState({ isSubmitting: true, error: null });
        const rawValues = { ...valuesRef.current };

        try {
            // 1️⃣ Asegurar ARRRENDATARIO (crear o reutilizar)
            const arrendatarioPayload = buildArrendatarioPayload(rawValues);
            let renant;

            try {
                // Intentar crear el arrendatario
                renant = await renantsApiService.create(arrendatarioPayload);
            } catch (error) {
                const duplicateMsg = "ya esta registrada como arrendatario";
                if (error?.message?.toLowerCase().includes(duplicateMsg)) {
                    // Ya existe → lo buscamos y reutilizamos
                    const tipoDocumento = (rawValues.tipoDocArrendatario || "").trim();
                    const numeroDocumento = cleanDocument(rawValues.numeroDocArrendatario);

                    const existing = await renantsApiService.getAll({
                        tipo_documento: tipoDocumento,
                        numero_documento: numeroDocumento
                    });

                    const matched = existing?.[0];
                    if (!matched) {
                        throw error; // no pudimos recuperarlo, dejamos que caiga al catch general
                    }
                    renant = matched;
                } else {
                    throw error;
                }
            }

            // 2️⃣ Crear ARRIENDO ligado al arrendatario obtenido/creado
            const arriendoPayload = buildArriendoPayload(rawValues, renant);
            const arriendoCreated = await arriendoApiService.crearArriendo(arriendoPayload);

            // 3️⃣ Notificar al padre → RenantManagementPage hará fetchArriendos()
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
        const isNameField = nameFields.includes(name);

        // Determinar si necesita validación en blur (incluye los requeridos para feedback inmediato)
        const needsBlurValidation = isDocField || isNameField || isPhoneField || isEmailField || isRequired || isStrictNumeric;
        const onBlurHandler = needsBlurValidation ? handleInputBlur : undefined;
        
        // Establecer el tipo de input para sugerir teclado numérico
        let inputType = type;
        if (isDocField || isPhoneField || isStrictNumeric) {
            if (type !== 'date' && type !== 'email') {
                inputType = "tel";
            }
        }
        else if (isEmailField) {
            inputType = "email";
        }

        // Placeholders mejorados
        let fieldPlaceholder = placeholder;
        if (isDocField) {
            fieldPlaceholder = "Ej: 1234567890 (8-10 dígitos según el tipo)";
        }
        if (isPhoneField) {
            fieldPlaceholder = "Ej: 3001234567 (10 dígitos mínimo)";
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
                    className={getFieldClass(name)}
                    type={inputType}
                    placeholder={fieldPlaceholder}
                    defaultValue={(displayValuesRef.current[name] || initial[name]) ?? ""} 
                    onChange={handleInputChange}
                    onBlur={onBlurHandler}
                />
                {errorMessage && (
                    <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
                )}
            </div>
        );
    };

    return (
        // 🔑 Fondo del modal con desenfoque - CAMBIO PRINCIPAL
        <div 
            className="fixed inset-0 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm z-50 p-4"
            onClick={onClose}
        >
            {/* Contenido principal del modal */}
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                
                {/* Header con estilo del banner */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Crear Arriendo</h2>
                    <p className="text-gray-600 text-sm">Complete la información del nuevo contrato de arrendamiento</p>
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

                {/* Barra de progreso */}
                <div className="mb-6">
                    <div className="w-full bg-gray-200 h-2 rounded-full">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        Paso {step} de {totalSteps}:{" "}
                        {step === 1 ? "Datos del Arrendatario" : step === 2 ? "Datos del Codeudor" : step === 3 ? "Datos del Inmueble" : "Datos del Contrato y Pago"}
                        {" "} (Campos obligatorios marcados con *)
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-6">
                        
                        {/* PASO 1 */}
                        {step === 1 && (
                            <div>
                                <h3 className="text-lg font-bold text-blue-800 mb-4 pb-2 border-b border-blue-200">
                                    Datos del Arrendatario
                                </h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    <Field
                                        name="tipoDocArrendatario"
                                        as="select"
                                        options={DOCUMENT_OPTIONS}
                                    />
                                    <Field name={NUMERO_DOC_ARR} placeholder="Ej: 1234567890 (8-10 dígitos según el tipo)" />
                                    <Field name="primerNombreArrendatario" placeholder="Solo letras y espacios." />
                                    <Field name="segundoNombreArrendatario" placeholder="Solo letras y espacios. (Opcional)" />
                                    <Field name="primerApellidoArrendatario" placeholder="Solo letras y espacios." />
                                    <Field name="segundoApellidoArrendatario" placeholder="Solo letras y espacios. (Opcional)" />
                                    <Field name="correoArrendatario" placeholder="correo@dominio.com" type="email" />
                                    <Field name="telefonoArrendatario" placeholder="Ej: 3001234567 (10 dígitos mínimo)" />
                                </div>
                                <div className="mt-2 space-y-1 text-xs">
                                    {arrendatarioLookupState.loading && (
                                        <p className="text-slate-500">Buscando arrendatario existente...</p>
                                    )}
                                    {arrendatarioLookupState.message && (
                                        <p className="text-green-600">{arrendatarioLookupState.message}</p>
                                    )}
                                    {arrendatarioLookupState.error && (
                                        <p className="text-red-600">{arrendatarioLookupState.error}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* PASO 2 */}
                        {step === 2 && (
                            <div>
                                <h3 className="text-lg font-bold text-green-800 mb-4 pb-2 border-b border-green-200">
                                    Datos del Codeudor
                                </h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    <Field
                                        name="tipoDocCodeudor"
                                        as="select"
                                        options={DOCUMENT_OPTIONS}
                                    />
                                    <Field name={NUMERO_DOC_COD} placeholder="Ej: 1234567890 (8-10 dígitos según el tipo)" />
                                    <Field name="primerNombreCodeudor" placeholder="Solo letras y espacios." />
                                    <Field name="segundoNombreCodeudor" placeholder="Solo letras y espacios. (Opcional)" />
                                    <Field name="primerApellidoCodeudor" placeholder="Solo letras y espacios." />
                                    <Field name="segundoApellidoCodeudor" placeholder="Solo letras y espacios. (Opcional)" />
                                    <Field name="correoCodeudor" placeholder="correo@dominio.com" type="email" />
                                    <Field name="telefonoCodeudor" placeholder="Ej: 3009876543 (10 dígitos mínimo)" />
                                    <Field name="estabilidadLaboral" placeholder="Ej: 5 años" />
                                </div>
                            </div>
                        )}

                        {/* PASO 3 */}
                        {step === 3 && (
                            <div>
                                <h3 className="text-lg font-bold text-yellow-800 mb-4 pb-2 border-b border-yellow-200">
                                    Datos del Inmueble
                                </h3>
                                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
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
                                    <div className="col-span-3 text-xs space-y-1">
                                        {inmuebleLookupState.loading && (
                                            <p className="text-slate-500">Buscando inmueble...</p>
                                        )}
                                        {inmuebleLookupState.message && (
                                            <p className="text-green-600">{inmuebleLookupState.message}</p>
                                        )}
                                        {inmuebleLookupState.error && (
                                            <p className="text-red-600">{inmuebleLookupState.error}</p>
                                        )}
                                    </div>
                                    <Field name="nombreInmueble" placeholder="Ej: Edificio Central" />
                                    <Field name="departamento" placeholder="Ej: Antioquia" />
                                    <Field name="ciudad" placeholder="Ej: Medellín" />
                                    <Field name="barrio" placeholder="Ej: El Poblado" />
                                    <Field name="direccion" placeholder="Ej: Calle 10 # 45-20" />
                                    <Field name="precioInmueble" placeholder="Ej: 150000000 (Solo números enteros mayores a 0)." />
                                    <Field name="garaje" type="checkbox" />
                                </div>
                            </div>
                        )}

                        {/* PASO 4 */}
                        {step === 4 && (
                            <div>
                                <h3 className="text-lg font-bold text-purple-800 mb-4 pb-2 border-b border-purple-200">
                                    Datos del Contrato y Pago
                                </h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    <Field name="fechaInicio" type="date" />
                                    <Field name="fechaFinal" type="date" />
                                    <Field name="fechaCobro" type="date" />
                                    <Field name="precio" placeholder="Ej: 1500000 (Solo números enteros mayores a 0)." />
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Controles de navegación */}
                    <div className="flex justify-between pt-6 mt-6">
                        {step > 1 && (
                            <button 
                                type="button" 
                                onClick={prevStep} 
                                className="px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition duration-150 transform hover:scale-[1.02]"
                            >
                                Anterior
                            </button>
                        )}

                        {step < totalSteps && (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className={`px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-400/50 hover:bg-blue-700 transition duration-150 transform hover:scale-[1.02] ${step > 1 ? "ml-auto" : "w-full"}`}
                            >
                                Siguiente
                            </button>
                        )}

                        {step === totalSteps && (
                            <button 
                                type="submit"
                                disabled={submissionState.isSubmitting}
                                className={`px-6 py-2 rounded-lg shadow-lg shadow-green-400/50 ml-auto font-semibold transition duration-150 transform hover:scale-[1.02]
                                    ${submissionState.isSubmitting ? "bg-green-500 opacity-80 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}
                                    text-white`}
                            >
                                {submissionState.isSubmitting ? "Creando..." : "Crear Arriendo"}
                            </button>
                        )}
                    </div>
                    {submissionState.error && (
                        <p className="mt-3 text-sm text-red-600">{submissionState.error}</p>
                    )}
                </form>
            </div>
        </div>
    );
}
