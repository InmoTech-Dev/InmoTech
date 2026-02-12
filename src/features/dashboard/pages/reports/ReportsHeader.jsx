import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { DownloadIcon, FileTextIcon, ChevronDownIcon, FileSpreadsheet, PlusIcon, SearchIcon } from 'lucide-react'

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
  onToggleShowCancelled
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

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

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="text-xs text-slate-500 mt-0.5">Gestiona tus reportes</p>
      </div>

      {/* Actions */}
      <div className="flex w-full sm:w-auto gap-2 flex-wrap items-center">
        {/* Search Bar */}
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

        {/* Status Filter */}
        {onStatusChange && (
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

        {/* Today Filter */}
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

        {/* Show Cancelled */}
        {onToggleShowCancelled && (
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
  )
}