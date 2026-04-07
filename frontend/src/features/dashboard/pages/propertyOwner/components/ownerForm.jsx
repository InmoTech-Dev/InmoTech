import React, { useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { WizardModalLayout } from '../../Inmuebles/components/common/wizardModalLayout';
import { AgregarInmuebleModal } from '../../Inmuebles/components/inmuebles/AgregarInmuebleModal';

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'CC' },
  { value: 'CE', label: 'CE' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'TI', label: 'TI' }
];

const INITIAL_FORM = {
  tipoDocumento: 'CC',
  numeroDocumento: '',
  primerNombre: '',
  segundoNombre: '',
  primerApellido: '',
  segundoApellido: '',
  email: '',
  telefono: ''
};

const STEPS = ['Datos y asignacion', 'Confirmacion'];

const SectionCard = ({ title, subtitle, children }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_16px_35px_rgba(15,23,42,0.04)] space-y-3">
    {(title || subtitle) && (
      <div>
        {subtitle && (
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-blue-500">{subtitle}</p>
        )}
        {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
      </div>
    )}
    {children}
  </div>
);

const normalizeInmuebleForSelection = (inmueble = {}) => ({
  id: inmueble.id,
  titulo: inmueble.titulo || inmueble.direccion,
  direccion: inmueble.direccion,
  ciudad: inmueble.ciudad,
  tipo: inmueble.tipo || inmueble.categoria,
  estado: inmueble.estado,
  operacion: inmueble.operacion
});

const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const normalizeDocumentType = (value = '') => String(value).trim().toUpperCase();

