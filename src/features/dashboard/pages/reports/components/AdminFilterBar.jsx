import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Calendar, MapPin, ChevronDown } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

const AdminFilterBar = ({
    filters,
    setFilters,
    options,
    onClear
}) => {
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const hasFilters = filters.year || filters.month || filters.city;

    return (
        <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 sticky top-0 z-20">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 mr-2">
                    <Filter className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar por:</span>
                </div>

                {/* City Filter */}
                <div className="flex-1 min-w-[140px] relative group">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors pointer-events-none" />
                    <select
                        value={filters.city || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-8 py-2 text-[11px] font-bold text-slate-600 appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:bg-white hover:shadow-sm"
                    >
                        <option value="">Todas las ciudades</option>
                        {options.cities.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                </div>

                {/* Year Filter */}
                <div className="w-[120px] relative group">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors pointer-events-none" />
                    <select
                        value={filters.year || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-8 py-2 text-[11px] font-bold text-slate-600 appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:bg-white hover:shadow-sm"
                    >
                        <option value="">Año</option>
                        {options.years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                </div>

                {/* Month Filter */}
                <div className="w-[140px] relative group">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors pointer-events-none" />
                    <select
                        value={filters.month || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-8 py-2 text-[11px] font-bold text-slate-600 appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:bg-white hover:shadow-sm"
                    >
                        <option value="">Mes</option>
                        {months.map((name, idx) => (
                            <option key={idx} value={idx + 1}>{name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                </div>

                {/* Clear Button */}
                <AnimatePresence>
                    {hasFilters && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={onClear}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-500 p-2 rounded-xl border border-rose-100 transition-colors shadow-sm"
                            title="Limpiar filtros"
                        >
                            <X className="w-4 h-4" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminFilterBar;
