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
        <div className="flex flex-col h-full bg-white border-r border-slate-100 w-[380px] min-w-[380px]">
            {/* User Header Section */}
            <div className="p-6 border-b border-slate-50">
                <div className="flex items-center gap-4 mb-6">
                    <Avatar className="w-14 h-14 border-2 border-white shadow-sm rounded-2xl">
                        {selectedUser.avatar_url && <AvatarImage src={selectedUser.avatar_url} />}
                        <AvatarFallback className="bg-orange-100 text-orange-600 font-bold rounded-2xl">
                            {initials || <UserIcon className="w-6 h-6" />}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="text-[14px] font-bold uppercase text-[#1E293B] leading-tight">
                            {selectedUser.nombre_completo}<br />{selectedUser.apellido_completo}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-300 mt-0.5">
                            CC: {selectedUser.num_documento || selectedUser.numero_documento || 'No disponible'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cargo</p>
                        <p className="text-[11px] font-semibold text-slate-600 truncate">{selectedUser.rol || 'Administrativo'}</p>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reportes Asignados</p>
                        <p className="text-[11px] font-semibold text-slate-600 truncate">{reports.length} reportes</p>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-6">
                    Reportes
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
                                        "w-full text-left p-6 rounded-[2.2rem] border-2 transition-all duration-300 group relative overflow-hidden",
                                        isSelected
                                            ? "border-indigo-100 bg-[#F8FAFF] shadow-[0_20px_50px_rgba(79,70,229,0.1)]"
                                            : "border-slate-50 hover:border-indigo-50 bg-white hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1"
                                    )}
                                >
                                    {/* Header Section: Title and Badge */}
                                    <div className="flex items-start justify-between mb-5">
                                        <div className="flex-1 min-w-0 pr-3">
                                            <h5 className="text-[15px] font-extrabold text-[#1E293B] leading-tight mb-1.5 truncate group-hover:text-indigo-600 transition-colors">
                                                {report.nombreInmueble || "Inmueble sin nombre"}
                                            </h5>
                                            <div className="flex items-center gap-2">
                                                <div className="bg-slate-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <Building2 className="w-2.5 h-2.5 text-indigo-500" />
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                                                        {report.tipoInmueble}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 transition-all shadow-sm",
                                            report.estado === 'Completado' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                                report.estado === 'Pendiente' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                                    "bg-indigo-50 text-indigo-600 border border-indigo-100"
                                        )}>
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full animate-pulse",
                                                report.estado === 'Completado' ? "bg-emerald-500" :
                                                    report.estado === 'Pendiente' ? "bg-amber-500" :
                                                        "bg-indigo-500"
                                            )} />
                                            {report.estado}
                                        </div>
                                    </div>

                                    {/* Info Block: Type and Address */}
                                    <div className="bg-[#F1F5F9]/30 rounded-[1.5rem] p-4 border border-slate-100/50 mb-5 group-hover:bg-white transition-all">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-50">
                                                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-500 italic leading-tight">
                                                {(report.tipoReporte || '').replace('Mantenimineto', 'Mantenimiento')}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-50">
                                                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 truncate">
                                                {report.direccionInmueble || report.ubicacion}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Footer: REF and Details Action */}
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] bg-slate-50 px-2 py-0.5 rounded border border-slate-100/50">
                                                REF: {report.referencia}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 -translate-x-3 group-hover:translate-x-0 transition-all duration-500">
                                            Detalles <ChevronRight className="w-4 h-4" />
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
