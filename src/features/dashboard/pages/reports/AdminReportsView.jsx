import React, { useState, useEffect } from 'react';
import UserSidebar from './components/UserSidebar';
import ReportSelectionList from './components/ReportSelectionList';
import ReportDetailedView from './components/ReportDetailedView';
import administrativosApiService from '@/shared/services/administrativosApiService';
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
        const userName = `${selectedUser.nombre_completo} ${selectedUser.apellido_completo}`.toLowerCase().trim();
        const responsable = (report.responsable || '').toLowerCase().trim();
        return responsable.includes(userName) || userName.includes(responsable);
    });

    // Reset selected report when user changes
    useEffect(() => {
        setSelectedReport(null);
    }, [selectedUser]);

    return (
        <div className="flex h-[calc(100vh-160px)] bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-2xl">
            {/* Column 1: User List */}
            <UserSidebar
                users={users}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
                loading={usersLoading}
            />

            {/* Column 2: Selection List */}
            <ReportSelectionList
                selectedUser={selectedUser}
                reports={userReports}
                selectedReport={selectedReport}
                onSelectReport={setSelectedReport}
                loading={reportsLoading}
            />

            {/* Column 3: Detailed View */}
            <ReportDetailedView
                report={selectedReport}
                onEdit={onEditReport}
                onDownload={onDownloadPDF}
            />
        </div>
    );
};

export default AdminReportsView;
