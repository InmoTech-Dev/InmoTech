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
    User as UserIcon
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';

const ReportDetailedView = ({ report, onEdit, onDownload }) => {
    if (!report) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] p-8 text-center">
                <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl shadow-slate-100 flex items-center justify-center mb-8 transform rotate-6 border border-slate-50">
                    <Inbox className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-[18px] font-bold text-slate-800 mb-2 uppercase">Detalles del Reporte</h3>
                <p className="text-slate-400 max-w-sm font-semibold text-sm">
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
                    className="p-10 max-w-5xl mx-auto"
                >
                    {/* Header Section */}
                    <header className="mb-10">
                        <h2 className="text-[28px] font-bold text-[#1E293B] mb-2 leading-tight">
                            {report.tipoReporte} — {report.tipoInmueble}
                        </h2>
                        <div className="flex items-center gap-2 text-slate-400 font-semibold text-sm">
                            <span className="uppercase tracking-wider text-[#64748B]">PROPIETARIO:</span>
                            <span className="text-[#475569]">{report.propietario}</span>
                            <span className="mx-2 opacity-30">•</span>
                            <span className="uppercase tracking-wider text-[#64748B]">UBICACIÓN:</span>
                            <span className="text-[#475569]">{report.ubicacion}</span>
                        </div>
                    </header>

                    {/* Stats/Info Grid - Balanced Proportions (30% : 35% : 35%) */}
                    <div className="flex flex-col md:flex-row gap-5 mb-12">
                        {/* Estado - Espacio suficiente (30%) */}
                        <div className="md:w-[28%] bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm flex flex-col min-w-[140px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-6">Estado</p>
                            <div className="flex flex-col gap-3">
                                <div className={cn("w-10 h-10 rounded-xl shrink-0 flex items-center justify-center", status.bg)}>
                                    <status.icon className={cn("w-5 h-5", status.color)} />
                                </div>
                                <p className={cn("text-[13px] font-bold uppercase truncate", status.color)}>
                                    {report.estado}
                                </p>
                            </div>
                        </div>

                        {/* Propiedad - Amplio (36%) */}
                        <div className="md:flex-1 bg-white rounded-[1.5rem] p-6 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Building className="w-16 h-16" />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Propiedad Vinculada</p>
                            <div className="space-y-2">
                                <p className="text-[15px] font-bold text-[#4338CA] uppercase truncate">
                                    {report.nombreInmueble}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md shrink-0">
                                        REF: {report.referencia}
                                    </span>
                                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md uppercase shrink-0">
                                        {report.tipoInmueble}
                                    </span>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-500 truncate italic">
                                    {report.direccionInmueble || report.ubicacion}
                                </p>
                            </div>
                        </div>

                        {/* Registro - Amplio (36%) */}
                        <div className="md:flex-1 bg-white rounded-[1.5rem] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <ShieldCheck className="w-16 h-16 text-slate-100" />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Registro y Responsable</p>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0">
                                        <UserIcon className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <p className="text-[14px] font-bold text-slate-700 uppercase leading-snug truncate">
                                        {report.responsable}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-indigo-400 bg-indigo-50/50 w-fit px-2 py-0.5 rounded-lg">
                                    <Calendar className="w-3 h-3" />
                                    <p className="text-[10px] font-bold uppercase shrink-0">
                                        Reg: {report.fecha}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar (Matches Section Header) */}
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
                        <h3 className="text-[14px] uppercase tracking-wider font-bold text-slate-400">
                            Detalles Técnicos
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onEdit(report)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-wider"
                            >
                                <Edit2 className="w-4 h-4" /> Editar
                            </button>
                            <button
                                onClick={() => onDownload(report)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#4338CA] rounded-xl text-[11px] font-bold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all uppercase tracking-wider"
                            >
                                <Download className="w-4 h-4" /> Descargar PDF
                            </button>
                        </div>
                    </div>

                    {/* Detailed Content Placeholder (Style of 'Facturas de pago') */}
                    <div className="bg-white rounded-[2.5rem] p-16 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 transform -rotate-6">
                            <Inbox className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h4 className="text-[16px] font-bold text-slate-700 mb-2 uppercase">Información extendida</h4>
                        <p className="text-slate-400 text-sm font-medium max-w-xs mx-auto">
                            Aquí se visualizarán las fotos, observaciones adicionales y rubros específicos vinculados a la propiedad {report.id}.
                        </p>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                            Última actualización: {report.fecha}
                        </p>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default ReportDetailedView;
