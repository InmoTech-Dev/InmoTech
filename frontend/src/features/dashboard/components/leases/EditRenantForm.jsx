ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿import React, { useRef, useState, useCallback, useMemo } from "react";
import { FaTimes } from "react-icons/fa";

const requiredFields = [
    "tipoDocInquilino", "numeroDocInquilino", "primerNombreInquilino",
    "primerApellidoInquilino", "telefonoInquilino", "correoInquilino",
    "tipoDocCodeudor", "numeroDocCodeudor", "primerNombreCodeudor",
    "primerApellidoCodeudor", "telefonoCodeudor", "correoCodeudor",
    "actividadEconomicaCodeudor",
    "tipoInmueble", "registroInmobiliario", "nombreInmueble", "area", 
    "habitaciones", "banos", "departamento", "ciudad", "barrio", 
    "direccion", "precioInmueble",
    "fechaInicio", "fechaFinal", "fechaCobro", "precio", "estado",
];

const defaultInitial = {
    tipoDocInquilino: "", numeroDocInquilino: "", primerNombreInquilino: "", segundoNombreInquilino: "",
    primerApellidoInquilino: "", segundoApellidoInquilino: "", correoInquilino: "", telefonoInquilino: "",

    tipoDocCodeudor: "", numeroDocCodeudor: "", primerNombreCodeudor: "", segundoNombreCodeudor: "",
    primerApellidoCodeudor: "", segundoApellidoCodeudor: "", correoCodeudor: "", telefonoCodeudor: "",
    actividadEconomicaCodeudor: "",

    tipoInmueble: "", registroInmobiliario: "", nombreInmueble: "", area: "\u00c1rea (m\u00b2)", habitaciones: "N\u00famero de habitaciones", banos: "N\u00famero de ba\u00f1os",
    departamento: "", ciudad: "", barrio: "", direccion: "Direcci\u00f3n", precioInmueble: "",

    fechaInicio: "", fechaFinal: "Fecha de finalizaci\u00f3n", fechaCobro: "", precio: "", estado: "",
};

