import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { WizardModalLayout } from '../../Inmuebles/components/common/wizardModalLayout';
import { AgregarInmuebleModal } from '../../Inmuebles/components/inmuebles/AgregarInmuebleModal';

const DOCUMENT_TYPES = ['CC', 'CE', 'NIT', 'Pasaporte', 'TI'];

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
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-blue-500">
            {subtitle}
          </p>
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

const OwnerSummary = ({ owner, inmuebles }) => {
  const nombres =
    owner.nombres ||
    [owner.primerNombre, owner.segundoNombre].filter(Boolean).join(' ');
  const apellidos =
    owner.apellidos ||
    [owner.primerApellido, owner.segundoApellido].filter(Boolean).join(' ');

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
      {inmuebles.length === 0 && (
        <p className="text-xs text-slate-500">No hay inmuebles asociados.</p>
      )}
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
            {hasValue(inmueble.direccion) && (
              <p className="text-[11px] text-slate-600">{inmueble.direccion}</p>
            )}
            {hasValue([inmueble.ciudad, inmueble.departamento, inmueble.pais].filter(Boolean).join(' - ')) && (
              <p className="text-[11px] text-slate-600">
                {[inmueble.ciudad, inmueble.departamento, inmueble.pais].filter(Boolean).join(' - ')}
              </p>
            )}
            {hasValue(inmueble.operacion) && (
              <p className="text-[11px] text-slate-500 mt-1">Operacion: {inmueble.operacion}</p>
            )}
            {(inmueble.precio_venta || inmueble.precio_arriendo) && (
              <p className="text-[11px] text-slate-500">
                {inmueble.precio_venta ? `Precio venta: ${inmueble.precio_venta}` : ''}
                {inmueble.precio_venta && inmueble.precio_arriendo ? ' - ' : ''}
                {inmueble.precio_arriendo ? `Canon: ${inmueble.precio_arriendo}` : ''}
              </p>
            )}
            {hasValue(inmueble.estado) && (
              <p className="text-[10px] text-slate-400 mt-1">Estado: {inmueble.estado}</p>
            )}
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
      const cleanDoc =
        documentoBase || selectedOwner.documento?.split(' ')?.pop() || '';
      const [primerNombre = '', segundoNombre = ''] =
        (selectedOwner.nombres || selectedOwner.nombreCompleto || '').split(
          ' '
        );
      const [primerApellido = '', segundoApellido = ''] = (
        selectedOwner.apellidos || ''
      ).split(' ');

      setFormData({
        tipoDocumento:
          selectedOwner.tipoDocumento ||
          selectedOwner?.documento?.split(' ')?.[0] ||
          'CC',
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
        const ownerId = String(
          selectedOwner.id || selectedOwner.id_persona || selectedOwner.idPersona || ''
        );
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

  const toggleInmuebleSelection = (inmueble) => {
    setSelectedInmuebles((prev) => {
      const exists = prev.some((item) => item.id === inmueble.id);
      if (exists) {
        return prev.filter((item) => item.id !== inmueble.id);
      }
      return [...prev, inmueble];
    });
  };

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
        const normalized = normalizeInmuebleForSelection(nuevoInmueble);
        setSelectedInmuebles((prev) => {
          if (prev.some((item) => item.id === normalized.id)) {
            return prev;
          }
          return [...prev, normalized];
        });
        setFormAlert({
          type: 'success',
          message: 'Inmueble creado y asignado automáticamente al propietario.'
        });
      }
    } catch (error) {
      setFormAlert({
        type: 'error',
        message: error.message || 'No se pudo crear el inmueble'
      });
      throw error;
    }
  };

  // Validadores
  const validators = {
    tipoDocumento: (value) =>
      !value ? 'Selecciona un tipo de documento' : '',
    numeroDocumento: (value) => {
      const v = value.trim();
      if (!v) return 'El número de documento es obligatorio';
      if (!/^\d{4,20}$/.test(v)) {
        return 'Ingresa un documento válido (solo números, 4-20 dígitos)';
      }
      return '';
    },
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
      if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(v)) {
        return 'Ingresa un correo válido';
      }
      return '';
    },
    telefono: (value) => {
      const clean = value.replace(/[^\d]/g, '');
      if (!clean) return 'El teléfono es obligatorio';
      if (!/^3\d{9}$/.test(clean)) {
        return 'Ingresa un celular colombiano (3XXXXXXXXX)';
      }
      return '';
    }
  };

  // Paso 0: todos los campos obligatorios; paso 1: solo confirmación
  const STEP_FIELDS = [
    [
      'tipoDocumento',
      'numeroDocumento',
      'primerNombre',
      'primerApellido',
      'email',
      'telefono'
    ],
    []
  ];

  const validateField = (name, value) => {
    if (validators[name]) {
      return validators[name](value);
    }
    return '';
  };

  const validateStep = (step) => {
    const fields = STEP_FIELDS[step] || [];
    if (fields.length === 0) return true;

    const newErrors = {};
    fields.forEach((field) => {
      newErrors[field] = validators[field](formData[field]);
    });

    setErrors((prev) => ({ ...prev, ...newErrors }));
    const hasErrors = Object.values(newErrors).some((msg) => msg);
    if (hasErrors) {
      setFormAlert({
        type: 'error',
        message: 'Revisa la información resaltada antes de continuar.'
      });
    } else {
      setFormAlert({ type: '', message: '' });
    }
    return !hasErrors;
  };

  const validateForm = () => {
    const allFields = Object.keys(validators);
    const fieldErrors = {};
    allFields.forEach((field) => {
      fieldErrors[field] = validators[field](formData[field]);
    });
    setErrors(fieldErrors);
    const hasErrors = Object.values(fieldErrors).some((msg) => msg);
    if (mode === 'create' && selectedInmuebles.length === 0) {
      setFormAlert({
        type: 'error',
        message: 'Debes asignar al menos un inmueble para crear el propietario.'
      });
      return false;
    }
    if (hasErrors) {
      setFormAlert({
        type: 'error',
        message: 'Revisa la información resaltada antes de continuar.'
      });
    } else {
      setFormAlert({ type: 'success', message: 'Todo listo para guardar.' });
    }
    return !hasErrors;
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    let newValue = value;

    // Solo números para documento y teléfono
    if (name === 'numeroDocumento' || name === 'telefono') {
      newValue = value.replace(/[^\d]/g, '');
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, newValue) }));
  };

  const handleSubmit = () => {
    if (mode === 'view') return onClose();
    if (!validateForm()) return;

    const payload = {
      tipoDocumento: formData.tipoDocumento,
      numeroDocumento: formData.numeroDocumento.trim(),
      nombres: [formData.primerNombre, formData.segundoNombre]
        .filter(Boolean)
        .join(' ')
        .trim(),
      apellidos: [formData.primerApellido, formData.segundoApellido]
        .filter(Boolean)
        .join(' ')
        .trim(),
      email: formData.email.trim(),
      telefono: formData.telefono.trim(),
      estado: selectedOwner?.estado || 'Activo'
    };

    try {
      onSubmit(payload, selectedInmuebles);
    } catch (error) {
      setFormAlert({
        type: 'error',
        message:
          error.message || 'No se pudo guardar la información. Intenta de nuevo.'
      });
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
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={
              activeStep === STEPS.length - 1 ? handleSubmit : handleNext
            }
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && (
              <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            {activeStep === STEPS.length - 1
              ? 'Guardar propietario'
              : 'Siguiente'}
          </button>
        </div>
      </div>
    );

  const renderStepContent = () => {
    if (mode === 'view') {
      return (
        <OwnerView
          owner={selectedOwner || formData}
          inmuebles={selectedInmuebles}
        />
      );
    }

    // PASO 0: agregar información + asignar/crear inmueble (todo en un solo paso)
    if (activeStep === 0) {
      return (
        <SectionCard
          title="Datos del propietario y asignación"
          subtitle="Completa la información en un paso"
        >
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
            {/* Tipo de documento */}
            <div>
              <label className="text-xs text-slate-600 flex justify-between">
                Tipo de documento
                {errors.tipoDocumento && (
                  <span className="text-[10px] text-red-500">
                    {errors.tipoDocumento}
                  </span>
                )}
              </label>
              <select
                name="tipoDocumento"
                value={formData.tipoDocumento}
                onChange={handleInputChange}
                className={`mt-1 w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 ${
                  errors.tipoDocumento
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Número de documento */}
            <div>
              <label className="text-xs text-slate-600 flex justify-between">
                Número de documento
                {errors.numeroDocumento && (
                  <span className="text-[10px] text-red-500">
                    {errors.numeroDocumento}
                  </span>
                )}
              </label>
              <input
                type="tel"
                inputMode="numeric"
                name="numeroDocumento"
                value={formData.numeroDocumento}
                onChange={handleInputChange}
                className={`mt-1 w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 ${
                  errors.numeroDocumento
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {!errors.numeroDocumento && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Solo números (4-20 dígitos).
                </p>
              )}
            </div>

            {/* Primer nombre */}
            <div>
              <label className="text-xs text-slate-600 flex justify-between">
                Primer nombre
                {errors.primerNombre && (
                  <span className="text-[10px] text-red-500">
                    {errors.primerNombre}
                  </span>
                )}
              </label>
              <input
                name="primerNombre"
                value={formData.primerNombre}
                onChange={handleInputChange}
                className={`mt-1 w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 ${
                  errors.primerNombre
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
            </div>

            {/* Segundo nombre */}
            <div>
              <label className="text-xs text-slate-600">Segundo nombre</label>
              <input
                name="segundoNombre"
                value={formData.segundoNombre}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Primer apellido */}
            <div>
              <label className="text-xs text-slate-600 flex justify-between">
                Primer apellido
                {errors.primerApellido && (
                  <span className="text-[10px] text-red-500">
                    {errors.primerApellido}
                  </span>
                )}
              </label>
              <input
                name="primerApellido"
                value={formData.primerApellido}
                onChange={handleInputChange}
                className={`mt-1 w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 ${
                  errors.primerApellido
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
            </div>

            {/* Segundo apellido */}
            <div>
              <label className="text-xs text-slate-600">Segundo apellido</label>
              <input
                name="segundoApellido"
                value={formData.segundoApellido}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Correo */}
            <div>
              <label className="text-xs text-slate-600 flex justify-between">
                Correo electrónico
                {errors.email && (
                  <span className="text-[10px] text-red-500">
                    {errors.email}
                  </span>
                )}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`mt-1 w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="text-xs text-slate-600 flex justify-between">
                Teléfono
                {errors.telefono && (
                  <span className="text-[10px] text-red-500">
                    {errors.telefono}
                  </span>
                )}
              </label>
              <input
                type="tel"
                inputMode="numeric"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                placeholder="3XXXXXXXXX"
                className={`mt-1 w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 ${
                  errors.telefono
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {!errors.telefono && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Número celular colombiano (3XXXXXXXXX).
                </p>
              )}
            </div>
          </div>

          {/* Asignar inmuebles (opcional) en el mismo paso */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-800">
                Asignar inmuebles (opcional)
              </h4>
              <button
                type="button"
                onClick={handleOpenPropertyModal}
                disabled={!onCreateInmueble}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Building2 className="w-3.5 h-3.5" />
                Crear inmueble
              </button>
            </div>
            <div className="max-h-44 overflow-y-auto rounded-2xl border border-slate-100 bg-white divide-y divide-slate-100">
              {availableInmuebles.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-500">
                  No hay inmuebles disponibles.
                </p>
              )}
              {availableInmuebles.map((inmueble) => {
                const isSelected = selectedInmuebles.some(
                  (item) => item.id === inmueble.id
                );
                return (
                  <label
                    key={inmueble.id}
                    className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {inmueble.titulo || inmueble.direccion}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {inmueble.ciudad} · {inmueble.tipo}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleInmuebleSelection(inmueble)}
                      className="text-blue-600 focus:ring-blue-500 rounded"
                    />
                  </label>
                );
              })}
            </div>
            {selectedInmuebles.length > 0 && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Inmuebles seleccionados: {selectedInmuebles.length}
              </div>
            )}
          </div>
        </SectionCard>
      );
    }

    // PASO 1: Confirmación SOLO LECTURA
    return (
      <SectionCard
        title="Confirmación"
        subtitle="Revisa la información antes de guardar"
      >
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

        {/* Datos del propietario */}
        <OwnerSummary owner={formData} inmuebles={selectedInmuebles} />

        {/* Inmuebles en modo solo lectura */}
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-slate-800 mb-1.5">
            Inmuebles asociados
          </h4>
          {selectedInmuebles.length === 0 && (
            <p className="text-xs text-slate-500">
              No se han asignado inmuebles.
            </p>
          )}
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
            {selectedInmuebles.map((inmueble) => (
              <div
                key={inmueble.id}
                className="px-3 py-2 text-xs text-slate-700 flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <p className="font-semibold text-slate-900">
                    {inmueble.titulo || inmueble.direccion}
                  </p>
                </div>
                <p>
                  {inmueble.ciudad} · {inmueble.tipo}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Si necesitas cambiar algo, usa el botón “Atrás”. En esta vista no se
            puede editar.
          </p>
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
        title={
          mode === 'view'
            ? 'Resumen de Propietario'
            : mode === 'edit'
            ? 'Editar Propietario'
            : 'Nuevo Propietario'
        }
        subtitle={
          mode === 'view'
            ? 'Consulta la información registrada'
            : 'Completa la información y confírmala'
        }
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





