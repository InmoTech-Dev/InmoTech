import React, { useRef, useState, useCallback } from "react";

// Lista de campos que deben ser obligatorios para el registro
const requiredFields = [
    // Vendedor
    "vendedorTipoDocumento", "vendedorDocumento", "vendedorNombreCompleto", "vendedorCorreo", "vendedorTelefono",
    // Comprador
    "compradorTipoDocumento", "compradorDocumento", "compradorNombreCompleto", "compradorCorreo", "compradorTelefono",
    // Inmueble
    "inmuebleTipo", "inmuebleRegistro", "inmuebleNombre", "inmuebleArea", "inmuebleHabitaciones", "inmuebleBanos",
    "inmueblePais", "inmuebleDepartamento", "inmuebleCiudad", "inmuebleDireccion", "inmueblePrecio", "inmuebleEstado",
];

// Nombres de los campos que requieren formato especial (Documento)
const VENDEDOR_DOC = "vendedorDocumento";
const COMPRADOR_DOC = "compradorDocumento";

export default function SalesForm({ onClose, onSubmit }) {
    const [step, setStep] = useState(1);
    // Estado para manejar los errores en línea.
    const [errors, setErrors] = useState({});
    const totalSteps = 4; // Cambiado a 4 pasos para el registro de inmueble

    // Variables iniciales con el modelo de datos proporcionado
    const initial = {
        // Datos del Vendedor
        vendedorTipoDocumento: "CC",
        vendedorDocumento: "",
        vendedorNombreCompleto: "",
        vendedorCorreo: "",
        vendedorTelefono: "",

        // Datos del Comprador
        compradorTipoDocumento: "CC",
        compradorDocumento: "",
        compradorNombreCompleto: "",
        compradorCorreo: "",
        compradorTelefono: "",

        // Detalles del Inmueble
        inmuebleTipo: "",
        inmuebleRegistro: "",
        inmuebleNombre: "",
        inmuebleArea: "",
        inmuebleHabitaciones: "",
        inmuebleBanos: "",
        inmueblePais: "Colombia",
        inmuebleDepartamento: "",
        inmuebleCiudad: "",
        inmuebleBarrio: "",
        inmuebleEstrato: "",
        inmuebleDireccion: "",
        inmueblePrecio: "", // guardamos sólo dígitos (raw)
        inmuebleGaraje: false,
        inmuebleEstado: "Disponible",
    };

    // refs para mantener TODOS los valores sin causar re-renders en cada letra
    const valuesRef = useRef({ ...initial });
    // Ref para mantener los valores formateados visibles en los inputs
    const displayValuesRef = useRef({ ...initial });
    const elRefs = useRef({});
    const errorFocusTimeout = useRef(null); 

    // Lista de campos que deben ser estrictamente numéricos (solo dígitos)
    const strictNumericFields = [
        "inmuebleArea", "inmuebleHabitaciones", "inmuebleBanos", "inmuebleEstrato"
    ];
    
    // Campos que requieren formato de miles (moneda)
    const currencyFields = ["inmueblePrecio"];

    // Campos agrupados por paso para la validación
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
            "inmuebleTipo", "inmuebleRegistro", "inmuebleNombre", "inmuebleArea", 
            "inmuebleHabitaciones", "inmuebleBanos", "inmueblePais", 
            "inmuebleDepartamento", "inmuebleCiudad", "inmuebleBarrio", 
            "inmuebleEstrato", "inmuebleDireccion", "inmuebleGaraje", "inmuebleEstado"
        ],
        4: [
            "inmueblePrecio"
        ]
    };

    const getLabel = (name) => {
        const labels = {
            // Vendedor
            vendedorTipoDocumento: "Tipo Doc. Vendedor", vendedorDocumento: "Número Doc. Vendedor",
            vendedorNombreCompleto: "Nombre Completo Vendedor", vendedorCorreo: "Correo Vendedor",
            vendedorTelefono: "Teléfono Vendedor",

            // Comprador
            compradorTipoDocumento: "Tipo Doc. Comprador", compradorDocumento: "Número Doc. Comprador",
            compradorNombreCompleto: "Nombre Completo Comprador", compradorCorreo: "Correo Comprador",
            compradorTelefono: "Teléfono Comprador",

            // Inmueble
            inmuebleTipo: "Tipo de Inmueble", inmuebleRegistro: "No. Registro Catastral",
            inmuebleNombre: "Nombre/Título Comercial", inmuebleArea: "Área Total",
            inmuebleHabitaciones: "No. Habitaciones", inmuebleBanos: "No. Baños",
            inmueblePais: "País", inmuebleDepartamento: "Departamento/Estado",
            inmuebleCiudad: "Ciudad", inmuebleBarrio: "Barrio/Zona",
            inmuebleEstrato: "Estrato Socioeconómico", inmuebleDireccion: "Dirección Completa",
            inmueblePrecio: "Precio de Venta (COP)", inmuebleGaraje: "¿Tiene Garaje?",
            inmuebleEstado: "Estado del Inmueble",
        };
        return labels[name] ?? name;
    };

    // Función para obtener la clase de estilo (incluyendo el resaltado de error)
    const getFieldClass = useCallback((fieldName) => {
        // Clase base para campos con estilo moderno y responsivo
        const baseClass = "w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-150 shadow-sm text-sm text-gray-700 bg-white";
        
        // Aplica el foco azul y el error rojo
        const errorClass = errors[fieldName] 
            ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';
            
        return `${baseClass} ${errorClass}`;
    }, [errors]);

    // Campos para validaciones de formato
    const nameFields = [
        "vendedorNombreCompleto", "compradorNombreCompleto",
    ];
    const docFields = [ VENDEDOR_DOC, COMPRADOR_DOC ];
    const phoneFields = [ "vendedorTelefono", "compradorTelefono" ];
    const emailFields = [ "vendedorCorreo", "compradorCorreo" ];

    // --- UTILITY: Formatea un número con separadores de miles ---
    const formatNumberWithThousandsSeparator = (value) => {
        if (!value) return "";
        // 1. Limpiar el valor de cualquier separador no numérico
        const cleanValue = value.toString().replace(/[^0-9]/g, '');
        if (cleanValue === "") return "";
        
        // 2. Formatear con separador de miles (usando punto para Colombia - es-CO)
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

        // Sincronizar el valor inicial en el elemento del DOM
        if (el.type === "checkbox") {
            el.checked = !!valuesRef.current[name];
        } else {
            if (displayValuesRef.current[name] !== undefined) {
                try { el.value = displayValuesRef.current[name]; } catch (err) { /* ignore */ }
            }
        }
    };

    const handleInputChange = (e) => {
        let { name, type, value, checked } = e.target;
        let cleanValue = value;

        if (type === "checkbox") {
            valuesRef.current[name] = checked;
        } else {
            // Manejo de campos de moneda (ej: inmueblePrecio)
            if (currencyFields.includes(name)) {
                cleanValue = value.replace(/[^0-9]/g, ''); // Solo dígitos
                const formattedValue = formatNumberWithThousandsSeparator(cleanValue);
                
                displayValuesRef.current[name] = formattedValue;
                e.target.value = formattedValue; // Forzar la actualización visual
            } else {
                displayValuesRef.current[name] = value;
            }
            
            // Guardar siempre el valor LIMPIO (solo dígitos si es numérico con formato) o el valor original
            valuesRef.current[name] = cleanValue;
        }

        // Limpieza de error en vivo
        if (errors[name] && cleanValue.length > 0) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    // --- FUNCIONES DE VALIDACIÓN DE FORMATO ---
    const isValidName = (value) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(value);
    const isValidNumeric = (value) => /^\d*$/.test(value); // Solo dígitos (0-9)
    const isValidEmail = (value) => value.includes('@') && /\S+@\S+\.\S+/.test(value);

    // Handler para verificar obligatoriedad, longitud y formato al salir del campo
    const handleInputBlur = (e) => {
        const { name } = e.target;
        // Tomamos el valor limpio de la ref
        const value = valuesRef.current[name] || ""; 
        
        let errorMessage = null;
        const minLengthDoc = 8;
        const isRequired = requiredFields.includes(name);

        setErrors(prev => {
            const newErrors = { ...prev };

            // 1. Validar OBLIGATORIO
            if (isRequired && !value.toString().trim()) { 
                errorMessage = "Este campo es obligatorio.";
            }

            // 2. Validar formato y longitud (solo si no hay un error de obligatoriedad y el campo tiene valor)
            if (!errorMessage && value.toString().trim()) {
                if (nameFields.includes(name) && !isValidName(value)) {
                    errorMessage = `Solo se permiten letras, espacios y acentos.`;
                } else if (docFields.includes(name)) {
                    if (!isValidNumeric(value)) {
                        errorMessage = `Solo se permiten dígitos.`;
                    } else if (value.length < minLengthDoc) {
                        errorMessage = `Debe tener un mínimo de ${minLengthDoc} dígitos.`;
                    }
                } else if (phoneFields.includes(name) && !isValidNumeric(value)) {
                    errorMessage = `Solo se permiten dígitos.`;
                } else if (emailFields.includes(name) && !isValidEmail(value)) {
                    errorMessage = `El correo electrónico debe contener un '@' y ser válido.`;
                } else if (strictNumericFields.includes(name) && !isValidNumeric(value)) { 
                    errorMessage = `Solo se permiten números enteros.`;
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
    };
    
    // --- LÓGICA DE VALIDACIÓN CENTRAL ---
    const runValidation = (fieldsToCheck) => {
        let currentErrors = { ...errors };
        let hasError = false;
        let firstErrorField = null;
        const minLengthDoc = 8;
        
        for (const fieldName of fieldsToCheck) {
            const value = valuesRef.current[fieldName] || "";
            let error = null;

            const isRequired = requiredFields.includes(fieldName);
            
            // A. Validación de Obligatoriedad
            if (isRequired && !value.toString().trim()) { 
                error = "Este campo es obligatorio.";
            } 
            
            // B. Validación de Obligatoriedad y > 0 para números estrictos/moneda
            if (isRequired && (strictNumericFields.includes(fieldName) || currencyFields.includes(fieldName))) {
                 if (!value.toString().trim() || parseFloat(value) <= 0 || isNaN(parseFloat(value))) {
                     error = "Este campo es obligatorio y debe ser un número mayor a 0.";
                 }
            }

            // C. Validación de Formato (usa el valor limpio)
            if (!error && value.toString().trim()) {
                if (nameFields.includes(fieldName) && !isValidName(value)) {
                    error = `Solo se permiten letras, espacios y acentos.`;
                } else if (docFields.includes(fieldName)) {
                    if (!isValidNumeric(value)) {
                        error = `Solo se permiten dígitos.`;
                    } else if (value.length < minLengthDoc) {
                        error = `Debe tener un mínimo de ${minLengthDoc} dígitos.`;
                    }
                } else if (phoneFields.includes(fieldName) && !isValidNumeric(value)) {
                    error = `Solo se permiten dígitos.`;
                } else if (emailFields.includes(fieldName) && !isValidEmail(value)) {
                    error = `Debe contener un '@' y ser válido.`;
                } else if (strictNumericFields.includes(fieldName) && !isValidNumeric(value)) { 
                    error = `Solo se permiten números enteros.`;
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
                delete currentErrors[fieldName];
            }
        }
        
        // Re-evaluar firstErrorField
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
        const fieldsToValidate = stepFields[step];
        
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

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // En el envío final, validamos TODOS los campos
        const allFieldsToValidate = requiredFields; // Solo validamos los obligatorios al final
        const { currentErrors, hasError, firstErrorField } = runValidation(allFieldsToValidate);

        setErrors(currentErrors);

        if (hasError) {
            // Determinar a qué paso debe volver para mostrar el error
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

        // Si no hay errores, se procede con el envío
        const payload = { ...valuesRef.current };
        if (onSubmit) onSubmit(payload);
        onClose?.();
        console.log("Formulario de Inmueble Enviado:", payload);
    };

    // Field: componente auxiliar reutilizando el estilo
    const Field = ({ name, as = "input", options = [], placeholder, type = "text" }) => {
        const label = getLabel(name);
        const errorMessage = errors[name];
        const isRequired = requiredFields.includes(name);

        const isDocField = docFields.includes(name);
        const isPhoneField = phoneFields.includes(name);
        const isEmailField = emailFields.includes(name);
        const isStrictNumeric = strictNumericFields.includes(name) || currencyFields.includes(name);
        const isNameField = nameFields.includes(name);

        const needsBlurValidation = isDocField || isNameField || isPhoneField || isEmailField || isRequired || isStrictNumeric;
        const onBlurHandler = needsBlurValidation ? handleInputBlur : undefined;
        
        // Establecer el tipo de input para sugerir teclado numérico
        let inputType = type;
        if ((isDocField || isPhoneField || isStrictNumeric) && type !== 'date' && type !== 'email' && type !== 'checkbox') {
            inputType = "tel";
        } else if (isEmailField) {
            inputType = "email";
        }

        // Caso especial para checkbox (ej: Garaje)
        if (type === "checkbox") {
            return (
                <div className="flex items-center space-x-3 h-10">
                    <input
                        id={name}
                        name={name}
                        ref={setElRef(name)}
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 shadow-sm transition duration-150"
                        onChange={handleInputChange}
                        onBlur={onBlurHandler}
                    />
                    <label htmlFor={name} className="text-sm font-semibold text-gray-700 cursor-pointer">
                        {label}
                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {errorMessage && (
                        <p className="text-red-500 text-xs mt-1 font-medium absolute top-full left-0 right-0">{errorMessage}</p>
                    )}
                </div>
            );
        }

        const LabelContent = (
            <label htmlFor={name} className="block text-xs font-semibold text-gray-700 mb-1">
                {label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
        );

        if (as === "select") {
            return (
                <div className="flex flex-col">
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
                        <p className="text-red-500 text-xs mt-1 font-medium">{errorMessage}</p>
                    )}
                </div>
            );
        }
        
        if (as === "textarea") {
            return (
                <div className="col-span-1 sm:col-span-2 flex flex-col">
                    {LabelContent}
                    <textarea
                        id={name}
                        name={name}
                        ref={setElRef(name)}
                        className={`${getFieldClass(name)} h-20 resize-none`}
                        placeholder={placeholder}
                        defaultValue={(displayValuesRef.current[name] || initial[name]) ?? ""} 
                        onChange={handleInputChange}
                        onBlur={onBlurHandler}
                    />
                    {errorMessage && (
                        <p className="text-red-500 text-xs mt-1 font-medium">{errorMessage}</p>
                    )}
                </div>
            );
        }

        return (
            <div className="flex flex-col">
                {LabelContent}
                <input
                    id={name}
                    name={name}
                    ref={setElRef(name)}
                    className={getFieldClass(name)} 
                    type={inputType}
                    placeholder={placeholder}
                    defaultValue={(displayValuesRef.current[name] || initial[name]) ?? ""} 
                    onChange={handleInputChange}
                    onBlur={onBlurHandler} 
                />
                {errorMessage && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{errorMessage}</p>
                )}
            </div>
        );
    };

    // Formato simple para el precio final (sin cálculos complejos)
    const formattedPrice = formatNumberWithThousandsSeparator(valuesRef.current.inmueblePrecio || 0);

    return (
        // 🔑 Fondo del modal con desenfoque - CAMBIO PRINCIPAL
        <div 
            className="fixed inset-0 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm z-50 p-4 overflow-y-auto"
            onClick={onClose}
        >
            {/* Contenedor del formulario: Diseño de tarjeta moderna */}
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 relative my-8 transform transition-all duration-300 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                
                {/* Botón de cierre */}
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-blue-600 p-1 rounded-full transition duration-150">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>

                {/* Título principal con estilo del banner */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Nueva venta</h2>
                    <p className="text-gray-600 text-sm">Complete la información requerida para registrar una nueva venta</p>
                </div>

                {/* Barra de progreso */}
                <div className="mb-6">
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500 ease-in-out shadow-lg shadow-blue-400/50"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>
                    {/* Texto de paso más pequeño y compacto */}
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
                            {/* Subtítulo con estilo consistente */}
                            <h3 className="text-lg font-bold text-blue-800 mb-4 pb-2 border-b border-blue-200">1. Información del Vendedor</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                                <Field
                                    name="vendedorTipoDocumento"
                                    as="select"
                                    options={[
                                        { value: "CC", label: "Cédula de Ciudadanía (CC)" },
                                        { value: "CE", label: "Cédula de Extranjería (CE)" },
                                        { value: "NIT", label: "NIT" },
                                    ]}
                                />
                                <Field name={VENDEDOR_DOC} placeholder="Mínimo 8 dígitos (Solo números)" />
                                <Field name="vendedorNombreCompleto" placeholder="Nombre completo" />
                                <Field name="vendedorCorreo" placeholder="correo@dominio.com" type="email" />
                                <Field name="vendedorTelefono" placeholder="Ej: 3001234567" />
                            </div>
                        </div>
                    )}

                    {/* PASO 2: Datos del Comprador */}
                    {step === 2 && (
                        <div>
                            {/* Subtítulo con estilo consistente */}
                            <h3 className="text-lg font-bold text-green-800 mb-4 pb-2 border-b border-green-200">2. Información del Comprador</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                                <Field
                                    name="compradorTipoDocumento"
                                    as="select"
                                    options={[
                                        { value: "CC", label: "Cédula de Ciudadanía (CC)" },
                                        { value: "CE", label: "Cédula de Extranjería (CE)" },
                                        { value: "NIT", label: "NIT" },
                                    ]}
                                />
                                <Field name={COMPRADOR_DOC} placeholder="Mínimo 8 dígitos (Solo números)" />
                                <Field name="compradorNombreCompleto" placeholder="Nombre completo" />
                                <Field name="compradorCorreo" placeholder="correo@dominio.com" type="email" />
                                <Field name="compradorTelefono" placeholder="Ej: 3001234567" />
                            </div>
                        </div>
                    )}

                    {/* PASO 3: Detalles de la Propiedad */}
                    {step === 3 && (
                        <div>
                            {/* Subtítulo con estilo consistente */}
                            <h3 className="text-lg font-bold text-yellow-800 mb-4 pb-2 border-b border-yellow-200">3. Detalles y Ubicación del Inmueble</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                                {/* Propiedad */}
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
                                <div className="md:col-span-2">
                                    <Field name="inmuebleNombre" placeholder="Ej: Apartamento 501, Edificio La Torre" />
                                </div>
                                <Field name="inmuebleArea" placeholder="Área en metros cuadrados (Solo números)" />
                                <Field name="inmuebleHabitaciones" placeholder="Cantidad de habitaciones" />
                                <Field name="inmuebleBanos" placeholder="Cantidad de baños" />
                                <Field name="inmuebleEstrato" placeholder="Estrato (1 a 6)" />
                                
                                {/* Ubicación */}
                                <Field name="inmueblePais" placeholder="País" />
                                <Field name="inmuebleDepartamento" placeholder="Departamento o Estado" />
                                <Field name="inmuebleCiudad" placeholder="Ciudad" />
                                <Field name="inmuebleBarrio" placeholder="Barrio o Zona" />
                                <div className="md:col-span-2">
                                    <Field name="inmuebleDireccion" as="textarea" placeholder="Dirección completa, ej: Carrera 10 # 25-50" />
                                </div>

                                {/* Adicionales y Estado */}
                                <Field name="inmuebleGaraje" type="checkbox" />
                                <Field
                                    name="inmuebleEstado"
                                    as="select"
                                    options={[
                                        { value: "Disponible", label: "Disponible para Venta" },
                                        { value: "En Negociacion", label: "En Negociación" },
                                        { value: "Vendido", label: "Vendido/Transferido" },
                                    ]}
                                />
                            </div>
                        </div>
                    )}

                    {/* PASO 4: Precio de Venta */}
                    {step === 4 && (
                        <div>
                            {/* Subtítulo con estilo consistente */}
                            <h3 className="text-lg font-bold text-purple-800 mb-4 pb-2 border-b border-purple-200">4. Precio de Venta</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 mb-6 max-w-xl mx-auto">
                                <Field name="inmueblePrecio" placeholder="Precio total (Ej: 150.000.000)" />
                            </div>

                            {/* Resumen del Precio */}
                            <div className="p-4 bg-blue-50 border border-blue-300 rounded-xl shadow-inner text-gray-800 max-w-xl mx-auto">
                                <h4 className="text-base font-extrabold mb-2 text-blue-800 border-b border-blue-200 pb-1">Resumen de la Propiedad</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <p className="font-medium text-gray-700">Tipo/Nombre:</p>
                                        <p className="text-right font-medium text-gray-900">{valuesRef.current.inmuebleTipo || "N/A"} - {valuesRef.current.inmuebleNombre || "N/A"}</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="font-medium text-gray-700">Ubicación:</p>
                                        <p className="text-right font-medium text-gray-900">{valuesRef.current.inmuebleCiudad || "N/A"}</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="font-medium text-gray-700">Garaje:</p>
                                        <p className="text-right font-medium text-gray-900">{valuesRef.current.inmuebleGaraje ? "Sí" : "No"}</p>
                                    </div>
                                    <div className="border-t border-blue-400 pt-2 flex justify-between items-center font-extrabold text-lg mt-2">
                                        <span className="text-gray-900">PRECIO FINAL:</span>
                                        <span className="text-blue-700">$ {formattedPrice}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Botones de Navegación (Pie del formulario) */}
                    <div className="pt-4 border-t mt-6 flex justify-between">
                        {/* Botón Atrás: Siempre a la izquierda y solo si no es el primer paso */}
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="px-5 py-2 text-sm bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300 transition duration-150"
                            >
                                Atrás
                            </button>
                        )}
                        {/* Espaciador (solo aparece si el botón Atrás no está) */}
                        {step === 1 && <div />}
                        
                        {/* Botón Siguiente: Primario, color azul, solo si no es el último paso */}
                        {step < totalSteps && (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="px-6 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-400/50 hover:bg-blue-700 transition duration-150 transform hover:scale-[1.02]"
                            >
                                Siguiente
                            </button>
                        )}
                        
                        {/* Botón Final: Principal, color azul, solo en el último paso */}
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