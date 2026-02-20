import React, { useRef, useState, useCallback, useEffect } from "react";
import { buyersApiService } from "../../../../shared/services/buyersApiService";
import { inmueblesAPI } from "../../../../shared/services/propertyApidervice";

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
    { value: "CC", label: "C�dula de Ciudadan�a (CC)" },
    { value: "CE", label: "C�dula de Extranjer�a (CE)" },
    { value: "NIT", label: "NIT" },
    { value: "PASAPORTE", label: "Pasaporte" },
    { value: "TI", label: "Tarjeta de Identidad (TI)" },
];

const PAYMENT_OPTIONS = [
    { value: "efectivo", label: "Efectivo" },
    { value: "transferencia", label: "Transferencia" },
    { value: "credito", label: "Cr�dito" },
    { value: "mixto", label: "Mixto" },
];

const BUYER_AUTOFILL_FIELDS = [
    "compradorNombreCompleto",
    "compradorCorreo",
    "compradorTelefono",
];

// Estado inicial
const initial = {
    vendedorTipoDocumento: "CC",
    vendedorDocumento: "",
    vendedorNombreCompleto: "",
    vendedorCorreo: "",
    vendedorTelefono: "",
    compradorTipoDocumento: "CC",
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
    inmuebleGaraje: false,
    inmuebleEstado: "Disponible",
    fechaVenta: new Date().toISOString().slice(0, 10),
    medioPago: "efectivo",
    medioPagoDescripcion: "",
};

