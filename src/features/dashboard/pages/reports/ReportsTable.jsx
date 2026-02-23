import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { EyeIcon, EditIcon, DownloadIcon, ChevronLeftIcon, ChevronRightIcon, FileText, MapPin, Building, User, Calendar, BarChart3, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'

export function ReportsTable({ reports = [], onView, onEdit, onDownloadPDF }) {
  const [sortField, setSortField] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)

  // Usar exclusivamente los datos recibidos (sin mocks)
  const reportsData = Array.isArray(reports) ? reports : []

  // Función para obtener el color del estado
  const getStatusColor = (estado) => {
    switch (estado) {
      case 'Completado':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'En proceso':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Cotizando':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Sin novedades':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'Pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Cancelado':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Función para obtener información del estado con icono
  const getStatusInfo = (estado) => {
    const statusConfig = {
      'Completado': {
        color: 'bg-green-100 text-green-800 border border-green-200',
        icon: CheckCircle,
        label: 'Completado'
      },
      'En proceso': {
        color: 'bg-blue-100 text-blue-800 border border-blue-200',
        icon: Clock,
        label: 'En Proceso'
      },
      'Cotizando': {
        color: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        icon: AlertCircle,
        label: 'Cotizando'
      },
      'Sin novedades': {
        color: 'bg-gray-100 text-gray-800 border border-gray-200',
        icon: AlertCircle,
        label: 'Sin Novedades'
      },
      'Pendiente': {
        color: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        icon: AlertCircle,
        label: 'Pendiente'
      },
      'Cancelado': {
        color: 'bg-red-100 text-red-800 border border-red-200',
        icon: XCircle,
        label: 'Cancelado'
      }
    };
    return statusConfig[estado] || statusConfig['Pendiente'];
  }

  // Función para manejar el ordenamiento
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Función para ordenar los datos
  const sortedReports = [...reportsData].sort((a, b) => {
    if (!sortField) return 0

    const aValue = a[sortField]?.toString().toLowerCase() || ''
    const bValue = b[sortField]?.toString().toLowerCase() || ''

    if (sortDirection === 'asc') {
      return aValue.localeCompare(bValue)
    } else {
      return bValue.localeCompare(aValue)
    }
  })

  // Lógica de paginación
  const totalPages = Math.ceil(sortedReports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentReports = sortedReports.slice(startIndex, endIndex)

  // Funciones de paginación
  const goToPage = (page) => {
    setCurrentPage(page)
  }

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }

  // Resetear página cuando cambian los datos
  React.useEffect(() => {
    setCurrentPage(1)
  }, [sortedReports.length])

  // Calcular estadísticas
  const stats = {
    total: reportsData.length,
    pendientes: reportsData.filter(r => r.estado === 'Pendiente').length,
    enProceso: reportsData.filter(r => r.estado === 'En proceso').length,
    completados: reportsData.filter(r => r.estado === 'Completado').length,
    cancelados: reportsData.filter(r => r.estado === 'Cancelado').length,
    cotizando: reportsData.filter(r => r.estado === 'Cotizando').length,
    sinNovedades: reportsData.filter(r => r.estado === 'Sin novedades').length
  }

  // Componente para tarjeta de reporte
  const ReportCard = ({ report, index }) => {
    const statusInfo = getStatusInfo(report.estado)
    const StatusIcon = statusInfo.icon

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md px-6 py-5 flex flex-col gap-5 transition-all duration-200"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reporte</div>
            <div className="text-2xl font-bold text-slate-900">#{report.id}</div>
            <div className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${statusInfo.color}`}>
              <StatusIcon className="h-4 w-4" />
              <span>{statusInfo.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onView?.(report)}
              className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
              title="Ver detalles"
            >
              <EyeIcon className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit?.(report)}
              className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
              title="Editar reporte"
            >
              <EditIcon className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDownloadPDF?.(report)}
              className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
              title="Descargar PDF"
            >
              <DownloadIcon className="h-5 w-5" />
            </motion.button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition-colors">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Ubicación
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="capitalize font-medium">{report.ubicacion}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition-colors">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Propiedad & Propietario
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-700 mb-1">
              <Building className="h-4 w-4 text-blue-600" />
              <span className="capitalize font-medium">{report.tipoInmueble}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="h-4 w-4 text-slate-400" />
              <span>{report.propietario}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition-colors">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Tipo de Reporte & Fecha
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-700 mb-1">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="capitalize font-medium">{report.tipoReporte}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>{report.fecha}</span>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // Componente para vista móvil (tarjetas)
  const MobileCard = ({ report }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-gray-900">{report.id}</span>
          <Badge className={`${getStatusColor(report.estado)} border text-xs`}>
            {report.estado}
          </Badge>
        </div>
        <div className="flex items-center space-x-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onView?.(report)}
            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
            title="Ver detalles"
          >
            <EyeIcon className="h-4 w-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onEdit?.(report)}
            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
            title="Editar"
          >
            <EditIcon className="h-4 w-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onDownloadPDF?.(report)}
            className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
            title="Descargar PDF"
          >
            <DownloadIcon className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Ubicación:</span>
          <p className="font-medium text-gray-900 capitalize">{report.ubicacion}</p>
        </div>
        <div>
          <span className="text-gray-500">Tipo:</span>
          <p className="font-medium text-gray-900 capitalize">{report.tipoInmueble}</p>
        </div>
        <div>
          <span className="text-gray-500">Propietario:</span>
          <p className="font-medium text-gray-900">{report.propietario}</p>
        </div>
        <div>
          <span className="text-gray-500">Fecha:</span>
          <p className="font-medium text-gray-900">{report.fecha}</p>
        </div>
      </div>

      <div>
        <span className="text-gray-500 text-sm">Tipo de reporte:</span>
        <p className="font-medium text-gray-900 capitalize">{report.tipoReporte}</p>
      </div>
    </div>
  )

  // Componente para el encabezado de columna ordenable
  const SortableHeader = ({ field, children, className = "" }) => (
    <th
      className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field && (
          <span className="text-gray-400">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  )

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      {reportsData.length > 0 && (
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 px-5 py-5 space-y-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">Estadísticas de Reportes</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-lg shadow-slate-200/40 hover:shadow-slate-300/50 hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute inset-0 rounded-2xl border border-white/60 pointer-events-none"></div>
              <BarChart3 className="h-4 w-4 text-slate-600 mb-1" />
              <div className="text-xl font-semibold text-slate-800">{stats.total}</div>
              <div className="text-xs text-slate-600">Total</div>
            </div>
            <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-yellow-100 bg-white shadow-lg shadow-yellow-200/30 hover:shadow-yellow-300/40 hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute inset-0 rounded-2xl border border-white/70 pointer-events-none"></div>
              <AlertCircle className="h-4 w-4 text-yellow-600 mb-1" />
              <div className="text-xl font-semibold text-yellow-700">{stats.pendientes}</div>
              <div className="text-xs text-yellow-600">Pendientes</div>
            </div>
            <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-blue-100 bg-white shadow-lg shadow-blue-200/30 hover:shadow-blue-300/40 hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute inset-0 rounded-2xl border border-white/70 pointer-events-none"></div>
              <Clock className="h-4 w-4 text-blue-600 mb-1" />
              <div className="text-xl font-semibold text-blue-700">{stats.enProceso}</div>
              <div className="text-xs text-blue-600">En Proceso</div>
            </div>
            <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-green-100 bg-white shadow-lg shadow-green-200/30 hover:shadow-green-300/40 hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute inset-0 rounded-2xl border border-white/70 pointer-events-none"></div>
              <CheckCircle className="h-4 w-4 text-green-600 mb-1" />
              <div className="text-xl font-semibold text-green-700">{stats.completados}</div>
              <div className="text-xs text-green-600">Completados</div>
            </div>
            <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-red-100 bg-white shadow-lg shadow-red-200/30 hover:shadow-red-300/40 hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute inset-0 rounded-2xl border border-white/70 pointer-events-none"></div>
              <XCircle className="h-4 w-4 text-red-600 mb-1" />
              <div className="text-xl font-semibold text-red-700">{stats.cancelados}</div>
              <div className="text-xs text-red-600">Cancelados</div>
            </div>
            <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-amber-100 bg-white shadow-lg shadow-amber-200/30 hover:shadow-amber-300/40 hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute inset-0 rounded-2xl border border-white/70 pointer-events-none"></div>
              <AlertCircle className="h-4 w-4 text-amber-600 mb-1" />
              <div className="text-xl font-semibold text-amber-700">{stats.cotizando}</div>
              <div className="text-xs text-amber-600">Cotizando</div>
            </div>
            <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-gray-100 bg-white shadow-lg shadow-gray-200/30 hover:shadow-gray-300/40 hover:-translate-y-0.5 transition-all duration-200">
              <div className="absolute inset-0 rounded-2xl border border-white/70 pointer-events-none"></div>
              <AlertCircle className="h-4 w-4 text-gray-600 mb-1" />
              <div className="text-xl font-semibold text-gray-700">{stats.sinNovedades}</div>
              <div className="text-xs text-gray-600">Sin Novedades</div>
            </div>
          </div>
        </section>
      )}

      {/* Lista de reportes en tarjetas */}
      <div className="space-y-4">
        {currentReports.map((report, index) => (
          <ReportCard key={report.id} report={report} index={index} />
        ))}
      </div>

      {/* Paginador - Responsive */}
      {sortedReports.length > 0 && (
        <div className="bg-white px-4 py-3 border-t border-slate-200 sm:px-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </motion.button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Mostrando{' '}
                  <span className="font-medium">{startIndex + 1}</span>
                  {' '}a{' '}
                  <span className="font-medium">
                    {Math.min(endIndex, sortedReports.length)}
                  </span>
                  {' '}de{' '}
                  <span className="font-medium">{sortedReports.length}</span>
                  {' '}resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </motion.button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <motion.button
                      key={page}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => goToPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${currentPage === page
                        ? 'z-10 bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      {page}
                    </motion.button>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </motion.button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {sortedReports.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-slate-100">
          <div className="mb-6">
            <FileText className="mx-auto h-16 w-16 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-3">
            ¡No hay reportes registrados aún!
          </h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Los reportes aparecerán aquí una vez que se registren en el sistema.
          </p>
        </div>
      )}
    </div>
  )
}

export default ReportsTable
