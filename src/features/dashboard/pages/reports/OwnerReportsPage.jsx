import { useMemo, useState, useEffect } from 'react'
import { Input } from '@/shared/components/ui/input'
import { ReportsTable } from './ReportsTable.jsx'
import ViewReportModal from '@/features/dashboard/components/reports/ViewReportModal.jsx'
import { motion } from 'framer-motion'
import { FileTextIcon, ClockIcon, CheckCircleIcon, TrendingUpIcon } from 'lucide-react'

export default function OwnerReportsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)

  // Datos de ejemplo para diseño de UI. Luego se reemplaza por datos reales desde API.
  const [reports] = useState([
    {
      id: 'R-001',
      ubicacion: 'Medellín, Laureles',
      tipoInmueble: 'Apartamento',
      propietario: 'Dario Jaramillo',
      tipoReporte: 'Reparación baño',
      fecha: '2025-05-20',
      estado: 'En progreso',
      responsable: 'Juan Pérez',
      referencia: 'AP-9012',
      descripcion: 'Filtración en el baño principal que requiere revisión y reparación del sello.',
      seguimientoGeneral: 'Se ha iniciado la evaluación del daño. Pendiente cotización de materiales.',
      rubros: [
        {
          id: 'RB-1',
          nombre: 'Fontanería',
          activo: true,
          valorTotal: 250000,
          seguimientos: [
            {
              id: 'SEG-1',
              tipo: 'Revisión',
              responsable: 'Juan Pérez',
              fecha: '2025-05-21',
              subSeguimientos: 2,
              estado: 'En progreso',
              descripcion: 'Primera revisión realizada, detectado sello deteriorado.',
            },
            {
              id: 'SEG-2',
              tipo: 'Cotización',
              responsable: 'Juan Pérez',
              fecha: '2025-05-22',
              subSeguimientos: 0,
              estado: 'Finalizado',
              descripcion: 'Cotización enviada al propietario.',
            },
          ],
        },
      ],
      imagenes: [],
      archivos: [],
      seguimientos: [
        {
          id: 'HS-1',
          estado: 'Revisión',
          responsable: 'Juan Pérez',
          fecha: '2025-05-21',
          descripcion: 'Visita técnica realizada.',
        },
        {
          id: 'HS-2',
          estado: 'Cotización',
          responsable: 'Juan Pérez',
          fecha: '2025-05-22',
          descripcion: 'Cotización enviada por correo.',
        },
      ],
    },
    {
      id: 'R-002',
      ubicacion: 'Envigado, La Mina',
      tipoInmueble: 'Casa',
      propietario: 'Ana Martínez',
      tipoReporte: 'Mantenimiento general',
      fecha: '2025-05-18',
      estado: 'Finalizado',
      responsable: 'Equipo de Mantenimiento',
      referencia: 'CAS-5512',
      descripcion: 'Mantenimiento preventivo de techos y canaletas.',
      seguimientoGeneral: 'Mantenimiento completado satisfactoriamente.',
      rubros: [],
      imagenes: [],
      archivos: [],
      seguimientos: [
        {
          id: 'HS-3',
          estado: 'En ejecución',
          responsable: 'Equipo de Mantenimiento',
          fecha: '2025-05-18',
          descripcion: 'Limpieza de canaletas y ajuste de tejas.',
        },
        {
          id: 'HS-4',
          estado: 'Finalizado',
          responsable: 'Equipo de Mantenimiento',
          fecha: '2025-05-19',
          descripcion: 'Trabajo completado y validado.',
        },
      ],
    },
    {
      id: 'R-003',
      ubicacion: 'Bello, Centro',
      tipoInmueble: 'Local comercial',
      propietario: 'Carlos López',
      tipoReporte: 'Mejora iluminación',
      fecha: '2025-05-15',
      estado: 'Pendiente',
      responsable: 'No asignado',
      referencia: 'LC-3456',
      descripcion: 'Instalación de luces LED para mejorar la visibilidad en el local.',
      seguimientoGeneral: 'Aún no se ha asignado responsable.',
      rubros: [],
      imagenes: [],
      archivos: [],
      seguimientos: [],
    },
    {
      id: 'R-004',
      ubicacion: 'Itagüí, Industrial',
      tipoInmueble: 'Fábrica',
      propietario: 'María González',
      tipoReporte: 'Emergencia plomería',
      fecha: '2025-04-25',
      estado: 'Urgente',
      responsable: 'Equipo Emergencia',
      referencia: 'FAB-7890',
      descripcion: 'Ruptura de tubería principal causando inundación.',
      seguimientoGeneral: 'Requiere atención inmediata. Sin avances en 10 días.',
      rubros: [
        {
          id: 'RB-2',
          nombre: 'Emergencia',
          activo: true,
          valorTotal: 500000,
          seguimientos: [
            {
              id: 'SEG-3',
              tipo: 'Evaluación',
              responsable: 'Equipo Emergencia',
              fecha: '2025-04-26',
              subSeguimientos: 0,
              estado: 'Pendiente',
              descripcion: 'Evaluación inicial pendiente.',
            },
          ],
        },
      ],
      imagenes: [],
      archivos: [],
      seguimientos: [
        {
          id: 'HS-5',
          estado: 'Alerta',
          responsable: 'Equipo Emergencia',
          fecha: '2025-04-25',
          descripcion: 'Reporte de emergencia recibido.',
        },
      ],
    },
  ])

  const filteredReports = useMemo(() => {
    return reports.filter(report =>
      Object.values(report).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [reports, searchTerm])

  const handleViewReport = (report) => setSelectedReport(report)
  const handleCloseModal = () => setSelectedReport(null)

  const handleDownloadReportPDF = (report) => {
    alert('La descarga de PDF estará disponible próximamente.')
    console.log('Descargar PDF del reporte:', report?.id)
  }

  const resumen = useMemo(() => {
    const total = filteredReports.length
    const activos = filteredReports.filter((r) => r.estado !== 'Finalizado').length
    const finalizados = filteredReports.filter((r) => r.estado === 'Finalizado').length
    const totalSeguimientos = filteredReports.reduce((acc, r) => {
      const rubrosSeg = (r.rubros || []).reduce(
        (a, rb) => a + (rb.seguimientos?.length || 0),
        0
      )
      const histSeg = r.seguimientos?.length || 0
      return acc + rubrosSeg + histSeg
    }, 0)
    // Calcular progreso promedio
    const progresoPromedio = filteredReports.length > 0
      ? Math.round(filteredReports.reduce((acc, r) => {
          const totalSeg = (r.rubros || []).reduce((a, rb) => a + (rb.seguimientos?.length || 0), 0) + (r.seguimientos?.length || 0)
          const completados = (r.rubros || []).reduce((a, rb) => a + (rb.seguimientos?.filter(s => s.estado === 'Finalizado').length || 0), 0) + (r.seguimientos?.filter(s => s.estado === 'Finalizado').length || 0)
          return acc + (totalSeg > 0 ? (completados / totalSeg) * 100 : 0)
        }, 0) / filteredReports.length)
      : 0
    return { total, activos, finalizados, totalSeguimientos, progresoPromedio }
  }, [filteredReports])

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Reportes</h1>
          <p className="text-slate-600">
            Consulta el estado y el seguimiento de tus reportes de mantenimiento y gestión.
          </p>
        </div>
        <div className="w-full max-w-md sticky top-0 z-10 bg-white p-2 rounded-lg shadow-sm">
          <Input
            placeholder="Buscar por ubicación, tipo, estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Resumen destacado */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="rounded-lg border p-4 bg-slate-50 hover:shadow-md transition-shadow"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <FileTextIcon className="w-6 h-6 text-slate-600" />
            <div className="text-sm text-slate-600">Total de Reportes</div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{resumen.total}</div>
        </motion.div>
        <motion.div
          className="rounded-lg border p-4 bg-amber-50 hover:shadow-md transition-shadow"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <ClockIcon className="w-6 h-6 text-amber-600" />
            <div className="text-sm text-slate-600">Activos</div>
          </div>
          <div className="text-3xl font-bold text-amber-600">{resumen.activos}</div>
        </motion.div>
        <motion.div
          className="rounded-lg border p-4 bg-green-50 hover:shadow-md transition-shadow"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircleIcon className="w-6 h-6 text-green-600" />
            <div className="text-sm text-slate-600">Finalizados</div>
          </div>
          <div className="text-3xl font-bold text-green-600">{resumen.finalizados}</div>
        </motion.div>
        <motion.div
          className="rounded-lg border p-4 bg-blue-50 hover:shadow-md transition-shadow"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUpIcon className="w-6 h-6 text-blue-600" />
            <div className="text-sm text-slate-600">Seguimientos</div>
          </div>
          <div className="text-3xl font-bold text-blue-600">{resumen.totalSeguimientos}</div>
        </motion.div>
        <motion.div
          className="rounded-lg border p-4 bg-purple-50 hover:shadow-md transition-shadow"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUpIcon className="w-6 h-6 text-purple-600" />
            <div className="text-sm text-slate-600">Progreso Promedio</div>
          </div>
          <div className="text-3xl font-bold text-purple-600">{resumen.progresoPromedio}%</div>
          <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
            <motion.div
              className="bg-purple-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${resumen.progresoPromedio}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Tabla de reportes */}
      <ReportsTable
        reports={filteredReports}
        onView={handleViewReport}
        onDownloadPDF={handleDownloadReportPDF}
      />

      {/* Modal de detalle con seguimiento */}
      <ViewReportModal
        isOpen={Boolean(selectedReport)}
        setSelectedReport={handleCloseModal}
        report={selectedReport}
        onEdit={null}
      />
    </div>
  )
}
