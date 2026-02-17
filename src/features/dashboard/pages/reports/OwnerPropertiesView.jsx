import React, { useEffect, useMemo, useState } from 'react'

// Ajusta estas rutas si tu proyecto las tiene en otro lugar.
// El componente funciona en modo demo incluso si estos imports fallan, pero idealmente existen.
import { useAuth } from '../../../../shared/contexts/AuthContext'
import { usePropertyAutocomplete } from '../../../../shared/hooks/usePropertyAutocomplete'

// Datos de ejemplo para vista demo (se muestran cuando no hay sesión)
const sampleReports = [
  {
    id: 'RPT-001',
    referencia: 'REF-1001',
    propietario: 'Carlos Rodríguez',
    tipoReporte: 'Mantenimiento',
    ubicacion: 'Av. Principal 123, Lima',
    estado: 'En progreso',
    creadoEl: '2024-09-15',
    actualizadoEl: '2024-10-01',
    seguimientos: [
      { fecha: '2024-09-15', titulo: 'Reporte creado', descripcion: 'El propietario registró el reporte de mantenimiento.', estadoPaso: 'Finalizado' },
      { fecha: '2024-09-18', titulo: 'Inspección agendada', descripcion: 'Se programó inspección técnica.', estadoPaso: 'Finalizado' },
      { fecha: '2024-09-22', titulo: 'Inspección realizada', descripcion: 'Se realizó la inspección del inmueble.', estadoPaso: 'Finalizado' },
      { fecha: '2024-09-27', titulo: 'Cotización enviada', descripcion: 'Se envió la cotización al propietario.', estadoPaso: 'Pendiente' },
      { fecha: '2024-10-01', titulo: 'Aceptación de cotización', descripcion: 'En espera de confirmación del propietario.', estadoPaso: 'Pendiente' },
    ],
  },
  {
    id: 'RPT-002',
    referencia: 'REF-1032',
    propietario: 'María González',
    tipoReporte: 'Reparación',
    ubicacion: 'Calle Las Flores 45, Arequipa',
    estado: 'Pendiente',
    creadoEl: '2024-10-02',
    actualizadoEl: '2024-10-03',
    seguimientos: [
      { fecha: '2024-10-02', titulo: 'Reporte creado', descripcion: 'Solicitud de reparación por filtración.', estadoPaso: 'Finalizado' },
      { fecha: '2024-10-03', titulo: 'Inspección agendada', descripcion: 'Se programó visita del técnico.', estadoPaso: 'Pendiente' },
      { fecha: '2024-10-05', titulo: 'Visita técnica', descripcion: 'Diagnóstico en progreso.', estadoPaso: 'Pendiente' },
    ],
  },
  {
    id: 'RPT-003',
    referencia: 'REF-1088',
    propietario: 'Carlos Rodríguez',
    tipoReporte: 'Mejora',
    ubicacion: 'Jr. Los Cedros 789, Trujillo',
    estado: 'Finalizado',
    creadoEl: '2024-08-11',
    actualizadoEl: '2024-09-02',
    seguimientos: [
      { fecha: '2024-08-11', titulo: 'Reporte creado', descripcion: 'Solicitud de mejora en cocina.', estadoPaso: 'Finalizado' },
      { fecha: '2024-08-15', titulo: 'Inspección realizada', descripcion: 'Revisión de estructura.', estadoPaso: 'Finalizado' },
      { fecha: '2024-08-20', titulo: 'Cotización aprobada', descripcion: 'Presupuesto validado por propietario.', estadoPaso: 'Finalizado' },
      { fecha: '2024-08-25', titulo: 'Trabajo ejecutado', descripcion: 'Mejoras completadas.', estadoPaso: 'Finalizado' },
      { fecha: '2024-09-02', titulo: 'Entrega y conformidad', descripcion: 'Entrega satisfactoria.', estadoPaso: 'Finalizado' },
    ],
  },
  {
    id: 'RPT-004',
    referencia: 'REF-1115',
    propietario: 'María González',
    tipoReporte: 'Mantenimiento',
    ubicacion: 'Av. El Sol 560, Cusco',
    estado: 'En progreso',
    creadoEl: '2024-10-01',
    actualizadoEl: '2024-10-06',
    seguimientos: [
      { fecha: '2024-10-01', titulo: 'Reporte creado', descripcion: 'Mantenimiento anual de ascensor.', estadoPaso: 'Finalizado' },
      { fecha: '2024-10-04', titulo: 'Contratación de proveedor', descripcion: 'Proveedor asignado.', estadoPaso: 'Finalizado' },
      { fecha: '2024-10-06', titulo: 'Ejecución en curso', descripcion: 'Mantenimiento en marcha.', estadoPaso: 'Pendiente' },
    ],
  },
  {
    id: 'RPT-005',
    referencia: 'REF-1150',
    propietario: 'Carlos Rodríguez',
    tipoReporte: 'Reparación',
    ubicacion: 'Calle Primavera 12, Lima',
    estado: 'Pendiente',
    creadoEl: '2024-10-07',
    actualizadoEl: '2024-10-07',
    seguimientos: [
      { fecha: '2024-10-07', titulo: 'Reporte creado', descripcion: 'Reparación de cerradura.', estadoPaso: 'Pendiente' },
    ],
  },
  // Reportes adicionales para mejor demostración del diseño
  {
    id: 'RPT-006',
    referencia: 'REF-1201',
    propietario: 'Ana Martínez',
    tipoReporte: 'Inspección',
    ubicacion: 'Av. Libertadores 890, Chiclayo',
    estado: 'Finalizado',
    creadoEl: '2024-09-20',
    actualizadoEl: '2024-09-25',
    seguimientos: [
      { fecha: '2024-09-20', titulo: 'Solicitud de inspección', descripcion: 'Inspección preventiva solicitada.', estadoPaso: 'Finalizado' },
      { fecha: '2024-09-22', titulo: 'Inspección programada', descripcion: 'Cita agendada con técnico especializado.', estadoPaso: 'Finalizado' },
      { fecha: '2024-09-24', titulo: 'Inspección completada', descripcion: 'Revisión estructural finalizada.', estadoPaso: 'Finalizado' },
      { fecha: '2024-09-25', titulo: 'Informe entregado', descripcion: 'Documento técnico enviado al propietario.', estadoPaso: 'Finalizado' },
    ],
  },
  {
    id: 'RPT-007',
    referencia: 'REF-1245',
    propietario: 'Carlos Rodríguez',
    tipoReporte: 'Emergencia',
    ubicacion: 'Calle San Martín 456, Lima',
    estado: 'En progreso',
    creadoEl: '2024-10-08',
    actualizadoEl: '2024-10-09',
    seguimientos: [
      { fecha: '2024-10-08', titulo: 'Emergencia reportada', descripcion: 'Fuga de agua en tubería principal.', estadoPaso: 'Finalizado' },
      { fecha: '2024-10-08', titulo: 'Respuesta inmediata', descripcion: 'Técnico de emergencia despachado.', estadoPaso: 'Finalizado' },
      { fecha: '2024-10-09', titulo: 'Reparación temporal', descripcion: 'Fuga controlada, reparación definitiva en proceso.', estadoPaso: 'Pendiente' },
      { fecha: '2024-10-10', titulo: 'Reparación definitiva', descripcion: 'Reemplazo completo de tubería.', estadoPaso: 'Pendiente' },
    ],
  },
  {
    id: 'RPT-008',
    referencia: 'REF-1289',
    propietario: 'Ana Martínez',
    tipoReporte: 'Mejora',
    ubicacion: 'Jr. Amazonas 321, Iquitos',
    estado: 'Pendiente',
    creadoEl: '2024-10-05',
    actualizadoEl: '2024-10-05',
    seguimientos: [
      { fecha: '2024-10-05', titulo: 'Solicitud de mejora', descripcion: 'Modernización del sistema eléctrico.', estadoPaso: 'Finalizado' },
      { fecha: '2024-10-07', titulo: 'Evaluación técnica', descripcion: 'Revisión del sistema actual.', estadoPaso: 'Pendiente' },
      { fecha: '2024-10-10', titulo: 'Cotización', descripcion: 'Preparación de presupuesto detallado.', estadoPaso: 'Pendiente' },
    ],
  },
  {
    id: 'RPT-009',
    referencia: 'REF-1334',
    propietario: 'Luis Fernández',
    tipoReporte: 'Mantenimiento',
    ubicacion: 'Av. Grau 678, Piura',
    estado: 'Finalizado',
    creadoEl: '2024-08-15',
    actualizadoEl: '2024-08-30',
    seguimientos: [
      { fecha: '2024-08-15', titulo: 'Mantenimiento programado', descripcion: 'Limpieza y revisión de aires acondicionados.', estadoPaso: 'Finalizado' },
      { fecha: '2024-08-18', titulo: 'Inicio de trabajos', descripcion: 'Equipo técnico en sitio.', estadoPaso: 'Finalizado' },
      { fecha: '2024-08-25', titulo: 'Mantenimiento completado', descripcion: 'Todos los equipos revisados y limpiados.', estadoPaso: 'Finalizado' },
      { fecha: '2024-08-30', titulo: 'Certificación', descripcion: 'Certificado de mantenimiento emitido.', estadoPaso: 'Finalizado' },
    ],
  },
  {
    id: 'RPT-010',
    referencia: 'REF-1378',
    propietario: 'María González',
    tipoReporte: 'Reparación',
    ubicacion: 'Calle Bolívar 234, Huancayo',
    estado: 'En progreso',
    creadoEl: '2024-09-28',
    actualizadoEl: '2024-10-08',
    seguimientos: [
      { fecha: '2024-09-28', titulo: 'Reporte de daño', descripcion: 'Problema en sistema de calefacción.', estadoPaso: 'Finalizado' },
      { fecha: '2024-10-01', titulo: 'Diagnóstico', descripcion: 'Identificación de componentes dañados.', estadoPaso: 'Finalizado' },
      { fecha: '2024-10-05', titulo: 'Pedido de repuestos', descripcion: 'Solicitud de piezas de reemplazo.', estadoPaso: 'Finalizado' },
      { fecha: '2024-10-08', titulo: 'Instalación en curso', descripcion: 'Reemplazo de componentes iniciado.', estadoPaso: 'Pendiente' },
      { fecha: '2024-10-12', titulo: 'Pruebas finales', descripcion: 'Verificación del funcionamiento.', estadoPaso: 'Pendiente' },
    ],
  },
  {
    id: 'RPT-011',
    referencia: 'REF-1423',
    propietario: 'Luis Fernández',
    tipoReporte: 'Inspección',
    ubicacion: 'Av. Universitaria 567, Cajamarca',
    estado: 'Pendiente',
    creadoEl: '2024-10-09',
    actualizadoEl: '2024-10-09',
    seguimientos: [
      { fecha: '2024-10-09', titulo: 'Solicitud recibida', descripcion: 'Inspección de seguridad solicitada.', estadoPaso: 'Pendiente' },
      { fecha: '2024-10-12', titulo: 'Programación', descripcion: 'Asignación de inspector certificado.', estadoPaso: 'Pendiente' },
    ],
  },
  {
    id: 'RPT-012',
    referencia: 'REF-1467',
    propietario: 'Carlos Rodríguez',
    tipoReporte: 'Mejora',
    ubicacion: 'Jr. Tacna 890, Lima',
    estado: 'Finalizado',
    creadoEl: '2024-07-10',
    actualizadoEl: '2024-08-05',
    seguimientos: [
      { fecha: '2024-07-10', titulo: 'Propuesta de mejora', descripcion: 'Instalación de sistema de seguridad.', estadoPaso: 'Finalizado' },
      { fecha: '2024-07-15', titulo: 'Aprobación', descripcion: 'Proyecto aprobado por propietario.', estadoPaso: 'Finalizado' },
      { fecha: '2024-07-20', titulo: 'Instalación iniciada', descripcion: 'Montaje de cámaras y sensores.', estadoPaso: 'Finalizado' },
      { fecha: '2024-07-28', titulo: 'Configuración', descripcion: 'Programación del sistema.', estadoPaso: 'Finalizado' },
      { fecha: '2024-08-05', titulo: 'Entrega final', descripcion: 'Sistema operativo y capacitación completada.', estadoPaso: 'Finalizado' },
    ],
  },
]

