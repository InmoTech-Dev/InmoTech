import React from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    MapPin,
    Building,
    Calendar,
    CheckCircle,
    Clock,
    AlertCircle,
    XCircle,
    Eye,
    Edit2,
    Download,
    Mail,
    User as UserIcon,
    ChevronRight
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { cn } from '@/shared/utils/cn';

const UserReportDetails = ({ selectedUser, reports, loading, onView, onEdit, onDownload }) => {
    if (!selectedUser) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                    <UserIcon className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecciona un administrativo</h3>
                <p className="text-slate-500 max-w-sm">
                    Elige un administrativo de la lista lateral para ver sus reportes asignados y estadísticas de gestión.
                </p>
            </div>
        );
    }

    const stats = {
        total: reports.length,
        pendientes: reports.filter(r => r.estado === 'Pendiente').length,
        enProceso: reports.filter(r => r.estado === 'En Proceso').length,
        completados: reports.filter(r => r.estado === 'Completado').length,
    };

    const getStatusConfig = (estado) => {
        const configs = {
            'Completado': { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
            'En Proceso': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
            'Pendiente': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle },
            'Cancelado': { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
        };
        return configs[estado] || { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: AlertCircle };
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/30">
            <div className="p-8 max-w-6xl mx-auto">
                {/* User Profile Header */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <Avatar className="w-24 h-24 border-4 border-slate-50 shadow-md">
                        {selectedUser.avatar_url && <AvatarImage src={selectedUser.avatar_url} />}
                        <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
                            {selectedUser.nombre_completo?.[0]}{selectedUser.apellido_completo?.[0]}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">
                            {selectedUser.nombre_completo} {selectedUser.apellido_completo}
                        </h2>
                        <div className="flex flex-wrap gap-4 text-slate-600">
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full text-sm">
                                <Mail className="w-4 h-4 text-blue-500" />
                                {selectedUser.correo}
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full text-sm">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                                    {selectedUser.rol}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
                        <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100 min-w-[100px]">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total</p>
                            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                        </div>
                        <div className="bg-amber-50 rounded-2xl p-4 text-center border border-amber-100 min-w-[100px]">
                            <p className="text-[10px] uppercase font-bold text-amber-500 mb-1">Pend.</p>
                            <p className="text-2xl font-bold text-amber-600">{stats.pendientes}</p>
                        </div>
                        <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100 min-w-[100px]">
                            <p className="text-[10px] uppercase font-bold text-green-500 mb-1">Comp.</p>
                            <p className="text-2xl font-bold text-green-600">{stats.completados}</p>
                        </div>
                    </div>
                </div>

                {/* Reports Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Reportes Asignados
                        </h3>
                        <span className="text-sm text-slate-500">
                            Mostrando {reports.length} reportes
                        </span>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white h-32 rounded-3xl animate-pulse" />
                            ))}
                        </div>
                    ) : reports.length > 0 ? (
                        <div className="grid gap-4">
                            {reports.map((report) => {
                                const status = getStatusConfig(report.estado);
                                const StatusIcon = status.icon;

                                return (
                                    <motion.div
                                        key={report.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-center"
                                    >
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">Referencia</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900">#{report.id}</span>
                                                    <Badge className={cn("text-[10px] px-2 py-0", status.color)}>
                                                        {report.estado}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">Inmueble</span>
                                                <div className="flex flex-col truncate">
                                                    <span className="text-sm font-semibold text-slate-800 truncate capitalize">
                                                        {report.tipoInmueble}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                                        <MapPin className="w-3 h-3" />
                                                        <span className="truncate capitalize">{report.ubicacion}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-500">Reporte</span>
                                                <span className="text-sm font-medium text-slate-700 capitalize">
                                                    {report.tipoReporte}
                                                </span>
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{report.fecha}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">Propietario</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        {report.propietario?.[0]}
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 truncate">
                                                        {report.propietario}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 w-full md:w-auto justify-end">
                                            <button
                                                onClick={() => onView(report)}
                                                className="p-2.5 rounded-2xl bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                title="Ver detalles"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onEdit(report)}
                                                className="p-2.5 rounded-2xl bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                title="Editar reporte"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onDownload(report)}
                                                className="p-2.5 rounded-2xl bg-slate-50 text-slate-600 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                                                title="Descargar PDF"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 border-dashed">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-slate-300" />
                            </div>
                            <h4 className="text-lg font-semibold text-slate-800 mb-1">Sin reportes registrados</h4>
                            <p className="text-slate-500">Este administrativo aún no tiene reportes asignados.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserReportDetails;
