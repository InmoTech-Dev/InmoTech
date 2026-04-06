import React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  DollarSignIcon,
  FileTextIcon,
  HomeIcon,
  MapPinIcon,
  UserIcon,
} from 'lucide-react'
import ImageViewer from '@/shared/components/files/ImageViewer'
import PdfViewer from '@/shared/components/files/PdfViewer'
import FileDownloadButton from '@/shared/components/files/FileDownloadButton'
import { Badge } from '@/shared/components/ui/badge'
import { getFileNameFromUrl, isPdfUrl } from '@/shared/utils/fileUrl'

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'

  try {
    return format(new Date(dateString), 'PPP', { locale: es })
  } catch (_error) {
    return dateString
  }
}

const formatCurrency = (amount) => {
  const numericAmount = Number(amount || 0)
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number.isFinite(numericAmount) ? numericAmount : 0)
}

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

function InfoCard({ icon: Icon, title, value, tone = 'blue' }) {
  const iconTone = {
    blue: 'bg-blue-100 text-blue-600',
    teal: 'bg-teal-100 text-teal-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="flex items-start gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
      <div className={`rounded-lg p-2 ${iconTone[tone] || iconTone.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="break-words text-base font-medium text-slate-900">{value || 'No definido'}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, iconTone = 'bg-slate-100 text-slate-700', children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
        <h3 className="flex items-center gap-3 text-xl font-bold text-slate-900">
          <div className={`rounded-lg p-2 ${iconTone}`}>
            <Icon className="h-5 w-5" />
          </div>
          {title}
        </h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export function ReportViewer({ report }) {
  if (!report) return null

  const images = Array.isArray(report.imagenes) ? report.imagenes.filter((item) => item?.url) : []
  const files = Array.isArray(report.archivos) ? report.archivos.filter((item) => item?.url) : []
  const pdfFiles = files.filter((file) => isPdfUrl(file.url, file.nombre))
  const otherFiles = files.filter((file) => !isPdfUrl(file.url, file.nombre))
  const totalRubros = report.rubros?.reduce((total, rubro) => total + (Number(rubro.valorTotal) || 0), 0) || 0
  const assignedUser = report.responsable || report.responsableReporte || 'No asignado'
  const hasExtraContent =
    Boolean(report.seguimientoGeneral) ||
    (report.seguimientos && report.seguimientos.length > 0) ||
    images.length > 0 ||
    files.length > 0 ||
    (report.rubros && report.rubros.length > 0)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 p-8 shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                <FileTextIcon className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">{report.tipoReporte || 'Reporte'}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-blue-50">
              <span className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                <FileTextIcon className="h-4 w-4" />
                <span className="font-medium">ID:</span> {report.id}
              </span>
              <span className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                <CalendarIcon className="h-4 w-4" />
                {formatDate(report.fecha)}
              </span>
            </div>
          </div>
          <Badge className={`${getStatusColor(report.estado)} px-4 py-2 text-base font-semibold shadow-sm`}>
            {report.estado || 'No definido'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Información del Inmueble" icon={HomeIcon} iconTone="bg-blue-100 text-blue-600">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <InfoCard icon={MapPinIcon} title="Ubicación" value={report.ubicacion} tone="blue" />
              <InfoCard icon={HomeIcon} title="Tipo" value={report.tipoInmueble} tone="teal" />
              <InfoCard icon={FileTextIcon} title="Referencia" value={report.referencia} tone="purple" />
              <InfoCard icon={UserIcon} title="Propietario" value={report.propietario} tone="blue" />
              <InfoCard icon={DollarSignIcon} title="Valor del inmueble" value={formatCurrency(report.valorInmueble)} tone="emerald" />
              <InfoCard icon={CheckCircle2Icon} title="Estado del inmueble" value={report.estadoInmueble} tone="purple" />
            </div>
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Responsable" icon={UserIcon} iconTone="bg-teal-100 text-teal-600">
            <div className="space-y-4">
              <InfoCard icon={UserIcon} title="Asignado a" value={assignedUser} tone="teal" />
              <InfoCard icon={CalendarIcon} title="Fecha de creación" value={formatDate(report.fecha)} tone="blue" />
              <InfoCard icon={ClockIcon} title="Estado actual" value={report.estado} tone="purple" />
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Descripción del Reporte" icon={FileTextIcon} iconTone="bg-slate-100 text-slate-700">
        <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
          {report.descripcion || 'Sin descripción registrada.'}
        </p>
      </SectionCard>

      {report.seguimientoGeneral ? (
        <SectionCard title="Seguimiento General" icon={ClockIcon} iconTone="bg-blue-100 text-blue-600">
          <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
            {report.seguimientoGeneral}
          </p>
        </SectionCard>
      ) : null}

      {report.rubros && report.rubros.length > 0 ? (
        <SectionCard title="Rubros del Reporte" icon={DollarSignIcon} iconTone="bg-emerald-100 text-emerald-600">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-6 py-4 font-semibold">Concepto</th>
                  <th className="px-6 py-4 font-semibold">Descripción</th>
                  <th className="px-6 py-4 text-center font-semibold">Cantidad</th>
                  <th className="px-6 py-4 text-right font-semibold">Valor unitario</th>
                  <th className="px-6 py-4 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {report.rubros.map((rubro, index) => (
                  <tr key={rubro.id || index} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-medium text-slate-900">{rubro.concepto || rubro.nombre || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{rubro.descripcion || '-'}</td>
                    <td className="px-6 py-4 text-center font-medium text-slate-900">{rubro.cantidad ?? 0}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{formatCurrency(rubro.valorUnitario)}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(rubro.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-teal-300 bg-gradient-to-r from-teal-50 to-blue-50">
                  <td colSpan="4" className="px-6 py-5 text-right text-lg font-bold text-slate-900">
                    Total General:
                  </td>
                  <td className="px-6 py-5 text-right text-2xl font-bold text-teal-600">
                    {formatCurrency(totalRubros)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {report.seguimientos && report.seguimientos.length > 0 ? (
        <SectionCard title="Historial de Seguimientos" icon={ClockIcon} iconTone="bg-purple-100 text-purple-600">
          <div className="space-y-4">
            {report.seguimientos.map((seguimiento, index) => (
              <div
                key={seguimiento.id || index}
                className="relative border-l-2 border-slate-200 pb-6 pl-8 last:border-l-0 last:pb-0"
              >
                <div className="absolute left-0 top-0 h-4 w-4 -translate-x-[9px] rounded-full border-4 border-white bg-blue-600 shadow-sm" />
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 transition-all hover:border-blue-300 hover:shadow-sm">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className={`${getFollowUpStatusColor(seguimiento.estado)} px-3 py-1 font-semibold`}>
                        {seguimiento.estado || 'No definido'}
                      </Badge>
                      <span className="flex items-center gap-2 text-sm text-slate-600">
                        <CalendarIcon className="h-4 w-4" />
                        {formatDate(seguimiento.fecha)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900">
                      <UserIcon className="h-4 w-4 text-blue-600" />
                      {seguimiento.responsable || 'No asignado'}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                    {seguimiento.descripcion || 'Sin descripción'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {images.length > 0 ? (
        <SectionCard title="Imágenes del Proyecto" icon={HomeIcon} iconTone="bg-pink-100 text-pink-600">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((imagen, index) => (
              <div key={imagen.id_imagen || imagen.id || `${imagen.url}-${index}`} className="space-y-3">
                <ImageViewer
                  url={imagen.url}
                  title={imagen.nombre || `Imagen ${index + 1}`}
                  alt={imagen.descripcion || imagen.nombre || `Imagen ${index + 1}`}
                  fileName={imagen.nombre || getFileNameFromUrl(imagen.url, `imagen-${index + 1}`)}
                />
                {imagen.descripcion ? <p className="px-1 text-xs text-slate-600">{imagen.descripcion}</p> : null}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {pdfFiles.length > 0 ? (
        <SectionCard title="Documentos PDF" icon={FileTextIcon} iconTone="bg-amber-100 text-amber-600">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {pdfFiles.map((archivo, index) => (
              <PdfViewer
                key={archivo.id_archivo || archivo.id || `${archivo.url}-${index}`}
                url={archivo.url}
                title={archivo.nombre || `Documento PDF ${index + 1}`}
                fileName={archivo.nombre || getFileNameFromUrl(archivo.url, `documento-${index + 1}.pdf`)}
                heightClassName="h-[520px]"
              />
            ))}
          </div>
        </SectionCard>
      ) : null}

      {otherFiles.length > 0 ? (
        <SectionCard title="Archivos Adjuntos" icon={FileTextIcon} iconTone="bg-amber-100 text-amber-600">
          <div className="space-y-3">
            {otherFiles.map((archivo, index) => (
              <div
                key={archivo.id_archivo || archivo.id || `${archivo.url}-${index}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all hover:border-blue-300 hover:bg-blue-50/50"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex-shrink-0 rounded-lg border border-slate-200 bg-white p-3 transition-colors group-hover:border-blue-300">
                    <FileTextIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 truncate font-semibold text-slate-900">{archivo.nombre || `Archivo ${index + 1}`}</p>
                    <p className="text-sm text-slate-600">
                      {archivo.tamaño ? `${(archivo.tamaño / 1024).toFixed(2)} KB` : 'Tamaño desconocido'}
                      {archivo.tipo ? ` • ${archivo.tipo}` : ''}
                    </p>
                  </div>
                </div>
                <FileDownloadButton
                  url={archivo.url}
                  fileName={archivo.nombre || getFileNameFromUrl(archivo.url, `archivo-${index + 1}`)}
                  label="Descargar"
                  variant="default"
                  className="flex-shrink-0"
                  buttonClassName="bg-teal-600 text-white shadow-sm hover:bg-teal-700"
                />
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {!hasExtraContent ? (
        <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-amber-100 p-3">
              <AlertCircleIcon className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <p className="text-lg font-medium text-amber-800">
            Este reporte no tiene seguimientos, imágenes, archivos o rubros adicionales registrados.
          </p>
        </div>
      ) : null}
    </div>
  )
}

export default ReportViewer