function normalize(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}

function getStatusBadgeClass(estado) {
  switch (estado) {
    case 'Finalizado':
      return 'bg-green-100 text-green-700 border border-green-200'
    case 'En progreso':
      return 'bg-blue-100 text-blue-700 border border-blue-200'
    case 'Pendiente':
    default:
      return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
  }
}

function getProgressFromReport(report) {
  const segs = report.seguimientos || []
  if (segs.length === 0) {
    return report.estado === 'Finalizado' ? 100 : report.estado === 'En progreso' ? 50 : 10
  }
  const completed = segs.filter((s) => normalize(s.estadoPaso) === 'finalizado').length
  const progress = Math.round((completed / segs.length) * 100)
  return Math.min(100, Math.max(10, progress))
}

function ProgressBar({ value }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
      <div
        className="h-2.5 rounded-full transition-all duration-300"
        style={{
          width: `${value}%`,
          background:
            value === 100
              ? 'linear-gradient(90deg,#16a34a,#22c55e)'
              : 'linear-gradient(90deg,#3b82f6,#60a5fa)',
        }}
      />
    </div>
  )
}

function StatusDot({ estado }) {
  const color =
    estado === 'Finalizado' ? 'bg-green-500' : estado === 'En progreso' ? 'bg-blue-500' : 'bg-yellow-500'
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
}

