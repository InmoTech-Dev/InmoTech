import React from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  DownloadIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon,
  HomeIcon,
  FileTextIcon,
  DollarSignIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertCircleIcon
} from 'lucide-react'

export function ReportViewer({ report }) {
  if (!report) return null

  // Función para formatear la fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'PPP', { locale: es })
    } catch (error) {
      return dateString
    }
  }

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Función para obtener el color de la insignia según el estado
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pendiente':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'en proceso':
      case 'en-proceso':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'completado':
      case 'finalizado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'cotizando':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'sin novedades':
        return 'bg-slate-50 text-slate-700 border-slate-200'
      case 'cancelado':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  // Función para obtener el color de la insignia según el estado del seguimiento
  const getFollowUpStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'iniciado':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'en-proceso':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'cotizando':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'finalizado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  // Calcular total de rubros
  const totalRubros = report.rubros?.reduce((total, rubro) => total + (rubro.valorTotal || 0), 0) || 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header del reporte - Mejorado */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <FileTextIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">{report.tipoReporte}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-blue-50">
              <span className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <FileTextIcon className="w-4 h-4" />
                <span className="font-medium">ID:</span> {report.id}
              </span>
              <span className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <CalendarIcon className="w-4 h-4" />
                {formatDate(report.fecha)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${getStatusColor(report.estado)} text-base px-4 py-2 font-semibold shadow-sm`}>
              {report.estado || 'No definido'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Información básica del reporte - Grid mejorado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del inmueble */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HomeIcon className="w-5 h-5 text-blue-600" />
              </div>
              Información del Inmueble
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <MapPinIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ubicación</p>
                  <p className="text-base font-medium text-slate-900 capitalize break-words">{report.ubicacion || 'No definido'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                  <HomeIcon className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tipo de inmueble</p>
                  <p className="text-base font-medium text-slate-900 capitalize break-words">{report.tipoInmueble || 'No definido'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <FileTextIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Referencia</p>
                  <p className="text-base font-medium text-slate-900 break-words">{report.referencia || 'No definido'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Propietario</p>
                  <p className="text-base font-medium text-slate-900 break-words">{report.propietario || 'No definido'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información del responsable - Card destacado */}
        <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl border border-teal-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-teal-100">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <UserIcon className="w-5 h-5 text-teal-600" />
              </div>
              Responsable
            </h3>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Asignado a</p>
              <p className="text-lg font-bold text-slate-900">{report.responsableReporte || 'No asignado'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fecha de creación</p>
              <div className="flex items-center gap-2 text-slate-700">
                <CalendarIcon className="w-4 h-4 text-teal-600" />
                <p className="font-medium">{formatDate(report.fecha)}</p>
              </div>
            </div>
            {totalRubros > 0 && (
              <div className="pt-4 border-t border-teal-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Valor total estimado</p>
                <p className="text-3xl font-bold text-teal-600">{formatCurrency(totalRubros)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Descripción - Mejorada */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileTextIcon className="w-5 h-5 text-blue-600" />
            </div>
            Descripción del Reporte
          </h3>
        </div>
        <div className="p-6">
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-base">
            {report.descripcion || 'Sin descripción disponible'}
          </p>
        </div>
      </div>

      {/* Seguimiento general - Mejorado */}
      {report.seguimientoGeneral && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-blue-100">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClockIcon className="w-5 h-5 text-blue-600" />
              </div>
              Seguimiento General
            </h3>
          </div>
          <div className="p-6">
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-base">
              {report.seguimientoGeneral}
            </p>
          </div>
        </div>
      )}

      {/* Rubros del proyecto - Tabla mejorada */}
      {report.rubros && report.rubros.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSignIcon className="w-5 h-5 text-emerald-600" />
              </div>
              Rubros del Proyecto
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="text-left py-4 px-6 font-bold text-slate-700 text-sm uppercase tracking-wide">Rubro</th>
                  <th className="text-left py-4 px-6 font-bold text-slate-700 text-sm uppercase tracking-wide">Descripción</th>
                  <th className="text-center py-4 px-6 font-bold text-slate-700 text-sm uppercase tracking-wide">Cantidad</th>
                  <th className="text-right py-4 px-6 font-bold text-slate-700 text-sm uppercase tracking-wide">Valor Unitario</th>
                  <th className="text-right py-4 px-6 font-bold text-slate-700 text-sm uppercase tracking-wide">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rubros.map((rubro, index) => (
                  <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">{rubro.nombre}</td>
                    <td className="py-4 px-6 text-slate-600">{rubro.descripcion}</td>
                    <td className="py-4 px-6 text-center font-medium text-slate-900">{rubro.cantidad}</td>
                    <td className="py-4 px-6 text-right text-slate-700">{formatCurrency(rubro.valorUnitario)}</td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900">{formatCurrency(rubro.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-teal-50 to-blue-50 border-t-2 border-teal-300">
                  <td colSpan="4" className="py-5 px-6 font-bold text-slate-900 text-right text-lg">Total General:</td>
                  <td className="py-5 px-6 font-bold text-teal-600 text-right text-2xl">{formatCurrency(totalRubros)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Seguimientos - Timeline mejorado */}
      {report.seguimientos && report.seguimientos.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ClockIcon className="w-5 h-5 text-purple-600" />
              </div>
              Historial de Seguimientos
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {report.seguimientos.map((seguimiento, index) => (
                <div
                  key={index}
                  className="relative pl-8 pb-6 border-l-2 border-slate-200 last:border-l-0 last:pb-0"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-0 -translate-x-[9px] w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm"></div>

                  <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className={`${getFollowUpStatusColor(seguimiento.estado)} font-semibold px-3 py-1`}>
                          {seguimiento.estado || 'No definido'}
                        </Badge>
                        <span className="flex items-center gap-2 text-sm text-slate-600">
                          <CalendarIcon className="w-4 h-4" />
                          {formatDate(seguimiento.fecha)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                        <UserIcon className="w-4 h-4 text-blue-600" />
                        {seguimiento.responsable || 'No asignado'}
                      </div>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {seguimiento.descripcion || 'Sin descripción'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Imágenes - Grid mejorado */}
      {report.imagenes && report.imagenes.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              Imágenes del Proyecto
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {report.imagenes.map((imagen, index) => (
                <div key={index} className="group relative bg-slate-50 rounded-xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
                  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                    <img
                      src={imagen.url}
                      alt={imagen.descripcion || `Imagen ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold text-slate-900 mb-1">{imagen.nombre}</p>
                    {imagen.descripcion && (
                      <p className="text-xs text-slate-600">{imagen.descripcion}</p>
                    )}
                  </div>
                  {imagen.url && (
                    <a
                      href={imagen.url}
                      download={imagen.nombre || `imagen-${index + 1}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Button size="sm" className="bg-white/95 hover:bg-white text-blue-600 shadow-lg border border-blue-200">
                        <DownloadIcon className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Archivos - Lista mejorada */}
      {report.archivos && report.archivos.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FileTextIcon className="w-5 h-5 text-amber-600" />
              </div>
              Archivos Adjuntos
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {report.archivos.map((archivo, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 p-3 bg-white rounded-lg border border-slate-200 group-hover:border-blue-300 transition-colors">
                      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 mb-1 truncate">{archivo.nombre || `Archivo ${index + 1}`}</p>
                      <p className="text-sm text-slate-600">
                        {archivo.tamaño ? `${(archivo.tamaño / 1024).toFixed(2)} KB` : 'Tamaño desconocido'}
                        {archivo.tipo && ` • ${archivo.tipo}`}
                      </p>
                    </div>
                  </div>
                  {archivo.url && (
                    <a
                      href={archivo.url}
                      download={archivo.nombre || `archivo-${index + 1}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Descargar
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay información adicional - Mejorado */}
      {(!report.seguimientos || report.seguimientos.length === 0) &&
        (!report.imagenes || report.imagenes.length === 0) &&
        (!report.archivos || report.archivos.length === 0) &&
        (!report.rubros || report.rubros.length === 0) && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-8 text-center shadow-sm">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <AlertCircleIcon className="w-8 h-8 text-amber-600" />
              </div>
            </div>
            <p className="text-amber-800 font-medium text-lg">
              Este reporte no tiene seguimientos, imágenes, archivos o rubros adicionales registrados.
            </p>
          </div>
        )}
    </div>
  )
}

// Exportación por defecto
export default ReportViewer