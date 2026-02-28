import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, FileText, User as UserIcon, MapPin, Tag, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';

const ReportSelectionList = ({ selectedUser, reports, selectedReport, onSelectReport, loading }) => {
    if (!selectedUser) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-transparent">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                    <UserIcon className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Selecciona un administrativo</p>
            </div>
        );
    }

    const initials = `${selectedUser.nombre_completo?.[0] || ''}${selectedUser.apellido_completo?.[0] || ''}`.toUpperCase();

    return (
        <div className="flex flex-col h-full bg-transparent w-[320px] min-w-[300px] shrink-0">
            {/* User Header Section - Standard Typography */}
            <div className="p-3 border-b border-slate-50 bg-[#F8FAFC]/50">
                <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-10 h-10 border border-white shadow-sm rounded-lg shrink-0">
                        {selectedUser.avatar_url && <AvatarImage src={selectedUser.avatar_url} />}
                        <AvatarFallback className="bg-orange-50 text-orange-600 font-bold text-[10px] rounded-lg">
                            {initials || <UserIcon className="w-4 h-4" />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <h3 className="text-[13px] font-bold text-slate-800 leading-tight mb-0.5 truncate">
                            {selectedUser.nombre_completo} {selectedUser.apellido_completo}
                        </h3>
                        <p className="text-[10px] font-medium text-slate-400 leading-none truncate opacity-80">
                            C.C. {selectedUser.num_documento || selectedUser.numero_documento || 'No disp.'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-1.5">
                    <div className="flex-1 bg-white/60 border border-slate-100/50 rounded-md py-1 px-2 text-center">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Cargo</p>
                        <p className="text-[10px] font-semibold text-indigo-600 truncate uppercase leading-none">{selectedUser.rol || 'Admin'}</p>
                    </div>
                    <div className="flex-1 bg-white/60 border border-slate-100/50 rounded-md py-1 px-2 text-center">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Reportes</p>
                        <p className="text-[10px] font-semibold text-emerald-600 leading-none">{reports.length} asignados</p>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="flex-1 overflow-y-auto p-4 bg-transparent custom-scrollbar">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 pl-1 opacity-70">
                    Lista de Reportes
                </h4>

                <div>
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-slate-50 rounded-2xl animate-pulse" />
                        ))
                    ) : reports.length > 0 ? (
                        reports.map((report) => {
                            const isSelected = selectedReport?.id === report.id;

                            return (
                                <button
                                    key={report.id}
                                    onClick={() => onSelectReport(report)}
                                    className={cn(
                                        "w-full text-left transition-all duration-300 group relative mb-2.5",
                                        isSelected ? "scale-[0.98]" : "hover:scale-[0.99]"
                                    )}
                                >
                                    <div className={cn(
                                        "flex flex-col gap-2 p-3.5 rounded-2xl border transition-all duration-300",
                                        isSelected
                                            ? "bg-indigo-50/40 border-indigo-200 shadow-inner-sm"
                                            : "bg-slate-50/50 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-md hover:shadow-slate-200/40"
                                    )}>
                                        {/* Row Header: Name and Type */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <h5 className={cn(
                                                    "text-[13px] font-bold uppercase tracking-tight leading-none mb-1.5 truncate transition-colors",
                                                    isSelected ? "text-indigo-700" : "text-slate-700"
                                                )}>
                                                    {report.nombreInmueble || "Inmueble sin nombre"}
                                                </h5>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider opacity-60">ID: {report.referencia}</span>
                                                    <span className="text-[9px] font-bold text-indigo-400/70 uppercase">/</span>
                                                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">{report.tipoInmueble}</span>
                                                </div>
                                            </div>

                                            <div className={cn(
                                                "shrink-0 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                                                report.estado === 'Completado' ? "bg-emerald-100/50 text-emerald-600 border border-emerald-100" :
                                                    report.estado === 'Pendiente' ? "bg-amber-100/50 text-amber-600 border border-amber-100" :
                                                        "bg-indigo-100/50 text-indigo-600 border border-indigo-100"
                                            )}>
                                                {report.estado}
                                            </div>
                                        </div>

                                        {/* Row Footer: Type of report and Address (Bar style) */}
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white/50 px-3 py-2 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                <span className="text-slate-600 truncate font-bold">{(report.tipoReporte || '').replace('Mantenimineto', 'Mantenimiento')}</span>
                                            </div>
                                            <span className="opacity-10">|</span>
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                <span className="text-slate-500 truncate tracking-normal font-bold">
                                                    {report.direccionInmueble || report.ubicacion}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Active Accent */}
                                    {isSelected && (
                                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 rounded-full shadow-[2px_0_10px_rgba(79,70,229,0.3)]" />
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        <div className="text-center py-10 opacity-50">
                            <FileText className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                            <p className="text-[12px] font-semibold text-slate-400 uppercase">Sin reportes</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default ReportSelectionList;
