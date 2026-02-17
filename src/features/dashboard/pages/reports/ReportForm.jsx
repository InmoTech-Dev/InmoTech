import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Badge } from '@/shared/components/ui/badge'
import { PlusIcon, EditIcon, TrashIcon, UploadIcon, FileIcon, ImageIcon, ChevronDownIcon, ChevronRightIcon, CheckIcon, UserIcon, CalendarIcon, SaveIcon, XCircleIcon, ClipboardListIcon, ClockIcon, BuildingIcon, MapPinIcon, FileTextIcon } from 'lucide-react'
import { motion } from 'framer-motion'

export function ReportForm({ 
  initialData = {}, 
  onSubmit, 
  onCancel,
  submitLabel = 'Guardar Reporte',
  isSubmitting = false
}) {
  // Determinar si estamos en modo edición basándose en si hay un ID o datos específicos del reporte
  const isEditMode = initialData && (initialData.id || initialData.tipoReporte || initialData.propietario)
  // Función para obtener la fecha actual en formato ISO
  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  // Función para obtener fecha y hora actual en formato legible
  const getCurrentDateTime = () => {
    const now = new Date()
    return now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    }) + ' pm'
  }

  // Valores por defecto para el formulario
  const defaultFormData = {
    ubicacion: '',
    tipoInmueble: '',
    referencia: '',
    propietario: '',
    tipoReporte: '',
    descripcion: '',
    fecha: getCurrentDate(), // Fecha automática
    fechaCreacion: getCurrentDateTime(), // Fecha y hora de creación
    estado: 'En proceso',
    seguimientoGeneral: ''
  }

  // Estados del formulario
  const [formData, setFormData] = useState({...defaultFormData, ...(initialData || {})})
  const [rubros, setRubros] = useState((initialData && initialData.rubros) || (isEditMode ? [
    {
      id: 1,
      nombre: 'Baños',
      descripcion: 'Inspección y reparaciones de baños',
      estado: 'En proceso',
      activo: true,
      fechaAnulacion: null,
      seguimientos: [
        {
          id: 1,
          tipo: 'Iniciado',
          responsable: 'Admin',
          fecha: '19/03/2025 16:00 pm',
          descripcion: 'Visita del inmueble para identificar el reporte',
          subSeguimientos: 2
        },
        {
          id: 2,
          tipo: 'Cotizando',
          responsable: 'Admin',
          fecha: '19/03/2025 17:00 pm',
          descripcion: 'Citación a la inspección para negociar el anexo entre las partes',
          subSeguimientos: 0
        }
      ]
    },
    {
      id: 2,
      nombre: 'Ventanas',
      descripcion: 'Revisión y mantenimiento de ventanas',
      estado: 'Pendiente',
      activo: true,
      fechaAnulacion: null,
      seguimientos: []
    }
  ] : []))
  const [imagenes, setImagenes] = useState([])
  const [archivos, setArchivos] = useState([])
  const [expandedRubros, setExpandedRubros] = useState({})
  const rubroInputRefs = useRef({})
  const [errors, setErrors] = useState({})  
  const formRef = useRef(null)

  // Estados para seguimientos específicos
  const [seguimientos, setSeguimientos] = useState((initialData && initialData.seguimientos) || [])
  const [nuevoSeguimiento, setNuevoSeguimiento] = useState({
    responsable: '',
    estado: 'iniciado',
    descripcion: ''
  })

  // Función para obtener color del estado
  const getEstadoColor = (estado) => {
    const colores = {
      'iniciado': 'bg-blue-100 text-blue-800',
      'en-proceso': 'bg-yellow-100 text-yellow-800',
      'completado': 'bg-green-100 text-green-800',
      'pendiente': 'bg-gray-100 text-gray-800'
    }
    return colores[estado] || 'bg-gray-100 text-gray-800'
  }

  // Función para agregar seguimiento
  const agregarSeguimientoReporte = () => {
    if (!nuevoSeguimiento.descripcion.trim() || !nuevoSeguimiento.responsable.trim()) {
      return
    }

    const nuevoSeg = {
      id: Date.now(),
      ...nuevoSeguimiento,
      fecha: getCurrentDateTime()
    }

    setSeguimientos(prev => [...prev, nuevoSeg])
    setNuevoSeguimiento({
      responsable: '',
      estado: 'iniciado',
      descripcion: ''
    })
  }

  // Función para eliminar seguimiento
  const eliminarSeguimientoReporte = (seguimientoId) => {
    setSeguimientos(prev => prev.filter(seg => seg.id !== seguimientoId))
  }

  // Actualizar el formulario si cambian los datos iniciales
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData({
        ...defaultFormData, 
        ...initialData,
        // Asegurar que siempre tenga fecha actual si no viene en initialData
        fecha: initialData.fecha || getCurrentDate(),
        fechaCreacion: initialData.fechaCreacion || getCurrentDateTime()
      })
      setRubros((initialData && initialData.rubros) || rubros)
    }
  }, [initialData])

  // Manejadores de eventos
  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    })
  }

  const handleImagenes = useCallback((files) => {
    const imagenesArray = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      nombre: file.name
    }))
    setImagenes(prev => [...prev, ...imagenesArray])
  }, [])

  const handleArchivos = useCallback((files) => {
    const archivosArray = Array.from(files).map(file => ({
      file,
      nombre: file.name,
      tipo: file.type,
      tamaño: file.size
    }))
    setArchivos(prev => [...prev, ...archivosArray])
  }, [])

  const agregarRubro = () => {
    const nuevoRubro = {
      id: Date.now(),
      nombre: '',
      descripcion: '',
      estado: 'Pendiente',
      activo: true, // Nuevo campo para soft delete
      fechaAnulacion: null, // Fecha cuando se anuló
      seguimientos: []
    }
    setRubros([...rubros, nuevoRubro])
    
    // Enfocar automáticamente el campo de nombre del nuevo rubro
    setTimeout(() => {
      if (rubroInputRefs.current[nuevoRubro.id]) {
        rubroInputRefs.current[nuevoRubro.id].focus()
      }
    }, 100)
  }

  const editarRubro = (id, campo, valor) => {
    setRubros(rubros.map(rubro => 
      rubro.id === id ? { ...rubro, [campo]: valor } : rubro
    ))
  }

  // Anular/Reactivar rubro (soft delete)
  const toggleRubroActivo = (id) => {
    setRubros(rubros.map(rubro => 
      rubro.id === id 
        ? { 
            ...rubro, 
            activo: !rubro.activo,
            fechaAnulacion: !rubro.activo ? null : new Date().toISOString()
          } 
        : rubro
    ))
  }

  // Eliminar rubro permanentemente (solo para rubros nuevos sin guardar)
  const eliminarRubroPermanente = (id) => {
    const rubro = rubros.find(r => r.id === id)
    if (rubro && !rubro.nombre.trim()) {
      // Solo eliminar si es un rubro vacío recién creado
      setRubros(rubros.filter(rubro => rubro.id !== id))
    }
  }
  
  const eliminarRubro = (id) => {
    setRubros(rubros.filter(rubro => rubro.id !== id))
  }

  const agregarSeguimiento = (rubroId) => {
    const nuevoSeguimiento = {
      id: Date.now(),
      tipo: 'Iniciado',
      responsable: 'Admin',
      fecha: getCurrentDateTime(), // Fecha automática para seguimientos
      descripcion: '',
      subSeguimientos: 0
    }
    
    setRubros(rubros.map(rubro => 
      rubro.id === rubroId 
        ? { ...rubro, seguimientos: [...rubro.seguimientos, nuevoSeguimiento] }
        : rubro
    ))
  }

  const editarSeguimiento = (rubroId, seguimientoId, campo, valor) => {
    setRubros(rubros.map(rubro => 
      rubro.id === rubroId 
        ? {
            ...rubro,
            seguimientos: rubro.seguimientos.map(seg =>
              seg.id === seguimientoId ? { ...seg, [campo]: valor } : seg
            )
          }
        : rubro
    ))
  }

  const eliminarSeguimiento = (rubroId, seguimientoId) => {
    setRubros(rubros.map(rubro => 
      rubro.id === rubroId 
        ? {
            ...rubro,
            seguimientos: rubro.seguimientos.filter(seg => seg.id !== seguimientoId)
          }
        : rubro
    ))
  }

  const toggleRubro = (rubroId) => {
    setExpandedRubros(prev => ({
      ...prev,
      [rubroId]: !prev[rubroId]
    }))
  }
  
  const toggleRubroExpansion = toggleRubro

  // Obtener color del estado
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pendiente':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'en proceso':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completado':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTipoColor = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'iniciado':
        return 'bg-blue-100 text-blue-800'
      case 'cotizando':
        return 'bg-yellow-100 text-yellow-800'
      case 'completado':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Filtrar rubros para mostrar
  const rubrosActivos = rubros.filter(rubro => rubro.activo !== false)
  const rubrosAnulados = rubros.filter(rubro => rubro.activo === false)
  
  // Calcular resumen de progreso
  const calcularResumen = () => {
    const totalRubros = rubrosActivos.length
    const totalSeguimientos = rubrosActivos.reduce((acc, rubro) => acc + rubro.seguimientos.length, 0)
    const totalProcesos = rubrosActivos.reduce((acc, rubro) => {
      return acc + rubro.seguimientos.reduce((segAcc, seg) => segAcc + (seg.subSeguimientos || 0), 0)
    }, 0) + totalSeguimientos

    const pendientes = rubrosActivos.filter(r => r.estado === 'Pendiente').length
    const enProceso = rubrosActivos.filter(r => r.estado === 'En proceso').length

    return { 
      totalRubros, 
      totalSeguimientos, 
      totalProcesos: totalProcesos,
      pendientes, 
      enProceso 
    }
  }

  const resumen = calcularResumen()

  // Limpiar las URLs de vista previa cuando el componente se desmonte
  useEffect(() => {
    return () => {
      imagenes.forEach(imagen => {
        URL.revokeObjectURL(imagen.preview)
      })
    }
  }, [imagenes])

  // Validar el formulario
  const validateForm = () => {
    const newErrors = {}
    if (!formData.ubicacion) newErrors.ubicacion = 'La ubicación es obligatoria'
    if (!formData.tipoInmueble) newErrors.tipoInmueble = 'El tipo de inmueble es obligatorio'
    if (!formData.referencia.trim()) newErrors.referencia = 'La referencia es obligatoria'
    if (!formData.propietario.trim()) newErrors.propietario = 'El propietario es obligatorio'
    if (!formData.tipoReporte.trim()) newErrors.tipoReporte = 'El título del reporte es obligatorio'
    if (!formData.descripcion.trim()) newErrors.descripcion = 'La descripción es obligatoria'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Manejar el envío del formulario
  const handleFormSubmit = () => {
    if (!validateForm()) {
      return
    }

    // Asegurar que la fecha esté actualizada al momento del envío
    const dataToSubmit = {
      ...formData,
      fecha: getCurrentDate(),
      fechaActualizacion: getCurrentDateTime(),
      rubros,
      imagenes,
      archivos,
      seguimientos // Agregar seguimientos al envío
    }
    onSubmit(dataToSubmit)
  }

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header del formulario */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <ClipboardListIcon className="w-6 h-6 text-slate-600" />
                {initialData && Object.keys(initialData).length > 0 ? 'Editar Reporte' : 'Nuevo Reporte'}
              </h2>
              <p className="text-slate-600 mt-1">
                {initialData && Object.keys(initialData).length > 0 
                  ? 'Modifique la información del reporte inmobiliario'
                  : 'Complete la información para crear un nuevo reporte inmobiliario'
                }
              </p>
              <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                <ClockIcon className="w-3 h-3" />
                <span>Creado el: {formData.fechaCreacion || getCurrentDateTime()}</span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onCancel}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <XCircleIcon className="w-5 h-5 text-slate-500" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div ref={formRef} className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
        <div className="space-y-8">
          {/* Información básica del reporte */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-slate-200 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <BuildingIcon className="w-5 h-5 text-slate-600" />
              Información Básica
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <MapPinIcon className="w-4 h-4 inline mr-2" />
                  Ubicación *
                </label>
                <Select value={formData.ubicacion} onValueChange={(value) => handleChange('ubicacion', value)}>
                  <SelectTrigger className={`w-full ${errors.ubicacion ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Seleccionar ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quito">Quito</SelectItem>
                    <SelectItem value="guayaquil">Guayaquil</SelectItem>
                    <SelectItem value="cuenca">Cuenca</SelectItem>
                  </SelectContent>
                </Select>
                {errors.ubicacion && (
                  <p className="text-red-500 text-sm mt-1">{errors.ubicacion}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo Inmueble *
                </label>
                <Select value={formData.tipoInmueble} onValueChange={(value) => handleChange('tipoInmueble', value)}>
                  <SelectTrigger className={`w-full ${errors.tipoInmueble ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                    <SelectItem value="apartaestudio">Apartaestudio</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="finca">Finca</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipoInmueble && (
                  <p className="text-red-500 text-sm mt-1">{errors.tipoInmueble}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Referencia *
                </label>
                <Input 
                  type="text" 
                  placeholder="Ej: Apto 502"
                  value={formData.referencia}
                  onChange={(e) => handleChange('referencia', e.target.value)}
                  className={errors.referencia ? 'border-red-500' : ''}
                />
                {errors.referencia && (
                  <p className="text-red-500 text-sm mt-1">{errors.referencia}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <UserIcon className="w-4 h-4 inline mr-2" />
                  Propietario *
                </label>
                <Input 
                  type="text" 
                  placeholder="Nombre del propietario"
                  value={formData.propietario}
                  onChange={(e) => handleChange('propietario', e.target.value)}
                  className={errors.propietario ? 'border-red-500' : ''}
                />
                {errors.propietario && (
                  <p className="text-red-500 text-sm mt-1">{errors.propietario}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título Reporte *
                </label>
                <Input 
                  type="text" 
                  placeholder="Ej: Reparación integral apartamento"
                  value={formData.tipoReporte}
                  onChange={(e) => handleChange('tipoReporte', e.target.value)}
                  className={errors.tipoReporte ? 'border-red-500' : ''}
                />
                {errors.tipoReporte && (
                  <p className="text-red-500 text-sm mt-1">{errors.tipoReporte}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción *
                </label>
                <Textarea 
                  placeholder="Descripción general del reporte..."
                  rows={4}
                  value={formData.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  className={errors.descripcion ? 'border-red-500' : ''}
                />
                {errors.descripcion && (
                  <p className="text-red-500 text-sm mt-1">{errors.descripcion}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Estado
                </label>
                <Select value={formData.estado} onValueChange={(value) => handleChange('estado', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccione estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="En proceso">En proceso</SelectItem>
                    <SelectItem value="Completado">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Archivos e Imágenes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-slate-200 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileTextIcon className="w-5 h-5 text-slate-600" />
              Archivos e Imágenes
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors bg-slate-50">
                <ImageIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <p className="text-sm text-slate-600 mb-2 font-medium">Subir imágenes</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImagenes(e.target.files)}
                  className="hidden"
                  id="upload-images"
                />
                <label htmlFor="upload-images" className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                  Seleccionar archivos
                </label>
                {imagenes.length > 0 && (
                  <div className="mt-3 text-sm text-slate-500">
                    <Badge variant="secondary">{imagenes.length} imagen(es) seleccionada(s)</Badge>
                  </div>
                )}
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors bg-slate-50">
                <FileIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <p className="text-sm text-slate-600 mb-2 font-medium">Subir archivos</p>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleArchivos(e.target.files)}
                  className="hidden"
                  id="upload-files"
                />
                <label htmlFor="upload-files" className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                  Seleccionar archivos
                </label>
                {archivos.length > 0 && (
                  <div className="mt-3 text-sm text-slate-500">
                    <Badge variant="secondary">{archivos.length} archivo(s) seleccionado(s)</Badge>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Seguimiento General */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-slate-200 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileTextIcon className="w-5 h-5 text-slate-600" />
              Seguimiento General
            </h3>
            
            <Textarea
              placeholder="Escriba aquí el seguimiento general del reporte..."
              rows={4}
              value={formData.seguimientoGeneral}
              onChange={(e) => handleChange('seguimientoGeneral', e.target.value)}
              className="w-full"
            />
          </motion.div>

          {/* Rubros Section - keeping the existing complex logic but with better styling */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white border border-slate-200 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <ClipboardListIcon className="w-5 h-5 text-slate-600" />
                Rubros del Proyecto
              </h3>
              <Button
                onClick={agregarRubro}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Agregar Rubro
              </Button>
            </div>

            <div className="space-y-4">
              {/* Rubros Activos */}
              {rubrosActivos.map((rubro, index) => (
                <motion.div
                  key={rubro.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  {/* Rubro Header */}
                  <div className="bg-slate-50 p-4 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => toggleRubroExpansion(rubro.id)}
                          className="p-1 hover:bg-slate-200 rounded"
                        >
                          {expandedRubros[rubro.id] ? (
                            <ChevronDownIcon className="w-4 h-4" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input
                            ref={el => rubroInputRefs.current[rubro.id] = el}
                            placeholder="Nombre del rubro"
                            value={rubro.nombre}
                            onChange={(e) => editarRubro(rubro.id, 'nombre', e.target.value)}
                            className="font-medium"
                          />
                          <Input
                            placeholder="Descripción"
                            value={rubro.descripcion}
                            onChange={(e) => editarRubro(rubro.id, 'descripcion', e.target.value)}
                          />
                          <Select 
                            value={rubro.estado} 
                            onValueChange={(value) => editarRubro(rubro.id, 'estado', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pendiente">Pendiente</SelectItem>
                              <SelectItem value="En proceso">En proceso</SelectItem>
                              <SelectItem value="Completado">Completado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <Badge variant={rubro.estado === 'Completado' ? 'default' : 'secondary'}>
                          {rubro.seguimientos.length} seguimientos
                        </Badge>
                        {isEditMode && (
                          <Button
                            onClick={() => toggleRubroActivo(rubro.id)}
                            variant="outline"
                            size="sm"
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          >
                            Anular
                          </Button>
                        )}
                        {!isEditMode && !rubro.nombre.trim() && (
                          <Button
                            onClick={() => eliminarRubroPermanente(rubro.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rubro Content - Seguimientos */}
                  {expandedRubros[rubro.id] && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-slate-700">Seguimientos</h4>
                        <Button
                          onClick={() => agregarSeguimiento(rubro.id)}
                          variant="outline"
                          size="sm"
                        >
                          <PlusIcon className="w-4 h-4 mr-2" />
                          Agregar Seguimiento
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {rubro.seguimientos.map((seguimiento) => (
                          <div key={seguimiento.id} className="bg-slate-50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge className={getEstadoColor(seguimiento.tipo.toLowerCase())}>
                                {seguimiento.tipo}
                              </Badge>
                              <Button
                                onClick={() => eliminarSeguimiento(rubro.id, seguimiento.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div>
                                <Select 
                                  value={seguimiento.tipo} 
                                  onValueChange={(value) => editarSeguimiento(rubro.id, seguimiento.id, 'tipo', value)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Iniciado">Iniciado</SelectItem>
                                    <SelectItem value="Cotizando">Cotizando</SelectItem>
                                    <SelectItem value="En proceso">En proceso</SelectItem>
                                    <SelectItem value="Completado">Completado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Input
                                  placeholder="Responsable"
                                  value={seguimiento.responsable}
                                  onChange={(e) => editarSeguimiento(rubro.id, seguimiento.id, 'responsable', e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Input
                                  placeholder="Fecha"
                                  value={seguimiento.fecha}
                                  onChange={(e) => editarSeguimiento(rubro.id, seguimiento.id, 'fecha', e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Input
                                  type="number"
                                  placeholder="Sub-seguimientos"
                                  value={seguimiento.subSeguimientos}
                                  onChange={(e) => editarSeguimiento(rubro.id, seguimiento.id, 'subSeguimientos', parseInt(e.target.value) || 0)}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Textarea
                                placeholder="Descripción del seguimiento"
                                value={seguimiento.descripcion}
                                onChange={(e) => editarSeguimiento(rubro.id, seguimiento.id, 'descripcion', e.target.value)}
                                className="text-sm resize-none"
                                rows={2}
                              />
                            </div>
                          </div>
                        ))}
                        
                        {rubro.seguimientos.length === 0 && (
                          <div className="text-center py-6 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                            <p className="text-sm">No hay seguimientos para este rubro</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              
              {/* Rubros Anulados */}
              {rubrosAnulados.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-slate-500 mb-3 flex items-center">
                    <XCircleIcon className="w-4 h-4 mr-2" />
                    Rubros Anulados ({rubrosAnulados.length})
                  </h4>
                  <div className="space-y-2">
                    {rubrosAnulados.map((rubro) => (
                      <div key={rubro.id} className="bg-slate-100 border border-slate-300 rounded-lg p-3 opacity-60">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <XCircleIcon className="w-4 h-4 text-red-500" />
                            <div>
                              <span className="font-medium text-slate-700 line-through">
                                {rubro.nombre || 'Rubro sin nombre'}
                              </span>
                              <p className="text-xs text-slate-500">
                                Anulado el {new Date(rubro.fechaAnulacion).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
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
              
              {rubrosActivos.length === 0 && rubrosAnulados.length === 0 && (
                <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg">
                  <ClipboardListIcon className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="font-medium">No hay rubros agregados</p>
                  <p className="text-sm">Haz clic en "Agregar Rubro" para comenzar</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Resumen del Proyecto */}
          {rubros.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-blue-50 to-slate-50 border border-slate-200 rounded-xl p-6"
            >
              <h4 className="text-lg font-semibold text-slate-800 mb-4">Resumen del Proyecto</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{resumen.totalRubros}</div>
                  <div className="text-sm text-slate-600">Rubros totales</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{resumen.totalSeguimientos}</div>
                  <div className="text-sm text-slate-600">Seguimientos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{resumen.totalProcesos}</div>
                  <div className="text-sm text-slate-600">Procesos totales</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-600 mb-2">Estados por rubro:</div>
                  <div className="space-y-1">
                    <div className="text-orange-600">Pendiente: {resumen.pendientes}</div>
                    <div className="text-blue-600">En proceso: {resumen.enProceso}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleFormSubmit}
          disabled={isSubmitting}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
            isSubmitting
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          <SaveIcon className="w-4 h-4" />
          {isSubmitting ? 'Guardando...' : submitLabel}
        </motion.button>
      </div>
    </div>
  )
}

export default ReportForm