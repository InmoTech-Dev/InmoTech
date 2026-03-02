import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { DownloadIcon, FileTextIcon, ChevronDownIcon, FileSpreadsheet, PlusIcon, SearchIcon, Filter, Calendar, MapPin, X } from 'lucide-react'

export function ReportsHeader({
  searchTerm,
  onSearchChange,
  onNewReport,
  onDownloadPDF,
  onDownloadExcel,
  reports = [],
  // Nuevos props opcionales (se muestran solo si vienen)
  statusFilter,
  onStatusChange,
  todayOnly,
  onToggleToday,
  showCancelled,
  onToggleShowCancelled,
  hideFilters = false,
  // Admin filters
  adminFilters,
  setAdminFilters,
  onSearchAdmin,
  allReports = []
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Local state for admin filters (uncommitted)
  const [localAdminFilters, setLocalAdminFilters] = useState(adminFilters)

  // Update local state when parent adminFilters change (e.g. on clear)
  useEffect(() => {
    setLocalAdminFilters(adminFilters)
  }, [adminFilters])

  // NUEVO: dropdown de estado
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const statusRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setIsStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDownloadOption = (type) => {
    setIsDropdownOpen(false)
    if (type === 'pdf') {
      onDownloadPDF?.(reports)
    } else if (type === 'excel') {
      onDownloadExcel?.(reports)
    }
  }

  // Filter options computed from all reports
  const filterOptions = useMemo(() => {
    const cities = [...new Set(allReports.map(r => r.ubicacion).filter(Boolean))].sort()
    const years = [...new Set(allReports.map(r => {
      const parts = r.fecha?.split('/')
      return parts?.[2]
    }).filter(Boolean))].sort((a, b) => b - a)
    return { cities, years }
  }, [allReports])

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const hasAdminFilters = adminFilters?.year || adminFilters?.month || adminFilters?.city
  const isAdmin = hideFilters && adminFilters && setAdminFilters

  return (
    <div className="shrink-0 space-y-3">
      {/* Row 1: Title + Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Reportes</h1>
          <p className="text-xs text-slate-500 mt-0.5">Administra y supervisa todos los reportes inmobiliarios</p>
        </div>

        {/* Actions */}
        <div className="flex w-full sm:w-auto gap-2 flex-wrap items-center">
          {/* Search Bar (non-admin) */}
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

          {/* Status Filter (non-admin) */}
          {onStatusChange && !hideFilters && (
            <div className="relative" ref={statusRef}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className="px-3 py-2 text-sm border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
              >
                Todos los estados
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
              </motion.button>
              {isStatusOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-50 mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
                >
                  {['Todos los estados', 'Pendiente', 'En Proceso', 'Completado', 'Cancelado'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => { onStatusChange(opt); setIsStatusOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${statusFilter === opt ? 'font-semibold text-blue-600 bg-blue-50' : 'text-slate-700'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          )}

          {/* Today Filter (non-admin) */}
          {onToggleToday && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onToggleToday}
              className={`px-3 py-2 text-sm rounded-lg border transition-all ${todayOnly
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V8H3v11a2 2 0 0 0 2 2z" />
                </svg>
                De hoy
              </span>
            </motion.button>
          )}

          {/* Show Cancelled (non-admin) */}
          {onToggleShowCancelled && !hideFilters && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onToggleShowCancelled}
              className={`px-3 py-2 text-sm rounded-lg border transition-all ${showCancelled
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
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

          {/* Download Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm bg-white"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>Descargar</span>
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            {isDropdownOpen && (
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
                    <div className="text-xs text-slate-500">Hoja de cálculo</div>
                  </div>
                </button>
              </motion.div>
            )}
          </div>

          {/* New Report Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNewReport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm shadow-sm hover:shadow transition-all"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo reporte
          </motion.button>
        </div>
      </div>

      {/* Row 2: Admin Filters (only for admin view) */}
      {isAdmin && (
        <div className="flex items-center gap-3 bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2 mr-1">
            <Filter className="w-4 h-4 text-indigo-500" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filtrar:</span>
          </div>

          {/* City Filter */}
          <div className="relative group">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors pointer-events-none" />
            <select
              value={localAdminFilters.city || ''}
              onChange={(e) => setLocalAdminFilters(prev => ({ ...prev, city: e.target.value }))}
              className="bg-white border border-slate-200 rounded-lg pl-8 pr-8 py-1.5 text-xs font-medium text-slate-600 appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all cursor-pointer hover:border-indigo-300 hover:shadow-sm min-w-[160px]"
            >
              <option value="">Todas las ciudades</option>
              {filterOptions.cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
          </div>

          {/* Year Filter */}
          <div className="relative group">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors pointer-events-none" />
            <select
              value={localAdminFilters.year || ''}
              onChange={(e) => setLocalAdminFilters(prev => ({ ...prev, year: e.target.value }))}
              className="bg-white border border-slate-200 rounded-lg pl-8 pr-8 py-1.5 text-xs font-medium text-slate-600 appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all cursor-pointer hover:border-indigo-300 hover:shadow-sm min-w-[100px]"
            >
              <option value="">Año</option>
              {filterOptions.years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
          </div>

          {/* Month Filter */}
          <div className="relative group">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors pointer-events-none" />
            <select
              value={localAdminFilters.month || ''}
              onChange={(e) => setLocalAdminFilters(prev => ({ ...prev, month: e.target.value }))}
              className="bg-white border border-slate-200 rounded-lg pl-8 pr-8 py-1.5 text-xs font-medium text-slate-600 appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all cursor-pointer hover:border-indigo-300 hover:shadow-sm min-w-[130px]"
            >
              <option value="">Mes</option>
              {months.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
          </div>

          {/* Search Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => onSearchAdmin?.(localAdminFilters)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md transition-all"
          >
            <SearchIcon className="w-3.5 h-3.5" />
            Buscar
          </motion.button>

          {/* Clear Filters */}
          <AnimatePresence>
            {hasAdminFilters && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setAdminFilters({ year: '', month: '', city: '' })}
                className="bg-rose-50 hover:bg-rose-100 text-rose-500 p-1.5 rounded-lg border border-rose-100 transition-colors shadow-sm"
                title="Limpiar filtros"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}