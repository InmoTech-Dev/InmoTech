import React, { useState } from 'react';
import { User, Phone, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ModalContainer } from '../common/modalContainer';

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'CC' },
  { value: 'CE', label: 'CE' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'TI', label: 'TI' }
];

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
      if (!/^[0-9]{8,10}$/.test(numeroLimpio)) {
        return 'La cedula debe tener entre 8 y 10 digitos';
      }
      break;
    case 'CE':
      if (!/^[0-9]{6,10}$/.test(numeroLimpio)) {
        return 'La cedula de extranjeria debe tener entre 6 y 10 digitos';
      }
      break;
    case 'NIT':
      if (!/^[0-9]{8,10}$/.test(numeroLimpio)) {
        return 'El NIT debe tener entre 8 y 10 digitos';
      }
      break;
    case 'PASAPORTE':
      if (numeroLimpio.length < 6 || numeroLimpio.length > 20) {
        return 'El pasaporte debe tener entre 6 y 20 caracteres';
      }
      if (!/^[A-Z0-9]+$/.test(numeroLimpio)) {
        return 'El pasaporte solo puede contener letras y numeros';
      }
      break;
    case 'TI':
      if (!/^[0-9]{10,11}$/.test(numeroLimpio)) {
        return 'La tarjeta de identidad debe tener 10 u 11 digitos';
      }
      break;
    default:
      return 'Tipo de documento no valido';
  }

  return '';
};

const validators = {
  tipoDocumento: (value) => {
    if (!value) return 'Selecciona un tipo de documento';
    return '';
  },
  numeroDocumento: (value, form) => {
    return validateNumeroDocumentoByType(value, form?.tipoDocumento);
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
  numero_documento: cleanDocumentByType(form.tipoDocumento, form.numeroDocumento),
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

    const nextErrors = { ...errors };
    if (validators[name]) {
      nextErrors[name] = validators[name](nextForm[name] || '', nextForm);
    }
    if (name === 'tipoDocumento' || name === 'numeroDocumento') {
      nextErrors.numeroDocumento = validators.numeroDocumento(nextForm.numeroDocumento, nextForm);
      nextErrors.tipoDocumento = validators.tipoDocumento(nextForm.tipoDocumento, nextForm);
    }
    setErrors(nextErrors);
  };

  const validate = () => {
    const newErrors = {};
    Object.entries(validators).forEach(([field, validator]) => {
      newErrors[field] = validator(formData[field] || '', formData);
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

      <div className="grid gap-x-5 gap-y-2 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">Tipo de documento</label>
          <select
            name="tipoDocumento"
            value={formData.tipoDocumento}
            onChange={handleChange}
            className={`h-11 w-full rounded-xl border px-3 text-xs focus:outline-none ${
              errors.tipoDocumento ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <p className="min-h-[14px] text-[10px] text-red-500">{errors.tipoDocumento || ' '}</p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">Numero de documento</label>
          <input
            name="numeroDocumento"
            value={formData.numeroDocumento}
            onChange={handleChange}
            inputMode={normalizeDocumentType(formData.tipoDocumento) === 'PASAPORTE' ? 'text' : 'numeric'}
            className={`h-11 w-full rounded-xl border px-3 text-xs uppercase focus:outline-none ${
              errors.numeroDocumento ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          />
          <p className="min-h-[14px] text-[10px] text-red-500">{errors.numeroDocumento || ' '}</p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">Primer nombre</label>
          <input
            name="primerNombre"
            value={formData.primerNombre}
            onChange={handleChange}
            className={`h-11 w-full rounded-xl border px-3 text-xs focus:outline-none ${
              errors.primerNombre ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          />
          <p className="min-h-[14px] text-[10px] text-red-500">{errors.primerNombre || ' '}</p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">Segundo nombre</label>
          <input
            name="segundoNombre"
            value={formData.segundoNombre}
            onChange={handleChange}
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-blue-500 focus:outline-none"
          />
          <p className="min-h-[14px] text-[10px] text-transparent">.</p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">Primer apellido</label>
          <input
            name="primerApellido"
            value={formData.primerApellido}
            onChange={handleChange}
            className={`h-11 w-full rounded-xl border px-3 text-xs focus:outline-none ${
              errors.primerApellido ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          />
          <p className="min-h-[14px] text-[10px] text-red-500">{errors.primerApellido || ' '}</p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">Segundo apellido</label>
          <input
            name="segundoApellido"
            value={formData.segundoApellido}
            onChange={handleChange}
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-blue-500 focus:outline-none"
          />
          <p className="min-h-[14px] text-[10px] text-transparent">.</p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">Correo electronico</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`h-11 w-full rounded-xl border px-3 text-xs focus:outline-none ${
              errors.email ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          />
          <p className="min-h-[14px] text-[10px] text-red-500">{errors.email || ' '}</p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">Telefono</label>
          <input
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            inputMode="numeric"
            placeholder="3XXXXXXXXX"
            className={`h-11 w-full rounded-xl border px-3 text-xs focus:outline-none ${
              errors.telefono ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          />
          <p className="min-h-[14px] text-[10px] text-red-500">{errors.telefono || ' '}</p>
        </div>
      </div>
    </ModalContainer>
  );
};

export default CreateOwnerModal;
