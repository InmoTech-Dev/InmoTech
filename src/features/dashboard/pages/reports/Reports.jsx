import React, { useState, useEffect } from 'react'
import { ReportsHeader } from './ReportsHeader'
import { ReportsTable } from './ReportsTable'
import ReportsKanban from './ReportsKanban'
import CreateReportModal from '../../components/reports/CreateReportModal'
import ViewReportModal from '../../components/reports/ViewReportModal'
import { motion, AnimatePresence } from 'framer-motion'
import { useReports, ReportsProvider } from '../../../../shared/contexts/ReportsContext.jsx'
import { useAuth } from '../../../../shared/contexts/AuthContext'
import reportesInmobiliariosService from '../../services/reportesInmobiliarios.service'
import authService from '../../../../shared/services/authService'
import { useToast } from '../../../../shared/hooks/use-toast'
import { uploadToCloudinary } from '../../../../shared/services/cloudinary'
import { Grid3X3, List } from 'lucide-react'
import * as XLSX from "xlsx";
import ConfirmationDialog from '../../../../shared/components/ui/ConfirmationDialog'
import AdminReportsView from './AdminReportsView'


const ReportsContent = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState('board')
  const [showCancelled, setShowCancelled] = useState(false)
  const [statusFilter, setStatusFilter] = useState('Todos los estados')
  const [todayOnly, setTodayOnly] = useState(false)
  const [isStatusChangeConfirmOpen, setIsStatusChangeConfirmOpen] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState(null)
  const { createReport, updateReport, deleteReport } = useReports()
  const { user } = useAuth()
  const { toast } = useToast()

  // Estado para datos reales del backend
  const [dbReports, setDbReports] = useState([])
  const [dbLoading, setDbLoading] = useState(true)
  const [dbError, setDbError] = useState(null)

  // Función reutilizable para cargar desde la base de datos
  const fetchReports = async () => {
    setDbLoading(true)
    setDbError(null)
    try {
      const data = await reportesInmobiliariosService.listarReportes()
      const rows = Array.isArray(data) ? data : (data?.data || [])
      console.log('--- DEBUG: RAW REPORTS FROM API (first row) ---');
      console.log(JSON.stringify(rows[0], null, 2));
      const mapped = rows.map((r) => {
        // Extraer datos del inmueble buscando en varios lugares posibles
        const inm = r.inmueble || {};
        const ciudad = r.inmueble_ciudad || inm.ciudad || '';
        const categoria = r.inmueble_categoria || inm.categoria || '';
        const titulo = r.inmueble_titulo || inm.titulo || r.titulo || '';
        const direccion = r.inmueble_direccion || inm.direccion || '';

        return {
          id: `J${String(r.id_reporte ?? r.id ?? '').toString().padStart(3, '0')}`,
          id_reporte: r.id_reporte ?? r.id ?? '', // ID numérico real
          referencia: r.inmueble_referencia || r.registro_inmobiliario || '', // Alfanumérico del inmueble
          ubicacion: ciudad,
          tipoInmueble: categoria,
          nombreInmueble: titulo || `Propiedad Ref: ${r.inmueble_referencia || r.registro_inmobiliario || ''}`,
          direccionInmueble: direccion,
          // Usar el propietario real del inmueble, no quien creó el reporte
          propietario: r.propietario_nombre || r.propietario || '',
          // Responsable: quien creó/reportó el reporte
          responsable: r.reporta_nombre || '',
          prioridad: r.prioridad || 'Media',
          tipoReporte: (r.tipo_reporte || '').replace('Mantenimineto', 'Mantenimiento'),
          fecha: r.fecha_creacion ? new Date(r.fecha_creacion).toLocaleDateString('es-ES') : '',
          estado: r.estado || 'Pendiente',
        };
      })
      setDbReports(mapped)
    } catch (err) {
      setDbError(err?.message || 'Error al cargar reportes')
      setDbReports([])
    } finally {
      setDbLoading(false)
    }
  }

  // Cargar desde la base de datos al montar
  useEffect(() => {
    fetchReports()
  }, [])

  // Filtrar reportes (solo los del backend)
  const filteredReports = dbReports.filter(report =>
    Object.values(report).some(value =>
      (value ?? '').toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // MOVER AQUI: helper hoisteado para evitar TDZ
  function normalizeEstado(raw) {
    const s = String(raw || '').toLowerCase().trim()
    if (s === 'pendiente') return 'Pendiente'
    if (s === 'en proceso' || s === 'en_proceso' || s === 'enproceso') return 'En Proceso'
    if (s === 'completado' || s === 'completo') return 'Completado'
    if (s === 'cancelado') return 'Cancelado'
    return 'Pendiente'
  }

  // NUEVO: aplicar filtros combinados (cancelados, estado)
  const todayStr = new Date().toLocaleDateString('es-ES')
  const displayedReports = filteredReports
    .filter(r => showCancelled ? true : normalizeEstado(r.estado) !== 'Cancelado')
    .filter(r => statusFilter === 'Todos los estados' ? true : normalizeEstado(r.estado) === statusFilter)
    .filter(r => todayOnly ? (r.fecha === todayStr) : true)

  // Helper: obtiene ID numérico robusto del backend desde distintos formatos
  const getBackendId = (item) => {
    return Number(
      item?.id_reporte ??
      item?.referencia ??
      (item?.id || '').toString().replace(/\D/g, '')
    )
  }

  // NUEVO: formatear 'responsable' traído del backend
  const formatResponsableName = (r) => {
    if (!r) return '';
    if (typeof r === 'string') return r.trim();
    if (r?.nombre_completo) return String(r.nombre_completo).replace(/\s+/g, ' ').trim();
    const nombres = [r?.primer_nombre, r?.segundo_nombre, r?.nombres, r?.nombre].filter(Boolean).join(' ');
    const apellidos = [r?.primer_apellido, r?.segundo_apellido, r?.apellidos, r?.apellido, r?.apellido_completo].filter(Boolean).join(' ');
    const full = [nombres, apellidos].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    return full || r?.correo || r?.email || '';
  }

  // NUEVO: solicitar confirmación antes de cambiar estado
  const handleChangeEstadoRequest = (report, nuevoEstado) => {
    setPendingStatusChange({ report, nuevoEstado })
    setIsStatusChangeConfirmOpen(true)
  }

  // NUEVO: cambiar estado desde Kanban y persistir en backend (después de confirmación)
  const handleChangeEstadoConfirm = async () => {
    if (!pendingStatusChange) return

    const { report, nuevoEstado } = pendingStatusChange

    try {
      const backendId =
        getBackendId(report) ||
        getBackendId(selectedReport)

      if (!backendId) {
        throw new Error('No se pudo determinar el ID del reporte para actualizar estado.')
      }

      const estadoNormalizado = normalizeEstado(nuevoEstado)
      await reportesInmobiliariosService.actualizarReporte(
        backendId,
        { estado: estadoNormalizado },
        ''
      )
      await fetchReports()
      toast({
        title: 'Estado actualizado',
        description: `El reporte pasó a ${estadoNormalizado}`,
        variant: 'success',
      })
    } catch (err) {
      setDbError(err?.message || 'Error al actualizar estado')
      toast({
        title: 'Error',
        description: err?.message || 'No se pudo actualizar el estado.',
        variant: 'error',
      })
    } finally {
      setIsStatusChangeConfirmOpen(false)
      setPendingStatusChange(null)
    }
  }

  const handleChangeEstadoCancel = () => {
    setIsStatusChangeConfirmOpen(false)
    setPendingStatusChange(null)
  }

  const handleNewReport = () => {
    setSelectedReport(null)
    setIsCreateModalOpen(true)
  }

  // Fetch detailed report for viewing with inmueble data enrichment
  const handleViewReport = async (report) => {
    try {
      const reportId = Number(report.id_reporte ?? report.referencia ?? (report.id || '').toString().replace(/\D/g, ''))
      if (!reportId) {
        throw new Error('ID de reporte inválido para ver detalles')
      }

      const detailedReport = await reportesInmobiliariosService.obtenerReporte(reportId)

      // Add inmueble fields from shallow report or backend data
      detailedReport.ubicacion = report.ubicacion || detailedReport.inmueble_ciudad || ''
      detailedReport.tipoInmueble = report.tipoInmueble || detailedReport.inmueble_categoria || ''
      // Usar el propietario real del inmueble desde el shallow report (ya corregido en fetchReports)
      detailedReport.propietario = report.propietario || detailedReport.propietario_nombre || ''
      detailedReport.referencia = report.referencia || detailedReport.inmueble_referencia || detailedReport.inmueble?.registro_inmobiliario || ''
      detailedReport.tipoReporte = (report.tipoReporte || detailedReport.tipo_reporte || '').replace('Mantenimineto', 'Mantenimiento')
      detailedReport.estado = report.estado || detailedReport.estado || 'Pendiente'
      detailedReport.fecha = report.fecha || (detailedReport.fecha_creacion ? new Date(detailedReport.fecha_creacion).toLocaleDateString('es-ES') : '')
      detailedReport.prioridad = report.prioridad || detailedReport.prioridad || 'Media'
      // Responsable: primero del detalle del backend (reportadoPor), luego del shallow report
      detailedReport.responsable =
        detailedReport.reportadoPor?.nombre_completo ||
        report.responsable ||
        'No asignado'
      detailedReport.descripcion = detailedReport.descripcion || ''
      detailedReport.seguimientoGeneral = detailedReport.seguimiento_general || ''

      // Fetch rubros and follow-ups
      const rubros = await reportesInmobiliariosService.listarRubros(reportId)
      const rubrosConSeguimientos = await Promise.all(
        rubros.map(async (rubro) => {
          const seguimientosRaw = await reportesInmobiliariosService.listarSeguimientosRubro(reportId, rubro.id_rubro ?? rubro.id)
          const seguimientos = (seguimientosRaw || []).map(s => ({
            ...s,
            responsable: formatResponsableName(s.responsable)
          }))
          return { ...rubro, seguimientos }
        })
      )
      detailedReport.rubros = rubrosConSeguimientos

      setSelectedReport(detailedReport)
      setIsViewModalOpen(true)
    }
    catch (error) {
      setDbError(error.message || 'Error al cargar detalles del reporte')
      toast({
        title: 'Error',
        description: error.message || 'Error al cargar datos para ver',
        variant: 'error',
      })
    }
  }

  const handleEditReport = async (report) => {
    try {
      const reportId = Number(report.id_reporte ?? report.referencia ?? (report.id || '').toString().replace(/\D/g, ''))
      if (!reportId) {
        throw new Error('ID de reporte inválido para editar')
      }
      const detailedReport = await reportesInmobiliariosService.obtenerReporte(reportId)
      const rubros = await reportesInmobiliariosService.listarRubros(reportId)

      // For each rubro, fetch follow-ups
      const rubrosConSeguimientos = await Promise.all(
        rubros.map(async (rubro) => {
          const seguimientosRaw = await reportesInmobiliariosService.listarSeguimientosRubro(reportId, rubro.id_rubro ?? rubro.id)
          const seguimientos = (seguimientosRaw || []).map(s => ({
            ...s,
            responsable: formatResponsableName(s.responsable)
          }))
          return { ...rubro, seguimientos }
        })
      )

      // Append rubros with follow-ups to the detailed report
      detailedReport.rubros = rubrosConSeguimientos

      // Add inmueble fields from shallow report or backend data
      detailedReport.ubicacion = report.ubicacion || detailedReport.inmueble_ciudad || ''
      detailedReport.tipoInmueble = report.tipoInmueble || detailedReport.inmueble_categoria || ''
      // Usar el propietario real del inmueble desde el shallow report (ya corregido en fetchReports)
      detailedReport.propietario = report.propietario || detailedReport.propietario_nombre || ''
      detailedReport.referencia = report.referencia || detailedReport.inmueble_referencia || detailedReport.inmueble?.registro_inmobiliario || ''
      detailedReport.tipoReporte = (report.tipoReporte || detailedReport.tipo_reporte || '').replace('Mantenimineto', 'Mantenimiento')
      detailedReport.estado = report.estado || detailedReport.estado || 'Pendiente'
      detailedReport.fecha = report.fecha || (detailedReport.fecha_creacion ? new Date(detailedReport.fecha_creacion).toLocaleDateString('es-ES') : '')
      detailedReport.responsable = report.responsable || detailedReport.responsable || 'No asignado'
      detailedReport.descripcion = detailedReport.descripcion || ''
      detailedReport.seguimientoGeneral = detailedReport.seguimiento_general || ''

      setSelectedReport(detailedReport)
      setIsEditModalOpen(true)
    } catch (err) {
      setDbError(err.message || 'Error al cargar datos detallados para edición')
      toast({
        title: 'Error',
        description: err.message || 'Error al cargar datos para edición',
        variant: 'error',
      })
    }
  }

  // Helper: convertir File a Data URL (base64) para persistir
  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      try {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = (e) => reject(e)
        reader.readAsDataURL(file)
      } catch (e) {
        reject(e)
      }
    })

  const handleCreateReport = async (reportData) => {
    try {
      const personaId = Number(user?.id_persona ?? user?.id)

      const payload = {
        id_inmueble: Number(reportData.id_inmueble),
        tipo_reporte: reportData.tipoReporte?.trim(),
        estado: normalizeEstado(reportData.estado),
        descripcion: reportData.descripcion?.trim() || 'Sin descripción',
        id_persona_reporta: personaId,
        seguimiento_general: reportData.seguimientoGeneral?.trim() || ''
      }

      if (!payload.id_inmueble || !payload.tipo_reporte || !payload.id_persona_reporta) {
        setDbError('Faltan campos: id_inmueble, tipo_reporte o no hay usuario autenticado.')
        return
      }

      // Crear reporte y obtener el ID real del backend
      const createdReport = await reportesInmobiliariosService.crearReporte(payload, payload.seguimiento_general)
      const backendId = Number(createdReport?.id_reporte ?? createdReport?.id)

      // Persistir rubros y sus seguimientos (solo activos)
      const rubrosToSave = (reportData.rubros || []).filter(r => r.activo !== false)
      for (const r of rubrosToSave) {
        const activos = (r.seguimientos || []).filter(s => s.activo !== false)
        const completados = activos.filter(s => normalizeEstado(s.estado) === 'Completado').length
        const progreso = activos.length > 0 ? Math.round((completados / activos.length) * 100) : 0

        const rubroPayload = {
          nombre: (r.nombre || '').trim() || 'Rubro sin nombre',
          descripcion: (r.descripcion || '').trim(),
          estado: normalizeEstado(r.estado || 'Pendiente'),
          progreso
        }

        const savedRubro = await reportesInmobiliariosService.crearRubro(backendId, rubroPayload)
        const rubroId = Number(savedRubro?.id_rubro ?? savedRubro?.id)

        // Toast de creación de rubro
        toast({
          title: 'Rubro creado',
          description: `Se creó "${rubroPayload.nombre}" correctamente.`,
          variant: 'success',
        })

        // Guardar seguimientos del rubro
        for (const seg of activos) {
          const segPayload = {
            descripcion: (seg.descripcion || '').trim(),
            estado: normalizeEstado(seg.estado || 'Pendiente')
          }
          await reportesInmobiliariosService.crearSeguimientoRubro(backendId, rubroId, segPayload)

          // Toast de creación de seguimiento
          toast({
            title: 'Seguimiento agregado',
            description: `Seguimiento en "${rubroPayload.nombre}" agregado correctamente.`,
            variant: 'success',
          })
        }
      }

      // Persistir imágenes
      const imagenes = Array.isArray(reportData.imagenes) ? reportData.imagenes : []
      for (const img of imagenes) {
        const fileObj = img.file
        if (!fileObj) continue

        const upload = await uploadToCloudinary(fileObj, { folder: `reportes/${backendId}/imagenes` })
        await reportesInmobiliariosService.agregarImagen(backendId, { url: upload.secure_url })
        toast({
          title: 'Imagen guardada',
          description: `${img.name || 'Imagen'} guardada correctamente.`,
          variant: 'success',
        })
      }

      // Persistir archivos
      const archivos = Array.isArray(reportData.archivos) ? reportData.archivos : []
      for (const f of archivos) {
        const nombre = (f.name || f.nombre || 'Archivo').toString()
        const fileObj = f.file
        if (!fileObj) continue

        const upload = await uploadToCloudinary(fileObj, { folder: `reportes/${backendId}/archivos` })
        await reportesInmobiliariosService.agregarArchivo(backendId, { nombre, url: upload.secure_url })
        toast({
          title: 'Archivo guardado',
          description: `${nombre} guardado correctamente.`,
          variant: 'success',
        })
      }

      setIsCreateModalOpen(false)
      await fetchReports()

      // Toast final del reporte
      toast({
        title: 'Reporte creado',
        description: 'El reporte, rubros, seguimientos, imágenes y archivos fueron guardados.',
        variant: 'success',
      })
    } catch (err) {
      setDbError(`Error al crear el reporte: ${err?.message || 'desconocido'}`)
      toast({
        title: 'Error',
        description: err?.message || 'No se pudo crear el reporte o adjuntos.',
        variant: 'error',
      })
    }
  }

  // EDIT: lanzar error si no hay ID, para que el modal no muestre “éxito” por error
  const handleUpdateReport = async (reportData) => {
    const backendId =
      getBackendId(reportData) ||
      getBackendId(selectedReport)

    if (!backendId) {
      throw new Error('No se pudo determinar el ID del reporte para actualizar.')
    }

    // 1) Actualizar campos del reporte (sin borrar nada)
    const patchPayload = {
      estado: normalizeEstado(reportData.estado),
      descripcion: (reportData.descripcion || '').trim(),
      seguimiento_general: (reportData.seguimientoGeneral || '').trim()
    }

    await reportesInmobiliariosService.actualizarReporte(
      backendId,
      patchPayload,
      patchPayload.seguimiento_general
    )

    // 2) Upsert de rubros y sus seguimientos
    const rubrosToProcess = (reportData.rubros || [])

    for (const r of rubrosToProcess) {
      const activos = (r.seguimientos || []).filter(s => s.activo !== false)
      const completados = activos.filter(s => normalizeEstado(s.estado) === 'Completado').length
      const progreso = activos.length > 0 ? Math.round((completados / activos.length) * 100) : 0

      const rubroPayload = {
        nombre: (r.nombre || '').trim() || 'Rubro sin nombre',
        descripcion: (r.descripcion || '').trim(),
        estado: normalizeEstado(r.activo === false ? 'Cancelado' : (r.estado || 'Pendiente')),
        progreso
      }

      // Crear o actualizar rubro según tenga backendId
      let rubroBackendId = Number(r.backendId ?? 0)
      if (rubroBackendId > 0) {
        await reportesInmobiliariosService.actualizarRubro(backendId, rubroBackendId, rubroPayload)
      } else {
        const created = await reportesInmobiliariosService.crearRubro(backendId, rubroPayload)
        rubroBackendId = Number(created?.id_rubro ?? created?.id)
      }

      // Upsert de seguimientos del rubro
      const segsToProcess = (r.seguimientos || [])
      for (const s of segsToProcess) {
        const segPayload = {
          descripcion: (s.descripcion || '').trim(),
          estado: normalizeEstado(s.activo === false ? 'Cancelado' : (s.estado || 'Pendiente'))
        }

        const segBackendId = Number(s.backendId ?? 0)
        if (segBackendId > 0) {
          await reportesInmobiliariosService.actualizarSeguimientoRubro(
            backendId,
            rubroBackendId,
            segBackendId,
            segPayload
          )
        } else {
          await reportesInmobiliariosService.crearSeguimientoRubro(
            backendId,
            rubroBackendId,
            segPayload
          )
        }
      }
    }

    // Subir nuevas imágenes añadidas en edición (solo si traen File)
    const imagenes = Array.isArray(reportData.imagenes) ? reportData.imagenes : []
    for (const img of imagenes) {
      if (img.file) {
        const upload = await uploadToCloudinary(img.file, { folder: `reportes/${backendId}/imagenes` })
        await reportesInmobiliariosService.agregarImagen(backendId, { url: upload.secure_url })
        toast({
          title: 'Imagen guardada',
          description: `${img.name || 'Imagen'} guardada correctamente.`,
          variant: 'success',
        })
      }
    }

    // Subir nuevos archivos añadidos en edición (solo si traen File)
    const archivos = Array.isArray(reportData.archivos) ? reportData.archivos : []
    for (const f of archivos) {
      if (f.file) {
        const nombre = (f.name || f.nombre || 'Archivo').toString()
        const upload = await uploadToCloudinary(f.file, { folder: `reportes/${backendId}/archivos` })
        await reportesInmobiliariosService.agregarArchivo(backendId, { nombre, url: upload.secure_url })
        toast({
          title: 'Archivo guardado',
          description: `${nombre} guardado correctamente.`,
          variant: 'success',
        })
      }
    }

    setIsEditModalOpen(false)
    setSelectedReport(null)
    await fetchReports()
  }

  const handleDeleteReport = async (reportToDelete) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este reporte?')) {
      const backendId = Number(
        reportToDelete.id_reporte ??
        reportToDelete.referencia ??
        (reportToDelete.id || '').toString().replace(/\D/g, '')
      )
      if (!backendId) {
        setDbError('No se pudo determinar el ID del reporte para eliminar.')
        return
      }
      await reportesInmobiliariosService.eliminarReporte(backendId)
      await fetchReports()
    }
  }

  function handleDownloadReportPDF(report) {
    // Función auxiliar para obtener la clase CSS del estado
    function getStatusClass(estado) {
      switch (estado) {
        case 'Completado':
          return 'status-completado';
        case 'En proceso':
          return 'status-proceso';
        case 'Cotizando':
          return 'status-cotizando';
        case 'Sin novedades':
          return 'status-sin-novedades';
        case 'Pendiente':
          return 'status-cotizando';
        case 'Finalizado':
          return 'status-completado';
        default:
          return 'status-sin-novedades';
      }
    }

    // Función para generar la sección de rubros
    function generateRubrosSection(rubros) {
      if (!rubros || rubros.length === 0) {
        return '<p class=\'info-value\'>No hay rubros registrados</p>';
      }

      return rubros.map((rubro, index) => `
        <div class='rubro-item'>
          <div class='rubro-header'>
            <h4 class='rubro-title'>${index + 1}. ${rubro.nombre}</h4>
            <span class='status ${getStatusClass(rubro.estado)}'>${rubro.estado}</span>
          </div>
          <div class='rubro-description'>${rubro.descripcion || 'Sin descripción'}</div>
          
          ${rubro.seguimientos && rubro.seguimientos.length > 0 ? `
            <div class='seguimientos-section'>
              <h5 class='seguimientos-title'>Seguimientos:</h5>
              ${rubro.seguimientos.map((seg, segIndex) => `
                <div class='seguimiento-item'>
                  <div class='seguimiento-header'>
                    <span class='seguimiento-number'>${segIndex + 1}.</span>
                    <span class='seguimiento-desc'>${seg.descripcion}</span>
                    <span class='status ${getStatusClass(seg.estado)}'>${seg.estado}</span>
                  </div>
                  <div class='seguimiento-details'>
                    <span class='detail-item'><strong>Responsable:</strong> ${seg.responsable || 'No asignado'}</span>
                    <span class='detail-item'><strong>Fecha:</strong> ${seg.fecha || 'Sin fecha'}</span>
                    ${seg.subSeguimientos ? `<span class='detail-item'><strong>Sub-seguimientos:</strong> ${seg.subSeguimientos}</span>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<p class=\'no-seguimientos\'>Sin seguimientos registrados</p>'}
        </div>
      `).join('');
    }

    // Función para generar la sección de archivos
    function generateArchivosSection(archivos) {
      if (!archivos || archivos.length === 0) {
        return '<p class=\'info-value\'>No hay archivos adjuntos</p>';
      }

      return `
        <div class='archivos-list'>
          ${archivos.map((archivo, index) => `
            <div class='archivo-item'>
              <span class='archivo-number'>${index + 1}.</span>
              <span class='archivo-name'>${archivo.nombre || `Archivo ${index + 1}`}</span>
              <span class='archivo-type'>(${archivo.tipo || 'Tipo desconocido'})</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Función para generar la sección de imágenes
    function generateImagenesSection(imagenes) {
      if (!imagenes || imagenes.length === 0) {
        return '<p class=\'info-value\'>No hay imágenes adjuntas</p>';
      }

      return `
        <div class='imagenes-list'>
          ${imagenes.map((imagen, index) => `
            <div class='imagen-item'>
              <span class='imagen-number'>${index + 1}.</span>
              <span class='imagen-name'>${imagen.nombre || `Imagen ${index + 1}`}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Crear el contenido HTML completo para el PDF
    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset='UTF-8'>
        <title>Reporte ${report.id} - ${report.tipoReporte}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 10px;
          }
          .report-title {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .report-id {
            font-size: 16px;
            color: #666;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #3b82f6;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
            margin-bottom: 20px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-item {
            margin-bottom: 15px;
          }
          .info-label {
            font-weight: bold;
            color: #374151;
            display: block;
            margin-bottom: 5px;
          }
          .info-value {
            color: #6b7280;
            margin-left: 10px;
          }
          .status {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status-completado {
            background-color: #dcfce7;
            color: #166534;
          }
          .status-proceso {
            background-color: #dbeafe;
            color: #1e40af;
          }
          .status-cotizando {
            background-color: #fef3c7;
            color: #92400e;
          }
          .status-sin-novedades {
            background-color: #f3f4f6;
            color: #374151;
          }
          .rubro-item {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            background-color: #f9fafb;
          }
          .rubro-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .rubro-title {
            font-size: 16px;
            font-weight: bold;
            color: #374151;
            margin: 0;
          }
          .rubro-description {
            color: #6b7280;
            margin-bottom: 15px;
            font-style: italic;
          }
          .seguimientos-section {
            border-top: 1px solid #d1d5db;
            padding-top: 15px;
          }
          .seguimientos-title {
            font-size: 14px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
          }
          .seguimiento-item {
            background-color: white;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
          }
          .seguimiento-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
          }
          .seguimiento-number {
            font-weight: bold;
            color: #3b82f6;
          }
          .seguimiento-desc {
            flex: 1;
            font-weight: 500;
          }
          .seguimiento-details {
            display: flex;
            gap: 20px;
            font-size: 12px;
            color: #6b7280;
          }
          .detail-item {
            white-space: nowrap;
          }
          .no-seguimientos {
            color: #9ca3af;
            font-style: italic;
            margin: 10px 0;
          }
          .archivos-list, .imagenes-list {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px;
          }
          .archivo-item, .imagen-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .archivo-item:last-child, .imagen-item:last-child {
            border-bottom: none;
          }
          .archivo-number, .imagen-number {
            font-weight: bold;
            color: #3b82f6;
            min-width: 20px;
          }
          .archivo-name, .imagen-name {
            flex: 1;
            font-weight: 500;
          }
          .archivo-type {
            color: #6b7280;
            font-size: 12px;
          }
          .description-section {
            background-color: #f9fafb;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            border-top: 2px solid #e5e7eb;
            padding-top: 20px;
            page-break-inside: avoid;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class='header'>
          <div class='logo'>InmoTech</div>
          <div class='report-title'>Reporte de ${report.tipoReporte}</div>
          <div class='report-id'>ID: ${report.id} | Referencia: ${report.referencia || report.id}</div>
        </div>

        <div class='section'>
          <div class='section-title'>📋 Información Básica del Reporte</div>
          <div class='info-grid'>
            <div class='info-item'>
              <span class='info-label'>📍 Ubicación:</span>
              <span class='info-value'>${report.ubicacion}</span>
            </div>
            <div class='info-item'>
              <span class='info-label'>🏢 Tipo de Inmueble:</span>
              <span class='info-value'>${report.tipoInmueble}</span>
            </div>
            <div class='info-item'>
              <span class='info-label'>👤 Propietario:</span>
              <span class='info-value'>${report.propietario}</span>
            </div>
            <div class='info-item'>
              <span class='info-label'>📅 Fecha de Creación:</span>
              <span class='info-value'>${report.fecha}</span>
            </div>
            <div class='info-item'>
              <span class='info-label'>🔧 Tipo de Reporte:</span>
              <span class='info-value'>${report.tipoReporte}</span>
            </div>
            <div class='info-item'>
              <span class='info-label'>📊 Estado Actual:</span>
              <span class='status ${getStatusClass(report.estado)}'>${report.estado}</span>
            </div>
            <div class='info-item'>
              <span class='info-label'>👷 Responsable:</span>
              <span class='info-value'>${report.responsable || 'No asignado'}</span>
            </div>
            <div class='info-item'>
              <span class='info-label'>🔗 Referencia:</span>
              <span class='info-value'>${report.referencia || report.id}</span>
            </div>
          </div>
        </div>

        ${report.descripcion ? `
        <div class='section'>
          <div class='section-title'>📝 Descripción del Reporte</div>
          <div class='description-section'>
            ${report.descripcion}
          </div>
        </div>
        ` : ''}

        ${report.seguimientoGeneral ? `
        <div class='section'>
          <div class='section-title'>📈 Seguimiento General</div>
          <div class='description-section'>
            ${report.seguimientoGeneral}
          </div>
        </div>
        ` : ''}

        <div class='section'>
          <div class='section-title'>🔨 Rubros del Proyecto</div>
          ${generateRubrosSection(report.rubros)}
        </div>

        <div class='section'>
          <div class='section-title'>📎 Archivos Adjuntos</div>
          ${generateArchivosSection(report.archivos)}
        </div>

        <div class='section'>
          <div class='section-title'>🖼️ Imágenes del Proyecto</div>
          ${generateImagenesSection(report.imagenes)}
        </div>

        <div class='section'>
          <div class='section-title'>📊 Resumen del Proyecto</div>
          <div class='info-grid'>
            <div class='info-item'>
              <span class='info-label'>Total de Rubros:</span>
              <span class='info-value'>${report.rubros ? report.rubros.length : 0}</span>
            </div>
            <div class='info-item'>
              <span class='info-label'>Rubros Activos:</span>
              <span class='info-value'>${report.rubros ? report.rubros.filter(r => r.activo !== false).length : 0}</span>
            </div>
            <div class='info-item'>
              <span class='info-label'>Total de Seguimientos:</span>
              <span class='info-value'>${report.rubros ? report.rubros.reduce((total, rubro) => total + (rubro.seguimientos ? rubro.seguimientos.length : 0), 0) : 0}</span>
            </div>
            <div class='info-item'>
              <span class='info-label'>Archivos Adjuntos:</span>
              <span class='info-value'>${report.archivos ? report.archivos.length : 0}</span>
            </div>
            <div class='info-item'>
              <span class='info-label'>Imágenes:</span>
              <span class='info-value'>${report.imagenes ? report.imagenes.length : 0}</span>
            </div>
            <div class='info-item'>
              <span class='info-label'>Fecha de Generación:</span>
              <span class='info-value'>${new Date().toLocaleDateString('es-ES')}</span>
            </div>
          </div>
        </div>

        <div class='footer'>
          <p><strong>Documento generado automáticamente</strong></p>
          <p>Fecha: ${new Date().toLocaleDateString('es-ES')} | Hora: ${new Date().toLocaleTimeString('es-ES')}</p>
          <p>InmoTech - Sistema de Gestión de Reportes de Inmuebles</p>
          <p>Este documento contiene información confidencial del reporte ${report.id}</p>
        </div>
      </body>
      </html>
    `;

    // Crear una nueva ventana para el PDF
    const printWindow = window.open('', '_blank');
    printWindow.document.write(pdfContent);
    printWindow.document.close();

    // Esperar a que se cargue el contenido y luego abrir el diálogo de impresión
    printWindow.onload = function () {
      printWindow.focus();
      printWindow.print();

      // Cerrar la ventana después de un breve delay
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    };
  }

  const handleDownloadExcel = () => {
    // Función para generar y descargar Excel
    const generateExcel = () => {
      // Crear datos para Excel
      const excelData = displayedReports.map(report => ({
        'ID': report.id,
        'Ubicación': report.ubicacion,
        'Tipo de Inmueble': report.tipoInmueble,
        'Propietario': report.propietario,
        'Tipo de Reporte': report.tipoReporte,
        'Fecha': report.fecha,
        'Estado': report.estado,
        'Referencia': report.referencia || report.id
      }))

      // Crear workbook y worksheet
      const ws = XLSX.utils.json_to_sheet(excelData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Reportes')

      // Configurar ancho de columnas
      const colWidths = [
        { wch: 10 }, // ID
        { wch: 20 }, // Ubicación
        { wch: 15 }, // Tipo de Inmueble
        { wch: 25 }, // Propietario
        { wch: 20 }, // Tipo de Reporte
        { wch: 12 }, // Fecha
        { wch: 15 }, // Estado
        { wch: 15 }  // Referencia
      ]
      ws['!cols'] = colWidths

      // Generar nombre del archivo
      const fileName = `reportes_${new Date().toISOString().split('T')[0]}.xlsx`

      // Descargar archivo
      XLSX.writeFile(wb, fileName)
    }

    try {
      // Verificar si XLSX está disponible
      if (typeof XLSX === 'undefined') {
        // Si no está disponible, mostrar mensaje de error
        toast({
          title: 'Error',
          description: 'La funcionalidad de Excel no está disponible. Por favor, contacte al administrador.',
          variant: 'error',
        })
        return
      }

      generateExcel()

      toast({
        title: 'Excel generado',
        description: 'El archivo Excel se ha descargado correctamente.',
        variant: 'success',
      })
    } catch (error) {
      console.error('Error generando Excel:', error)
      toast({
        title: 'Error',
        description: 'No se pudo generar el archivo Excel.',
        variant: 'error',
      })
    }
  }

  return (
    <div className='p-6 space-y-6'>
      {dbLoading && <div className='p-4 text-slate-600'>Cargando reportes…</div>}
      {dbError && <div className='p-4 text-red-600'>{dbError}</div>}

      <ReportsHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onNewReport={handleNewReport}
        onDownloadPDF={handleDownloadReportPDF}
        onDownloadExcel={handleDownloadExcel}
        reports={displayedReports}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        showCancelled={showCancelled}
        onToggleShowCancelled={() => setShowCancelled(v => !v)}
      />

      {user?.roles?.some(r => ['Administrador', 'Super Administrador'].includes(r)) ? (
        <AdminReportsView
          allReports={dbReports}
          onViewReport={handleViewReport}
          onEditReport={handleEditReport}
          onDownloadPDF={handleDownloadReportPDF}
          loading={dbLoading}
        />
      ) : (
        <>
          <div className='flex items-center justify-end gap-3'>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode(viewMode === 'table' ? 'board' : 'table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${viewMode === 'board'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-green-300'
                }`}
            >
              {viewMode === 'table' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
              {viewMode === 'table' ? 'Vista Kanban' : 'Vista Tabla'}
            </motion.button>
          </div>

          {viewMode === 'board' ? (
            <ReportsKanban
              reports={displayedReports}
              onView={handleViewReport}
              onEdit={handleEditReport}
              onCreate={handleNewReport}
              onChangeEstado={handleChangeEstadoRequest}
              showCancelled={showCancelled}
            />
          ) : (
            <ReportsTable
              reports={displayedReports}
              onView={handleViewReport}
              onEdit={handleEditReport}
              onDownloadPDF={handleDownloadReportPDF}
            />
          )}
        </>
      )}

      {/* Confirmation Dialog for Status Change */}
      <ConfirmationDialog
        isOpen={isStatusChangeConfirmOpen}
        onClose={handleChangeEstadoCancel}
        onConfirm={handleChangeEstadoConfirm}
        title="Confirmar cambio de estado"
        message={pendingStatusChange ? `¿Estás seguro de que deseas cambiar el estado del reporte #${pendingStatusChange.report.id} a "${pendingStatusChange.nuevoEstado}"?` : ''}
        confirmText="Sí, cambiar estado"
        cancelText="Cancelar"
        variant="info"
      />

      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateReport}
        submitLabel='Crear Reporte'
      />

      <CreateReportModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedReport(null)
        }}
        onSubmit={handleUpdateReport}
        initialData={selectedReport}
        submitLabel='Actualizar Reporte'
      />

      <ViewReportModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setSelectedReport(null)
        }}
        report={selectedReport}
        onEdit={handleEditReport}
      />
    </div>
  )
}

export default function Reports() {
  return (
    <ReportsProvider>
      <ReportsContent />
    </ReportsProvider>
  )
}
