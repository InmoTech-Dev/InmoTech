import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../../shared/components/ui/button';
import { Input } from '../../../../shared/components/ui/input';
import { Textarea } from '../../../../shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../shared/components/ui/select';
import { Badge } from '../../../../shared/components/ui/badge';
import PropertyAutocomplete from '../../../../shared/components/ui/PropertyAutocomplete';
import { usePropertyAutocomplete } from '../../../../shared/hooks/usePropertyAutocomplete';
import { useToast } from '../../../../shared/hooks/use-toast';
import GeneralFollowUpSection from './GeneralFollowUpSection';
import { useGeneralFollowUp } from '../../hooks/useGeneralFollowUp';
import ConfirmationDialog from '../../../../shared/components/ui/ConfirmationDialog';
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  UploadIcon,
  FileIcon,
  ImageIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  CheckIcon,
  UserIcon,
  CalendarIcon,
  SaveIcon,
  XCircleIcon,
  X,
  FileText,
  ClipboardList as ClipboardListIcon,
  Building,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../../../shared/contexts/AuthContext.jsx';
import administrativosApiService from '../../../../shared/services/administrativosApiService';
import rolesApiService from '../../../../shared/services/rolesApiService';

const CreateReportModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  submitLabel = 'Crear Reporte'
}) => {
  // Hook de autocompletado de propiedades
  const {
    selectedProperty,
    searchTerm,
    setSearchTerm,
    filteredProperties,
    selectProperty,
    clearSelection,
    isSearching,
  } = usePropertyAutocomplete();

  // Usuario actual desde contexto de autenticación
  const { user } = useAuth();

  const getUserFullName = () => {
    if (!user) return 'No asignado';

    if (user?.nombre_completo) {
      return String(user.nombre_completo).replace(/\s+/g, ' ').trim();
    }

    const nombres = [
      user?.primer_nombre,
      user?.segundo_nombre,
      user?.nombres,
      user?.nombre
    ].filter(Boolean).join(' ');

    const apellidos = [
      user?.primer_apellido,
      user?.segundo_apellido,
      user?.apellidos,
      user?.apellido,
      user?.apellido_completo
    ].filter(Boolean).join(' ');

    const full = [nombres, apellidos].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    return full || user?.correo || user?.email || 'No asignado';
  };

  // Formatea cualquier valor de "responsable" (string u objeto) a un nombre completo legible
  const formatResponsableName = (r) => {
    if (!r) return '';
    if (typeof r === 'string') return r.trim();
    if (r?.nombre_completo) {
      return String(r.nombre_completo).replace(/\s+/g, ' ').trim();
    }
    const nombres = [
      r?.primer_nombre,
      r?.segundo_nombre,
      r?.nombres,
      r?.nombre
    ].filter(Boolean).join(' ');
    const apellidos = [
      r?.primer_apellido,
      r?.segundo_apellido,
      r?.apellidos,
      r?.apellido,
      r?.apellido_completo
    ].filter(Boolean).join(' ');
    const full = [nombres, apellidos].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    return full || r?.correo || r?.email || '';
  };

  const currentUser = {
    id_persona: user?.id_persona || user?.id || 0,
    primer_nombre: user?.primer_nombre || (user?.nombres?.split(' ')?.[0] || user?.nombre?.split(' ')?.[0] || ''),
    primer_apellido: user?.primer_apellido || (user?.apellidos?.split(' ')?.[0] || user?.apellido?.split(' ')?.[0] || '')
  };

  // Hook de seguimiento general: asegurar ID numérico del reporte
  const reportIdForFollowUps = (initialData?.id_reporte ?? initialData?.referencia ?? initialData?.id ?? '')
    .toString()
    .replace(/\D/g, '');
  const numericReportId = reportIdForFollowUps ? parseInt(reportIdForFollowUps, 10) : null;

  const {
    followUps,
    loading: followUpsLoading,
    submitting: followUpsSubmitting,
    newFollowUpNote,
    addFollowUp,
    updateFollowUpStatus,
    handleNewFollowUpChange,
    refreshFollowUps,
    getTemporaryFollowUps,
    clearTemporaryFollowUps
  } = useGeneralFollowUp(numericReportId, currentUser);

  // Función para obtener la fecha actual en formato ISO
  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Función para obtener fecha y hora actual en formato legible
  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    }) + ' pm';
  };

  // Función para obtener fecha y hora actual en formato compatible con input datetime-local
  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Formatear fecha para el input datetime-local
  const formatDatetimeForInput = (dateValue) => {
    if (!dateValue) return '';
    // Si ya está en formato datetime-local exacto (sin zona horaria), retornar tal cual
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateValue)) return dateValue;
    // Convertir siempre con new Date() para respetar la zona horaria local
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      const hours = pad(date.getHours());
      const minutes = pad(date.getMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      return '';
    }
  };

  // Valores por defecto para el formulario
  const defaultFormData = {
    ubicacion: '',
    tipoInmueble: '',
    referencia: '',
    propietario: '',
    tipoReporte: '',
    descripcion: '',
    fecha: getCurrentDate(),
    fechaCreacion: getCurrentDateTime(),
    estado: 'En proceso',
    seguimientoGeneral: '',
    responsable: '',
    id_persona_reporta: null
  };

  // Estados del formulario
  const [formData, setFormData] = useState({ ...defaultFormData, ...(initialData || {}) });
  const [rubros, setRubros] = useState((initialData && initialData.rubros) || []);
  const [imagenes, setImagenes] = useState((initialData && initialData.imagenes) || []);
  const [archivos, setArchivos] = useState((initialData && initialData.archivos) || []);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPropertyInfo, setShowPropertyInfo] = useState(false);
  const [activeTab, setActiveTab] = useState('cliente');
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'warning'
  });

  // Referencias para los inputs de archivos
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Hook para notificaciones
  const { toast } = useToast();

  // Resetear formulario cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      const base = initialData ? { ...defaultFormData, ...initialData } : { ...defaultFormData };
      const fullName = getUserFullName();

      if (initialData) {
        const responsableId = initialData.id_persona_reporta || initialData.id_responsable ||
          (initialData.reportado_por?.id_persona ?? initialData.reportado_por?.id ?? initialData.reportadoPor?.id_persona ?? initialData.reportadoPor?.id);

        const responsableName = formatResponsableName(initialData.reportado_por || initialData.reportadoPor) ||
          (typeof initialData.responsable === 'string' && !/^\d+$/.test(initialData.responsable) ? initialData.responsable : '');

        setFormData({
          ...base,
          responsable: responsableName || fullName,
          id_persona_reporta: responsableId || null
        });
        // Normalizar rubros y seguimientos para que el flujo de actualización
        // pueda decidir correctamente entre crear/actualizar
        const normalizedRubros = (initialData.rubros || []).map((r) => ({
          ...r,
          id: Number(r.id_rubro ?? r.id ?? Date.now()),
          backendId: Number(r.id_rubro ?? r.id ?? 0),
          activo: r.activo !== false,
          fechaAnulacion: r.fechaAnulacion || null,
          seguimientos: (r.seguimientos || []).map((s) => ({
            ...s,
            id: Number(s.id_seguimiento_rubro ?? s.id ?? Date.now()),
            backendId: Number(s.id_seguimiento_rubro ?? s.id ?? 0),
            responsable: typeof s.responsable === 'string' ? s.responsable : formatResponsableName(s.responsable),
            activo: s.activo !== false,
            fecha: formatDatetimeForInput(s.fecha || s.fecha_creacion),
            expandido: false,
          })),
        }));
        setRubros(normalizedRubros);
        setImagenes(initialData.imagenes || []);
        setArchivos(initialData.archivos || []);
        // Si hay una referencia inicial, buscar la propiedad y pre-seleccionarla para activar la UI de "Auto"
        if (initialData.referencia) {
          setSearchTerm(initialData.referencia);
          // Sintetizar objeto de propiedad para que usePropertyAutocomplete lo reconozca
          const synthProperty = {
            id: initialData.id_inmueble,
            reference: initialData.referencia,
            title: initialData.nombreInmueble || initialData.inmueble_titulo || initialData.titulo || '',
            location: initialData.ubicacion || initialData.inmueble_ciudad || '',
            type: initialData.tipoInmueble || initialData.inmueble_categoria || '',
            owner: initialData.propietario || initialData.propietario_nombre || ''
          };
          selectProperty(synthProperty);
          setShowPropertyInfo(true);
        }
      } else {
        setFormData({
          ...defaultFormData,
          responsable: fullName,
          id_persona_reporta: user?.id_persona || user?.id
        });
        setRubros([]);
        setImagenes([]);
        setArchivos([]);
        clearSelection();
      }
      setErrors({});
      setShowPropertyInfo(false);
    }
  }, [isOpen, initialData, user]);

  // Fetch eligible users for reporting (for Super Admins)
  useEffect(() => {
    if (isOpen && user?.roles?.includes('Super Administrador')) {
      const fetchEligibleUsers = async () => {
        setIsLoadingUsers(true);
        try {
          const [usersResp, rolesResp] = await Promise.all([
            administrativosApiService.getAdministrativos({ limit: 1000 }),
            rolesApiService.obtenerRoles()
          ]);

          const roles = Array.isArray(rolesResp) ? rolesResp : [];
          // Roles with reportes permissions - More robust filtering
          const eligibleRoleNames = roles
            .filter(r => {
              const roleName = r.nombre_rol || '';
              // Admins always have access
              if (['Super Administrador', 'Administrador'].includes(roleName)) return true;

              // Check permissions in any module that mentions "reporte"
              return Object.entries(r.permisos || {}).some(([moduleKey, perms]) => {
                const isReportModule = moduleKey.toLowerCase().includes('reporte');
                if (isReportModule && perms) {
                  return perms.ver || perms.crear || perms.editar || perms.full || perms.estado;
                }
                return false;
              });
            })
            .map(r => r.nombre_rol);

          const rawStaff = usersResp?.data?.data?.administrativos
            || usersResp?.data?.administrativos
            || usersResp?.administrativos
            || usersResp?.data?.data
            || [];

          const staff = Array.isArray(rawStaff) ? rawStaff : [];

          const filtered = staff.filter(u => {
            const userRole = u.rol_nombre ?? u.nombre_rol ?? (u.rol ? (typeof u.rol === 'string' ? u.rol : u.rol.nombre_rol) : '');
            return eligibleRoleNames.includes(userRole);
          });

          // Fallback: if filtered is empty but we have staff, use all staff (better than empty)
          const finalStaffList = filtered.length > 0 ? filtered : staff;

          const mapped = finalStaffList.map(u => {
            const persona = u.persona || u;
            const firstName = persona.primer_nombre || persona.nombre || u.nombre || '';
            const lastName = persona.primer_apellido || persona.apellido || u.apellido || '';
            const fullName = persona.nombre_completo || u.nombre_completo || `${firstName} ${lastName}`.trim();

            return {
              id_persona: Number(persona.id_persona ?? persona.id ?? u.id_persona ?? u.id_administrativo ?? u.id),
              nombre_completo: fullName || `ID: ${u.id_persona ?? u.id}`,
            };
          }).filter(u => u.id_persona && u.nombre_completo);

          setEligibleUsers(mapped);
        } catch (error) {
          console.error('Error fetching eligible users:', error);
        } finally {
          setIsLoadingUsers(false);
        }
      };
      fetchEligibleUsers();
    }
  }, [isOpen, user]);

  // Validar el formulario
  const validateForm = () => {
    const newErrors = {};

    if (!(formData.ubicacion || '').toString().trim()) {
      newErrors.ubicacion = 'La ubicación es requerida';
    }

    if (!(formData.tipoInmueble || '').toString().trim()) {
      newErrors.tipoInmueble = 'El tipo de inmueble es requerido';
    }

    if (!(formData.referencia || '').toString().trim()) {
      newErrors.referencia = 'La referencia es requerida';
    }

    if (!(formData.propietario || '').toString().trim()) {
      newErrors.propietario = 'El propietario es requerido';
    }

    if (!(formData.tipoReporte || '').toString().trim()) {
      newErrors.tipoReporte = 'El tipo de reporte es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambios en el formulario
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Manejar selección de propiedad desde el autocompletado
  const handlePropertySelect = (property) => {
    const propertyData = selectProperty(property);

    // Actualizar los campos del formulario con los datos de la propiedad
    setFormData(prev => ({
      ...prev,
      ...propertyData,
      id_inmueble: property?.id || propertyData?.id || null
    }));

    // Mostrar información de la propiedad seleccionada
    setShowPropertyInfo(true);

    // Limpiar errores de los campos que se autocompletaron
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.ubicacion;
      delete newErrors.tipoInmueble;
      delete newErrors.referencia;
      delete newErrors.propietario;
      return newErrors;
    });

    // Toast estilo Citas
    toast({
      title: 'Propiedad seleccionada',
      description: `Se seleccionó ${property?.referencia || propertyData?.referencia || 'la propiedad'} correctamente.`,
      variant: 'success',
    });
  };

  // Manejar cambio en el campo de referencia
  const handleReferenceChange = (value) => {
    setSearchTerm(value);
    handleChange('referencia', value);

    // Si el campo se vacía, limpiar la selección
    if (!value.trim()) {
      clearSelection();
      setShowPropertyInfo(false);
    }
  };

  // Manejar imágenes
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      file: file
    }));
    setImagenes(prev => [...prev, ...newImages]);

    // Toast estilo Citas
    toast({
      title: 'Imágenes agregadas',
      description: `${newImages.length} ${newImages.length === 1 ? 'imagen' : 'imágenes'} agregadas correctamente.`,
      variant: 'success',
    });
  };

  // Manejar archivos
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    setArchivos(prev => [...prev, ...newFiles]);

    // Toast estilo Citas
    toast({
      title: 'Archivos agregados',
      description: `${newFiles.length} ${newFiles.length === 1 ? 'archivo' : 'archivos'} agregados correctamente.`,
      variant: 'success',
    });
  };

  // Eliminar imagen
  const eliminarImagen = (id) => {
    setImagenes(prev => prev.filter(img => img.id !== id));
  };

  // Eliminar archivo
  const eliminarArchivo = (id) => {
    setArchivos(prev => prev.filter(file => file.id !== id));
  };

  // Agregar nuevo rubro
  const agregarRubro = () => {
    const nuevoRubro = {
      id: Date.now(),
      backendId: 0,
      nombre: '',
      descripcion: '',
      seguimientos: [],
      expandido: true,
      activo: true,
      fechaAnulacion: null
    };
    setRubros(prev => [...prev, nuevoRubro]);

    toast({
      title: 'Rubro agregado',
      description: 'Se creó un nuevo rubro correctamente.',
      variant: 'success',
    });
  };

  // Editar rubro
  const editarRubro = (id, field, value) => {
    setRubros(prev => prev.map(rubro =>
      rubro.id === id ? { ...rubro, [field]: value } : rubro
    ));
  };

  // Anular/Reactivar rubro (soft delete)
  const toggleRubroActivo = (id) => {
    const rubro = rubros.find(r => r.id === id);
    if (!rubro) return;

    const action = () => {
      setRubros(prev => prev.map(r =>
        r.id === id
          ? {
            ...r,
            activo: !r.activo,
            fechaAnulacion: !r.activo ? null : new Date().toISOString()
          }
          : r
      ));
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    };

    if (rubro.activo) {
      setConfirmConfig({
        isOpen: true,
        title: '¿Confirmar anulación?',
        message: '¿Estás seguro de que deseas anular este rubro? Esta acción se guardará al actualizar el reporte.',
        onConfirm: action,
        variant: 'danger'
      });
    } else {
      action();
    }
  };

  // Anular rubro (soft delete)
  const anularRubro = (id) => {
    setRubros(prev => prev.map(rubro =>
      rubro.id === id
        ? {
          ...rubro,
          activo: false,
          fechaAnulacion: new Date().toISOString()
        }
        : rubro
    ));
  };

  // Toggle expandir rubro
  const toggleRubro = (id) => {
    setRubros(prev => prev.map(rubro =>
      rubro.id === id ? { ...rubro, expandido: !rubro.expandido } : rubro
    ));
  };

  // Agregar seguimiento a rubro con debounce para evitar múltiples solicitudes
  let agregacionTimeout = null;
  const agregarSeguimientoRubro = (rubroId) => {
    if (agregacionTimeout) clearTimeout(agregacionTimeout);

    agregacionTimeout = setTimeout(() => {
      const nuevoSeguimiento = {
        id: Date.now(),
        backendId: 0,
        descripcion: '',
        fecha: getCurrentDateTimeLocal(),
        estado: 'pendiente',
        activo: true,
        fechaAnulacion: null,
        expandido: true,
        // Prefill: nombre completo del usuario autenticado
        responsable: getUserFullName()
      };

      setRubros(prev => prev.map(rubro =>
        rubro.id === rubroId
          ? { ...rubro, seguimientos: [...rubro.seguimientos, nuevoSeguimiento] }
          : rubro
      ));
    }, 300); // debounce delay 300ms

    toast({
      title: 'Seguimiento agregado',
      description: 'Se añadió un seguimiento al rubro correctamente.',
      variant: 'success',
    });
  };

  // Editar seguimiento de rubro
  const editarSeguimientoRubro = (rubroId, seguimientoId, field, value) => {
    setRubros(prev => prev.map(rubro =>
      rubro.id === rubroId
        ? {
          ...rubro,
          seguimientos: rubro.seguimientos.map(seg =>
            seg.id === seguimientoId ? { ...seg, [field]: value } : seg
          )
        }
        : rubro
    ));
  };

  // Toggle expandir seguimiento de rubro
  const toggleSeguimientoExpansion = (rubroId, seguimientoId) => {
    setRubros(prev => prev.map(rubro =>
      rubro.id === rubroId
        ? {
          ...rubro,
          seguimientos: rubro.seguimientos.map(seg =>
            seg.id === seguimientoId ? { ...seg, expandido: !seg.expandido } : seg
          )
        }
        : rubro
    ));
  };

  // Anular/Reactivar seguimiento (soft delete)
  const toggleSeguimientoActivo = (rubroId, seguimientoId) => {
    const rubro = rubros.find(r => r.id === rubroId);
    if (!rubro) return;

    const seguimiento = rubro.seguimientos.find(s => s.id === seguimientoId);
    if (!seguimiento) return;

    const action = () => {
      setRubros(prev => prev.map(r =>
        r.id === rubroId
          ? {
            ...r,
            seguimientos: r.seguimientos.map(seg =>
              seg.id === seguimientoId
                ? {
                  ...seg,
                  activo: !seg.activo,
                  fechaAnulacion: !seg.activo ? null : new Date().toISOString()
                }
                : seg
            )
          }
          : r
      ));
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    };

    if (seguimiento.activo) {
      setConfirmConfig({
        isOpen: true,
        title: '¿Confirmar anulación?',
        message: '¿Estás seguro de que deseas anular este seguimiento? Esta acción se guardará al actualizar el reporte.',
        onConfirm: action,
        variant: 'danger'
      });
    } else {
      action();
    }
  };



  // Hook global de toasts ya está definido arriba
  // const { toast } = useToast();

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Obtener seguimientos temporales del hook
      const temporaryFollowUps = getTemporaryFollowUps();

      const dataToSubmit = {
        ...formData,
        id_inmueble: selectedProperty?.id,
        rubros,
        imagenes,
        archivos,
        // Incluir seguimientos temporales para ser procesados por el servicio
        seguimientosTemporales: temporaryFollowUps,
        id_persona_reporta: formData.id_persona_reporta
      };

      await onSubmit(dataToSubmit);

      // Limpiar seguimientos temporales después del envío exitoso
      clearTemporaryFollowUps();

      toast({
        title: initialData ? 'Reporte actualizado' : 'Reporte creado',
        description: initialData
          ? 'El reporte fue actualizado correctamente.'
          : 'El reporte fue creado correctamente.',
        variant: 'success',
      });
      onClose();
    } catch (error) {
      console.error('Error al guardar reporte:', error);
      toast({
        title: 'Error al guardar reporte',
        description: error?.message || 'Intenta de nuevo.',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filtrar rubros activos para mostrar
  const rubrosVisibles = rubros.filter(rubro => rubro.activo !== false);
  const rubrosAnulados = rubros.filter(rubro => rubro.activo === false);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay (idéntico a "Nueva Cita") */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header (título y subtítulo igual a "Nueva Cita") */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {initialData ? 'Editar Reporte' : 'Nuevo Reporte'}
                </h2>
                <p className="text-slate-600 mt-1">
                  {initialData
                    ? 'Modifica la información del reporte inmobiliario'
                    : 'Crea un nuevo reporte inmobiliario detallado'}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </motion.button>
            </div>

            {/* Contenido con padding uniforme */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-6">
                <form onSubmit={handleSubmit} className="w-full">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Columna Izquierda - Información Principal */}
                    <div className="lg:col-span-2 space-y-4">

                      {/* Sección 1: Identificación de Propiedad */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center mb-3">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3">
                            <Building className="w-5 h-5 text-blue-600" />
                          </div>
                          <h3 className="text-base font-semibold text-gray-800">
                            Identificación de Propiedad
                          </h3>
                        </div>

                        {/* Referencia del Inmueble - Destacado */}
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Referencia del Inmueble *
                          </label>
                          <PropertyAutocomplete
                            value={searchTerm}
                            onChange={handleReferenceChange}
                            onPropertySelect={handlePropertySelect}
                            onSearchChange={setSearchTerm}
                            filteredProperties={filteredProperties}
                            isSearching={isSearching}
                            placeholder="Buscar por referencia (ej: J001) o nombre..."
                            className="w-full"
                            error={!!errors.referencia}
                          />
                          {errors.referencia && (
                            <p className="text-red-500 text-xs mt-1">{errors.referencia}</p>
                          )}
                        </div>

                        {/* Grid de campos básicos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Ubicación */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Ubicación *
                            </label>
                            <Input
                              value={formData.ubicacion}
                              onChange={(e) => handleChange('ubicacion', e.target.value)}
                              placeholder="Ingrese la ubicación"
                              className={errors.ubicacion ? 'border-red-500' : ''}
                              readOnly={!!selectedProperty}
                            />
                            {errors.ubicacion && (
                              <p className="text-red-500 text-xs mt-1">{errors.ubicacion}</p>
                            )}
                          </div>

                          {/* Tipo de Inmueble */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tipo de Inmueble *
                            </label>
                            <Select
                              value={formData.tipoInmueble}
                              onValueChange={(value) => handleChange('tipoInmueble', value)}
                              disabled={!!selectedProperty}
                            >
                              <SelectTrigger className={errors.tipoInmueble ? 'border-red-500' : ''}>
                                <SelectValue placeholder="Seleccione el tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Casa">Casa</SelectItem>
                                <SelectItem value="Apartamento">Apartamento</SelectItem>
                                <SelectItem value="Apartaestudio">Apartaestudio</SelectItem>
                                <SelectItem value="Local">Local</SelectItem>
                                <SelectItem value="Finca">Finca</SelectItem>
                                <SelectItem value="Bodega">Bodega</SelectItem>
                                <SelectItem value="Oficina">Oficina</SelectItem>
                                <SelectItem value="Lote">Lote</SelectItem>
                                <SelectItem value="Edificio">Edificio</SelectItem>
                                <SelectItem value="Otro">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                            {errors.tipoInmueble && (
                              <p className="text-red-500 text-xs mt-1">{errors.tipoInmueble}</p>
                            )}
                          </div>

                          {/* Propietario */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Propietario *
                            </label>
                            <Input
                              value={formData.propietario}
                              onChange={(e) => handleChange('propietario', e.target.value)}
                              placeholder="Nombre del propietario"
                              className={errors.propietario ? 'border-red-500' : ''}
                              readOnly={!!selectedProperty}
                            />
                            {errors.propietario && (
                              <p className="text-red-500 text-xs mt-1">{errors.propietario}</p>
                            )}
                          </div>

                          {/* Tipo de Reporte */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tipo de Reporte *
                            </label>
                            <Input
                              value={formData.tipoReporte}
                              onChange={(e) => handleChange('tipoReporte', e.target.value)}
                              placeholder="Ej: Daño reparar, Techos, etc."
                              className={errors.tipoReporte ? 'border-red-500' : ''}
                            />
                            {errors.tipoReporte && (
                              <p className="text-red-500 text-xs mt-1">{errors.tipoReporte}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Responsable del Reporte (debajo y más pequeño) */}
                      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm mt-4">
                        <div className="flex items-center mb-2">
                          <div className="p-1.5 bg-blue-100 rounded-lg mr-2">
                            <UserIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <h4 className="text-sm font-semibold text-gray-800">
                            Responsable del Reporte
                          </h4>
                        </div>
                        {user?.roles?.includes('Super Administrador') ? (
                          <Select
                            value={String(formData.responsable || '')}
                            onValueChange={(value) => {
                              const selectedUser = eligibleUsers.find(u => u.nombre_completo === value);
                              handleChange('responsable', value);
                              if (selectedUser) {
                                handleChange('id_persona_reporta', selectedUser.id_persona);
                              }
                            }}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder={isLoadingUsers ? "Cargando..." : "Seleccione un responsable"} />
                            </SelectTrigger>
                            <SelectContent>
                              {eligibleUsers.map((u) => (
                                <SelectItem key={`${u.id_persona}-${u.nombre_completo}`} value={u.nombre_completo}>
                                  {u.nombre_completo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={formData.responsable || getUserFullName()}
                            readOnly
                            disabled
                            className="text-sm bg-gray-50 cursor-not-allowed"
                          />
                        )}
                      </div>
                    </div>

                    {/* Columna Derecha - Estado y Acciones */}
                    <div className="space-y-4">

                      {/* Estado del Reporte */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center mb-4">
                          <div className="p-2 bg-purple-100 rounded-lg mr-3">
                            <AlertCircle className="w-5 h-5 text-purple-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800">
                            Estado
                          </h3>
                        </div>

                        <Select
                          value={formData.estado}
                          onValueChange={(value) => handleChange('estado', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione el estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pendiente">
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                                Pendiente
                              </div>
                            </SelectItem>
                            <SelectItem value="En proceso">
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                En proceso
                              </div>
                            </SelectItem>
                            <SelectItem value="Completado">
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                Completado
                              </div>
                            </SelectItem>
                            <SelectItem value="Cancelado">
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                Cancelado
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Información del Reporte (compacto y arriba) */}
                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Información del Reporte
                        </h4>

                        <div className="space-y-2 text-xs text-gray-700">
                          {/* Fecha y hora de creación (combinadas) */}
                          <div className="flex items-start gap-2">
                            <CalendarIcon className="w-3 h-3 text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-gray-600">Fecha y hora de creación</p>
                              <p className="font-medium text-gray-900">
                                {formData.fechaCreacion
                                  ? `${formData.fechaCreacion}${formData.horaCreacion ? ` ${formData.horaCreacion}` : ''}`
                                  : 'No definida'}
                              </p>
                            </div>
                          </div>

                          {/* Estado actual (Cancelado en rojo) */}
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-3 h-3 text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-gray-600">Estado actual</p>
                              <span
                                className={`font-medium px-2 py-1 rounded-full text-[10px] inline-block
                              ${formData.estado === 'Pendiente'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : formData.estado === 'En proceso'
                                      ? 'bg-blue-100 text-blue-700'
                                      : formData.estado === 'Completado'
                                        ? 'bg-green-100 text-green-700'
                                        : formData.estado === 'Cancelado'
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-gray-100 text-gray-700'
                                  }
                            `}
                              >
                                {formData.estado || 'No definido'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Descripción del Reporte - ancho completo */}
                    <div className="lg:col-span-3">
                      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mt-4">
                        <div className="flex items-center mb-4">
                          <div className="p-2 bg-orange-100 rounded-lg mr-3">
                            <FileText className="w-5 h-5 text-orange-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800">
                            Descripción del Reporte
                          </h3>
                        </div>

                        <Textarea
                          value={formData.descripcion}
                          onChange={(e) => handleChange('descripcion', e.target.value)}
                          placeholder="Descripción detallada del reporte..."
                          className="w-full min-h-[160px] resize-y"
                          rows={6}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección de Imágenes y Archivos - Ancho completo */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

                    {/* Imágenes */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 rounded-lg mr-3">
                            <ImageIcon className="w-5 h-5 text-green-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800">
                            Imágenes
                          </h3>
                        </div>
                        <input
                          type="file"
                          ref={imageInputRef}
                          onChange={handleImageUpload}
                          accept="image/*"
                          multiple
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => imageInputRef.current?.click()}
                          className="flex items-center space-x-2 border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <UploadIcon className="w-4 h-4" />
                          <span>Subir</span>
                        </Button>
                      </div>

                      {imagenes.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {imagenes.map((imagen, index) => (
                            <div key={imagen.id ?? index} className="relative group">
                              <img
                                src={imagen.url}
                                alt={`Imagen ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => eliminarImagen(imagen.id)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">No hay imágenes</p>
                        </div>
                      )}
                    </div>

                    {/* Archivos */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3">
                            <FileIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800">
                            Archivos
                          </h3>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          multiple
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center space-x-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <UploadIcon className="w-4 h-4" />
                          <span>Subir</span>
                        </Button>
                      </div>

                      {archivos.length > 0 ? (
                        <div className="space-y-2">
                          {archivos.map((archivo, index) => (
                            <div key={archivo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                              <div className="flex items-center space-x-3">
                                <FileIcon className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700 truncate">
                                  {archivo.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => eliminarArchivo(archivo.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                          <FileIcon className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">No hay archivos</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seguimiento General */}
                  {/* Separador visual entre Archivos/Imágenes y Seguimiento */}
                  <div className="mt-8 border-t border-gray-200" />

                  {/* Bloque de Seguimiento General con separación */}
                  <div className="mt-6">
                    <GeneralFollowUpSection
                      reportId={numericReportId}
                      followUps={followUps}
                      onAddFollowUp={addFollowUp}
                      onUpdateFollowUpStatus={updateFollowUpStatus}
                      currentUser={currentUser}
                      isEditing={true}
                      newFollowUpNote={newFollowUpNote}
                      onNewFollowUpChange={handleNewFollowUpChange}
                      isSubmitting={followUpsSubmitting}
                    />
                  </div>

                  {/* Rubros del Proyecto */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-blue-600" />
                        Rubros del Proyecto
                      </h3>
                      <Button
                        type="button"
                        onClick={agregarRubro}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors px-4"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Agregar Rubro
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {/* Rubros Activos */}
                      {rubrosVisibles.map((rubro) => (
                        <div key={rubro.id} className="bg-white border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <button
                              type="button"
                              onClick={() => toggleRubro(rubro.id)}
                              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                            >
                              {rubro.expandido ? (
                                <ChevronDownIcon className="w-4 h-4" />
                              ) : (
                                <ChevronRightIcon className="w-4 h-4" />
                              )}
                              <span className="font-medium">
                                {rubro.nombre || 'Nuevo Rubro'}
                              </span>
                            </button>

                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                onClick={() => toggleRubroActivo(rubro.id)}
                                size="sm"
                                variant="outline"
                                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                              >
                                Anular
                              </Button>
                              {/* Eliminado: botón de eliminar permanente */}
                              {/* Antes: mostrar Trash cuando !initialData && !rubro.nombre.trim() */}
                            </div>
                          </div>

                          {rubro.expandido && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre del Rubro
                                  </label>
                                  <Input
                                    value={rubro.nombre}
                                    onChange={(e) => editarRubro(rubro.id, 'nombre', e.target.value)}
                                    placeholder="Ej: Plomería, Electricidad..."
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Descripción
                                </label>
                                <Textarea
                                  value={rubro.descripcion}
                                  onChange={(e) => editarRubro(rubro.id, 'descripcion', e.target.value)}
                                  placeholder="Descripción detallada del rubro..."
                                  rows={2}
                                />
                              </div>

                              {/* Seguimientos del rubro */}
                              <div className="border-t pt-3">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-sm font-medium text-gray-800 flex items-center">
                                    <ClipboardListIcon className="w-4 h-4 mr-2 text-blue-600" />
                                    Seguimientos del Rubro
                                    <Badge
                                      variant="secondary"
                                      className="ml-2 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2"
                                    >
                                      {rubro.seguimientos.filter(seg => seg.activo !== false).length}
                                    </Badge>
                                  </h4>
                                  <Button
                                    type="button"
                                    onClick={() => agregarSeguimientoRubro(rubro.id)}
                                    size="sm"
                                    variant="outline"
                                    className="text-white bg-blue-600 hover:bg-blue-700 border-blue-600 text-xs px-3 py-1 rounded-md shadow-sm"
                                  >
                                    <PlusIcon className="w-3 h-3 mr-1" />
                                    Nuevo Seguimiento
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  {rubro.seguimientos.filter(seg => seg.activo !== false).map((seguimiento, index) => {
                                    const isCreated = seguimiento.backendId > 0;
                                    return (
                                      <div
                                        key={seguimiento.id}
                                        className={`bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow group ${isCreated ? 'opacity-90 bg-slate-50/50' : ''}`}
                                      >
                                        {/* Header del seguimiento */}
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center space-x-2">
                                            <div className="w-7 h-7 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-full flex items-center justify-center">
                                              <span className="text-xs font-semibold text-blue-700">#{index + 1}</span>
                                            </div>
                                            <span className="text-sm font-medium text-slate-800">Seguimiento {index + 1}</span>
                                          </div>

                                          <div className="flex items-center space-x-2">
                                            <button
                                              type="button"
                                              onClick={() => toggleSeguimientoExpansion(rubro.id, seguimiento.id)}
                                              className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-500"
                                              title={seguimiento.expandido ? "Colapsar" : "Expandir"}
                                            >
                                              {seguimiento.expandido ? (
                                                <ChevronUpIcon className="w-5 h-5" />
                                              ) : (
                                                <ChevronDownIcon className="w-5 h-5" />
                                              )}
                                            </button>
                                            <span
                                              className={`text-[11px] px-2 py-1 rounded-full border ${seguimiento.estado === 'completado'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : seguimiento.estado === 'en-proceso'
                                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                }`}
                                            >
                                              {seguimiento.estado ? seguimiento.estado[0].toUpperCase() + seguimiento.estado.slice(1) : 'Pendiente'}
                                            </span>
                                            <Button
                                              type="button"
                                              onClick={() => toggleSeguimientoActivo(rubro.id, seguimiento.id)}
                                              size="sm"
                                              variant="outline"
                                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs px-2 py-1 rounded-md"
                                            >
                                              <XCircleIcon className="w-3 h-3 mr-1" />
                                              Anular
                                            </Button>
                                          </div>
                                        </div>

                                        {/* Campos organizados en grid */}
                                        <AnimatePresence>
                                          {seguimiento.expandido && (
                                            <motion.div
                                              initial={{ opacity: 0, height: 0 }}
                                              animate={{ opacity: 1, height: 'auto' }}
                                              exit={{ opacity: 0, height: 0 }}
                                              className="overflow-hidden"
                                            >
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                                <div>
                                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                                    <CalendarIcon className="w-3 h-3 inline mr-1 text-slate-500" />
                                                    Fecha
                                                  </label>
                                                  <Input
                                                    type="datetime-local"
                                                    value={seguimiento.fecha}
                                                    onChange={(e) => editarSeguimientoRubro(rubro.id, seguimiento.id, 'fecha', e.target.value)}
                                                    className="text-xs h-8"
                                                    disabled={isCreated}
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                                    Estado
                                                  </label>
                                                  <Select
                                                    value={seguimiento.estado}
                                                    onValueChange={(value) => editarSeguimientoRubro(rubro.id, seguimiento.id, 'estado', value)}
                                                    disabled={isCreated}
                                                  >
                                                    <SelectTrigger className={`text-xs h-8 ${isCreated ? 'bg-slate-50' : ''}`}>
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="text-xs">
                                                      <SelectItem value="pendiente">
                                                        <div className="flex items-center">
                                                          <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                                                          Pendiente
                                                        </div>
                                                      </SelectItem>
                                                      <SelectItem value="en-proceso">
                                                        <div className="flex items-center">
                                                          <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                                                          En Proceso
                                                        </div>
                                                      </SelectItem>
                                                      <SelectItem value="completado">
                                                        <div className="flex items-center">
                                                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                                          Completado
                                                        </div>
                                                      </SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              </div>

                                              {/* Responsable */}
                                              <div className="mb-3">
                                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                                  <UserIcon className="w-3 h-3 inline mr-1 text-slate-500" />
                                                  Responsable
                                                </label>
                                                <Input
                                                  value={seguimiento.responsable || ''}
                                                  onChange={(e) => editarSeguimientoRubro(rubro.id, seguimiento.id, 'responsable', e.target.value)}
                                                  placeholder="Nombre del responsable"
                                                  className="text-xs h-8"
                                                  disabled={isCreated}
                                                />
                                              </div>

                                              {/* Descripción */}
                                              <div>
                                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                                  <FileText className="w-3 h-3 inline mr-1 text-slate-500" />
                                                  Descripción
                                                </label>
                                                <Textarea
                                                  value={seguimiento.descripcion}
                                                  onChange={(e) => editarSeguimientoRubro(rubro.id, seguimiento.id, 'descripcion', e.target.value)}
                                                  placeholder="Describe las actividades realizadas o por realizar..."
                                                  rows={2}
                                                  className="text-xs resize-none"
                                                  disabled={isCreated}
                                                />
                                              </div>

                                              {/* Indicador de estado visual */}
                                              <div className="mt-3 pt-2 border-t border-slate-100">
                                                <div className="flex items-center justify-between text-xs text-slate-600">
                                                  <span>Estado actual:</span>
                                                  <div className="flex items-center">
                                                    <div
                                                      className={`w-2 h-2 rounded-full mr-2 ${seguimiento.estado === 'completado'
                                                        ? 'bg-green-400'
                                                        : seguimiento.estado === 'en-proceso'
                                                          ? 'bg-blue-400'
                                                          : 'bg-yellow-400'
                                                        }`}
                                                    ></div>
                                                    <span className="capitalize">{seguimiento.estado || 'pendiente'}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    );
                                  })}

                                  {/* Indicador de progreso del rubro */}
                                  <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-medium text-slate-800">Progreso del rubro:</span>
                                      <span className="text-slate-700">
                                        {rubro.seguimientos.filter(seg => seg.activo !== false && seg.estado === 'completado').length} de {rubro.seguimientos.filter(seg => seg.activo !== false).length} completados
                                      </span>
                                    </div>
                                    <div className="mt-2 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                      <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{
                                          width: `${rubro.seguimientos.filter(seg => seg.activo !== false).length > 0
                                            ? (rubro.seguimientos.filter(seg => seg.activo !== false && seg.estado === 'completado').length / rubro.seguimientos.filter(seg => seg.activo !== false).length) * 100
                                            : 0}%`
                                        }}
                                      ></div>
                                    </div>
                                  </div>

                                  {/* Seguimientos Anulados */}
                                  {rubro.seguimientos.filter(seg => seg.activo === false).length > 0 && (
                                    <div className="mt-3">
                                      <h5 className="text-xs font-medium text-slate-600 mb-2 flex items-center">
                                        <XCircleIcon className="w-3 h-3 mr-1 text-red-500" />
                                        Seguimientos Anulados ({rubro.seguimientos.filter(seg => seg.activo === false).length})
                                      </h5>
                                      <div className="space-y-2">
                                        {rubro.seguimientos.filter(seg => seg.activo === false).map((seguimiento) => (
                                          <div key={seguimiento.id} className="bg-red-50 border border-red-200 rounded p-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center space-x-2">
                                                <CalendarIcon className="w-3 h-3 text-slate-500" />
                                                <span className="text-xs text-slate-700">{seguimiento.fecha}</span>
                                                <Badge className="text-[11px] bg-red-100 text-red-700 border border-red-200 rounded-full">
                                                  {seguimiento.estado}
                                                </Badge>
                                                <span className="text-[11px] text-red-700">
                                                  (Anulado: {new Date(seguimiento.fechaAnulacion).toLocaleDateString()})
                                                </span>
                                              </div>
                                              <Button
                                                type="button"
                                                onClick={() => toggleSeguimientoActivo(rubro.id, seguimiento.id)}
                                                size="sm"
                                                variant="outline"
                                                className="text-green-700 border-green-200 hover:bg-green-50 text-xs px-2 py-1 rounded-md"
                                              >
                                                Reactivar
                                              </Button>
                                            </div>
                                            <p className="text-xs text-slate-700 line-through">
                                              {seguimiento.descripcion || 'Sin descripción'}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Rubros Anulados */}
                      {rubrosAnulados.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                            <XCircleIcon className="w-4 h-4 mr-2" />
                            Rubros Anulados ({rubrosAnulados.length})
                          </h4>
                          <div className="space-y-2">
                            {rubrosAnulados.map((rubro) => (
                              <div key={rubro.id} className="bg-gray-100 border border-gray-300 rounded-lg p-3 opacity-60">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <XCircleIcon className="w-4 h-4 text-red-500" />
                                    <div>
                                      <span className="font-medium text-gray-700 line-through">
                                        {rubro.nombre || 'Rubro sin nombre'}
                                      </span>
                                      <p className="text-xs text-gray-500">
                                        Anulado el {new Date(rubro.fechaAnulacion).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    onClick={() => toggleRubroActivo(rubro.id)}
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                  >
                                    Reactivar
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {rubrosVisibles.length === 0 && rubrosAnulados.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>No hay rubros agregados</p>
                          <p className="text-sm">Haz clic en "Agregar Rubro" para comenzar</p>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer (acciones a la derecha, misma paleta) */}
            < div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4" >
              <Button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all ease-in-out duration-200"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all ease-in-out duration-200"
              >
                {isSubmitting ? 'Guardando...' : submitLabel}
              </Button>
            </div >
          </motion.div >

          {/* Diálogo de Confirmación */}
          <ConfirmationDialog
            isOpen={confirmConfig.isOpen}
            onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmConfig.onConfirm}
            title={confirmConfig.title}
            message={confirmConfig.message}
            variant={confirmConfig.variant}
            confirmText="Sí, continuar"
            cancelText="Cancelar"
          />
        </div >
      )}
    </AnimatePresence >,
    document.body
  );
};

export default CreateReportModal;