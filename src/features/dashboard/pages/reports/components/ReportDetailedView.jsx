import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    Calendar,
    Building,
    Download,
    Edit2,
    Eye,
    Inbox,
    ShieldCheck,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileText,
    User as UserIcon
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';

const ReportDetailedView = ({ report, onEdit, onDownload }) => {
    if (!report) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] p-12 text-center">
                <div className="w-32 h-32 bg-white rounded-[3rem] shadow-2xl shadow-indigo-100 flex items-center justify-center mb-10 transform rotate-6 border border-slate-50">
                    <Inbox className="w-14 h-14 text-indigo-100" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-4 uppercase tracking-tight">Detalles del Reporte</h3>
                <p className="text-slate-400 max-w-md font-bold text-base leading-relaxed">
                    Selecciona un reporte de la lista central para ver toda su información detallada.
                </p>
            </div>
        );
    }

    const getStatusInfo = (estado) => {
        const configs = {
            'Completado': { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2, label: 'Finalizado' },
            'En proceso': { color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock, label: 'Procesando' },
            'Pendiente': { color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle, label: 'En espera' },
        };
        return configs[estado] || configs['Pendiente'];
    };

    const status = getStatusInfo(report.estado);

    return (
        <div className="flex-1 h-full overflow-y-auto bg-[#F8FAFC] custom-scrollbar">
            <AnimatePresence mode="wait">
                <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-6 max-w-4xl mx-auto"
                >
                    {/* Header Section */}
                    <header className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-1.5 bg-indigo-600 rounded-full" />
                            <h2 className="text-xl md:text-2xl font-black text-[#1E293B] uppercase tracking-tight">
                                {report.tipoReporte} <span className="text-indigo-600">/</span> {report.tipoInmueble}
                            </h2>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-y-2 gap-x-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] bg-white w-fit px-5 py-3 rounded-2xl border border-slate-100 shadow-sm ml-4.5">
                            <div className="flex items-center gap-2.5">
                                <span className="text-slate-400 opacity-60">PROPIETARIO:</span>
                                <span className="text-[#1E293B]">{report.propietario}</span>
                            </div>
                            <span className="hidden md:block opacity-10 font-thin scale-150">|</span>
                            <div className="flex items-center gap-2.5">
                                <span className="text-slate-400 opacity-60">UBICACIÓN:</span>
                                <span className="text-[#1E293B]">{report.ubicacion}</span>
                            </div>
                        </div>
                    </header>

                    {/* Stats/Info Grid - Compact and Balanced Layout */}
                    <div className="flex flex-col md:flex-row gap-5 mb-10">
                        {/* Estado */}
                        <div className="md:w-[26%] bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center min-h-[170px]">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4 opacity-70">Estado</p>
                            <div className="flex flex-col items-center gap-3">
                                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-md", status.bg)}>
                                    <status.icon className={cn("w-6 h-6", status.color)} />
                                </div>
                                <p className={cn("text-[13px] font-black uppercase tracking-[0.1em]", status.color)}>
                                    {report.estado}
                                </p>
                            </div>
                        </div>

                        {/* Propiedad */}
                        <div className="md:flex-1 bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[170px]">
                            <div className="absolute -top-3 -right-3 opacity-[0.03]">
                                <Building className="w-24 h-24 text-slate-600" />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3 opacity-70">Propiedad</p>
                            <div className="space-y-3">
                                <p className="text-lg font-black text-indigo-700 uppercase tracking-tight leading-none truncate">
                                    {report.nombreInmueble}
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg uppercase tracking-widest shadow-sm">
                                        ID: {report.referencia}
                                    </span>
                                    <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-widest shadow-sm">
                                        {report.tipoInmueble}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 mt-1 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50 w-fit max-w-full">
                                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <p className="text-[10px] font-bold truncate tracking-tight uppercase">
                                        {report.direccionInmueble || report.ubicacion}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Responsable */}
                        <div className="md:flex-1 bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm flex flex-col relative overflow-hidden min-h-[170px]">
                            <div className="absolute -top-3 -right-3 opacity-[0.03]">
                                <ShieldCheck className="w-24 h-24 text-slate-600" />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4 opacity-70">Responsable</p>
                            <div className="flex-1 flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center border border-white shadow-lg shrink-0">
                                        <UserIcon className="w-5.5 h-5.5 text-indigo-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-slate-700 uppercase tracking-tight truncate leading-tight">
                                            {report.responsable}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500 bg-slate-50 w-fit px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm ml-auto">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.1em]">
                                        {report.fecha}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar (Matches Section Header) */}
                    {/* Action Bar */}
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-slate-300" />
                            <h3 className="text-xs uppercase tracking-[0.25em] font-black text-slate-400">
                                Detalles Técnicos del Reporte
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onEdit(report)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-lg transition-all uppercase tracking-widest shadow-sm"
                            >
                                <Edit2 className="w-3.5 h-3.5" /> Editar
                            </button>
                            <button
                                onClick={() => onDownload(report)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 rounded-2xl text-[11px] font-black text-white hover:bg-indigo-700 hover:shadow-xl shadow-md transition-all uppercase tracking-widest"
                            >
                                <Download className="w-3.5 h-3.5" /> Descargar PDF
                            </button>
                        </div>
                    </div>

                    {/* Detailed Content: Descriptions, Images and Rubros */}
                    <div className="space-y-8">
                        {/* 1. Descripción / Observaciones */}
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3 opacity-80">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                                    <FileText className="w-4.5 h-4.5 text-indigo-500" />
                                </div>
                                Observaciones Generales
                            </h4>
                            <div className="bg-slate-50/80 rounded-2xl p-7 border border-slate-100">
                                <p className="text-base text-slate-600 leading-relaxed font-bold">
                                    {report.descripcion || "No se han registrado observaciones adicionales para este reporte."}
                                </p>
                            </div>
                        </div>

                        {/* 2. Galería de Imágenes */}
                        {report.imagenes?.length > 0 && (
                            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-lg shadow-slate-100/50">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-8 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                        <Eye className="w-5 h-5 text-amber-500" />
                                    </div>
                                    Galería de Evidencias <span className="text-indigo-600 font-black">({report.imagenes.length})</span>
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {report.imagenes.map((img, idx) => (
                                        <div key={idx} className="group relative aspect-square rounded-3xl overflow-hidden border-4 border-white shadow-md hover:shadow-2xl transition-all cursor-pointer">
                                            <img
                                                src={img.url}
                                                alt={`Evidencia ${idx + 1}`}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                <Eye className="w-10 h-10 text-white" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Rubros de Inspección */}
                        {report.rubros?.length > 0 && (
                            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-lg shadow-slate-100/50">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-8 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    Inspección Detallada por Rubros
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {report.rubros.map((rubro, idx) => (
                                        <div key={idx} className="flex flex-col p-7 bg-slate-50/50 rounded-3xl border-2 border-transparent group hover:bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50/50 transition-all cursor-default">
                                            <div className="flex items-start justify-between mb-5">
                                                <div className="flex-1 pr-4">
                                                    <h5 className="text-[15px] font-black text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition-colors mb-1">
                                                        {rubro.nombre || rubro.nombre_rubro}
                                                    </h5>
                                                    <p className="text-xs text-slate-400 font-bold line-clamp-2 leading-relaxed">
                                                        {rubro.descripcion || "Sin descripción de rubro disponible para esta inspección."}
                                                    </p>
                                                </div>
                                                <Badge className={cn(
                                                    "rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-sm",
                                                    rubro.estado === 'Bueno' ? "bg-emerald-500 text-white" :
                                                        rubro.estado === 'Regular' ? "bg-amber-500 text-white" :
                                                            "bg-red-500 text-white"
                                                )}>
                                                    {rubro.estado || 'N/A'}
                                                </Badge>
                                            </div>
                                            {/* Progress Bar Si aplica */}
                                            {rubro.progreso !== undefined && (
                                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 transition-all"
                                                        style={{ width: `${rubro.progreso}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. Seguimiento General */}
                        {report.seguimientoGeneral && (
                            <div className="bg-indigo-900 rounded-[3rem] p-12 text-white shadow-2xl shadow-indigo-200 flex flex-col md:flex-row items-center md:items-start gap-10 hover:scale-[1.01] transition-transform cursor-default">
                                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center shrink-0 border border-white/20 backdrop-blur-md shadow-lg">
                                    <FileText className="w-10 h-10 text-indigo-200" />
                                </div>
                                <div className="space-y-4 text-center md:text-left">
                                    <h4 className="text-xs font-black text-indigo-300 uppercase tracking-[0.3em] mb-2">Comentario Administrativo</h4>
                                    <p className="text-xl leading-relaxed text-indigo-50 font-black italic tracking-tight">
                                        "{report.seguimientoGeneral}"
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-16 flex justify-end border-t border-slate-200 pt-8">
                        <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">
                            Última actualización: {report.fecha}
                        </p>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default ReportDetailedView;
