import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, FileText, User as UserIcon, MapPin, Tag, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';

const ReportSelectionList = ({ selectedUser, reports, selectedReport, onSelectReport, loading }) => {
    if (!selectedUser) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white p-8 text-center border-r border-slate-100">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                    <UserIcon className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Selecciona un administrativo</p>
            </div>
        );
    }

    const initials = `${selectedUser.nombre_completo?.[0] || ''}${selectedUser.apellido_completo?.[0] || ''}`.toUpperCase();

    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-100 w-[360px] min-w-[320px] shrink-0">
            {/* User Header Section */}
            <div className="p-5 border-b border-slate-50 bg-[#F8FAFC]/50">
                <div className="flex items-center gap-3.5 mb-5">
                    <Avatar className="w-12 h-12 border-[3px] border-white shadow-lg rounded-xl">
                        {selectedUser.avatar_url && <AvatarImage src={selectedUser.avatar_url} />}
                        <AvatarFallback className="bg-orange-100 text-orange-600 font-black text-sm rounded-xl">
                            {initials || <UserIcon className="w-5 h-5" />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <h3 className="text-sm font-black uppercase text-[#1E293B] leading-tight tracking-tight">
                            {selectedUser.nombre_completo}<br />{selectedUser.apellido_completo}
                        </h3>
                        <p className="text-[9px] font-black text-slate-300 mt-0.5 uppercase tracking-widest leading-none">
                            CC: {selectedUser.num_documento || selectedUser.numero_documento || 'No disponible'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="flex-1 bg-white border border-slate-100 shadow-sm rounded-lg p-2.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 opacity-80">Cargo</p>
                        <p className="text-[10px] font-black text-slate-700 truncate uppercase tracking-tight">{selectedUser.rol || 'Admin'}</p>
                    </div>
                    <div className="flex-1 bg-white border border-slate-100 shadow-sm rounded-lg p-2.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 opacity-80">Reportes</p>
                        <p className="text-[10px] font-black text-slate-700 truncate">{reports.length} asignados</p>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="flex-1 overflow-y-auto p-5 bg-white custom-scrollbar">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                    Lista de Reportes
                </h4>

                <div className="space-y-4">
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
                                        "w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 group relative overflow-hidden",
                                        isSelected
                                            ? "border-indigo-100 bg-[#F8FAFF] shadow-[0_10px_30px_rgba(79,70,229,0.08)]"
                                            : "border-slate-50 hover:border-indigo-50 bg-white hover:shadow-lg hover:shadow-slate-200/40 hover:-translate-y-0.5"
                                    )}
                                >
                                    {/* Header Section: Title and Badge */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1 min-w-0 pr-3">
                                            <h5 className="text-[13px] font-black text-[#1E293B] leading-tight mb-1.5 truncate group-hover:text-indigo-600 transition-colors">
                                                {report.nombreInmueble || "Inmueble sin nombre"}
                                            </h5>
                                            <div className="flex items-center gap-1.5">
                                                <div className="bg-slate-100/80 px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-slate-50">
                                                    <Building2 className="w-3 h-3 text-indigo-500" />
                                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">
                                                        {report.tipoInmueble}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 transition-all",
                                            report.estado === 'Completado' ? "bg-emerald-500 text-white shadow-sm" :
                                                report.estado === 'Pendiente' ? "bg-amber-500 text-white shadow-sm" :
                                                    "bg-indigo-600 text-white shadow-sm"
                                        )}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
                                            {report.estado}
                                        </div>
                                    </div>

                                    {/* Info Block: Type and Address */}
                                    <div className="bg-[#F1F5F9]/40 rounded-2xl p-3.5 border border-slate-100/50 mb-4 group-hover:bg-white transition-all shadow-inner-sm">
                                        <div className="flex items-center gap-3 mb-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-50">
                                                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                                            </div>
                                            <p className="text-[11px] font-black text-slate-600 italic leading-tight">
                                                {(report.tipoReporte || '').replace('Mantenimineto', 'Mantenimiento')}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-50">
                                                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 truncate tracking-tight">
                                                {report.direccionInmueble || report.ubicacion}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Footer: REF and Details Action */}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                ID: {report.referencia}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[8px] font-black text-indigo-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                                            Detalles <ChevronRight className="w-3 h-3" />
                                        </div>
                                    </div>

                                    {/* Selected Indicator Bar */}
                                    {isSelected && (
                                        <motion.div
                                            layoutId="active-bar-list"
                                            className="absolute left-0 top-8 bottom-8 w-1.5 bg-indigo-600 rounded-r-full shadow-[4px_0_15px_rgba(79,70,229,0.4)]"
                                        />
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
        </div>
    );
};

export default ReportSelectionList;
