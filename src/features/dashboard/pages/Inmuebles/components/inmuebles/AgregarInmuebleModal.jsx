import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Trash2, AlertCircle, Building2, MapPin, Layers, UserCheck, ImagePlus } from 'lucide-react';
import ownersApiService from '../../../../../../shared/services/ownersApiService';
import { WizardModalLayout } from '../common/wizardModalLayout';
import CreateOwnerModal from '../owners/CreateOwnerModal';
import { inmueblesAPI } from '../../../../../../shared/services/propertyApidervice';
import { uploadToCloudinary } from '../../../../../../shared/services/cloudinary';

const PROPERTY_TYPES = ['Casa', 'Apartamento', 'Local', 'Oficina', 'Bodega', 'Lote', 'Finca', 'Otro'];
const OPERATION_OPTIONS = ['Venta', 'Arriendo', 'Venta y Arriendo'];
const MIN_AMENITIES_REQUIRED_TYPES = new Set(['Casa', 'Apartamento']);
const DEFAULT_AMENITIES = ['Habitaciones', 'Banos', 'Parqueaderos', 'Balcon', 'Cuarto util', 'Cocina'];

const AMENITIES_BY_TYPE = {
  Casa: DEFAULT_AMENITIES,
  Apartamento: DEFAULT_AMENITIES,
  Local: ['Banos', 'Zona de carga', 'Deposito'],
  Oficina: ['Banos', 'Salas de reunion', 'Parqueaderos', 'Recepcion'],
  Bodega: ['Area de carga', 'Oficinas internas'],
  Lote: ['Area verde', 'Servicios publicos'],
  Finca: ['Habitaciones', 'Banos', 'Piscina', 'Casa mayordomo'],
  Otro: DEFAULT_AMENITIES
};

const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const mapImageSources = (sources = []) =>
  sources
    .filter(Boolean)
    .map((src, index) => ({
      id: `existing-image-${index}`,
      preview: src,
      source: src,
      remote: true,
      name: `Imagen ${index + 1}`
    }));

const INITIAL_FORM = {
  registro: '',
  titulo: '',
  direccion: '',
  barrio: '',
  ciudad: '',
  departamento: '',
  pais: 'Colombia',
  tipo: 'Apartamento',
  operacion: 'Venta',
  precioVenta: '',
  precioArriendo: '',
  areaConstruida: '',
  descripcion: '',
  estado: true
};

const STEPS = [
  { label: 'Inmueble', description: 'Define la información general', icon: Building2 },
  { label: 'Ubicación', description: 'Dirección y zona', icon: MapPin },
  { label: 'Características', description: 'Amenidades y multimedia', icon: Layers },
  { label: 'Propietario', description: 'Asignación y resumen', icon: UserCheck }
];

const buildAmenitiesForType = (type, current = []) => {
  const base = AMENITIES_BY_TYPE[type] || AMENITIES_BY_TYPE.Otro;
  const mapped = base.map((nombre, index) => {
    const existing = current.find((item) => item.nombre === nombre);
    return existing || {
      id: `base-${type}-${index}`,
      nombre,
      cantidad: 1,
      seleccionada: false,
      custom: false
    };
  });
  const customs = current.filter((item) => item.custom && !mapped.some((baseItem) => baseItem.nombre === item.nombre));
  return [...mapped, ...customs];
};

