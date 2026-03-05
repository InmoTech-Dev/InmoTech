import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '../../shared/contexts/AuthContext';
import dashboardApiService from '../../shared/services/dashboardApiService';
import DashboardHeader from './components/DashboardHeader';
import PersonalOverview from './components/PersonalOverview';
import ModuleSection from './components/ModuleSection';
import ModuleTabs from './components/ModuleTabs';
import KpiCard from './components/KpiCard';
import InsightList from './components/InsightList';
import { MODULE_META, FALLBACK_MODULES } from './utils/dashboardConfig';
import { formatNumber, formatCurrency, formatDateLabel, formatDateTime } from './utils/dashboardFormatters';

const STATUS_COLORS = ['#00457B', '#0EA5E9', '#16A34A', '#F59E0B', '#DC2626', '#7C3AED'];
const DEFAULT_REFRESH_IN_SEC = 60;

const ChartContainer = ({ children, height = 240 }) => (
  <div className="w-full min-w-0" style={{ minHeight: height }}>
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  </div>
);

const KpiGrid = ({ children }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{children}</div>
);

const EmptyModule = ({ message }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
    {message}
  </div>
);

const renderCitas = (data = {}) => {
  const trend = (data.serie_ultimos_30d || []).map((item) => ({
    fecha: formatDateLabel(item.fecha),
    total: Number(item.total) || 0
  }));

  const insights = (data.agenda_hoy || []).slice(0, 6).map((item) => ({
    id: item.id,
    label: `${item.hora_inicio?.slice(0, 5) || '--:--'} - ${item.cliente || 'Cliente'}`,
    description: `${item.servicio || 'Servicio'} - ${item.estado || 'Sin estado'}`
  }));

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Hoy total" value={formatNumber(data.hoy_total)} tone="primary" />
        <KpiCard label="Pendientes" value={formatNumber(data.hoy_pendientes)} tone="warning" />
        <KpiCard label="Confirmadas" value={formatNumber(data.hoy_confirmadas)} tone="success" />
        <KpiCard label="Proximas 24h" value={formatNumber(data.proximas_24h)} tone="info" />
      </KpiGrid>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-3">
          {trend.length ? (
            <ChartContainer>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#00457B" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyModule message="No hay tendencia para mostrar." />
          )}
        </div>

        <InsightList title="Agenda e insights" items={insights} emptyMessage="Sin agenda para hoy." />
      </div>
    </div>
  );
};

const renderVentas = (data = {}) => {
  const insights = (data.por_estado || []).map((item, idx) => ({
    id: `${item.estado}-${idx}`,
    label: item.estado || 'Sin estado',
    description: `Monto: ${formatCurrency(item.monto_total || 0)}`,
    value: formatNumber(item.total || 0)
  }));

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Ventas mes" value={formatNumber(data.ventas_este_mes)} tone="success" />
        <KpiCard label="Facturado mes" value={formatCurrency(data.total_facturado_mes)} tone="primary" />
        <KpiCard label="Ticket promedio" value={formatCurrency(data.ticket_promedio_mes)} tone="info" />
      </KpiGrid>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-3">
          {(data.por_estado || []).length ? (
            <ChartContainer>
              <BarChart data={data.por_estado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="estado" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#0B6FA4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyModule message="Sin datos de ventas para el rango." />
          )}
        </div>

        <InsightList title="Estado comercial" items={insights} emptyMessage="Sin estados registrados." />
      </div>
    </div>
  );
};

const renderArriendos = (data = {}) => {
  const insights = (data.por_estado || []).map((item, idx) => ({
    id: `${item.estado}-${idx}`,
    label: item.estado || 'Sin estado',
    description: `Valor mensual: ${formatCurrency(item.monto_mensual || 0)}`,
    value: formatNumber(item.total || 0)
  }));

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Activos" value={formatNumber(data.activos)} tone="success" />
        <KpiCard label="Ingresos mes" value={formatCurrency(data.ingresos_este_mes)} tone="primary" />
        <KpiCard label="Cobros pendientes" value={formatNumber(data.cobros_pendientes)} tone="warning" />
      </KpiGrid>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-3">
          {(data.por_estado || []).length ? (
            <ChartContainer>
              <BarChart data={data.por_estado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="estado" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#0F766E" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyModule message="Sin datos de arriendos para el rango." />
          )}
        </div>

        <InsightList title="Estado de arriendos" items={insights} emptyMessage="Sin estados registrados." />
      </div>
    </div>
  );
};