export default function EditRenantForm({ onClose, onSubmit, initialData = {} }) {
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState({});
    const totalSteps = 4;

    const initial = useMemo(() => ({ ...defaultInitial, ...initialData }), [initialData]);

    const valuesRef = useRef({ ...initial });
    const displayValuesRef = useRef({}); 
    const elRefs = useRef({});
    const errorFocusTimeout = useRef(null); 

    const NUMERO_DOC_INQ = "numeroDocInquilino";
    const NUMERO_DOC_COD = "numeroDocCodeudor";

    const strictNumericFields = [
        "area", "habitaciones", "banos", "precioInmueble", "precio"
    ];
    
    const currencyFields = ["precioInmueble", "precio"];

    const stepFields = {
        1: [
            "tipoDocInquilino", NUMERO_DOC_INQ, "primerNombreInquilino", "segundoNombreInquilino",
            "primerApellidoInquilino", "segundoApellidoInquilino", "correoInquilino", "telefonoInquilino",
        ],
        2: [
            "tipoDocCodeudor", NUMERO_DOC_COD, "primerNombreCodeudor", "segundoNombreCodeudor",
            "primerApellidoCodeudor", "segundoApellidoCodeudor", "correoCodeudor", "telefonoCodeudor",
            "actividadEconomicaCodeudor",
        ],
        3: [
            "tipoInmueble", "registroInmobiliario", "nombreInmueble", "area", "habitaciones", "banos",
            "departamento", "ciudad", "barrio", "direccion", "precioInmueble"
        ],
        4: ["fechaInicio", "fechaFinal", "fechaCobro", "precio", "estado"],
    };
    const getLabel = (name) => {
        const labels = {
            tipoDocInquilino: "Tipo de documento", numeroDocInquilino: "N\u00famero de documento", primerNombreInquilino: "Primer nombre",
            segundoNombreInquilino: "Segundo nombre", primerApellidoInquilino: "Primer apellido", segundoApellidoInquilino: "Segundo apellido",
            correoInquilino: "Correo electr\u00f3nico", telefonoInquilino: "Tel\u00e9fono", tipoDocCodeudor: "Tipo de documento del codeudor",
            numeroDocCodeudor: "N\u00famero de documento del codeudor", primerNombreCodeudor: "Primer nombre del codeudor",
            segundoNombreCodeudor: "Segundo nombre del codeudor", primerApellidoCodeudor: "Primer apellido del codeudor",
            segundoApellidoCodeudor: "Segundo apellido del codeudor", correoCodeudor: "Correo electr\u00f3nico del codeudor",
            telefonoCodeudor: "Tel\u00e9fono del codeudor", actividadEconomicaCodeudor: "Actividad econ\u00f3mica", tipoInmueble: "Tipo de inmueble",
            registroInmobiliario: "Registro inmobiliario", nombreInmueble: "Nombre del inmueble", area: "\u00c1rea (m\u00b2)",
            habitaciones: "N\u00famero de habitaciones", banos: "N\u00famero de ba\u00f1os", departamento: "Departamento",
            ciudad: "Ciudad", barrio: "Barrio", direccion: "Direcci\u00f3n", precioInmueble: "Precio del inmueble",
            fechaInicio: "Fecha de inicio", fechaFinal: "Fecha de finalizaci\u00f3n", fechaCobro: "Fecha de cobro",
            precio: "Precio del arriendo", estado: "Estado del arriendo",
        };
        return labels[name] ?? name;
    };

    const getFieldClass = useCallback((fieldName) => {
        const errorClass = errors[fieldName] ? 'border-red-500 ring-2 ring-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
        return `w-full p-3 border rounded-lg focus:outline-none transition duration-150 ${errorClass}`;
    }, [errors]);

    const nameFields = [
        "primerNombreInquilino", "segundoNombreInquilino", "primerApellidoInquilino", "segundoApellidoInquilino",
        "primerNombreCodeudor", "segundoNombreCodeudor", "primerApellidoCodeudor", "segundoApellidoCodeudor",
    ];

    const docFields = [
        NUMERO_DOC_INQ, NUMERO_DOC_COD,
    ];

    const phoneFields = [
        "telefonoInquilino", "telefonoCodeudor",
    ];

    const emailFields = [
        "correoInquilino", "correoCodeudor",
    ];
    
    const formatNumberWithThousandsSeparator = (value) => {
        if (!value) return "";
        const cleanValue = value.toString().replace(/[^0-9]/g, '');
        if (cleanValue === "") return "";
        
        const formatter = new Intl.NumberFormat('es-CO', { 
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        return formatter.format(cleanValue);
    };
    
    useMemo(() => {
        const newDisplayValues = {};
        for (const key in initial) {
            if (currencyFields.includes(key) && initial[key]) {
                newDisplayValues[key] = formatNumberWithThousandsSeparator(initial[key].toString());
            } else {
                newDisplayValues[key] = initial[key];
            }
        }
        displayValuesRef.current = newDisplayValues;
    }, [initial]);

    const setElRef = (name) => (el) => {
        if (!el) return;
        elRefs.current[name] = el;
        
        if (valuesRef.current[name] === undefined || valuesRef.current[name] === null) {
            valuesRef.current[name] = initial[name] ?? defaultInitial[name] ?? "";
        }
        
        const displayValue = displayValuesRef.current[name] ?? initial[name] ?? defaultInitial[name] ?? "";

        if (el.type === "checkbox") {
            el.checked = !!valuesRef.current[name];
        } else {
            if (displayValue !== undefined) {
                try { el.value = displayValue; } catch (err) { }
            }
        }

        // Recalcular estado al montar refs si ya hay fechaCobro en ediciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n
        if (name === "fechaCobro" && valuesRef.current.fechaCobro) {
            const estadoAuto = isOnOrAfterToday(valuesRef.current.fechaCobro) ? "Debe" : "Activo";
            valuesRef.current.estado = estadoAuto;
            displayValuesRef.current.estado = estadoAuto;
            const estadoEl = elRefs.current.estado;
            if (estadoEl) {
                try { estadoEl.value = estadoAuto; } catch (_) {}
            }
        }
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

    const handleInputChange = (e) => {
        let { name, type, value, checked } = e.target;
        let cleanValue = value;

        if (type === "checkbox") {
            valuesRef.current[name] = checked;
        } else {
            if (currencyFields.includes(name)) {
                cleanValue = value.replace(/[^0-9]/g, '');
                const formattedValue = formatNumberWithThousandsSeparator(cleanValue);
                
                displayValuesRef.current[name] = formattedValue;
                e.target.value = formattedValue;
            } else {
                displayValuesRef.current[name] = value;
            }
            
            valuesRef.current[name] = cleanValue;

            if (name === "fechaCobro") {
                const estadoAuto = isOnOrAfterToday(cleanValue) ? "Debe" : "Activo";
                valuesRef.current.estado = estadoAuto;
                displayValuesRef.current.estado = estadoAuto;
                const estadoEl = elRefs.current.estado;
                if (estadoEl) {
                    try { estadoEl.value = estadoAuto; } catch (_) {}
                }
            }
        }

        if (errors[name] && cleanValue.length === 0) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const isValidName = (value) => /^[a-zA-ZÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¹Ãƒâ€¦Ã¢â‚¬Å“\s]*$/.test(value);
    const isValidNumeric = (value) => /^\d*$/.test(value);
    const isValidEmail = (value) => value.includes('@');

    const handleInputBlur = (e) => {
        const { name } = e.target;
        const value = valuesRef.current[name] || ""; 
        
        let errorMessage = null;
        const minLengthDoc = 7;
        const maxLengthDoc = 10;
        const isRequired = requiredFields.includes(name);
        const conflictErrorMsg = "El nÃƒÂºmero de documento del inquilino no puede ser igual al del codeudor.";

        setErrors(prev => {
            const newErrors = { ...prev };

        if (isRequired && !value.toString().trim()) { 
                errorMessage = "Este campo es obligatorio.";
            }

            if (!errorMessage && value.toString().trim()) {
                if (nameFields.includes(name) && !isValidName(value)) {
                    errorMessage = `Solo se permiten n\u00fameros.`;
                } else if (docFields.includes(name)) {
                    if (!isValidNumeric(value)) {
                        errorMessage = `Solo se permiten n\u00fameros.`;
                    } else if (value.length < minLengthDoc) {
                        errorMessage = `Debe tener un m\u00ednimo de ${minLengthDoc} n\u00fameros.`;
                    } else if (value.length > maxLengthDoc) {
                        errorMessage = `Debe tener un m\u00e1ximo de ${maxLengthDoc} n\u00fameros.`;
                    }
                } else if (phoneFields.includes(name) && !isValidNumeric(value)) {
                    errorMessage = `Solo se permiten n\u00fameros.`;
                } else if (emailFields.includes(name) && !isValidEmail(value)) {
                    errorMessage = `El correo electr\u00f3nico debe contener un '@'.`;
                } else if (strictNumericFields.includes(name) && !isValidNumeric(value)) {
                    errorMessage = `Solo se permiten n\u00fameros.`;
                }
            }

            if (!errorMessage && docFields.includes(name)) {
                const otherDocName = name === NUMERO_DOC_INQ ? NUMERO_DOC_COD : NUMERO_DOC_INQ;
                const otherDocValue = valuesRef.current[otherDocName] || "";
                
                if (value.trim() && otherDocValue.trim() && value === otherDocValue) {
                    errorMessage = conflictErrorMsg;
                    if (newErrors[otherDocName] !== conflictErrorMsg) {
                        newErrors[otherDocName] = conflictErrorMsg;
                    }
                } else if (newErrors[otherDocName] === conflictErrorMsg) {
                    delete newErrors[otherDocName];
                }
            }
            
            if (errorMessage) {
                newErrors[name] = errorMessage;
            } else {
                delete newErrors[name];
            }

            return newErrors;
        });
    };
    
    const runValidation = (fieldsToCheck) => {
        let currentErrors = { ...errors };
        let hasError = false;
        const minLengthDoc = 7;
        const maxLengthDoc = 10;
        
        for (const fieldName of fieldsToCheck) {
            const value = valuesRef.current[fieldName] || "";
            let error = null;

            const isRequired = requiredFields.includes(fieldName);
            
        if (isRequired && !value.toString().trim()) { 
                error = "Este campo es obligatorio.";
            } 
            
            if (isRequired && strictNumericFields.includes(fieldName)) {
                if (!value.toString().trim() || parseFloat(value) <= 0 || isNaN(parseFloat(value))) {
                    error = "Este campo es obligatorio";
                }
            }

            if (!error && value.toString().trim()) {
                if (nameFields.includes(fieldName) && !isValidName(value)) {
                    error = `Solo se permiten d\u00edgitos.`;
                } else if (docFields.includes(fieldName)) {
                    if (!isValidNumeric(value)) {
                        error = `Solo se permiten d\u00edgitos.`;
                    } else if (value.length < minLengthDoc) {
                        error = `Debe tener un m\u00ednimo de ${minLengthDoc} d\u00edgitos.`;
                    } else if (value.length > maxLengthDoc) {
                        error = `Debe tener un m\u00e1ximo de ${maxLengthDoc} d\u00edgitos.`;
                    }
                } else if (phoneFields.includes(fieldName) && !isValidNumeric(value)) {
                    error = `Solo se permiten d\u00edgitos.`;
                } else if (emailFields.includes(fieldName) && !isValidEmail(value)) {
                    error = `El correo electr\u00f3nico debe contener un '@'.`;
                } else if (strictNumericFields.includes(fieldName) && !isValidNumeric(value)) { 
                    error = `Solo se permiten d\u00edgitos.`;
                }
            }
            
            if (error) {
                currentErrors[fieldName] = error;
                hasError = true;
                if (!firstErrorField) {
                    firstErrorField = fieldName;
                }
            } else {
                const isConflictError = currentErrors[fieldName] === "El nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero de documento del Inquilino no puede ser igual al del Codeudor.";
                if (!isConflictError) {
                    delete currentErrors[fieldName];
                }
            }
        }
        
        const docInqValue = valuesRef.current[NUMERO_DOC_INQ] || "";
        const docCodValue = valuesRef.current[NUMERO_DOC_COD] || "";
        const conflictErrorMsg = "El nÃƒÂºmero de documento del inquilino no puede ser igual al del codeudor.";

        if (docInqValue.trim() && docCodValue.trim() && docInqValue === docCodValue) {
            
            const fieldNames = [NUMERO_DOC_INQ, NUMERO_DOC_COD];

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
            if (currentErrors[NUMERO_DOC_INQ] === conflictErrorMsg) {
                delete currentErrors[NUMERO_DOC_INQ];
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
                const termError = "La duraci\u00f3n m\u00ednima del contrato debe ser de un mes.";
                currentErrors.fechaFinal = termError;
                hasError = true;
                if (!firstErrorField) firstErrorField = "fechaFinal";
            }
        }

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
        let fieldsToValidate = stepFields[step];
        
        if (step === 1 && valuesRef.current[NUMERO_DOC_COD].toString().trim()) {
            if (!fieldsToValidate.includes(NUMERO_DOC_COD)) fieldsToValidate.push(NUMERO_DOC_COD);
        }
        if (step === 2 && valuesRef.current[NUMERO_DOC_INQ].toString().trim()) {
            if (!fieldsToValidate.includes(NUMERO_DOC_INQ)) fieldsToValidate.push(NUMERO_DOC_INQ);
        }
        
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

    const handleSubmit = (e) => {
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

        const estadoAuto = isOnOrAfterToday(valuesRef.current.fechaCobro) ? "Debe" : "Activo";
        valuesRef.current.estado = estadoAuto;
        const payload = { ...valuesRef.current, estado: estadoAuto };
        if (onSubmit) onSubmit(payload);
        onClose?.();
        console.log("Formulario de edici\u00f3n enviado:", payload);
    };

    const Field = ({ name, as = "input", options = [], placeholder, type = "text" }) => {
        const label = getLabel(name);
        const errorMessage = errors[name];
        const isRequired = requiredFields.includes(name);

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
        
        const initialValue = initial[name] ?? defaultInitial[name];

        if (type === "checkbox") {
            return (
                <label htmlFor={name} className="col-span-3 flex items-center gap-2 text-sm font-semibold text-gray-700 mt-2">
                    <input
                        id={name}
                        name={name}
                        ref={setElRef(name)}
                        type="checkbox"
                        defaultChecked={!!initialValue}
                        onChange={handleInputChange}
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
                        defaultValue={initialValue ?? ""}
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

        const isDocField = docFields.includes(name);

        return (
            <div>
                {LabelContent}
                <input
                    id={name}
                    name={name}
                    ref={setElRef(name)}
                    className={getFieldClass(name)}
                    type={inputType}
                    placeholder={placeholder}
                    minLength={isDocField ? 7 : undefined}
                    maxLength={isDocField ? 10 : undefined}
                    defaultValue={displayValuesRef.current[name] ?? initialValue ?? ""} 
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
        // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¹Ãƒâ€¦Ã¢â‚¬Å“ Fondo del modal con desenfoque - ESTILO ACTUALIZADO
        <div 
            className="fixed inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm z-50 p-3 md:p-6 overflow-y-auto md:overflow-hidden"
            onClick={onClose}
        >
            {/* Contenido principal del modal con estilo consistente */}
            <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-3 md:p-4 relative my-3 max-h-[88vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                
                {/* Header con estilo del banner */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Editar Arriendo</h2>
                    <p className="text-gray-600 text-sm">Actualice la informaciÃƒÂ³n del contrato de arrendamiento</p>
                </div>

                {/* BotÃƒÂ³n cerrar con estilo azul */}
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
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-blue-700 font-bold mt-2 text-center">
                        Paso {step} de {totalSteps}:{" "}
                        <span className="font-semibold text-gray-600">
                            {step === 1 ? "Datos del Inquilino" : step === 2 ? "Datos del Codeudor" : step === 3 ? "Datos del Inmueble" : "Datos del Contrato y Pago"}
                        </span>
                        <span className="text-gray-500 font-normal"> (Campos obligatorios marcados con *)</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1 md:pr-2">
                    <div className="bg-slate-50 rounded-xl p-3 md:p-4 border border-slate-200 space-y-4">
                        
                        {/* PASO 1 */}
                        {step === 1 && (
                            <div>
                                <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                                    Datos del Inquilino
                                </h3>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                                    <Field
                                        name="tipoDocInquilino"
                                        as="select"
                                        options={[
                                            { value: "CC", label: "CÃƒÂ©dula de CiudadanÃƒÂ­a (CC)" },
                                            { value: "CE", label: "CÃƒÂ©dula de ExtranjerÃƒÂ­a (CE)" },
                                            { value: "NIT", label: "NIT" },
                                        ]}
                                    />
                                    <Field name={NUMERO_DOC_INQ} placeholder="Ej: 1234567 a 1234567890" />
                                    <Field name="primerNombreInquilino" placeholder="Solo letras y espacios." />
                                    <Field name="segundoNombreInquilino" placeholder="Solo letras y espacios. (Opcional)" />
                                    <Field name="primerApellidoInquilino" placeholder="Solo letras y espacios." />
                                    <Field name="segundoApellidoInquilino" placeholder="Solo letras y espacios. (Opcional)" />
                                    <Field name="correoInquilino" placeholder="Debe contener un @" type="email" />
                                    <Field name="telefonoInquilino" placeholder="Solo nÃƒÂºmeros. Ej: 3001234567" />
                                </div>
                            </div>
                        )}

                        {/* PASO 2 */}
                        {step === 2 && (
                            <div>
                                <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                                    Datos del Codeudor
                                </h3>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                                    <Field
                                        name="tipoDocCodeudor"
                                        as="select"
                                        options={[
                                            { value: "CC", label: "CÃƒÂ©dula de CiudadanÃƒÂ­a (CC)" },
                                            { value: "CE", label: "CÃƒÂ©dula de ExtranjerÃƒÂ­a (CE)" },
                                            { value: "NIT", label: "NIT" },
                                        ]}
                                    />
                                    <Field name={NUMERO_DOC_COD} placeholder="Ej: 1234567 a 1234567890" />
                                    <Field name="primerNombreCodeudor" placeholder="Solo letras y espacios." />
                                    <Field name="segundoNombreCodeudor" placeholder="Solo letras y espacios. (Opcional)" />
                                    <Field name="primerApellidoCodeudor" placeholder="Solo letras y espacios." />
                                    <Field name="segundoApellidoCodeudor" placeholder="Solo letras y espacios. (Opcional)" />
                                    <Field name="correoCodeudor" placeholder="Debe contener un @" type="email" />
                                    <Field name="telefonoCodeudor" placeholder="Solo nÃƒÂºmeros. Ej: 3009876543" />
                                    <Field
                                        name="actividadEconomicaCodeudor"
                                        as="select"
                                        options={[
                                            { value: "Empleado", label: "Empleado" },
                                            { value: "Independiente", label: "Independiente" },
                                        ]}
                                    />
                                </div>
                            </div>
                        )}

                        {/* PASO 3 */}
                        {step === 3 && (
                            <div>
                                <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                                    Datos del Inmueble
                                </h3>
                                <div className="grid grid-cols-3 gap-x-3 gap-y-2">
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
                                    <Field name="area" placeholder="Ej: 75. Solo nÃƒÂºmeros enteros mayores a 0." />
                                    <Field name="habitaciones" placeholder="Ej: 3. Solo nÃƒÂºmeros enteros mayores a 0." />
                                    <Field name="banos" placeholder="Ej: 2. Solo nÃƒÂºmeros enteros mayores a 0." />
                                    <Field name="departamento" placeholder="Ej: Antioquia" />
                                    <Field name="ciudad" placeholder="Ej: MedellÃƒÂ­n" />
                                    <Field name="barrio" placeholder="Ej: El Poblado" />
                                    <Field name="direccion" placeholder="Ej: Calle 10 # 45-20" />
                                    <Field name="precioInmueble" placeholder="Ej: 1.500.000 (Solo nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmeros enteros mayores a 0)." />
                                </div>
                            </div>
                        )}

                        {/* PASO 4 */}
                        {step === 4 && (
                            <div>
                                <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                                    Datos del Contrato y Pago
                                </h3>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                                    <Field name="fechaInicio" type="date" />
                                    <Field name="fechaFinal" type="date" />
                                    <Field name="fechaCobro" type="date" />
                                    <Field name="precio" placeholder="Ej: 1.500.000 (Solo nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmeros enteros mayores a 0)." />
                                    <Field
                                        name="estado"
                                        as="select"
                                        options={[
                                            { value: "Activo", label: "Activo" },
                                            { value: "Pendiente", label: "Pendiente de inicio" },
                                            { value: "Finalizado", label: "Finalizado" },
                                        ]}
                                    />
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Controles de navegaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n */}
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
                                className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-lg shadow-green-400/50 hover:bg-green-700 transition duration-150 transform hover:scale-[1.02] ml-auto"
                            >
                                Guardar Cambios
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}









