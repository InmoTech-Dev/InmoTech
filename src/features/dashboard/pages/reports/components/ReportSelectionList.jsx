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
                                        "w-full text-left p-5 rounded-[1.5rem] border-2 transition-all duration-200 group relative overflow-hidden",
                                        isSelected
                                            ? "border-indigo-100 bg-[#F5F8FF] shadow-sm"
                                            : "border-[#F1F5F9] hover:border-slate-200 bg-white"
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 pr-2">
                                            <h5 className="text-[13px] font-bold text-slate-800 leading-tight mb-1 truncate">
                                                {report.nombreInmueble || "Sin título definido"}
                                            </h5>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-wide">
                                                <Building2 className="w-3 h-3" />
                                                {report.tipoInmueble || "Propiedad"}
                                            </div>
                                        </div>
                                        <Badge className={cn(
                                            "rounded-full px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border-none shrink-0",
                                            report.estado === 'Completado' ? "bg-emerald-50 text-emerald-600" :
                                                report.estado === 'Pendiente' ? "bg-amber-50 text-amber-600" :
                                                    "bg-blue-50 text-blue-600"
                                        )}>
                                            {report.estado}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2 mb-4 bg-slate-50/50 rounded-xl p-3 border border-slate-100/50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                <Tag className="w-2.5 h-2.5 text-slate-400" />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-600 italic">
                                                {report.tipoReporte}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                            </div>
                                            <p className="text-[10px] font-medium text-slate-500 truncate">
                                                {report.direccionInmueble ? `${report.direccionInmueble}, ${report.ubicacion}` : report.ubicacion}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-50/50">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/50 px-2 py-0.5 rounded-lg">
                                            REF: {report.referencia}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider group-hover:gap-1.5 transition-all">
                                            Detalles <ChevronRight className="w-3 h-3" />
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="absolute left-0 top-6 bottom-6 w-1 bg-indigo-600 rounded-r-full" />
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