const getSelectedAmenitiesSignature = (items = []) => {
  const normalized = items
    .filter((item) => item?.seleccionada)
    .map((item) => ({
      nombre: String(item?.nombre || '').trim().toLowerCase(),
      cantidad: Number(item?.cantidad) > 0 ? Number(item.cantidad) : 1
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return JSON.stringify(normalized);
};

const formatOwnerSummary = (owner) => {
  if (!owner) return null;
  return {
    id: owner.id,
    nombreCompleto: owner.nombreCompleto || `${owner.nombres || ''} ${owner.apellidos || ''}`.trim(),
    email: owner.email || owner.correo || '',
    telefono: owner.telefono || '',
    documento: owner.documento || `${owner.tipoDocumento || owner.tipo_documento || 'CC'} ${owner.numeroDocumento || owner.numero_documento || ''}`
  };
};

export const AgregarInmuebleModal = ({ isOpen, onClose, onSave, inmuebleEditar }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [activeStep, setActiveStep] = useState(0);
  const [amenities, setAmenities] = useState(buildAmenitiesForType(INITIAL_FORM.tipo));
  const [imagenes, setImagenes] = useState([]);
  const [owners, setOwners] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [customAmenity, setCustomAmenity] = useState({ nombre: '', cantidad: 1 });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [checkingRegistro, setCheckingRegistro] = useState(false);
  const [registroDisponible, setRegistroDisponible] = useState(true);
  const [descripcionCambioComodidades, setDescripcionCambioComodidades] = useState('');
  const lastFocusedRef = useRef(null);
  const lastFocusInfo = useRef({ name: null, selectionStart: null, selectionEnd: null });

  const handleFocusCapture = (event) => {
    const target = event.target;
    if (target && typeof target.focus === 'function') {
      lastFocusedRef.current = target;
      lastFocusInfo.current = {
        name: target.name || null,
        selectionStart: typeof target.selectionStart === 'number' ? target.selectionStart : null,
        selectionEnd: typeof target.selectionEnd === 'number' ? target.selectionEnd : null,
      };
    }
  };

  const handleInputCapture = (event) => {
    const target = event.target;
    if (target === lastFocusedRef.current) {
      lastFocusInfo.current = {
        name: target.name || null,
        selectionStart: typeof target.selectionStart === 'number' ? target.selectionStart : null,
        selectionEnd: typeof target.selectionEnd === 'number' ? target.selectionEnd : null,
      };
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const { name, selectionStart, selectionEnd } = lastFocusInfo.current || {};
    let target = lastFocusedRef.current;

    if ((!target || !document.body.contains(target)) && name) {
      target = document.querySelector(`input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`);
    }

    if (target && document.activeElement !== target && document.body.contains(target)) {
      target.focus({ preventScroll: true });
      if (typeof target.setSelectionRange === 'function' && selectionStart !== null && selectionEnd !== null) {
        target.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  });

  const selectedOwner = useMemo(
    () => owners.find((owner) => String(owner.id) === String(selectedOwnerId)),
    [owners, selectedOwnerId]
  );
  const amenitiesChangedInEdit = useMemo(() => {
    if (!inmuebleEditar) return false;
    const currentSignature = getSelectedAmenitiesSignature(amenities);
    const initialSignature = getSelectedAmenitiesSignature(inmuebleEditar.comodidades || []);
    return currentSignature !== initialSignature;
  }, [amenities, inmuebleEditar]);

  useEffect(() => {
    if (!amenitiesChangedInEdit && errors.descripcionCambioComodidades) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.descripcionCambioComodidades;
        return updated;
      });
    }
  }, [amenitiesChangedInEdit, errors.descripcionCambioComodidades]);

  const loadOwners = async () => {
    try {
      setOwnersLoading(true);
      const { owners: list } = await ownersApiService.getOwners({ limit: 200 });
      setOwners(list);
    } catch (error) {
      console.error('Error obteniendo propietarios:', error);
    } finally {
      setOwnersLoading(false);
    }
  };

  const handleOpenOwnerModal = () => setOwnerModalOpen(true);
  const handleCloseOwnerModal = () => setOwnerModalOpen(false);

  const handleOwnerModalSubmit = async (ownerPayload) => {
    try {
      const newOwner = await ownersApiService.createOwner(ownerPayload);
      setOwners((previous) => {
        const filtered = previous.filter((owner) => String(owner.id) !== String(newOwner.id));
        const updated = [newOwner, ...filtered];
        return updated.sort((a, b) => (a.nombreCompleto || '').localeCompare(b.nombreCompleto || ''));
      });
      setSelectedOwnerId(String(newOwner.id));
      return newOwner;
    } catch (error) {
      console.error('Error creando propietario desde el modal de inmueble:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOwners();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setForm(INITIAL_FORM);
      setAmenities(buildAmenitiesForType(INITIAL_FORM.tipo));
      setImagenes([]);
      setSelectedOwnerId('');
      setOwnerModalOpen(false);
      setCustomAmenity({ nombre: '', cantidad: 1 });
      setDescripcionCambioComodidades('');
      setErrors({});
      setActiveStep(0);
      return;
    }

    if (inmuebleEditar) {
      const inferredOperation = inmuebleEditar.operacion
        || (inmuebleEditar.precio_arriendo && inmuebleEditar.precio_venta
          ? 'Venta y Arriendo'
          : inmuebleEditar.precio_arriendo
            ? 'Arriendo'
            : 'Venta');

      setForm({
        registro: inmuebleEditar.registro || '',
        titulo: inmuebleEditar.titulo || '',
        direccion: inmuebleEditar.direccion || '',
        barrio: inmuebleEditar.barrio || '',
        ciudad: inmuebleEditar.ciudad || '',
        departamento: inmuebleEditar.departamento || '',
        pais: inmuebleEditar.pais || 'Colombia',
        tipo: inmuebleEditar.tipo || inmuebleEditar.categoria || 'Apartamento',
        operacion: inferredOperation,
        precioVenta: inmuebleEditar.precio_venta || '',
        precioArriendo: inmuebleEditar.precio_arriendo || '',
        areaConstruida: inmuebleEditar.area_construida || '',
        descripcion: inmuebleEditar.descripcion || '',
        estado: inmuebleEditar.estado_bool ?? true
      });
      setAmenities(buildAmenitiesForType(inmuebleEditar.tipo || inmuebleEditar.categoria || 'Apartamento', inmuebleEditar.comodidades || []));
      setImagenes(mapImageSources(inmuebleEditar.imagenes || []));
      if (inmuebleEditar.propietario?.id) {
        setSelectedOwnerId(inmuebleEditar.propietario.id);
      }
      setDescripcionCambioComodidades('');
    } else {
      setForm(INITIAL_FORM);
      setAmenities(buildAmenitiesForType(INITIAL_FORM.tipo));
      setImagenes([]);
      setSelectedOwnerId('');
      setDescripcionCambioComodidades('');
    }
    setActiveStep(0);
  }, [inmuebleEditar, isOpen]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'tipo') {
      setAmenities((prev) => buildAmenitiesForType(value, prev));
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.comodidades;
        return updated;
      });
    }
  };

  useEffect(() => {
    if (!form.registro.trim()) {
      setRegistroDisponible(true);
      setErrors((prev) => {
        const updated = { ...prev };
        if (updated.registro === 'Este registro ya existe') {
          delete updated.registro;
        }
        return updated;
      });
      return;
    }

    const registroValue = form.registro.trim();
    const currentId =
      inmuebleEditar?.id_inmueble ||
      inmuebleEditar?.id ||
      inmuebleEditar?.inmuebleId ||
      inmuebleEditar?.inmueble?.id;
    const timeoutId = setTimeout(async () => {
      setCheckingRegistro(true);
      try {
        const { items = [] } = await inmueblesAPI.getInmuebles(1, 200, {
          registro: registroValue,
          registro_inmobiliario: registroValue,
          busqueda: registroValue
        });
        const exists = items.some((item) => {
          const itemId = item.id_inmueble || item.id || item.inmuebleId;
          const sameRecord =
            (item.registro || '').toLowerCase() === registroValue.toLowerCase() ||
            (item.registro_inmobiliario || '').toLowerCase() === registroValue.toLowerCase();

          // Si es el mismo inmueble en edición, no marcar como existente
          if (currentId && itemId && String(currentId) === String(itemId)) {
            return false;
          }

          return sameRecord;
        });
        setRegistroDisponible(!exists);
        setErrors((prev) => {
          const updated = { ...prev };
          if (exists) {
            updated.registro = 'Este registro ya existe';
          } else if (updated.registro === 'Este registro ya existe') {
            delete updated.registro;
          }
          return updated;
        });
      } catch (error) {
        console.error('Error validando registro:', error);
      } finally {
        setCheckingRegistro(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [form.registro]);

  const handleAmenityToggle = (amenityId) => {
    setAmenities((prev) =>
      prev.map((amenity) =>
        amenity.id === amenityId ? { ...amenity, seleccionada: !amenity.seleccionada } : amenity
      )
    );
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.comodidades;
      return updated;
    });
  };

  const handleAmenityQuantity = (amenityId, quantity) => {
    setAmenities((prev) =>
      prev.map((amenity) =>
        amenity.id === amenityId ? { ...amenity, cantidad: Number(quantity) || 0 } : amenity
      )
    );
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.comodidades;
      return updated;
    });
  };

  const handleAddCustomAmenity = () => {
    if (!customAmenity.nombre.trim()) return;
    setAmenities((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        nombre: customAmenity.nombre.trim(),
        cantidad: Number(customAmenity.cantidad) || 1,
        seleccionada: true,
        custom: true
      }
    ]);
    setCustomAmenity({ nombre: '', cantidad: 1 });
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.comodidades;
      return updated;
    });
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const validFiles = [];
    let hasInvalidFiles = false;

    files.forEach((file) => {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        hasInvalidFiles = true;
        return;
      }
      validFiles.push(file);
    });

    if (hasInvalidFiles) {
      setErrors((prev) => ({
        ...prev,
        imagenes: `Algunas imagenes superan ${MAX_IMAGE_SIZE_MB}MB.`
      }));
    } else {
      setErrors((prev) => {
        const { imagenes, ...rest } = prev;
        return rest;
      });
    }

    if (!validFiles.length) {
      event.target.value = '';
      return;
    }

    const mappedFiles = await Promise.all(
      validFiles.map(async (file, index) => {
        const preview = await readFileAsDataURL(file);
        return {
          id: `local-image-${Date.now()}-${index}`,
          preview,
          source: preview,
          file,
          remote: false,
          name: file.name
        };
      })
    );

    setImagenes((prev) => [...prev, ...mappedFiles]);
    event.target.value = '';
  };

  const handleRemoveImage = (imageId) => {
    setImagenes((prev) => prev.filter((image) => image.id !== imageId));
  };

  const validateStep = (stepIndex) => {
    const validationErrors = {};

    if (stepIndex === 0) {
      if (!form.registro.trim()) validationErrors.registro = 'El registro es obligatorio';
      if (!registroDisponible) validationErrors.registro = 'Este registro ya existe';
      if (!form.titulo.trim()) validationErrors.titulo = 'El título es obligatorio';
      if (!form.descripcion.trim()) validationErrors.descripcion = 'La descripción es obligatoria';
      if (form.operacion === 'Venta' && !form.precioVenta) validationErrors.precioVenta = 'Ingresa el precio de venta';
      if (form.operacion === 'Arriendo' && !form.precioArriendo) validationErrors.precioArriendo = 'Ingresa el canon de arriendo';
      if (form.operacion === 'Venta y Arriendo' && (!form.precioVenta || !form.precioArriendo)) {
        validationErrors.precioVenta = 'Ingresa ambos valores';
        validationErrors.precioArriendo = 'Ingresa ambos valores';
      }
      if (!form.areaConstruida || Number(form.areaConstruida) <= 0) {
        validationErrors.areaConstruida = 'Ingresa el área en m²';
      }
    } else if (stepIndex === 1) {
      if (!form.direccion.trim()) validationErrors.direccion = 'La dirección es obligatoria';
      if (!form.ciudad.trim()) validationErrors.ciudad = 'La ciudad es obligatoria';
      if (!form.departamento.trim()) validationErrors.departamento = 'El departamento es obligatorio';
    } else if (stepIndex === 2) {
      const selectedAmenitiesCount = amenities.filter((amenity) => amenity.seleccionada).length;
      if (MIN_AMENITIES_REQUIRED_TYPES.has(form.tipo) && selectedAmenitiesCount < 2) {
        validationErrors.comodidades = 'Casa y Apartamento requieren minimo 2 comodidades.';
      }
      if (inmuebleEditar && amenitiesChangedInEdit && !descripcionCambioComodidades.trim()) {
        validationErrors.descripcionCambioComodidades = 'Describe el cambio en comodidades';
      }
    } else if (stepIndex === 3) {
      if (!selectedOwnerId) {
        validationErrors.propietario = 'Selecciona un propietario';
      }
    }

    setErrors((prev) => ({ ...prev, ...validationErrors }));
    return Object.keys(validationErrors).length === 0;
  };

  const resolvePropietario = async () => formatOwnerSummary(selectedOwner);

  const handleFinalSubmit = async () => {
    try {
      setSaving(true);
      if (!registroDisponible) {
        setErrors((prev) => ({ ...prev, registro: 'Este registro ya existe' }));
        setSaving(false);
        return;
      }
      const ownerSummary = await resolvePropietario();
      const selectedAmenities = amenities
        .filter((amenity) => amenity.seleccionada)
        .map((amenity) => ({
          nombre: amenity.nombre,
          cantidad: amenity.cantidad,
          seleccionada: true,
          custom: amenity.custom ?? false
        }));

      // Subir a Cloudinary las imágenes locales; conservar las remotas
      const uploadedImages = [];
      for (const image of imagenes) {
        if (image.remote && image.source) {
          uploadedImages.push(image.source);
          continue;
        }
        if (image.file) {
          try {
            const upload = await uploadToCloudinary(image.file, {
              folder: `inmotech/inmuebles/${form.registro || 'general'}`,
            });
            if (upload?.secure_url) {
              uploadedImages.push(upload.secure_url);
            }
          } catch (uploadError) {
            console.warn('No se pudo subir una imagen a Cloudinary:', uploadError);
          }
        } else if (image.source) {
          uploadedImages.push(image.source);
        }
      }

      const payload = {
        id: inmuebleEditar?.id,
        registro_inmobiliario: form.registro,
        registro: form.registro,
        titulo: form.titulo,
        direccion: form.direccion,
        barrio: form.barrio,
        ciudad: form.ciudad,
        departamento: form.departamento,
        pais: form.pais,
        tipo: form.tipo,
        categoria: form.tipo,
        operacion: form.operacion,
        precio_venta: form.precioVenta ? Number(form.precioVenta) : null,
        precio_arriendo: form.precioArriendo ? Number(form.precioArriendo) : null,
        area_construida: form.areaConstruida ? Number(form.areaConstruida) : null,
        descripcion: form.descripcion,
        estado: form.estado,
        comodidades: selectedAmenities,
        imagenes: uploadedImages,
        propietario: ownerSummary || null,
        propietarioId: ownerSummary?.id,
        descripcion_cambio_comodidades:
          inmuebleEditar && amenitiesChangedInEdit ? descripcionCambioComodidades.trim() : ''
      };

      await onSave(payload, Boolean(inmuebleEditar));
      onClose();
    } catch (error) {
      console.error('Error al guardar inmueble:', error);
      setErrors((prev) => ({
        ...prev,
        submit: error.message || 'No se pudo guardar el inmueble'
      }));
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (!validateStep(activeStep)) return;
    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      handleFinalSubmit();
    }
  };

  const handleBack = () => {
    if (activeStep === 0) return;
    setActiveStep((prev) => prev - 1);
  };

  const SectionCard = ({ title, subtitle, children }) => (
    <div className="rounded-2xl border border-white bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] space-y-3">
      {(title || subtitle) && (
        <div>
          {subtitle && <p className="text-xs font-semibold tracking-[0.2em] uppercase text-blue-500">{subtitle}</p>}
          {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
        </div>
      )}
      {children}
    </div>
  );

  const renderGeneralStep = () => (
    <div className="space-y-4">
      <SectionCard title="Información del inmueble" subtitle="Paso 1">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600 flex justify-between">
              Registro inmobiliario
            {errors.registro && <span className="text-xs text-red-500">{errors.registro}</span>}
          </label>
          <input
            name="registro"
            value={form.registro}
            onChange={handleFieldChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {!registroDisponible && (
            <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>El registro ya existe. Usa uno diferente.</span>
            </div>
          )}
          {checkingRegistro && (
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Verificando registro...</span>
            </div>
          )}
        </div>
        <div>
          <label className="text-sm text-slate-600 flex justify-between">
            Título del inmueble
            {errors.titulo && <span className="text-xs text-red-500">{errors.titulo}</span>}
          </label>
          <input
            name="titulo"
            value={form.titulo}
            onChange={handleFieldChange}
            placeholder="Casa moderna en El Poblado"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm text-slate-600">Tipo de propiedad</label>
          <select
            name="tipo"
            value={form.tipo}
            onChange={handleFieldChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {PROPERTY_TYPES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-600">Operación</label>
          <select
            name="operacion"
            value={form.operacion}
            onChange={handleFieldChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {OPERATION_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        {(form.operacion === 'Venta' || form.operacion === 'Venta y Arriendo') && (
          <div>
            <label className="text-sm text-slate-600 flex justify-between">
              Precio de venta
              {errors.precioVenta && <span className="text-xs text-red-500">{errors.precioVenta}</span>}
            </label>
            <input
              name="precioVenta"
              type="number"
              min="0"
              value={form.precioVenta}
              onChange={handleFieldChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}
        {(form.operacion === 'Arriendo' || form.operacion === 'Venta y Arriendo') && (
          <div>
            <label className="text-sm text-slate-600 flex justify-between">
              Canon de arriendo
              {errors.precioArriendo && <span className="text-xs text-red-500">{errors.precioArriendo}</span>}
            </label>
            <input
              name="precioArriendo"
              type="number"
              min="0"
              value={form.precioArriendo}
              onChange={handleFieldChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}
        <div>
          <label className="text-sm text-slate-600 flex justify-between">
            Área construida (m²)
            {errors.areaConstruida && <span className="text-xs text-red-500">{errors.areaConstruida}</span>}
          </label>
          <input
            name="areaConstruida"
            type="number"
            min="0"
            value={form.areaConstruida}
            onChange={handleFieldChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Ej: 120"
          />
        </div>
          <div className="md:col-span-2">
            <label className="text-sm text-slate-600 flex justify-between">
              Descripción
              {errors.descripcion && <span className="text-xs text-red-500">{errors.descripcion}</span>}
            </label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleFieldChange}
              rows={4}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            ></textarea>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const renderLocationStep = () => (
    <div className="space-y-4">
      <SectionCard title="Ubicación del inmueble" subtitle="Paso 2">
        <div>
          <label className="text-sm text-slate-600 flex justify-between">
            Dirección completa
            {errors.direccion && <span className="text-xs text-red-500">{errors.direccion}</span>}
          </label>
          <input
            name="direccion"
            value={form.direccion}
            onChange={handleFieldChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600">Barrio / Sector</label>
            <input
              name="barrio"
              value={form.barrio}
              onChange={handleFieldChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600 flex justify-between">
              Ciudad
              {errors.ciudad && <span className="text-xs text-red-500">{errors.ciudad}</span>}
            </label>
            <input
              name="ciudad"
              value={form.ciudad}
              onChange={handleFieldChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600 flex justify-between">
              Departamento
              {errors.departamento && <span className="text-xs text-red-500">{errors.departamento}</span>}
            </label>
            <input
              name="departamento"
              value={form.departamento}
              onChange={handleFieldChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">País</label>
            <input
              name="pais"
              value={form.pais}
              onChange={handleFieldChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const renderAmenitiesStep = () => (
    <div className="space-y-4">
      <SectionCard title="Selecciona características" subtitle="Paso 3">
        <div className="grid gap-3 md:grid-cols-2">
          {amenities.map((amenity) => (
            <label
              key={amenity.id}
            className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-sm transition-all ${amenity.seleccionada ? 'border-blue-300 bg-white shadow-sm' : 'border-slate-200 bg-slate-100/50'}`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={amenity.seleccionada}
                onChange={() => handleAmenityToggle(amenity.id)}
                className="text-blue-600 focus:ring-blue-500"
              />
              {amenity.nombre}
            </div>
            <input
              type="number"
              min="0"
              value={amenity.cantidad}
              disabled={!amenity.seleccionada}
              onChange={(event) => handleAmenityQuantity(amenity.id, event.target.value)}
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
            />
          </label>
          ))}
        </div>
        {errors.comodidades && (
          <p className="text-xs text-red-500">{errors.comodidades}</p>
        )}

        <div className="rounded-2xl border border-dashed border-slate-300 p-4 bg-slate-50">
          <p className="text-sm font-semibold text-slate-700 mb-3">Característica personalizada</p>
          <div className="flex flex-wrap gap-3">
            <input
              value={customAmenity.nombre}
              onChange={(event) => setCustomAmenity((prev) => ({ ...prev, nombre: event.target.value }))}
              placeholder="Ej: Zona BBQ"
              className="flex-1 min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              type="number"
              min="1"
              value={customAmenity.cantidad}
              onChange={(event) => setCustomAmenity((prev) => ({ ...prev, cantidad: event.target.value }))}
              className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddCustomAmenity}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
        </div>

        {inmuebleEditar && amenitiesChangedInEdit && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <label className="text-sm text-slate-700 flex justify-between font-semibold">
              Descripcion del cambio en comodidades
              {errors.descripcionCambioComodidades && (
                <span className="text-xs text-red-500">{errors.descripcionCambioComodidades}</span>
              )}
            </label>
            <textarea
              value={descripcionCambioComodidades}
              onChange={(event) => {
                setDescripcionCambioComodidades(event.target.value);
                if (errors.descripcionCambioComodidades) {
                  setErrors((prev) => {
                    const updated = { ...prev };
                    delete updated.descripcionCambioComodidades;
                    return updated;
                  });
                }
              }}
              rows={3}
              placeholder="Ej: Se agregó 1 baño social y se retiró 1 parqueadero."
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Galería del inmueble" subtitle="Paso 3">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Carga imágenes</p>
            <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/70 px-3 py-2.5 text-sm text-blue-600 hover:border-blue-300">
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <ImagePlus className="h-4 w-4" />
              Seleccionar archivos
              <span className="text-xs text-blue-400">PNG, JPG o WebP (max {MAX_IMAGE_SIZE_MB}MB)</span>
            </label>
            {errors.imagenes && (
              <p className="mt-1 text-xs text-red-500">{errors.imagenes}</p>
            )}
          </div>

          {imagenes.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {imagenes.map((imagen) => (
                <div
                  key={imagen.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                >
                  <img
                    src={imagen.preview}
                    alt={imagen.name || 'Imagen del inmueble'}
                    className="h-40 w-full object-cover"
                  />
                  <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-600">
                    <span className="truncate">{imagen.name || 'Imagen'}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(imagen.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              Aun no has cargado imágenes para este inmueble.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );

  const renderOwnerStep = () => (
    <div className="space-y-4">
      <SectionCard title="Selecciona propietario" subtitle="Paso 4">
        <label className="text-sm text-slate-600 flex justify-between">
          Propietario asignado
          {errors.propietario && <span className="text-xs text-red-500">{errors.propietario}</span>}
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={selectedOwnerId}
            onChange={(event) => setSelectedOwnerId(event.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Seleccione</option>
            {ownersLoading && <option value="">Cargando propietarios...</option>}
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.nombreCompleto} · {owner.documento}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleOpenOwnerModal}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            <Building2 className="h-4 w-4" />
            Nuevo propietario
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Resumen final" subtitle="Paso 4">
        <p className="text-sm font-semibold text-slate-800 mb-3">Resumen</p>
        <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-600">
          <div>
            <p className="text-xs text-slate-400 mb-1">Propietario asignado</p>
            <p className="font-semibold text-slate-800">
              {selectedOwner?.nombreCompleto || 'Sin selección'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Contacto</p>
            <p>{selectedOwner?.email || 'Sin correo'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Teléfono</p>
            <p>{selectedOwner?.telefono || 'Sin teléfono'}</p>
          </div>
          <div>
          <p className="text-xs text-slate-400 mb-1">Características seleccionadas</p>
            <p>{amenities.filter((item) => item.seleccionada).length}</p>
          </div>
        </div>
        

      </SectionCard>

      {errors.submit && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          {errors.submit}
        </div>
      )}
    </div>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderGeneralStep();
      case 1:
        return renderLocationStep();
      case 2:
        return renderAmenitiesStep();
      case 3:
        return renderOwnerStep();
      default:
        return null;
    }
  };

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        disabled={saving}
      >
        Cancelar
      </button>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={activeStep === 0 || saving}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {activeStep === STEPS.length - 1 ? 'Guardar inmueble' : 'Siguiente'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <WizardModalLayout
        isOpen={isOpen}
        onClose={onClose}
        title={inmuebleEditar ? 'Editar inmueble' : 'Nuevo inmueble'}
        subtitle="Completa la información paso a paso para registrar el inmueble"
        steps={STEPS}
        activeStep={activeStep}
        footer={footer}
      >
        <div onFocusCapture={handleFocusCapture} onInputCapture={handleInputCapture}>
          {renderStepContent()}
        </div>
      </WizardModalLayout>

      <CreateOwnerModal
        isOpen={ownerModalOpen}
        onClose={handleCloseOwnerModal}
        onSubmit={handleOwnerModalSubmit}
      />
    </>
  );
};

