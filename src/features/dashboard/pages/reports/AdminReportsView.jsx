import React, { useState, useEffect } from 'react';
import UserSidebar from './components/UserSidebar';
import ReportSelectionList from './components/ReportSelectionList';
import ReportDetailedView from './components/ReportDetailedView';
import administrativosApiService from '@/shared/services/administrativosApiService';
import reportesInmobiliariosService from '@/features/dashboard/services/reportesInmobiliarios.service';
import { useToast } from '@/shared/hooks/use-toast';

const AdminReportsView = ({
    allReports,
    onViewReport,
    onEditReport,
    onDownloadPDF,
    loading: reportsLoading
}) => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const [usersLoading, setUsersLoading] = useState(true);
    const [detailedLoading, setDetailedLoading] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchUsers = async () => {
            setUsersLoading(true);
            try {
                const response = await administrativosApiService.getAdministrativos({ limit: 100 });
                const staff = response?.data?.data?.administrativos
                    || response?.data?.administrativos
                    || response?.administrativos
                    || response?.data?.data
                    || [];

                const mappedUsers = staff.map(u => {
                    const persona = u.persona || u;
                    return {
                        id_persona: persona.id_persona ?? persona.id ?? u.id_administrativo,
                        nombre_completo: persona.nombre_completo ?? `${persona.primer_nombre || ''} ${persona.segundo_nombre || ''}`.trim(),
                        apellido_completo: persona.apellido_completo ?? `${persona.primer_apellido || ''} ${persona.segundo_apellido || ''}`.trim(),
                        num_documento: persona.num_documento ?? persona.numero_documento ?? persona.documento ?? u.num_documento ?? u.numero_documento,
                        correo: persona.correo ?? u.correo ?? u.email,
                        rol: u.rol_nombre ?? u.nombre_rol ?? (u.rol ? (typeof u.rol === 'string' ? u.rol : u.rol.nombre_rol) : 'Administrativo'),
                        avatar_url: persona.avatar_url ?? u.avatar_url
                    };
                }).filter(u => u.nombre_completo);

                setUsers(mappedUsers);

                if (mappedUsers.length > 0 && !selectedUser) {
                    setSelectedUser(mappedUsers[0]);
                }
            } catch (error) {
                console.error('Error fetching users for reports view:', error);
                toast({
                    title: 'Error',
                    description: 'No se pudieron cargar los administrativos.',
                    variant: 'error',
                });
            } finally {
                setUsersLoading(false);
            }
        };

        fetchUsers();
    }, []);

    // Filter reports for the selected user
    const userReports = allReports.filter(report => {
        if (!selectedUser) return false;

        // Priority 1: Use ID for reliable filtering
        const reportUserId = Number(report.id_persona_reporta || 0);
        const selectedUserId = Number(selectedUser.id_persona || 0);

        if (reportUserId > 0 && selectedUserId > 0) {
            return reportUserId === selectedUserId;
        }

        // Priority 2: Fallback to name match if IDs are missing
        const userName = `${selectedUser.nombre_completo}`.toLowerCase().trim();
        const responsable = (report.responsable || '').toLowerCase().trim();
        return responsable.includes(userName) || userName.includes(responsable);
    });

    const formatResponsableName = (r) => {
        if (!r) return '';
        if (typeof r === 'string') return r.trim();
        if (r?.nombre_completo) return String(r.nombre_completo).replace(/\s+/g, ' ').trim();
        const nombres = [r?.primer_nombre, r?.segundo_nombre, r?.nombres, r?.nombre].filter(Boolean).join(' ');
        const apellidos = [r?.primer_apellido, r?.segundo_apellido, r?.apellidos, r?.apellido, r?.apellido_completo].filter(Boolean).join(' ');
        const full = [nombres, apellidos].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        return full || r?.correo || r?.email || '';
    };

    const handleSelectReport = async (report) => {
        if (!report) {
            setSelectedReport(null);
            return;
        }

        setDetailedLoading(true);
        try {
            const reportId = Number(report.id_reporte ?? report.referencia ?? (report.id || '').toString().replace(/\D/g, ''));
            if (!reportId) throw new Error('ID de reporte inválido');

            // 1) Fetch basic details
            const response = await reportesInmobiliariosService.obtenerReporte(reportId);
            const detailedReport = response.data || response;

            // 2) Fetch rubros and follow-ups
            const rubros = await reportesInmobiliariosService.listarRubros(reportId);
            const rubrosConSeguimientos = await Promise.all(
                rubros.map(async (rubro) => {
                    const seguimientosRaw = await reportesInmobiliariosService.listarSeguimientosRubro(reportId, rubro.id_rubro ?? rubro.id);
                    const seguimientos = (seguimientosRaw || []).map(s => ({
                        ...s,
                        responsable: formatResponsableName(s.responsable)
                    }));
                    return { ...rubro, seguimientos };
                })
            );

            // 3) Merge and enrich data (consistent with handleViewReport in Reports.jsx)
            const enrichedReport = {
                ...detailedReport,
                ubicacion: report.ubicacion || detailedReport.inmueble_ciudad || '',
                tipoInmueble: report.tipoInmueble || detailedReport.inmueble_categoria || '',
                propietario: report.propietario || detailedReport.propietario_nombre || '',
                referencia: report.referencia || detailedReport.inmueble_referencia || detailedReport.inmueble?.registro_inmobiliario || '',
                tipoReporte: (report.tipoReporte || detailedReport.tipo_reporte || '').replace('Mantenimineto', 'Mantenimiento'),
                estado: report.estado || detailedReport.estado || 'Pendiente',
                fecha: report.fecha || (detailedReport.fecha_creacion ? new Date(detailedReport.fecha_creacion).toLocaleDateString('es-ES') : ''),
                prioridad: report.prioridad || detailedReport.prioridad || 'Media',
                responsable: detailedReport.reportadoPor?.nombre_completo || report.responsable || 'No asignado',
                descripcion: detailedReport.descripcion || detailedReport.descripcion_reporte || '',
                seguimientoGeneral: detailedReport.seguimiento_general || '',
                rubros: rubrosConSeguimientos,
                // Ensure ID is consistent for selection comparison
                id: report.id
            };

            setSelectedReport(enrichedReport);
        } catch (error) {
            console.error('Error fetching full report details:', error);
            toast({
                title: 'Error de carga',
                description: 'No se pudieron obtener todos los detalles del reporte.',
                variant: 'error',
            });
            // Fallback to shallow report if fetch fails
            setSelectedReport(report);
        } finally {
            setDetailedLoading(false);
        }
    };

    // Reset selected report when user changes or reports are reloaded
    useEffect(() => {
        if (selectedReport) {
            const isStillInList = userReports.some(r => r.id === selectedReport.id);
            if (!isStillInList) {
                setSelectedReport(null);
            }
        }
    }, [selectedUser, allReports]);

    return (
        <div className="flex h-[calc(100vh-160px)] bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-2xl">
            {/* Column 1: User List */}
            <UserSidebar
                users={users}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
                loading={usersLoading}
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* Column 2: Selection List */}
            <ReportSelectionList
                selectedUser={selectedUser}
                reports={userReports}
                selectedReport={selectedReport}
                onSelectReport={handleSelectReport}
                loading={reportsLoading}
            />

            {/* Column 3: Detailed View */}
            <ReportDetailedView
                report={selectedReport}
                onEdit={onEditReport}
                onDownload={onDownloadPDF}
                loading={detailedLoading}
            />
        </div>
    );
};

export default AdminReportsView;
