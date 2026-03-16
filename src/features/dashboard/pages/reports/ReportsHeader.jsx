import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Input } from '@/shared/components/ui/input'
import {
  Calendar,
  ChevronDownIcon,
  FileSpreadsheet,
  FileTextIcon,
  Filter,
  MapPin,
  PlusIcon,
  SearchIcon,
  X
} from 'lucide-react'
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
  hideFilters = false,
  adminFilters = { year: '', month: '', city: '' },
  setAdminFilters,
  onSearchAdmin,
  allReports = []
}) {
  const { hasPermission } = useAuth()
  const [isDownloadOpen, setIsDownloadOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [localAdminFilters, setLocalAdminFilters] = useState(adminFilters || { year: '', month: '', city: '' })
  const dropdownRef = useRef(null)
  const statusRef = useRef(null)

  const canCreate = hasPermission('reportes', 'crear')
  const canDownload = hasPermission('reportes', 'descargar')
  const statusOptions = ['Todos los estados', 'Pendiente', 'En Proceso', 'Completado', 'Cancelado']

  useEffect(() => {
    setLocalAdminFilters(adminFilters || { year: '', month: '', city: '' })
  }, [adminFilters])

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

  const filterOptions = useMemo(() => {
    const cities = [...new Set(allReports.map((r) => r.ubicacion).filter(Boolean))].sort()
    const years = [...new Set(allReports.map((r) => {
      const parts = r.fecha?.split('/')
      return parts?.[2]
    }).filter(Boolean))].sort((a, b) => Number(b) - Number(a))
    return { cities, years }
  }, [allReports])

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const hasAdminFilters = Boolean(localAdminFilters?.year || localAdminFilters?.month || localAdminFilters?.city)
  const isAdminView = hideFilters && typeof setAdminFilters === 'function'

  return (
    <div className="shrink-0 space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion de Reportes</h1>
          <p className="text-xs text-slate-500 mt-0.5">Administra y supervisa todos los reportes inmobiliarios</p>
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
                onClick={() => setIsStatusOpen((prev) => !prev)}
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
                      type="button"
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

          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileHover={canDownload ? { scale: 1.02 } : {}}
              whileTap={canDownload ? { scale: 0.98 } : {}}
              type="button"
              disabled={!canDownload}
              onClick={() => canDownload && setIsDownloadOpen((prev) => !prev)}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm border transition-all ${
                canDownload
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60 border-slate-300'
              }`}
            >
              Descargar
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isDownloadOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            {isDownloadOpen && canDownload && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden"
              >
                <button
                  type="button"
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
                  type="button"
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
              canCreate
                ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
            }`}
            title={canCreate ? 'Crear nuevo reporte' : 'No tienes permiso para crear reportes'}
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo reporte
          </motion.button>
        </div>
      </div>

      {isAdminView && (
        <div className="flex items-center gap-3 bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2 mr-1">
            <Filter className="w-4 h-4 text-indigo-500" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filtrar:</span>
          </div>

          <div className="relative group">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={localAdminFilters.city || ''}
              onChange={(e) => setLocalAdminFilters((prev) => ({ ...prev, city: e.target.value }))}
              className="bg-white border border-slate-200 rounded-lg pl-8 pr-8 py-1.5 text-xs font-medium text-slate-600 appearance-none outline-none transition-all min-w-[160px]"
            >
              <option value="">Todas las ciudades</option>
              {filterOptions.cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
          </div>

          <div className="relative group">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={localAdminFilters.year || ''}
              onChange={(e) => setLocalAdminFilters((prev) => ({ ...prev, year: e.target.value }))}
              className="bg-white border border-slate-200 rounded-lg pl-8 pr-8 py-1.5 text-xs font-medium text-slate-600 appearance-none outline-none transition-all min-w-[100px]"
            >
              <option value="">Ano</option>
              {filterOptions.years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
          </div>

          <div className="relative group">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={localAdminFilters.month || ''}
              onChange={(e) => setLocalAdminFilters((prev) => ({ ...prev, month: e.target.value }))}
              className="bg-white border border-slate-200 rounded-lg pl-8 pr-8 py-1.5 text-xs font-medium text-slate-600 appearance-none outline-none transition-all min-w-[130px]"
            >
              <option value="">Mes</option>
              {months.map((name, idx) => (
                <option key={name} value={String(idx + 1)}>{name}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => {
              setAdminFilters?.(localAdminFilters)
              onSearchAdmin?.(localAdminFilters)
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all"
          >
            <SearchIcon className="w-3.5 h-3.5" />
            Buscar
          </motion.button>

          {hasAdminFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => {
                const clean = { year: '', month: '', city: '' }
                setLocalAdminFilters(clean)
                setAdminFilters?.(clean)
                onSearchAdmin?.(clean)
              }}
              className="bg-rose-50 hover:bg-rose-100 text-rose-500 p-1.5 rounded-lg border border-rose-100 transition-colors shadow-sm"
              title="Limpiar filtros"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>
      )}
    </div>
  )
}