function getInitials(name) {
  if (!name) return 'U'
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export default function OwnerPropertiesView() {
  const { user, isAuthenticated } = useAuth?.() || { user: null, isAuthenticated: false }
  const { allProperties } = usePropertyAutocomplete?.() || { allProperties: [] }

  // Estados principales
  const [previewOwner, setPreviewOwner] = useState(sampleReports[0]?.propietario || '')
  const [isFiltering, setIsFiltering] = useState(false)
  const [statusFilter, setStatusFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [pageView, setPageView] = useState('list')
  const [selectedReport, setSelectedReport] = useState(null)
  const [mounted, setMounted] = useState(false)

  // DEMO: lista de propietarios de los reportes de ejemplo
  const owners = useMemo(() => {
    const ownersList = Array.from(new Set(sampleReports.map((r) => r.propietario))).sort()
    console.log('🔍 Owners disponibles:', ownersList)
    console.log('📊 Total reportes:', sampleReports.length)
    return ownersList
  }, [])

  // Nombre del propietario visible (sesión real o demo)
  const ownerName = useMemo(() => {
    if (isAuthenticated && user) {
      const candidates = [
        [user?.primer_nombre, user?.segundo_nombre, user?.primer_apellido, user?.segundo_apellido].filter(Boolean).join(' '),
        user?.nombre_completo,
        user?.name,
        user?.email,
      ].filter(Boolean)
      const resolved = candidates[0] || ''
      const ownersNorm = owners.map(normalize)
      if (!resolved || !ownersNorm.includes(normalize(resolved))) {
        return previewOwner || owners[0] || ''
      }
      return resolved
    }
    return previewOwner || owners[0] || ''
  }, [isAuthenticated, user, previewOwner, owners])

  // Efectos
  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated && owners.length > 0 && !previewOwner) {
      setPreviewOwner(owners[0])
      console.log('🎯 Propietario seleccionado automáticamente:', owners[0])
    }
  }, [isAuthenticated, owners, previewOwner])

  useEffect(() => {
    setIsFiltering(true)
    const t = setTimeout(() => setIsFiltering(false), 300)
    return () => clearTimeout(t)
  }, [statusFilter, search, ownerName])

  // Funciones auxiliares
  const getReportIcon = (tipo) => {
    const icons = {
      'Emergencia': '🚨',
      'Reparación': '🔧',
      'Mantenimiento': '⚙️',
      'Mejora': '⬆️',
      'Inspección': '🔍'
    }
    return icons[tipo] || '📋'
  }

  const getStatusColor = (estado) => {
    const colors = {
      'En progreso': 'from-blue-500 to-blue-600',
      'Finalizado': 'from-green-500 to-green-600',
      'Pendiente': 'from-yellow-500 to-yellow-600',
      'Urgente': 'from-red-500 to-red-600'
    }
    return colors[estado] || 'from-gray-500 to-gray-600'
  }

  const getStatusBg = (estado) => {
    const colors = {
      'En progreso': 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
      'Finalizado': 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
      'Pendiente': 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200',
      'Urgente': 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
    }
    return colors[estado] || 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
  }

  const isReportStale = (report) => {
    const daysSinceUpdate = Math.floor((new Date() - new Date(report.actualizadoEl)) / (1000 * 60 * 60 * 24))
    return daysSinceUpdate > 7 && report.estado !== 'Finalizado'
  }

  const getReportStats = (report) => {
    const steps = report?.seguimientos || []
    const total = steps.length
    const completed = steps.filter((s) => normalize(s.estadoPaso) === 'finalizado').length
    const pending = Math.max(0, total - completed)
    const progress = total > 0 ? Math.round((completed / total) * 100) : getProgressFromReport(report)
    return { total, completed, pending, progress }
  }

  const getDefaultResponsible = (report) => report?.responsable || 'Administrador Inmotech'
  const getDefaultDescription = (report) => report?.descripcion || 'Descripción del trabajo: resumen de la solicitud y tareas planeadas para resolverla.'
  const getDefaultAttachments = (report) => report?.adjuntos || [
    { nombre: 'presupuesto_materiales.pdf', tipo: 'pdf' },
    { nombre: 'informe_tecnico.pdf', tipo: 'pdf' },
    { nombre: 'lista_materiales.xlsx', tipo: 'xlsx' },
  ]

  // FILTRADO
  const filteredReports = useMemo(() => {
    const ownerNorm = normalize(ownerName)
    const step1 = sampleReports.filter((r) => !ownerNorm || normalize(r.propietario) === ownerNorm)
    const step2 = step1.filter((r) => (statusFilter === 'todos' ? true : r.estado === statusFilter))
    const step3 = step2.filter((r) => {
      if (!search.trim()) return true
      const term = normalize(search)
      return (
        normalize(r.tipoReporte).includes(term) ||
        normalize(r.ubicacion).includes(term) ||
        normalize(r.referencia).includes(term) ||
        normalize(r.id).includes(term)
      )
    })
    return step3.sort((a, b) => new Date(b.actualizadoEl) - new Date(a.actualizadoEl))
  }, [ownerName, statusFilter, search])

  const stats = useMemo(() => {
    const total = filteredReports.length
    const activos = filteredReports.filter((r) => r.estado !== 'Finalizado').length
    const finalizados = filteredReports.filter((r) => r.estado === 'Finalizado').length
    const urgentes = filteredReports.filter((r) => r.tipoReporte === 'Emergencia' && r.estado !== 'Finalizado').length
    const avgProgress = total > 0 ? Math.round(filteredReports.reduce((acc, r) => acc + getProgressFromReport(r), 0) / total) : 0
    return { total, activos, finalizados, urgentes, avgProgress }
  }, [filteredReports])

  // Componente Skeleton
  const SkeletonReportCard = () => (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-slate-200 rounded-xl" />
          <div>
            <div className="h-4 w-24 bg-slate-200 rounded mb-2" />
            <div className="h-3 w-32 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="h-6 w-20 bg-slate-200 rounded-full" />
      </div>
      <div className="h-3 w-full bg-slate-200 rounded mb-2" />
      <div className="h-3 w-2/3 bg-slate-200 rounded mb-4" />
      <div className="h-2 w-full bg-slate-200 rounded" />
    </div>
  )

  console.log('🎨 Renderizando OwnerPropertiesView:', {
    ownerName,
    filteredReports: filteredReports.length,
    pageView,
    stats
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7fbff] to-white">
      {/* Hero se mantiene igual */}
      <div className="bg-[linear-gradient(135deg,#00457B_0%,#0077B6_100%)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold">
                {getInitials(ownerName || 'Propietario')}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Panel del Propietario</h1>
                <p className="mt-1 text-blue-100">
                  Seguimiento de reportes de {ownerName || 'Propietario'}.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-blue-100">Reportes</p>
                <p className="text-xl font-semibold">{stats.total}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-blue-100">Activos</p>
                <p className="text-xl font-semibold">{stats.activos}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-blue-100">Finalizados</p>
                <p className="text-xl font-semibold">{stats.finalizados}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-blue-100">Progreso promedio</p>
                <p className="text-xl font-semibold">{stats.avgProgress}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido: sin sección de inmuebles, solo list/detalle de reportes */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros principales */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="w-full md:max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <input
                className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="ID, referencia, ubicación o tipo de reporte"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En progreso">En progreso</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de reportes como tarjetas en grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isFiltering ? (
            // Si tienes el estado isFiltering, mostramos skeletons en el grid
            <>
              <SkeletonReportCard />
              <SkeletonReportCard />
              <SkeletonReportCard />
              <SkeletonReportCard />
              <SkeletonReportCard />
              <SkeletonReportCard />
            </>
          ) : filteredReports.length > 0 ? (
            filteredReports.map((r, idx) => (
              <article
                key={r.id}
                style={{ transitionDelay: `${idx * 40}ms` }}
                className="group rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm p-5
                               shadow-sm transition-all duration-300
                               hover:shadow-xl hover:-translate-y-[2px]"
              >
                {/* Encabezado de la tarjeta */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs text-slate-500">ID #{r.id}</div>
                    <h3 className="text-base font-semibold text-slate-800">{r.tipoReporte}</h3>
                    <p className="text-sm text-slate-600">{r.ubicacion}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${getStatusBadgeClass(r.estado)}`}>
                    {r.estado}
                  </span>
                </div>
              
                {/* Progreso */}
                <div className="mt-2">
                  <ProgressBar progress={getProgressFromReport(r)} />
                  <div className="mt-2 text-xs text-slate-500">
                    Actualizado: {formatDate(r.actualizadoEl)}
                  </div>
                </div>
              
                {/* Footer de acciones (si tienes navegación al detalle) */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-slate-700 font-semibold">
                      {getInitials(r.propietario)}
                    </span>
                    <span>{r.propietario}</span>
                  </div>
                  <button
                    onClick={() => setPageView({ type: 'detail', report: r })}
                    className="text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline"
                  >
                    Ver detalle
                  </button>
                </div>
              </article>
            ))
          ) : (
            // Mensaje de vacíos ocupando todo el ancho del grid
            <div className="col-span-full rounded-lg border border-slate-200 bg-white py-8 text-center text-slate-600">
              No hay reportes para mostrar con los filtros actuales.
            </div>
          )}
        </section>

        {pageView === 'detail' && selectedReport && (
          <div className="mt-4">
            {/* Back */}
            <button
              type="button"
              className="text-sm px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 border"
              onClick={() => {
                setPageView('list')
                setSelectedReport(null)
              }}
            >
              ← Volver a reportes
            </button>

            {/* Header del reporte */}
            <div className="mt-4 bg-blue-600 text-white rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedReport.tipoReporte} • {selectedReport.referencia}</h3>
                  <div className="mt-1 space-y-1 text-blue-100">
                    <p>📍 {selectedReport.ubicacion}</p>
                    <p>📅 Creado: {formatDate(selectedReport.creadoEl)}</p>
                    <p>👤 Responsable: {getDefaultResponsible(selectedReport)}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full bg-white/10 border border-white/20`}>
                  {selectedReport.estado}
                </span>
              </div>
            </div>

            {/* Progreso general */}
            <div className="mt-4 bg-white rounded-xl border shadow-sm p-5">
              {(() => {
                const s = getReportStats(selectedReport)
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">Progreso general</p>
                      <p className="text-sm font-semibold text-gray-900">{s.progress}%</p>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={s.progress} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Totales</p>
                        <p className="text-base font-semibold">{s.total}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Completados</p>
                        <p className="text-base font-semibold text-green-600">{s.completed}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Pendientes</p>
                        <p className="text-base font-semibold text-yellow-600">{s.pending}</p>
                      </div>
                    </div>
                  </>
                )
              })()}
              <div className="mt-4">
                <button
                  type="button"
                  className="w-full text-sm px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => {
                    // Simple: hacemos scroll a la sección de seguimiento
                    const el = document.getElementById('seguimiento-detallado')
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  Ver Seguimiento Detallado
                </button>
              </div>
            </div>

            {/* Descripción */}
            <div className="mt-4 bg-white rounded-xl border shadow-sm p-5">
              <p className="text-sm font-medium text-gray-700 mb-1">Descripción del trabajo</p>
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                {getDefaultDescription(selectedReport)}
              </div>
            </div>

            {/* Adjuntos */}
            <div className="mt-4 bg-white rounded-xl border shadow-sm p-5">
              <p className="text-sm font-medium text-gray-700 mb-3">Adjuntos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {getDefaultAttachments(selectedReport).map((a, idx) => (
                  <div key={`${selectedReport.id}-adj-${idx}`} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border">
                    <div className="w-14 h-10 bg-black text-white flex items-center justify-center text-xs font-bold rounded">
                      IMAGE
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{a.nombre}</p>
                      <p className="text-xs text-gray-500">Tipo: {a.tipo?.toUpperCase() || 'N/A'}</p>
                    </div>
                    <button className="text-xs px-2 py-1 rounded-md bg-white border hover:bg-gray-50">
                      Descargar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Seguimiento detallado */}
            <div id="seguimiento-detallado" className="mt-4 bg-white rounded-xl border shadow-sm p-5">
              <p className="text-sm font-medium text-gray-700 mb-4">Seguimiento detallado</p>
              <ol className="space-y-4">
                {(selectedReport.seguimientos || []).map((s, i) => {
                  const done = normalize(s.estadoPaso) === 'finalizado'
                  return (
                    <li key={`seg-${selectedReport.id}-${i}`} className="flex items-start gap-3">
                      <div className={`mt-1 w-6 h-6 flex items-center justify-center rounded-full text-white text-xs ${done ? 'bg-green-500' : 'bg-blue-500'}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-800">{s.titulo}</p>
                          <span className="text-xs text-gray-500">{formatDate(s.fecha)}</span>
                        </div>
                        <p className="text-sm text-gray-600">{s.descripcion}</p>
                        <p className={`mt-1 text-xs ${done ? 'text-green-600' : 'text-blue-600'}`}>
                          {done ? 'Finalizado' : 'Estado actual'}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>

              {/* Información del inmueble (resumen) */}
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Información del inmueble</p>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>🏠 Dirección: {selectedReport.ubicacion}</p>
                    <p>🔖 Número de reporte: {selectedReport.id}</p>
                    <p>📌 Referencia: {selectedReport.referencia}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Administrador del caso</p>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>👤 {getDefaultResponsible(selectedReport)}</p>
                    <p>📧 soporte@inmotech.com</p>
                    <p>📱 +51 900 000 000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