const renderInmuebles = (data = {}) => {
  const pieData = [
    { name: 'Disponibles', total: Number(data.disponibles) || 0 },
    { name: 'Arrendados', total: Number(data.arrendados) || 0 },
    { name: 'Vendidos', total: Number(data.vendidos) || 0 },
    { name: 'En Proceso', total: Number(data.en_proceso_arrendamiento) || 0 }
  ];

  const insights = pieData.map((item) => ({
    id: item.name,
    label: item.name,
    value: formatNumber(item.total)
  }));

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Total inventario" value={formatNumber(data.total_inmuebles)} tone="primary" />
        <KpiCard label="Disponibles" value={formatNumber(data.disponibles)} tone="success" />
        <KpiCard label="Arrendados" value={formatNumber(data.arrendados)} tone="info" />
        <KpiCard label="Vendidos" value={formatNumber(data.vendidos)} tone="warning" />
      </KpiGrid>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-3">
          {pieData.some((item) => item.total > 0) ? (
            <ChartContainer>
              <PieChart>
                <Pie data={pieData} dataKey="total" nameKey="name" outerRadius={88} innerRadius={52}>
                  {pieData.map((item, idx) => (
                    <Cell key={item.name} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ChartContainer>
          ) : (
            <EmptyModule message="No hay composicion de inventario para mostrar." />
          )}
        </div>

        <InsightList title="Disponibilidad" items={insights} emptyMessage="Sin datos de disponibilidad." />
      </div>
    </div>
  );
};

const renderUsuarios = (data = {}) => {
  const chartData = [
    { estado: 'Activos', total: Number(data.activos) || 0 },
    { estado: 'Inactivos', total: Number(data.inactivos) || 0 },
    { estado: 'Nuevos 30d', total: Number(data.nuevos_30d) || 0 }
  ];

  const insights = (data.activos_recientes || []).slice(0, 6).map((item) => ({
    id: item.id_persona,
    label: item.nombre || 'Usuario',
    description: `${item.correo || 'Sin correo'} - ${formatDateTime(item.ultimo_acceso)}`
  }));

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Activos" value={formatNumber(data.activos)} tone="success" />
        <KpiCard label="Inactivos" value={formatNumber(data.inactivos)} tone="warning" />
        <KpiCard label="Nuevos 30d" value={formatNumber(data.nuevos_30d)} tone="info" />
      </KpiGrid>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-3">
          <ChartContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="estado" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#475569" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        <InsightList title="Actividad reciente" items={insights} emptyMessage="No hay actividad reciente." />
      </div>
    </div>
  );
};

const renderAdministrativos = (data = {}) => {
  const insights = (data.distribucion_cargo || []).slice(0, 6).map((item) => ({
    id: item.cargo,
    label: item.cargo || 'Sin cargo',
    value: formatNumber(item.total || 0)
  }));

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Activos" value={formatNumber(data.activos)} tone="success" />
        <KpiCard label="No activos" value={formatNumber(data.inactivos)} tone="warning" />
      </KpiGrid>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-3">
          {(data.distribucion_estado || []).length ? (
            <ChartContainer>
              <BarChart data={data.distribucion_estado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="estado" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#0E7490" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyModule message="Sin estado laboral para mostrar." />
          )}
        </div>

        <InsightList title="Distribucion de cargos" items={insights} emptyMessage="Sin cargos registrados." />
      </div>
    </div>
  );
};

const renderRoles = (data = {}) => {
  const insights = (data.roles_mas_asignados || []).slice(0, 6).map((item) => ({
    id: item.id_rol,
    label: item.nombre_rol || 'Sin rol',
    value: formatNumber(item.total || 0)
  }));

  if ((data.usuarios_sin_rol || 0) > 0) {
    insights.unshift({
      id: 'sin-rol',
      label: 'Usuarios sin rol',
      value: formatNumber(data.usuarios_sin_rol),
      description: 'Requiere revision de seguridad'
    });
  }

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Usuarios sin rol" value={formatNumber(data.usuarios_sin_rol)} tone="danger" />
        <KpiCard
          label="Roles con asignacion"
          value={formatNumber((data.roles_mas_asignados || []).length)}
          tone="primary"
        />
      </KpiGrid>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-3">
          {(data.roles_mas_asignados || []).length ? (
            <ChartContainer>
              <BarChart data={data.roles_mas_asignados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="nombre_rol" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#7C3AED" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyModule message="No hay asignaciones de roles registradas." />
          )}
        </div>

        <InsightList title="Resumen de perfiles" items={insights} emptyMessage="Sin perfiles para revisar." />
      </div>
    </div>
  );
};

const renderReportes = (data = {}) => {
  const insights = (data.por_estado || []).map((item, idx) => ({
    id: `${item.estado}-${idx}`,
    label: item.estado || 'Sin estado',
    value: formatNumber(item.total || 0)
  }));

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Reportes del mes" value={formatNumber(data.reportes_mes)} tone="primary" />
        <KpiCard label="Pendientes" value={formatNumber(data.pendientes)} tone="warning" />
        <KpiCard label="Resueltos" value={formatNumber(data.resueltos)} tone="success" />
      </KpiGrid>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-3">
          {(data.por_estado || []).length ? (
            <ChartContainer>
              <BarChart data={data.por_estado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="estado" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#B45309" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyModule message="No hay estados de reportes para mostrar." />
          )}
        </div>

        <InsightList title="Estado de reportes" items={insights} emptyMessage="Sin estado de reportes." />
      </div>
    </div>
  );
};

const MODULE_RENDERERS = {
  citas: renderCitas,
  ventas: renderVentas,
  arriendos: renderArriendos,
  inmuebles: renderInmuebles,
  usuarios: renderUsuarios,
  administrativos: renderAdministrativos,
  roles: renderRoles,
  reportes: renderReportes
};

const getPreferredInitialTab = (modules = []) => {
  if (modules.includes('citas')) return 'citas';
  return modules[0] || null;
};

const DashboardPage = () => {
  const { user, hasPermission } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [range, setRange] = useState('30d');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeModuleTab, setActiveModuleTab] = useState(null);
  const [refreshInSec, setRefreshInSec] = useState(DEFAULT_REFRESH_IN_SEC);
  const latestRequestRef = useRef(0);

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = latestRequestRef.current + 1;
      latestRequestRef.current = requestId;

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError('');

        const payload = await dashboardApiService.getDashboardOverview({ range });
        if (requestId !== latestRequestRef.current) return;
        setDashboardData(payload);
        const nextRefreshInSec = Number(payload?.refreshInSec);
        if (Number.isFinite(nextRefreshInSec) && nextRefreshInSec > 0) {
          setRefreshInSec(nextRefreshInSec);
        }
      } catch (err) {
        if (requestId !== latestRequestRef.current) return;
        setError(err?.message || 'No se pudo cargar el dashboard.');
      } finally {
        if (requestId !== latestRequestRef.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const intervalMs = Math.max(1, Number(refreshInSec) || DEFAULT_REFRESH_IN_SEC) * 1000;
    const timer = setInterval(() => {
      loadDashboard({ silent: true });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [loadDashboard, refreshInSec]);

  const fallbackModules = useMemo(
    () => FALLBACK_MODULES.filter((moduleKey) => hasPermission(moduleKey, 'ver')),
    [hasPermission]
  );

  const visibleModules = useMemo(() => {
    const modules = dashboardData?.visibility?.modules;
    if (Array.isArray(modules) && modules.length) {
      return modules;
    }
    return fallbackModules;
  }, [dashboardData, fallbackModules]);

  useEffect(() => {
    if (!visibleModules.length) {
      setActiveModuleTab(null);
      return;
    }

    if (!activeModuleTab || !visibleModules.includes(activeModuleTab)) {
      setActiveModuleTab(getPreferredInitialTab(visibleModules));
    }
  }, [activeModuleTab, visibleModules]);

  const personal = dashboardData?.global?.personal || {
    agendaHoy: [],
    pendientesUsuario: 0,
    notificacionesNoLeidas: 0
  };
  const quickActions = dashboardData?.global?.quickActions || [];
  const moduleErrors = dashboardData?.moduleErrors || {};
  const modulesPayload = dashboardData?.modules || {};
  const activeMeta = activeModuleTab ? MODULE_META[activeModuleTab] : null;
  const activeModuleData = activeModuleTab ? modulesPayload[activeModuleTab] || {} : {};
  const activeModuleError = activeModuleTab ? moduleErrors[activeModuleTab] : null;
  const activeRenderer = activeModuleTab ? MODULE_RENDERERS[activeModuleTab] : null;

  const isBusy = loading || refreshing;
  const tabTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: 'easeOut' };

  return (
    <div className="space-y-6">
      <DashboardHeader
        userName={user?.nombre_completo}
        range={range}
        onRangeChange={setRange}
        onRefresh={() => loadDashboard({ silent: true })}
        loading={isBusy}
        generatedAt={dashboardData?.generatedAt}
      />

      {error ? (
        <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 p-4 text-sm text-[#991B1B]">
          {error}
        </div>
      ) : null}

      {loading && !dashboardData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <PersonalOverview personal={personal} quickActions={quickActions} />

          {visibleModules.length ? (
            <ModuleTabs
              modules={visibleModules}
              activeTab={activeModuleTab}
              onChange={setActiveModuleTab}
            />
          ) : null}

          <AnimatePresence mode="wait">
            {activeMeta && activeRenderer ? (
              <motion.div
                key={activeModuleTab}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
                transition={tabTransition}
              >
                <ModuleSection
                  title={activeMeta.title}
                  description={activeMeta.description}
                  icon={activeMeta.icon}
                  accent={activeMeta.accent}
                  error={activeModuleError}
                >
                  {activeRenderer(activeModuleData)}
                </ModuleSection>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {!visibleModules.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              No hay modulos habilitados para este usuario. Contacta a un administrador para ajustar permisos.
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default DashboardPage;
