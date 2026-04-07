import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '../../../../shared/components/ui/badge'
import { MoreHorizontal, MapPin, Calendar as CalendarIcon, FileText } from 'lucide-react'
import { useAuth } from '@/shared/contexts/AuthContext'
import { cn } from '@/shared/utils/cn'

function normalizeEstado(raw) {
  const s = String(raw || '').toLowerCase().trim().replace(/[\s_-]/g, '')
  if (s === 'pendiente') return 'Pendiente'
  if (s === 'enproceso') return 'En Proceso'
  if (s === 'completado' || s === 'completo') return 'Completado'
  if (s === 'cancelado') return 'Cancelado'
  return 'Pendiente'
}

const estadoMeta = {
  'Pendiente': { dot: 'bg-yellow-500', title: 'Pendiente' },
  'En Proceso': { dot: 'bg-blue-500', title: 'En Proceso' },
  'Completado': { dot: 'bg-green-600', title: 'Completado' },
  'Cancelado': { dot: 'bg-red-500', title: 'Cancelado' }
}

export default function ReportsKanban({ reports = [], onView, onEdit, onCreate, onChangeEstado, showCancelled }) {
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('reportes', 'editar')

  const grouped = useMemo(() => {
    const estados = showCancelled
      ? ['Pendiente', 'En Proceso', 'Completado', 'Cancelado']
      : ['Pendiente', 'En Proceso', 'Completado']

    const base = estados.reduce((acc, e) => { acc[e] = []; return acc }, {})

    for (const r of reports) {
      const estado = normalizeEstado(r.estado)
      if (base[estado]) base[estado].push(r)
    }
    return base
  }, [reports, showCancelled])

  const handleDropOnColumn = (e, destinoEstado) => {
    e.preventDefault()
    let item = null
    try {
      const json = e.dataTransfer.getData('application/json')
      item = json ? JSON.parse(json) : null
    } catch {
      const id = e.dataTransfer.getData('text/plain')
      item = reports.find(r => r.id === id || String(r.referencia) === String(id)) || null
    }
    if (!canEdit) return
    if (item && normalizeEstado(item.estado) !== destinoEstado) {
      onChangeEstado?.(item, destinoEstado)
    }
  }

  const allowDrop = (e) => e.preventDefault()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Tablero Kanban de Reportes</h2>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${showCancelled ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        {Object.entries(grouped).map(([estado, items]) => {
          const meta = estadoMeta[estado]
          return (
            <div
              key={estado}
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 min-h-[240px] shadow-sm"
              onDragOver={allowDrop}
              onDrop={(e) => handleDropOnColumn(e, estado)}
            >
              <div className="flex items-center justify-between sticky top-0 bg-opacity-80 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
                  <span className="text-sm font-medium text-slate-700">{meta.title}</span>
                </div>
                <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 border">
                  {items.length}
                </Badge>
              </div>

              <div className="mt-3 space-y-3">
                {items.length === 0 ? (
                  <div className="text-xs text-slate-500 border border-dashed rounded-lg p-3 bg-white">
                    Arrastra reportes aquí para cambiar de estado
                  </div>
                ) : (
                  items.map((item) => (
                    // Tarjeta con estilo mejorado
                    <motion.div
                      key={item.id}
                      layout
                      draggable={canEdit}
                      onDragStart={(e) => {
                        if (!canEdit) {
                          e.preventDefault()
                          return
                        }
                        e.dataTransfer.effectAllowed = 'move'
                        try {
                          e.dataTransfer.setData('application/json', JSON.stringify(item))
                        } catch {
                          e.dataTransfer.setData('text/plain', item.id)
                        }
                      }}
                      whileHover={canEdit ? { scale: 1.01 } : {}}
                      className={cn(
                        "rounded-xl border p-4 shadow-sm transition hover:-translate-y-[1px]",
                        canEdit ? "border-slate-200 bg-white/90 cursor-move hover:shadow-md" : "border-slate-100 bg-slate-50 cursor-default opacity-80"
                      )}
                      title={canEdit ? "Arrastra para cambiar estado" : "No tienes permiso para editar"}
                      onClick={() => onView?.(item)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{item.tipoReporte || 'Sin tipo'}</div>
                          <div className="text-xs text-slate-500">ID: {item.referencia || item.id}</div>
                        </div>
                        <MoreHorizontal className="w-5 h-5 text-slate-400" />
                      </div>

                      <div className="mt-2 space-y-1 text-slate-600 text-xs">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>Ubicación: {item.ubicacion || 'No definida'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>Tipo: {item.tipoInmueble || 'No definido'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-3 h-3 text-slate-400" />
                          <span>Fecha: {item.fecha || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 grid place-items-center text-xs font-semibold">
                          {(item.propietario || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <Badge variant="secondary" className="text-xs">{item.estado}</Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}