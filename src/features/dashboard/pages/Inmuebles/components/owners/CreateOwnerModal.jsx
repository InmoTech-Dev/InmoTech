import React, { useState } from 'react';
import { User, Phone, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ModalContainer } from '../common/modalContainer';

const DOCUMENT_TYPES = ['CC', 'CE', 'NIT', 'Pasaporte', 'TI'];

const INITIAL_STATE = {
  tipoDocumento: 'CC',
  numeroDocumento: '',
  primerNombre: '',
  segundoNombre: '',
  primerApellido: '',
  segundoApellido: '',
  email: '',
  telefono: ''
};

const validators = {
  numeroDocumento: (value) => {
    if (!value.trim()) return 'El número de documento es obligatorio';
    if (!/^[A-Za-z0-9-.]{4,20}$/.test(value.trim())) return 'Documento inválido (4-20 caracteres)';
    return '';
  },
  primerNombre: (value) => {
    if (!value.trim()) return 'El primer nombre es obligatorio';
    if (value.trim().length < 2) return 'Debe contener al menos 2 caracteres';
    return '';
  },
  primerApellido: (value) => {
    if (!value.trim()) return 'El primer apellido es obligatorio';
    if (value.trim().length < 2) return 'Debe contener al menos 2 caracteres';
    return '';
  },
  email: (value) => {
    if (!value.trim()) return 'El correo es obligatorio';
    if (!/[\w-.]+@([\w-]+\.)+[\w-]{2,}/.test(value.trim())) return 'Ingresa un correo válido';
    return '';
  },
  telefono: (value) => {
    if (!value.trim()) return 'El teléfono es obligatorio';
    const clean = value.replace(/[^\d]/g, '');
    if (!/^3\d{9}$/.test(clean)) return 'Debe ser un celular colombiano (3XXXXXXXXX)';
    return '';
  }
};

const mapPayload = (form) => ({
  tipo_documento: form.tipoDocumento,
  numero_documento: form.numeroDocumento.trim(),
  primer_nombre: form.primerNombre.trim(),
  segundo_nombre: form.segundoNombre.trim() || null,
  primer_apellido: form.primerApellido.trim(),
  segundo_apellido: form.segundoApellido.trim() || null,
  correo: form.email.trim(),
  telefono: form.telefono.trim()
});

const CreateOwnerModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validators[name]) {
      setErrors((prev) => ({ ...prev, [name]: validators[name](value) }));
    }
  };

  const validate = () => {
    const newErrors = {};
    Object.entries(validators).forEach(([field, validator]) => {
      newErrors[field] = validator(formData[field] || '');
    });
    setErrors(newErrors);
    const hasErrors = Object.values(newErrors).some((message) => message);
    if (hasErrors) {
      setStatus({ type: 'error', message: 'Corrige los campos marcados antes de continuar.' });
    } else {
      setStatus({ type: '', message: '' });
    }
    return !hasErrors;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!onSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(mapPayload(formData));
      setStatus({ type: 'success', message: 'Propietario creado correctamente.' });
      setFormData(INITIAL_STATE);
      setTimeout(() => {
        setSubmitting(false);
        setStatus({ type: '', message: '' });
        onClose();
      }, 600);
    } catch (error) {
      setSubmitting(false);
      setStatus({ type: 'error', message: error.message || 'No se pudo crear el propietario.' });
    }
  };

  const renderAlert = () => {
    if (!status.message) return null;
    const Icon = status.type === 'error' ? AlertTriangle : CheckCircle2;
    const colors =
      status.type === 'error'
        ? 'bg-red-50 text-red-600 border-red-200'
        : 'bg-emerald-50 text-emerald-600 border-emerald-200';

    return (
      <div className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${colors}`}>
        <Icon className="w-4 h-4" />
        {status.message}
      </div>
    );
  };

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) {
          setStatus({ type: '', message: '' });
          setFormData(INITIAL_STATE);
          onClose();
        }
      }}
      title="Nuevo propietario"
      subtitle="Ingresa la información básica"
      icon={User}
      footer={(
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Crear propietario
          </button>
        </div>
      )}
    >
      {renderAlert()}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs text-slate-600">Tipo de documento</label>
          <select
            name="tipoDocumento"
            value={formData.tipoDocumento}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-600 flex justify-between">
            Número de documento
            {errors.numeroDocumento && <span className="text-[10px] text-red-500">{errors.numeroDocumento}</span>}
          </label>
          <input
            name="numeroDocumento"
            value={formData.numeroDocumento}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600 flex justify-between">
            Primer nombre
            {errors.primerNombre && <span className="text-[10px] text-red-500">{errors.primerNombre}</span>}
          </label>
          <input
            name="primerNombre"
            value={formData.primerNombre}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">Segundo nombre</label>
          <input
            name="segundoNombre"
            value={formData.segundoNombre}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
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
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">Segundo apellido</label>
          <input
            name="segundoApellido"
            value={formData.segundoApellido}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600 flex justify-between">
            Correo electrónico
            {errors.email && <span className="text-[10px] text-red-500">{errors.email}</span>}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600 flex justify-between">
            Teléfono
            {errors.telefono && <span className="text-[10px] text-red-500">{errors.telefono}</span>}
          </label>
          <input
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            placeholder="3XX XXX XXXX"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>
    </ModalContainer>
  );
};

export default CreateOwnerModal;
