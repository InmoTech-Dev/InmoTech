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
    User as UserIcon,
    Plus
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';
import { ImageViewer } from '@/shared/components/ui/ImageViewer';

const ReportDetailedView = ({ report, onEdit, onDownload, loading }) => {
    const [viewerConfig, setViewerConfig] = React.useState({
        isOpen: false,
        currentIndex: 0
    });

    const openViewer = (index) => {
        setViewerConfig({
            isOpen: true,
            currentIndex: index
        });
    };
    if (loading) {
        return (
            <div className="flex-1 h-full overflow-y-auto p-8 space-y-8 animate-pulse">
                <div className="h-10 bg-slate-200 rounded-xl w-1/2 mb-4" />
                <div className="h-12 bg-slate-100 rounded-2xl w-3/4 mb-10" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="h-40 bg-slate-50 rounded-3xl border border-slate-100" />
                    <div className="h-40 bg-slate-50 rounded-3xl border border-slate-100" />
                    <div className="h-40 bg-slate-50 rounded-3xl border border-slate-100" />
                </div>
                <div className="h-64 bg-slate-50 rounded-3xl border border-slate-100" />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] shadow-xl shadow-slate-100 flex items-center justify-center mb-8 transform rotate-6 border border-slate-100">
                    <Inbox className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3 uppercase tracking-tight">Detalles del Reporte</h3>
                <p className="text-slate-400 max-w-[280px] font-semibold text-sm leading-relaxed">
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
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
                <motion.div
                    key={report.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="p-8"
                >
                    {/* Header Section */}
                    <header className="mb-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-7 w-1.5 bg-indigo-600 rounded-full" />
                            <h2 className="text-xl font-bold text-[#1E293B] uppercase tracking-tight">
                                {(report.tipoReporte || '').replace('Mantenimineto', 'Mantenimiento')} <span className="text-indigo-600 opacity-50">/</span> {report.tipoInmueble}
                            </h2>
                        </div>

                        <div className="flex flex-col gap-4">
                            {/* Bar 1: Propietario / Ubicación / Dirección */}
                            <div className="flex flex-wrap items-center gap-y-3 gap-x-8 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 w-full px-7 py-4.5 rounded-2xl border border-slate-100/80 shadow-sm shadow-indigo-100/20">
                                <div className="flex items-center gap-3">
                                    <span className="opacity-60">PROPIETARIO:</span>
                                    <span className="text-slate-800 tracking-normal text-[12px]">{report.propietario}</span>
                                </div>
                                <span className="opacity-10">|</span>
                                <div className="flex items-center gap-3">
                                    <span className="opacity-60">UBICACIÓN:</span>
                                    <span className="text-slate-800 tracking-normal text-[12px]">{report.ubicacion}</span>
                                </div>
                                <span className="opacity-10">|</span>
                                <div className="flex items-center gap-3">
                                    <span className="opacity-60 shrink-0">DIRECCIÓN:</span>
                                    <span className="text-slate-800 tracking-tight text-[12px] truncate max-w-[250px]">
                                        {report.direccionInmueble || report.ubicacion}
                                    </span>
                                </div>
                            </div>

                            {/* Bar 2: Inmueble / ID / Responsable / Fecha / Estado */}
                            <div className="flex flex-wrap items-center gap-y-3 gap-x-8 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-white w-full px-7 py-5.5 rounded-2xl border border-slate-100 shadow-md shadow-indigo-100/30">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50/50 flex items-center justify-center border border-indigo-100/50 shadow-inner-sm shrink-0">
                                        <Building className="w-4.5 h-4.5 text-indigo-500" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-indigo-700 font-bold tracking-tight text-[13px]">{report.nombreInmueble}</span>
                                        <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 text-[9px] text-slate-500 font-bold mt-0.5 w-fit">REF: {report.referencia}</span>
                                    </div>
                                </div>

                                <span className="opacity-10">|</span>

                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
                                        <UserIcon className="w-5.5 h-5.5 text-slate-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-slate-800 tracking-tight leading-none mb-1 text-[12px]">{report.responsable}</span>
                                        <div className="flex items-center gap-1.5 opacity-60">
                                            <Calendar className="w-3 h-3 text-indigo-400" />
                                            <span className="text-[10px] tracking-wider text-slate-500">{report.fecha}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="ml-auto flex items-center gap-3">
                                    <div className={cn(
                                        "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm",
                                        report.estado === 'Completado' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                            report.estado === 'Pendiente' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                                "bg-indigo-50 text-indigo-600 border border-indigo-100"
                                    )}>
                                        <span className={cn(
                                            "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                                            report.estado === 'Completado' ? "bg-emerald-500" :
                                                report.estado === 'Pendiente' ? "bg-amber-500" :
                                                    "bg-indigo-500"
                                        )} />
                                        {report.estado}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Action Bar (Matches Section Header) */}
                    {/* Action Bar */}
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-slate-300" />
                            <h3 className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                                Detalles Técnicos del Reporte
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onEdit(report)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-lg transition-all uppercase tracking-wider shadow-sm"
                            >
                                <Edit2 className="w-3.5 h-3.5" /> Editar
                            </button>
                            <button
                                onClick={() => onDownload(report)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 rounded-2xl text-[11px] font-bold text-white hover:bg-indigo-700 hover:shadow-xl shadow-md transition-all uppercase tracking-wider"
                            >
                                <Download className="w-3.5 h-3.5" /> Descargar PDF
                            </button>
                        </div>
                    </div>

                    {/* Detailed Content: Descriptions, Images and Rubros */}
                    <div className="space-y-8">
                        {/* 1. Descripción / Observaciones */}
                        <div className="bg-slate-50/30 rounded-[2rem] p-8 border border-slate-100">
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3 opacity-80">
                                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                                    <FileText className="w-4.5 h-4.5 text-indigo-500" />
                                </div>
                                Observaciones Generales
                            </h4>
                            <div className="bg-white rounded-2xl p-7 border border-slate-50 shadow-inner-sm">
                                <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                                    {report.descripcion || "No se han registrado observaciones adicionales para este reporte."}
                                </p>
                            </div>
                        </div>

                        {/* 2. Galería de Imágenes */}
                        {report.imagenes?.length > 0 && (
                            <div className="bg-slate-50/30 rounded-[2.5rem] p-10 border border-slate-100">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-8 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                                        <Eye className="w-5 h-5 text-amber-500" />
                                    </div>
                                    Galería de Evidencias <span className="text-indigo-600 font-black">({report.imagenes.length})</span>
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {report.imagenes.slice(0, 4).map((img, idx) => (
                                        <div
                                            key={idx}
                                            className="group relative aspect-square rounded-3xl overflow-hidden border-4 border-white shadow-md hover:shadow-2xl transition-all cursor-pointer"
                                            onClick={() => openViewer(idx)}
                                        >
                                            <img
                                                src={img.url}
                                                alt={`Evidencia ${idx + 1}`}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                {idx === 3 && report.imagenes.length > 4 ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Plus className="w-8 h-8 text-white" />
                                                        <span className="text-white font-black text-xl">
                                                            {report.imagenes.length - 3} MÁS
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <Eye className="w-10 h-10 text-white" />
                                                )}
                                            </div>
                                            {idx === 3 && report.imagenes.length > 4 && (
                                                <div className="absolute inset-0 bg-indigo-900/60 flex items-center justify-center">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Plus className="w-8 h-8 text-white" />
                                                        <span className="text-white font-black text-xl">
                                                            {report.imagenes.length - 3} MÁS
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Rubros de Inspección */}
                        {report.rubros?.length > 0 && (
                            <div className="bg-slate-50/30 rounded-[2.5rem] p-10 border border-slate-100">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-8 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    Inspección Detallada por Rubros
                                </h4>
                                <div className="space-y-6">
                                    {report.rubros.map((rubro, idx) => (
                                        <div key={idx} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-500">
                                            {/* Rubro Header */}
                                            <div className="p-6 border-b border-slate-50 bg-[#FBFDFF]/50">
                                                <div className="flex items-start justify-between gap-4 mb-4">
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="text-[14px] font-bold text-[#1E293B] uppercase tracking-tight mb-1 truncate group-hover:text-indigo-600 transition-colors">
                                                            {rubro.nombre || rubro.nombre_rubro || "RUBRO SIN NOMBRE"}
                                                        </h5>
                                                        <p className="text-[11px] font-semibold text-slate-400 leading-relaxed italic line-clamp-2">
                                                            {rubro.descripcion || "Sin descripción disponible para esta inspección."}
                                                        </p>
                                                    </div>
                                                    <Badge className={cn(
                                                        "rounded-full px-4 py-1 text-[9px] font-bold uppercase tracking-widest shadow-sm shrink-0",
                                                        rubro.estado === 'Bueno' ? "bg-emerald-500 text-white" :
                                                            rubro.estado === 'Regular' ? "bg-amber-500 text-white" :
                                                                rubro.estado === 'Malo' ? "bg-rose-500 text-white" :
                                                                    "bg-slate-500 text-white"
                                                    )}>
                                                        {rubro.estado || 'PENDIENTE'}
                                                    </Badge>
                                                </div>

                                                {/* Progress Indicator */}
                                                {rubro.progreso !== undefined && (
                                                    <div className="bg-white rounded-xl p-3 border border-slate-100/80 shadow-inner-sm">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1 h-1 rounded-full bg-indigo-400" />
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nivel de Progreso</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-indigo-600 font-mono tracking-tighter">{rubro.progreso}%</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${rubro.progreso}%` }}
                                                                transition={{ duration: 1, ease: "circOut" }}
                                                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Follow-ups Timeline Section */}
                                            {rubro.seguimientos?.length > 0 ? (
                                                <div className="p-6 bg-white relative">
                                                    <div className="flex items-center gap-2 mb-6">
                                                        <Clock className="w-3.5 h-3.5 text-indigo-300" />
                                                        <h6 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Historial de Seguimientos</h6>
                                                    </div>

                                                    <div className="space-y-6 relative">
                                                        {/* Vertical Timeline Line */}
                                                        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100" />

                                                        {rubro.seguimientos.map((seg, sIdx) => (
                                                            <div key={sIdx} className="relative pl-10 group/item">
                                                                {/* Timeline Dot */}
                                                                <div className={cn(
                                                                    "absolute left-0 top-1 w-6 h-6 rounded-lg flex items-center justify-center shadow-sm z-10 transition-transform group-hover/item:scale-110 border-2 border-white",
                                                                    seg.estado === 'Completado' ? "bg-emerald-50 text-emerald-500" :
                                                                        seg.estado === 'En proceso' ? "bg-blue-50 text-blue-500" :
                                                                            "bg-slate-50 text-slate-400"
                                                                )}>
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                                </div>

                                                                <div className="bg-[#F8FAFC]/50 group-hover/item:bg-white p-4 rounded-2xl border border-slate-50 group-hover/item:border-indigo-100 group-hover/item:shadow-lg group-hover/item:shadow-indigo-50/30 transition-all duration-300">
                                                                    <div className="flex items-start justify-between gap-4 mb-3">
                                                                        <p className="text-[12px] font-semibold text-slate-700 leading-snug">
                                                                            {seg.descripcion}
                                                                        </p>
                                                                        <Badge variant="outline" className={cn(
                                                                            "rounded-md px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest shrink-0 border-0 shadow-sm",
                                                                            seg.estado === 'Completado' ? "bg-emerald-50 text-emerald-600" :
                                                                                seg.estado === 'En proceso' ? "bg-blue-50 text-blue-600" :
                                                                                    "bg-slate-100 text-slate-400"
                                                                        )}>
                                                                            {seg.estado}
                                                                        </Badge>
                                                                    </div>

                                                                    <div className="flex items-center gap-4 text-[9px] font-bold text-slate-300 uppercase tracking-wider mt-2 border-t border-slate-100/50 pt-3">
                                                                        <div className="flex items-center gap-1.5 group-hover/item:text-slate-400 transition-colors">
                                                                            <UserIcon className="w-3 h-3 opacity-50" />
                                                                            {seg.responsable || "SISTEMA"}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 ml-auto opacity-70">
                                                                            <Calendar className="w-3 h-3" />
                                                                            {seg.fecha || "PENDIENTE"}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="px-6 py-8 text-center bg-slate-50/30 border-t border-slate-50">
                                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">
                                                        No hay seguimientos registrados aún
                                                    </p>
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
                </motion.div >
            </AnimatePresence >

            <ImageViewer
                isOpen={viewerConfig.isOpen}
                onClose={() => setViewerConfig(prev => ({ ...prev, isOpen: false }))}
                images={report.imagenes}
                currentIndex={viewerConfig.currentIndex}
                onIndexChange={(index) => setViewerConfig(prev => ({ ...prev, currentIndex: index }))}
            />
        </div >
    );
};

export default ReportDetailedView;
