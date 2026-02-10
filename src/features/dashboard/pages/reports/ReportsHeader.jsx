import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { DownloadIcon, FileTextIcon, ChevronDownIcon, FileSpreadsheet } from 'lucide-react'

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
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>

      <div className="flex w-full sm:w-auto gap-2 flex-wrap items-center">
        {/* Buscador */}
        <div className="relative w-full sm:w-64">
          <Input
            type="text"
            placeholder="Buscar reportes..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filtro por estado (si se provee onStatusChange) */}
        {onStatusChange && (
          <div className="relative" ref={statusRef}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="px-3 py-2 text-sm border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg flex items-center gap-2"
            >
              Todos los estados
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
            </Button>
            {isStatusOpen && (
              <div className="absolute z-50 mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-md">
                {['Todos los estados', 'Pendiente', 'En Proceso', 'Completado', 'Cancelado'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => { onStatusChange(opt); setIsStatusOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${statusFilter === opt ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filtro "De hoy" (si se provee onToggleToday) */}
        {onToggleToday && (
          <Button
            type="button"
            variant="outline"
            onClick={onToggleToday}
            className={`px-3 py-2 text-sm rounded-lg border-slate-200 ${todayOnly ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V8H3v11a2 2 0 0 0 2 2z"/>
              </svg>
              De hoy
            </span>
          </Button>
        )}

        {/* Ver cancelados (usa tu showCancelled) */}
        {onToggleShowCancelled && (
          <Button
            type="button"
            variant="outline"
            onClick={onToggleShowCancelled}
            className={`px-3 py-2 text-sm rounded-lg border-slate-200 ${showCancelled ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3" />
                <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" />
              </svg>
              Ver cancelados
            </span>
          </Button>
        )}

        {/* Botón de descarga con dropdown */}
        <div className="relative" ref={dropdownRef}>
          <Button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <DownloadIcon className="h-4 w-4" />
            <span>Descargar Reporte</span>
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>
          
          {/* Menú desplegable */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="py-1">
                <button
                  onClick={() => handleDownloadOption('pdf')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                >
                  <FileTextIcon className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="font-medium">Descargar PDF</div>
                    <div className="text-xs text-gray-500">Formato de documento portable</div>
                  </div>
                </button>
                <button
                  onClick={() => handleDownloadOption('excel')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium">Descargar Excel</div>
                    <div className="text-xs text-gray-500">Hoja de cálculo de Excel</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nuevo reporte */}
        <Button 
          onClick={onNewReport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo reporte
        </Button>
      </div>
    </div>
  )
}