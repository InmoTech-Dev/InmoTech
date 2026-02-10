import React from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DownloadIcon, UserIcon, CalendarIcon, MapPinIcon, HomeIcon, FileTextIcon, DollarSignIcon } from 'lucide-react'

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
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'en proceso':
      case 'en-proceso':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completado':
      case 'finalizado':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cotizando':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'sin novedades':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Función para obtener el color de la insignia según el estado del seguimiento
  const getFollowUpStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'iniciado':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'en-proceso':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cotizando':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'finalizado':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Calcular total de rubros
  const totalRubros = report.rubros?.reduce((total, rubro) => total + (rubro.valorTotal || 0), 0) || 0

  return (
    <div className="space-y-8">
      {/* Header del reporte */}
      <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-6 border border-teal-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{report.tipoReporte}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <FileTextIcon className="w-4 h-4" />
                ID: {report.id}
              </span>
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                {formatDate(report.fecha)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${getStatusColor(report.estado)} text-sm px-3 py-1`}>
              {report.estado || 'No definido'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Información básica del reporte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información del inmueble */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <HomeIcon className="w-5 h-5 text-teal-600" />
            Información del Inmueble
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPinIcon className="w-4 h-4 text-gray-400 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Ubicación</p>
                <p className="text-gray-900 capitalize">{report.ubicacion || 'No definido'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HomeIcon className="w-4 h-4 text-gray-400 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Tipo de inmueble</p>
                <p className="text-gray-900 capitalize">{report.tipoInmueble || 'No definido'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileTextIcon className="w-4 h-4 text-gray-400 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Referencia</p>
                <p className="text-gray-900">{report.referencia || 'No definido'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserIcon className="w-4 h-4 text-gray-400 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-500">Propietario</p>
                <p className="text-gray-900">{report.propietario || 'No definido'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Información del responsable */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-teal-600" />
            Responsable del Reporte
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Responsable</p>
              <p className="text-gray-900">{report.responsableReporte || 'No asignado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Fecha de creación</p>
              <p className="text-gray-900">{formatDate(report.fecha)}</p>
            </div>
            {totalRubros > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500">Valor total estimado</p>
                <p className="text-2xl font-bold text-teal-600">{formatCurrency(totalRubros)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Descripción */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Descripción del Reporte</h3>
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
          {report.descripcion || 'Sin descripción disponible'}
        </p>
      </div>

      {/* Seguimiento general */}
      {report.seguimientoGeneral && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Seguimiento General</h3>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {report.seguimientoGeneral}
          </p>
        </div>
      )}

      {/* Rubros del proyecto */}
      {report.rubros && report.rubros.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSignIcon className="w-5 h-5 text-teal-600" />
            Rubros del Proyecto
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Rubro</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Descripción</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Cantidad</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Valor Unitario</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {report.rubros.map((rubro, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{rubro.nombre}</td>
                    <td className="py-3 px-4 text-gray-700">{rubro.descripcion}</td>
                    <td className="py-3 px-4 text-center text-gray-900">{rubro.cantidad}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(rubro.valorUnitario)}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">{formatCurrency(rubro.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td colSpan="4" className="py-3 px-4 font-semibold text-gray-900 text-right">Total:</td>
                  <td className="py-3 px-4 font-bold text-teal-600 text-right text-lg">{formatCurrency(totalRubros)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Seguimientos */}
      {report.seguimientos && report.seguimientos.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de Seguimientos</h3>
          <div className="space-y-4">
            {report.seguimientos.map((seguimiento, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getFollowUpStatusColor(seguimiento.estado)}`}>
                      {seguimiento.estado || 'No definido'}
                    </Badge>
                    <span className="text-sm text-gray-500">{formatDate(seguimiento.fecha)}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {seguimiento.responsable || 'No asignado'}
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {seguimiento.descripcion || 'Sin descripción'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Imágenes */}
      {report.imagenes && report.imagenes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Imágenes del Proyecto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.imagenes.map((imagen, index) => (
              <div key={index} className="relative group">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={imagen.url}
                    alt={imagen.descripcion || `Imagen ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-900">{imagen.nombre}</p>
                  {imagen.descripcion && (
                    <p className="text-xs text-gray-500">{imagen.descripcion}</p>
                  )}
                </div>
                {imagen.url && (
                  <a
                    href={imagen.url}
                    download={imagen.nombre || `imagen-${index + 1}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white">
                      <DownloadIcon className="w-4 h-4" />
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Archivos */}
      {report.archivos && report.archivos.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Archivos Adjuntos</h3>
          <div className="space-y-3">
            {report.archivos.map((archivo, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{archivo.nombre || `Archivo ${index + 1}`}</p>
                    <p className="text-sm text-gray-500">
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
                  >
                    <Button size="sm" variant="outline" className="text-teal-600 border-teal-200 hover:bg-teal-50">
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay información adicional */}
      {(!report.seguimientos || report.seguimientos.length === 0) && 
       (!report.imagenes || report.imagenes.length === 0) && 
       (!report.archivos || report.archivos.length === 0) && 
       (!report.rubros || report.rubros.length === 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">
            Este reporte no tiene seguimientos, imágenes, archivos o rubros adicionales registrados.
          </p>
        </div>
      )}
    </div>
  )
}

// Exportación por defecto
export default ReportViewer