const cleanDocumentByType = (tipoDocumento, value = '') => {
  const rawValue = String(value || '');
  const normalizedType = normalizeDocumentType(tipoDocumento);

  if (normalizedType === 'PASAPORTE') {
    return rawValue.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  return rawValue.replace(/[^\d]/g, '');
};

const validateNumeroDocumentoByType = (numeroDocumento, tipoDocumento) => {
  if (!numeroDocumento.trim()) return 'El numero de documento es obligatorio';

  const normalizedType = normalizeDocumentType(tipoDocumento);
  const numeroLimpio = cleanDocumentByType(normalizedType, numeroDocumento);

  switch (normalizedType) {
    case 'CC':
      if (!/^[0-9]{8,10}$/.test(numeroLimpio)) return 'La cedula debe tener entre 8 y 10 digitos';
      break;
    case 'CE':
      if (!/^[0-9]{6,10}$/.test(numeroLimpio)) return 'La cedula de extranjeria debe tener entre 6 y 10 digitos';
      break;
    case 'NIT':
      if (!/^[0-9]{8,10}$/.test(numeroLimpio)) return 'El NIT debe tener entre 8 y 10 digitos';
      break;
    case 'PASAPORTE':
      if (numeroLimpio.length < 6 || numeroLimpio.length > 20) return 'El pasaporte debe tener entre 6 y 20 caracteres';
      if (!/^[A-Z0-9]+$/.test(numeroLimpio)) return 'El pasaporte solo puede contener letras y numeros';
      break;
    case 'TI':
      if (!/^[0-9]{10,11}$/.test(numeroLimpio)) return 'La tarjeta de identidad debe tener 10 u 11 digitos';
      break;
    default:
      return 'Tipo de documento no valido';
  }

  return '';
};

const OwnerSummary = ({ owner, inmuebles }) => {
  const nombres = owner.nombres || [owner.primerNombre, owner.segundoNombre].filter(Boolean).join(' ');
  const apellidos = owner.apellidos || [owner.primerApellido, owner.segundoApellido].filter(Boolean).join(' ');

  const fullName = [nombres, apellidos].filter(Boolean).join(' ').trim();
  const documentText = [owner.tipoDocumento, owner.numeroDocumento].filter(Boolean).join(' ').trim();

  const fields = [
    { label: 'Nombre completo', value: fullName },
    { label: 'Documento', value: documentText },
    { label: 'Correo', value: owner.email },
    { label: 'Telefono', value: owner.telefono },
    { label: 'Inmuebles asignados', value: String(inmuebles.length) }
  ].filter((field) => hasValue(field.value));

  return (
    <div className="grid gap-3 md:grid-cols-2 text-xs text-slate-600">
      {fields.map((field) => (
        <div key={field.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-[10px] text-slate-400 mb-0.5">{field.label}</p>
          <p className="font-semibold text-slate-800">{field.value}</p>
        </div>
      ))}
    </div>
  );
};

const OwnerView = ({ owner, inmuebles }) => (
  <div className="space-y-4">
    <SectionCard title="Informacion general" subtitle="Resumen">
      <OwnerSummary owner={owner} inmuebles={inmuebles} />
    </SectionCard>
    <SectionCard title="Inmuebles asociados" subtitle="Detalle">
      {inmuebles.length === 0 && <p className="text-xs text-slate-500">No hay inmuebles asociados.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {inmuebles.map((inmueble) => (
          <div
            key={inmueble.id_inmueble || inmueble.id}
            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <p className="font-semibold text-slate-900">
                {inmueble.titulo || inmueble.registro_inmobiliario || inmueble.direccion || 'Sin titulo'}
              </p>
            </div>
            {hasValue(inmueble.direccion) && <p className="text-[11px] text-slate-600">{inmueble.direccion}</p>}
            {hasValue([inmueble.ciudad, inmueble.departamento, inmueble.pais].filter(Boolean).join(' - ')) && (
              <p className="text-[11px] text-slate-600">
                {[inmueble.ciudad, inmueble.departamento, inmueble.pais].filter(Boolean).join(' - ')}
              </p>
            )}
            {hasValue(inmueble.operacion) && <p className="text-[11px] text-slate-500 mt-1">Operacion: {inmueble.operacion}</p>}
            {(inmueble.precio_venta || inmueble.precio_arriendo) && (
              <p className="text-[11px] text-slate-500">
                {inmueble.precio_venta ? `Precio venta: ${inmueble.precio_venta}` : ''}
                {inmueble.precio_venta && inmueble.precio_arriendo ? ' - ' : ''}
                {inmueble.precio_arriendo ? `Canon: ${inmueble.precio_arriendo}` : ''}
              </p>
            )}
            {hasValue(inmueble.estado) && <p className="text-[10px] text-slate-400 mt-1">Estado: {inmueble.estado}</p>}
          </div>
        ))}
      </div>
    </SectionCard>
  </div>
);

const OwnerForm = ({
  isOpen,
  mode,
  selectedOwner,
  availableInmuebles = [],
  onClose,
  onSubmit,
  onCreateInmueble = null,
  isSubmitting = false
}) => {
  const documentoBase = useMemo(() => {
    if (!selectedOwner?.documento) return '';
    const parts = selectedOwner.documento.split(' ');
    return parts[parts.length - 1] || '';
  }, [selectedOwner]);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [selectedInmuebles, setSelectedInmuebles] = useState([]);
  const [errors, setErrors] = useState({});
  const [formAlert, setFormAlert] = useState({ type: '', message: '' });
  const [activeStep, setActiveStep] = useState(0);
  const [isPropertyModalOpen, setPropertyModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormData(INITIAL_FORM);
      setSelectedInmuebles([]);
      setErrors({});
      setFormAlert({ type: '', message: '' });
      setActiveStep(0);
      return;
    }

    if ((mode === 'edit' || mode === 'view') && selectedOwner) {
      const cleanDoc = documentoBase || selectedOwner.documento?.split(' ')?.pop() || '';
      const [primerNombre = '', segundoNombre = ''] = (selectedOwner.nombres || selectedOwner.nombreCompleto || '').split(' ');
      const [primerApellido = '', segundoApellido = ''] = (selectedOwner.apellidos || '').split(' ');

      setFormData({
        tipoDocumento: selectedOwner.tipoDocumento || selectedOwner?.documento?.split(' ')?.[0] || 'CC',
        numeroDocumento: cleanDoc,
        primerNombre,
        segundoNombre,
        primerApellido,
        segundoApellido,
        email: selectedOwner.email || '',
        telefono: selectedOwner.telefono || ''
      });

      if (selectedOwner.inmuebles && selectedOwner.inmuebles.length) {
        setSelectedInmuebles(selectedOwner.inmuebles);
      } else {
        const ownerId = String(selectedOwner.id || selectedOwner.id_persona || selectedOwner.idPersona || '');
        const derivados = availableInmuebles.filter((inmueble) => {
          if (!Array.isArray(inmueble.ownerIds)) return false;
          return inmueble.ownerIds.map((v) => String(v)).includes(ownerId);
        });
        setSelectedInmuebles(derivados);
      }
      setActiveStep(0);
    } else {
      setFormData(INITIAL_FORM);
      setSelectedInmuebles([]);
      setActiveStep(0);
    }
  }, [isOpen, mode, selectedOwner, documentoBase, availableInmuebles]);

  const handleOpenPropertyModal = () => {
    if (mode === 'view') return;
    setPropertyModalOpen(true);
  };

  const handleClosePropertyModal = () => {
    setPropertyModalOpen(false);
  };

  const handlePropertyModalSave = async (payload) => {
    if (!onCreateInmueble) return;
    try {
      const nuevoInmueble = await onCreateInmueble(payload);
      if (nuevoInmueble) {
        if (mode === 'edit') {
          const normalized = normalizeInmuebleForSelection(nuevoInmueble);
          setSelectedInmuebles((prev) => (prev.some((item) => item.id === normalized.id) ? prev : [...prev, normalized]));
        }
        setFormAlert({
          type: 'success',
          message:
            mode === 'edit'
              ? 'Inmueble creado y asignado automaticamente al propietario.'
              : 'Inmueble creado correctamente.'
        });
      }
    } catch (error) {
      setFormAlert({ type: 'error', message: error.message || 'No se pudo crear el inmueble' });
      throw error;
    }
  };

  const validators = {
    tipoDocumento: (value) => (!value ? 'Selecciona un tipo de documento' : ''),
    numeroDocumento: (value) => validateNumeroDocumentoByType(value, formData.tipoDocumento),
    primerNombre: (value) => {
      const v = value.trim();
      if (!v) return 'El primer nombre es obligatorio';
      if (v.length < 2) return 'Debe contener al menos 2 caracteres';
      return '';
    },
    primerApellido: (value) => {
      const v = value.trim();
      if (!v) return 'El primer apellido es obligatorio';
      if (v.length < 2) return 'Debe contener al menos 2 caracteres';
      return '';
    },
    email: (value) => {
      const v = value.trim();
      if (!v) return 'El correo es obligatorio';
      if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(v)) return 'Ingresa un correo valido';
      return '';
    },
    telefono: (value) => {
      const clean = value.replace(/[^\d]/g, '');
      if (!clean) return 'El telefono es obligatorio';
      if (!/^3\d{9}$/.test(clean)) return 'Ingresa un celular colombiano (3XXXXXXXXX)';
      return '';
    }
  };

  const STEP_FIELDS = [['tipoDocumento', 'numeroDocumento', 'primerNombre', 'primerApellido', 'email', 'telefono'], []];

  const validateField = (name, value) => (validators[name] ? validators[name](value) : '');

  const validateStep = (step) => {
    const fields = STEP_FIELDS[step] || [];
    if (fields.length === 0) return true;

    const newErrors = {};
    fields.forEach((field) => {
      newErrors[field] = validators[field](formData[field]);
    });

    setErrors((prev) => ({ ...prev, ...newErrors }));
    const hasErrors = Object.values(newErrors).some((msg) => msg);
    setFormAlert(hasErrors ? { type: 'error', message: 'Revisa la informacion resaltada antes de continuar.' } : { type: '', message: '' });
    return !hasErrors;
  };

  const validateForm = () => {
    const fieldErrors = {};
    Object.keys(validators).forEach((field) => {
      fieldErrors[field] = validators[field](formData[field]);
    });
    setErrors(fieldErrors);

    const hasErrors = Object.values(fieldErrors).some((msg) => msg);
    setFormAlert(
      hasErrors
        ? { type: 'error', message: 'Revisa la informacion resaltada antes de continuar.' }
        : { type: 'success', message: 'Todo listo para guardar.' }
    );
    return !hasErrors;
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    const nextForm = { ...formData };

    if (name === 'tipoDocumento') {
      nextForm.tipoDocumento = value;
      nextForm.numeroDocumento = cleanDocumentByType(value, formData.numeroDocumento);
    } else if (name === 'numeroDocumento') {
      nextForm.numeroDocumento = cleanDocumentByType(formData.tipoDocumento, value);
    } else if (name === 'telefono') {
      nextForm.telefono = value.replace(/[^\d]/g, '');
    } else {
      nextForm[name] = value;
    }

    setFormData(nextForm);

    const nextErrors = { ...errors, [name]: validateField(name, nextForm[name] || '') };
    if (name === 'tipoDocumento' || name === 'numeroDocumento') {
      nextErrors.numeroDocumento = validateField('numeroDocumento', nextForm.numeroDocumento || '');
      nextErrors.tipoDocumento = validateField('tipoDocumento', nextForm.tipoDocumento || '');
    }
    setErrors(nextErrors);
  };

  const handleSubmit = () => {
    if (mode === 'view') return onClose();
    if (!validateForm()) return;

    const payload = {
      tipoDocumento: formData.tipoDocumento,
      numeroDocumento: cleanDocumentByType(formData.tipoDocumento, formData.numeroDocumento),
      nombres: [formData.primerNombre, formData.segundoNombre].filter(Boolean).join(' ').trim(),
      apellidos: [formData.primerApellido, formData.segundoApellido].filter(Boolean).join(' ').trim(),
      email: formData.email.trim(),
      telefono: formData.telefono.trim(),
      estado: selectedOwner?.estado || 'Activo'
    };

    try {
      onSubmit(payload, selectedInmuebles);
    } catch (error) {
      setFormAlert({ type: 'error', message: error.message || 'No se pudo guardar la informacion. Intenta de nuevo.' });
    }
  };

  const handleNext = () => {
    if (!validateStep(activeStep)) return;
    if (activeStep < STEPS.length - 1) {
      setActiveStep((s) => s + 1);
      setFormAlert({ type: '', message: '' });
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((s) => s - 1);
      setFormAlert({ type: '', message: '' });
    }
  };

  const footer =
    mode === 'view' ? (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Cerrar
        </button>
      </div>
    ) : (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <div className="flex gap-2">
          {activeStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Atras
            </button>
          )}
          <button
            type="button"
            onClick={activeStep === STEPS.length - 1 ? handleSubmit : handleNext}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            {activeStep === STEPS.length - 1 ? 'Guardar propietario' : 'Siguiente'}
          </button>
        </div>
      </div>
    );

  const renderStepContent = () => {
    if (mode === 'view') {
      return <OwnerView owner={selectedOwner || formData} inmuebles={selectedInmuebles} />;
    }

    if (activeStep === 0) {
      return (
        <SectionCard title="Datos del propietario" subtitle="Completa la informacion en un paso">
          {formAlert.message && (
            <div
              className={`mb-3 rounded-xl px-3 py-2 text-xs flex items-center gap-2 border ${
                formAlert.type === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {formAlert.message}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-600 flex justify-between">
                Tipo de documento
                {errors.tipoDocumento && <span className="text-[10px] text-red-500">{errors.tipoDocumento}</span>}
              </label>
              <select
                name="tipoDocumento"
                value={formData.tipoDocumento}
                onChange={handleInputChange}
                className={`mt-1 w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 ${
                  errors.tipoDocumento ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600 flex justify-between">
                Numero de documento
                {errors.numeroDocumento && <span className="text-[10px] text-red-500">{errors.numeroDocumento}</span>}
              </label>
              <input
                type="text"
                inputMode={normalizeDocumentType(formData.tipoDocumento) === 'PASAPORTE' ? 'text' : 'numeric'}
                name="numeroDocumento"
                value={formData.numeroDocumento}
                onChange={handleInputChange}
                className={`mt-1 w-full rounded-xl border px-2.5 py-1.5 text-xs uppercase focus:outline-none focus:ring-2 ${
                  errors.numeroDocumento ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {!errors.numeroDocumento && <p className="text-[10px] text-slate-400 mt-0.5">Formato segun tipo de documento.</p>}
            </div>

            <div>
              <label className="text-xs text-slate-600 flex justify-between">
                Primer nombre
                {errors.primerNombre && <span className="text-[10px] text-red-500">{errors.primerNombre}</span>}
              </label>
              <input
                name="primerNombre"
                value={formData.primerNombre}
                onChange={handleInputChange}
                className={`mt-1 w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 ${
                  errors.primerNombre ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">Segundo nombre</label>
              <input
                name="segundoNombre"
                value={formData.segundoNombre}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 flex justify-between">
                Primer apellido
                {errors.primerApellido && <span className="text-[10px] text-red-500">{errors.primerApellido}</span>}
              </label>
              <input
                name="primerApellido"
                value={formData.primerApellido}
                onChange={handleInputChange}
                className={`mt-1 w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 ${
                  errors.primerApellido ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">Segundo apellido</label>
              <input
                name="segundoApellido"
                value={formData.segundoApellido}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 flex justify-between">
                Correo electronico
                {errors.email && <span className="text-[10px] text-red-500">{errors.email}</span>}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`mt-1 w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 ${
                  errors.email ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 flex justify-between">
                Telefono
                {errors.telefono && <span className="text-[10px] text-red-500">{errors.telefono}</span>}
              </label>
              <input
                type="tel"
                inputMode="numeric"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                placeholder="3XXXXXXXXX"
                className={`mt-1 w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 ${
                  errors.telefono ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {!errors.telefono && <p className="text-[10px] text-slate-400 mt-0.5">Numero celular colombiano (3XXXXXXXXX).</p>}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-800">Inmuebles</h4>
              <button
                type="button"
                onClick={handleOpenPropertyModal}
                disabled={!onCreateInmueble}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Building2 className="w-4 h-4" />
                Crear inmueble
              </button>
            </div>
          </div>
        </SectionCard>
      );
    }

    return (
      <SectionCard title="Confirmacion" subtitle="Revisa la informacion antes de guardar">
        {formAlert.message && (
          <div
            className={`mb-3 rounded-xl px-3 py-2 text-xs flex items-center gap-2 border ${
              formAlert.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {formAlert.message}
          </div>
        )}

        <OwnerSummary owner={formData} inmuebles={selectedInmuebles} />

        <div className="mt-4">
          <h4 className="text-xs font-semibold text-slate-800 mb-1.5">Inmuebles asociados</h4>
          {selectedInmuebles.length === 0 && <p className="text-xs text-slate-500">No se han asignado inmuebles.</p>}
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
            {selectedInmuebles.map((inmueble) => (
              <div key={inmueble.id} className="px-3 py-2 text-xs text-slate-700 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <p className="font-semibold text-slate-900">{inmueble.titulo || inmueble.direccion}</p>
                </div>
                <p>{inmueble.ciudad} - {inmueble.tipo}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">Si necesitas cambiar algo, usa el boton "Atras". En esta vista no se puede editar.</p>
        </div>
      </SectionCard>
    );
  };

  const stepsForLayout = mode === 'view' ? [] : STEPS;
  const activeStepForLayout = mode === 'view' ? 0 : activeStep;

  return (
    <>
      <WizardModalLayout
        isOpen={isOpen}
        onClose={onClose}
        title={mode === 'view' ? 'Resumen de Propietario' : mode === 'edit' ? 'Editar Propietario' : 'Nuevo Propietario'}
        subtitle={mode === 'view' ? 'Consulta la informacion registrada' : 'Completa la informacion y confirmala'}
        steps={stepsForLayout}
        activeStep={activeStepForLayout}
        footer={footer}
      >
        {renderStepContent()}
      </WizardModalLayout>

      {mode !== 'view' && onCreateInmueble && (
        <AgregarInmuebleModal
          isOpen={isPropertyModalOpen}
          onClose={handleClosePropertyModal}
          onSave={handlePropertyModalSave}
          inmuebleEditar={null}
        />
      )}
    </>
  );
};

export default OwnerForm;