export default function SalesForm({ onClose, onSubmit }) {
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState({});
    const totalSteps = 4;

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
        tipo: "CC",
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

    // Campos estrictamente num�ricos (solo d�gitos)
    const strictNumericFields = [];

    const currencyFields = ["inmueblePrecio"];

    // Campos para validaciones de formato
    const nameFields = [
        "vendedorNombreCompleto", "compradorNombreCompleto",
    ];
    const docFields = [VENDEDOR_DOC, COMPRADOR_DOC];
    const phoneFields = ["vendedorTelefono", "compradorTelefono"];
    const emailFields = ["vendedorCorreo", "compradorCorreo"];

    // Campos agrupados por paso para la validaci�n
    const stepFields = {
        1: [
            "vendedorTipoDocumento", VENDEDOR_DOC, "vendedorNombreCompleto", 
            "vendedorCorreo", "vendedorTelefono",
        ],
        2: [
            "compradorTipoDocumento", COMPRADOR_DOC, "compradorNombreCompleto", 
            "compradorCorreo", "compradorTelefono",
        ],
        3: [
            "inmuebleTipo", "inmuebleRegistro", "inmuebleNombre",
            "inmueblePais", "inmuebleDepartamento", "inmuebleCiudad",
            "inmuebleBarrio", "inmuebleDireccion", "inmuebleGaraje"
        ],
        4: [
            "fechaVenta", "medioPago", "medioPagoDescripcion", "inmueblePrecio"
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
            vendedorDocumento: "N�mero Doc. Vendedor",
            vendedorNombreCompleto: "Nombre Completo Vendedor", 
            vendedorCorreo: "Correo Vendedor",
            vendedorTelefono: "Tel�fono Vendedor",

            // Comprador
            compradorTipoDocumento: "Tipo Doc. Comprador", 
            compradorDocumento: "N�mero Doc. Comprador",
            compradorNombreCompleto: "Nombre Completo Comprador", 
            compradorCorreo: "Correo Comprador",
            compradorTelefono: "Tel�fono Comprador",

            // Inmueble
            inmuebleTipo: "Tipo de Inmueble", 
            inmuebleRegistro: "No. Registro Catastral",
            inmuebleNombre: "Nombre/T�tulo Comercial", 
            inmueblePais: "Pa�s", 
            inmuebleDepartamento: "Departamento/Estado",
            inmuebleCiudad: "Ciudad", 
            inmuebleBarrio: "Barrio/Zona",
            inmuebleDireccion: "Direcci�n Completa",
            inmueblePrecio: "Precio de Venta (COP)", 
            inmuebleGaraje: "�Tiene Garaje?",

            // Venta
            fechaVenta: "Fecha de Venta",
            medioPago: "Medio de Pago",
        };
        return labels[name] ?? name;
    };

    // === VALIDACIONES MEJORADAS PARA DOCUMENTOS ===

    // Funci�n para validar documentos seg�n el tipo
    const validateDocument = (tipoDocumento, numeroDocumento) => {
        const numeroLimpio = numeroDocumento.replace(/[^0-9]/g, '');
        
        switch (tipoDocumento) {
            case 'CC': // C�dula de Ciudadan�a
                if (!/^[0-9]{8,10}$/.test(numeroLimpio)) {
                    return 'La c�dula de ciudadan�a debe tener entre 8 y 10 d�gitos';
                }
                break;
                
            case 'CE': // C�dula de Extranjer�a
                if (!/^[0-9]{6,10}$/.test(numeroLimpio)) {
                    return 'La c�dula de extranjer�a debe tener entre 6 y 10 d�gitos';
                }
                break;
                
            case 'NIT': // NIT
                if (!/^[0-9]{9,10}$/.test(numeroLimpio)) {
                    return 'El NIT debe tener 9 o 10 d�gitos';
                }
                break;
                
            case 'PASAPORTE': // Pasaporte
                if (numeroLimpio.length < 6 || numeroLimpio.length > 20) {
                    return 'El pasaporte debe tener entre 6 y 20 caracteres';
                }
                if (!/^[A-Za-z0-9]+$/.test(numeroLimpio)) {
                    return 'El pasaporte solo puede contener letras y n�meros';
                }
                break;
                
            case 'TI': // Tarjeta de Identidad
                if (!/^[0-9]{10,11}$/.test(numeroLimpio)) {
                    return 'La tarjeta de identidad debe tener 10 u 11 d�gitos';
                }
                break;
                
            default:
                return 'Tipo de documento no v�lido';
        }
        
        return '';
    };

    // Funci�n para obtener la clase de estilo (incluyendo el resaltado de error)
    const getFieldClass = useCallback((fieldName) => {
        const errorClass = errors[fieldName] 
            ? 'border-red-500 ring-2 ring-red-500' 
            : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
        return `w-full p-3 border rounded-lg focus:outline-none transition duration-150 ${errorClass}`;
    }, [errors]);

    // Formateador de n�meros con separadores de miles
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

    // Configuraci�n de referencias de elementos
    const setElRef = (name) => (el) => {
        if (!el) return;
        elRefs.current[name] = el;
        
        if (valuesRef.current[name] === undefined || valuesRef.current[name] === null) {
            valuesRef.current[name] = initial[name] ?? "";
        }
        
        // Inicializar valor de visualizaci�n para campos de moneda
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

        if (type === "checkbox") {
            valuesRef.current[name] = checked;
        } else {
            // Formatear campos de moneda
            if (currencyFields.includes(name)) {
                cleanValue = value.replace(/[^0-9]/g, '');
                const formattedValue = formatNumberWithThousandsSeparator(cleanValue);
                
                displayValuesRef.current[name] = formattedValue;
                e.target.value = formattedValue;
            } else {
                displayValuesRef.current[name] = value;
            }
            
            valuesRef.current[name] = cleanValue;

            // Si cambia el medio de pago y ya no es mixto, limpiar la descripci�n
            if (name === "medioPago" && cleanValue.toLowerCase() !== "mixto") {
                setFieldValue("medioPagoDescripcion", "");
            }

            if (name === "medioPago") {
                setStep((s) => s); // forzar re-render para campos condicionales
            }

            // Reset de selecci�n de comprador si cambian documentos
            if (name === COMPRADOR_DOC || name === "compradorTipoDocumento") {
                selectedBuyerRef.current = null;
                manuallyEditedBuyerFieldsRef.current.clear();
            }

            // Marcar campos editados manualmente
            if (BUYER_AUTOFILL_FIELDS.includes(name)) {
                manuallyEditedBuyerFieldsRef.current.add(name);
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
    };

    const handleInmuebleLookup = useCallback(async (registro = "") => {
        const cleanRegistro = (registro || "").trim();
        if (!cleanRegistro) return;

        setInmuebleLookupState({ loading: true, message: "", error: null });

        try {
            const inmueble = await inmueblesAPI.getInmuebleByRegistro(cleanRegistro);

            if (inmueble && inmueble.id) {
                autofillInmueble(inmueble, { skipEstado: true });
                setInmuebleLookupState({
                    loading: false,
                    message: "Datos del inmueble completados autom�ticamente.",
                    error: null,
                });
            } else {
                setInmuebleLookupState({
                    loading: false,
                    message: "",
                    error: "No encontramos un inmueble con ese registro.",
                });
            }
        } catch (error) {
            setInmuebleLookupState({
                loading: false,
                message: "",
                error: error?.message || "No fue posible buscar el inmueble.",
            });
        }
    }, []);

    // Funciones de validaci�n de formato
    const isValidName = (value) => /^[a-zA-Z������??�????�??�??\s]*$/.test(value);
    const isValidNumeric = (value) => /^\d*$/.test(value);
    const isValidEmail = (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

    // Manejador de blur para validaci�n MEJORADO
    const handleInputBlur = async (e) => {
        const { name } = e.target;
        const value = valuesRef.current[name] || ""; 
        
        let errorMessage = null;
        const isRequired =
            (name === "medioPagoDescripcion" && (valuesRef.current.medioPago || "").toLowerCase() === "mixto") ||
            requiredFields.includes(name);

        setErrors(prev => {
            const newErrors = { ...prev };

            // Validar campo obligatorio
            if (isRequired && !value.trim() && name !== 'inmuebleGaraje') { 
                 errorMessage = "Este campo es obligatorio.";
            }

            // Validar formato y longitud (solo si no hay error de obligatoriedad y el campo tiene valor)
            if (!errorMessage && value.trim()) {
                if (nameFields.includes(name) && !isValidName(value)) {
                    errorMessage = `Solo se permiten letras.`;
                } 
                // VALIDACI??N MEJORADA PARA DOCUMENTOS
                else if (docFields.includes(name)) {
                    let tipoDocumento = "";
                    
                    if (name === VENDEDOR_DOC) {
                        tipoDocumento = valuesRef.current.vendedorTipoDocumento || "CC";
                    } else if (name === COMPRADOR_DOC) {
                        tipoDocumento = valuesRef.current.compradorTipoDocumento || "CC";
                    }
                    
                    // Validar formato b�sico primero
                    if (!/^[A-Za-z0-9\s\-\.]*$/.test(displayValuesRef.current[name])) {
                        errorMessage = `Solo se permiten letras, n�meros, espacios, puntos y guiones`;
                    } else {
                        // Validaci�n espec�fica por tipo de documento
                        errorMessage = validateDocument(tipoDocumento, value);
                    }
                } 
                else if (phoneFields.includes(name)) {
                    if (!isValidNumeric(value)) {
                        errorMessage = `Solo se permiten n�meros.`;
                    } else if (value.length < 10) {
                        errorMessage = `El tel�fono debe tener al menos 10 d�gitos`;
                    }
                } 
                else if (emailFields.includes(name) && !isValidEmail(value)) {
                    errorMessage = `El correo electr�nico debe ser v�lido.`;
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
        // L�gica de b�squeda de comprador
        if (name === COMPRADOR_DOC || name === "compradorTipoDocumento") {
            const currentTipo = valuesRef.current.compradorTipoDocumento || "";
            const normalizedDocumento = valuesRef.current.compradorDocumento || "";
            const docChanged =
                buyerDocumentSnapshotRef.current.tipo !== currentTipo ||
                buyerDocumentSnapshotRef.current.numero !== normalizedDocumento;

            if (docChanged) {
                resetBuyerSelection({ resetState: true, resetFields: true });
                buyerDocumentSnapshotRef.current = {
                    tipo: currentTipo,
                    numero: normalizedDocumento,
                };
            }

            triggerBuyerLookup(name === COMPRADOR_DOC ? 0 : 200);
        }
    };

    // === FUNCIONES DE NORMALIZACI??N ===
    const normalizeValueForStorage = (fieldName, value) => {
        if (typeof value === "boolean") return value;
        if (value === null || value === undefined) return "";
        if (value === 0) return "0";
        if (value === "") return "";

        // Para campos num�ricos estrictos, solo mantener d�gitos
        if (strictNumericFields.includes(fieldName)) {
            return value.toString().replace(/[^0-9]/g, '');
        }

        // Para campos de moneda, solo mantener d�gitos (sin formato)
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
            valuesRef.current.compradorTelefono = buyer.telefono || buyer.raw?.persona?.telefono || "";
            displayValuesRef.current.compradorTelefono = buyer.telefono || buyer.raw?.persona?.telefono || "";
        }

        // Forzar actualizaci�n de los inputs
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
                primerApellido: "",
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
                segundoNombre: "",
                primerApellido: parts[1],
                segundoApellido: parts[2],
            };
        }

        // 4 o m�s palabras: dos �ltimos como apellidos, resto para nombres
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
        const documento = normalizeValueForStorage(COMPRADOR_DOC, valuesRef.current.compradorDocumento || "");
        const nombreCompleto = (valuesRef.current.compradorNombreCompleto || "").trim();

        if (!tipoDocumento || !documento || !nombreCompleto) {
            throw new Error("Completa tipo, documento y nombre del comprador para crearlo.");
        }

        const { primerNombre, segundoNombre, primerApellido, segundoApellido } = splitFullNameToParts(nombreCompleto);

        setBuyerLookupState({ loading: true, message: "", error: null });
        try {
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
        const numeroDocumento = valuesRef.current.compradorDocumento || "";

        if (!tipoDocumento || !numeroDocumento) {
            resetBuyerSelection({ resetState: true, resetFields: true });
            return;
        }

        // Validar el documento antes de hacer la b�squeda
        const documentError = validateDocument(tipoDocumento, numeroDocumento);
        if (documentError) {
            setBuyerLookupState({
                loading: false,
                message: "",
                error: "Documento inv�lido. Corrija el formato antes de buscar.",
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
            const buyer = await buyersApiService.findByDocument(
                tipoDocumento,
                numeroDocumento
            );

            if (buyerLookupRequestId.current !== requestId) {
                return;
            }

            if (buyer) {
                applyBuyerData(buyer);
                setBuyerLookupState({
                    loading: false,
                    message: "Datos del comprador completados autom�ticamente.",
                    error: null,
                });
            } else {
                resetBuyerSelection();
                setBuyerLookupState({
                    loading: false,
                    message: "",
                    error: "No encontramos un comprador registrado con ese documento.",
                });
            }
        } catch (error) {
            if (buyerLookupRequestId.current !== requestId) {
                return;
            }
            resetBuyerSelection();
            setBuyerLookupState({
                loading: false,
                message: "",
                error: error?.message || "No fue posible buscar el comprador.",
            });
        }
    }, [applyBuyerData, resetBuyerSelection]);

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

    // Validaci�n centralizada MEJORADA
    const runValidation = (fieldsToCheck) => {
        let currentErrors = { ...errors };
        let hasError = false;
        let firstErrorField = null;
        
        for (const fieldName of fieldsToCheck) {
            const value = valuesRef.current[fieldName] || "";
            let error = null;

            const isRequired =
                (fieldName === "medioPagoDescripcion" && (valuesRef.current.medioPago || "").toLowerCase() === "mixto") ||
                requiredFields.includes(fieldName);
            
            // Validaci�n de obligatoriedad
            if (isRequired && !value.toString().trim() && fieldName !== 'inmuebleGaraje') { 
                error = "Este campo es obligatorio.";
            } 
            
            // Validaci�n de n�meros estrictos
            if (isRequired && strictNumericFields.includes(fieldName)) {
                 if (!value.toString().trim() || parseFloat(value) <= 0 || isNaN(parseFloat(value))) {
                     error = "Este campo es obligatorio y debe ser mayor a 0";
                 }
            }

            // Validaci�n de formato MEJORADA
            if (!error && value.toString().trim()) {
                if (nameFields.includes(fieldName) && !isValidName(value)) {
                    error = `Solo se permiten letras, espacios y acentos.`;
                } 
                // VALIDACI??N MEJORADA PARA DOCUMENTOS
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
                        error = `Solo se permiten d�gitos.`;
                    } else if (value.length < 10) {
                        error = `El tel�fono debe tener al menos 10 d�gitos`;
                    }
                } 
                else if (emailFields.includes(fieldName) && !isValidEmail(value)) {
                    error = `Debe ser un correo electr�nico v�lido.`;
                } 
                else if (strictNumericFields.includes(fieldName) && !isValidNumeric(value)) { 
                    error = `Solo se permiten n�meros enteros.`;
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

    // Navegaci�n entre pasos
    const handleNextStep = () => {
        let fieldsToValidate = stepFields[step].filter(f => f !== 'inmuebleGaraje' || requiredFields.includes('inmuebleGaraje'));
        
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

    // Env�o del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const allFieldsToValidate = Object.values(stepFields).flat().filter(f => f !== 'inmuebleGaraje' || requiredFields.includes('inmuebleGaraje'));
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
        
        if (onSubmit) onSubmit(payload);
        onClose?.();
    };

    // Componente Field reutilizable (con validaciones mejoradas)
    const Field = ({ name, as = "input", options = [], placeholder, type = "text" }) => {
        const label = getLabel(name);
        const errorMessage = errors[name];
        const isRequired =
            (name === "medioPagoDescripcion" && (valuesRef.current.medioPago || "").toLowerCase() === "mixto") ||
            requiredFields.includes(name);

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

        // Placeholders mejorados para documentos
        let fieldPlaceholder = placeholder;
        if (isDocField) {
            fieldPlaceholder = "Ej: 1234567890 (8-10 d�gitos seg�n el tipo)";
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
        <div 
            className="fixed inset-0 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm z-50 p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 relative my-8 transform transition-all duration-300 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >

                <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-blue-600 p-1 rounded-full transition duration-150" aria-label="Cerrar">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Nueva venta</h2>
                    <p className="text-gray-600 text-sm">Complete la informaci�n requerida para registrar una nueva venta</p>
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
                            {step === 1 ? "Datos del Vendedor" : 
                             step === 2 ? "Datos del Comprador" : 
                             step === 3 ? "Detalles de la Propiedad" : "Precio de Venta"}
                        </span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* PASO 1: Datos del Vendedor */}
                    {step === 1 && (
                        <div>
                            <h3 className="text-lg font-bold text-blue-800 mb-4 pb-2 border-b border-blue-200">1. Informaci�n del Vendedor</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                                <Field
                                    name="vendedorTipoDocumento"
                                    as="select"
                                    options={DOCUMENT_OPTIONS}
                                />
                                <Field name={VENDEDOR_DOC} placeholder="Ej: 1234567890 (8-10 d�gitos seg�n el tipo)" />
                                <Field name="vendedorNombreCompleto" placeholder="Solo letras y espacios." />
                                <Field name="vendedorCorreo" placeholder="correo@dominio.com" type="email" />
                                <Field name="vendedorTelefono" placeholder="Solo n�meros. M�nimo 10 d�gitos." />
                            </div>
                        </div>
                    )}

                    {/* PASO 2: Datos del Comprador */}
                    {step === 2 && (
                        <div>
                            <h3 className="text-lg font-bold text-green-800 mb-4 pb-2 border-b border-green-200">2. Informaci�n del Comprador</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                                <Field
                                    name="compradorTipoDocumento"
                                    as="select"
                                    options={DOCUMENT_OPTIONS}
                                />
                                <Field name={COMPRADOR_DOC} placeholder="Ej: 1234567890 (8-10 d�gitos seg�n el tipo)" />
                                <Field name="compradorNombreCompleto" placeholder="Solo letras y espacios." />
                                <Field name="compradorCorreo" placeholder="correo@dominio.com" type="email" />
                                <Field name="compradorTelefono" placeholder="Solo n�meros. M�nimo 10 d�gitos." />
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
                                            {buyerLookupState.loading && "Buscando comprador???"}
                                            {!buyerLookupState.loading && buyerLookupState.error && buyerLookupState.error}
                                            {!buyerLookupState.loading && !buyerLookupState.error && buyerLookupState.message}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PASO 3: Detalles de la Propiedad */}
                    {step === 3 && (
                        <div>
                            <h3 className="text-lg font-bold text-yellow-800 mb-4 pb-2 border-b border-yellow-200">3. Detalles y Ubicaci�n del Inmueble</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
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
                                <Field name="inmuebleRegistro" placeholder="No. de matr�cula inmobiliaria" />
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
                                <Field name="inmueblePais" placeholder="Pa�s" />
                                <Field name="inmuebleDepartamento" placeholder="Departamento o Estado" />
                                <Field name="inmuebleCiudad" placeholder="Ciudad" />
                                <Field name="inmuebleBarrio" placeholder="Barrio o Zona" />
                                <div className="md:col-span-2">
                                    <Field name="inmuebleDireccion" as="textarea" placeholder="Direcci�n completa, ej: Carrera 10 # 25-50" />
                                </div>

                                <Field name="inmuebleGaraje" type="checkbox" />
                            </div>
                        </div>
                    )}

                    {/* PASO 4: Precio de Venta */}
                                        {step === 4 && (
                        <div>
                            <h3 className="text-lg font-bold text-purple-800 mb-4 pb-2 border-b border-purple-200">4. Precio de Venta</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 mb-6 max-w-xl mx-auto">
                                <Field name="fechaVenta" type="date" />
                                <Field
                                    name="medioPago"
                                    as="select"
                                    options={PAYMENT_OPTIONS}
                                />
                                <Field name="inmueblePrecio" placeholder="Ej: 150000000 (Solo n?meros enteros mayores a 0)." />
                                {(valuesRef.current.medioPago || "").toLowerCase() === "mixto" && (
                                    <div className="md:col-span-2">
                                        <Field
                                            name="medioPagoDescripcion"
                                            as="textarea"
                                            placeholder="Describe c?mo se distribuye el pago mixto (ej: 50% cr?dito, 50% transferencia)."
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-blue-50 border border-blue-300 rounded-xl shadow-inner text-gray-800 max-w-xl mx-auto">
                                <h4 className="text-base font-extrabold mb-2 text-blue-800 border-b border-blue-200 pb-1">Resumen de la Propiedad</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <p className="font-medium text-gray-700">Tipo/Nombre:</p>
                                        <p className="text-right font-medium text-gray-900">{valuesRef.current.inmuebleTipo || "N/A"} - {valuesRef.current.inmuebleNombre || "N/A"}</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="font-medium text-gray-700">Ubicaci?n:</p>
                                        <p className="text-right font-medium text-gray-900">{valuesRef.current.inmuebleCiudad || "N/A"}</p>
                                    </div>
                                    <div className="border-t border-blue-400 pt-2 flex justify-between items-center font-extrabold text-lg mt-2">
                                        <span className="text-gray-900">PRECIO FINAL:</span>
                                        <span className="text-blue-700">$ {formattedPrice}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}        )}

                    <div className="pt-4 border-t mt-6 flex justify-between">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="px-5 py-2 text-sm bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300 transition duration-150"
                            >
                                Atr�s
                            </button>
                        )}
                        {step === 1 && <div />}

                        {step < totalSteps && (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="px-6 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-400/50 hover:bg-blue-700 transition duration-150 transform hover:scale-[1.02]"
                            >
                                Siguiente
                            </button>
                        )}

                        {step === totalSteps && (
                            <button
                                type="submit"
                                className="px-6 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-400/50 hover:bg-blue-700 transition duration-150 transform hover:scale-[1.02]"
                            >
                                Registrar Venta
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}










