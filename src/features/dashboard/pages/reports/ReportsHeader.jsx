import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Input } from '@/shared/components/ui/input'
import { ChevronDownIcon, DownloadIcon, FileSpreadsheet, FileTextIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useAuth } from '@/shared/contexts/AuthContext'

export function ReportsHeader({
  searchTerm,
  onSearchChange,
  onNewReport,
  onDownloadPDF,
  onDownloadExcel,
  reports = [],
  statusFilter,
  onStatusChange,
  showCancelled,
  onToggleShowCancelled,
  hideFilters = false
}) {
  const { hasPermission } = useAuth()
  const [isDownloadOpen, setIsDownloadOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const dropdownRef = useRef(null)
  const statusRef = useRef(null)

  const canCreate = hasPermission('reportes', 'crear')
  const canDownload = hasPermission('reportes', 'descargar')
  const statusOptions = ['Todos los estados', 'Pendiente', 'En Proceso', 'Completado', 'Cancelado']

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDownloadOpen(false)
      }
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setIsStatusOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDownloadOption = (type) => {
    if (!canDownload) return
    setIsDownloadOpen(false)
    if (type === 'pdf') onDownloadPDF?.(reports)
    if (type === 'excel') onDownloadExcel?.(reports)
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="text-xs text-slate-500 mt-0.5">Gestiona tus reportes</p>
      </div>

      <div className="flex w-full sm:w-auto gap-2 flex-wrap items-center">
        {!hideFilters && (
          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar reportes..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-3 py-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        )}

        {onStatusChange && !hideFilters && (
          <div className="relative" ref={statusRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setIsStatusOpen((v) => !v)}
              className="px-3 py-2 text-sm border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
            >
              {statusFilter || 'Todos los estados'}
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            {isStatusOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-50 mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
              >
                {statusOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      onStatusChange(opt)
                      setIsStatusOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                      statusFilter === opt ? 'font-semibold text-blue-600 bg-blue-50' : 'text-slate-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {onToggleShowCancelled && !hideFilters && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onToggleShowCancelled}
            className={`px-3 py-2 text-sm rounded-lg border transition-all ${
              showCancelled ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3" />
                <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" />
              </svg>
              Ver cancelados
            </span>
          </motion.button>
        )}

        <div className="relative" ref={dropdownRef}>
          <motion.button
            whileHover={canDownload ? { scale: 1.02 } : {}}
            whileTap={canDownload ? { scale: 0.98 } : {}}
            disabled={!canDownload}
            onClick={() => setIsDownloadOpen((v) => !v)}
            className={`border px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm bg-white ${
              canDownload ? 'border-blue-600 text-blue-600 hover:bg-blue-50' : 'border-slate-300 text-slate-400 cursor-not-allowed opacity-60'
            }`}
            title={canDownload ? 'Descargar reportes' : 'No tienes permiso para descargar'}
          >
            <DownloadIcon className="h-4 w-4" />
            <span>Descargar</span>
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isDownloadOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          {isDownloadOpen && canDownload && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden"
            >
              <button
                onClick={() => handleDownloadOption('pdf')}
                className="w-full px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <FileTextIcon className="h-4 w-4 text-red-500" />
                <div>
                  <div className="font-medium text-slate-900">PDF</div>
                  <div className="text-xs text-slate-500">Formato portable</div>
                </div>
              </button>
              <button
                onClick={() => handleDownloadOption('excel')}
                className="w-full px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-green-50 flex items-center gap-2 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-500" />
                <div>
                  <div className="font-medium text-slate-900">Excel</div>
                  <div className="text-xs text-slate-500">Hoja de calculo</div>
                </div>
              </button>
            </motion.div>
          )}
        </div>

        <motion.button
          whileHover={canCreate ? { scale: 1.02 } : {}}
          whileTap={canCreate ? { scale: 0.98 } : {}}
          disabled={!canCreate}
          onClick={() => canCreate && onNewReport?.()}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm shadow-sm transition-all ${
            canCreate ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow' : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
          }`}
          title={canCreate ? 'Crear nuevo reporte' : 'No tienes permiso para crear reportes'}
        >
          <PlusIcon className="h-4 w-4" />
          Nuevo reporte
        </motion.button>
      </div>
    </div>
  )
}
