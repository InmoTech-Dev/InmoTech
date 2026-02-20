import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../shared/contexts/AuthContext';
import dashboardApiService from '../../shared/services/dashboardApiService';
import {
  MdCalendarToday,
  MdPeople,
  MdAssignmentInd,
  MdShield,
  MdRefresh,
  MdAccessTime,
  MdTrendingUp
} from 'react-icons/md';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar
} from 'recharts';

const RANGE_OPTIONS = [
  { value: 'all', label: 'Todo' },
  { value: '90d', label: '90 días' },
  { value: '30d', label: '30 días' },
  { value: '7d', label: '7 días' }
];

const STATUS_COLORS = ['#0ea5e9', '#6366f1', '#f97316', '#f43f5e', '#22c55e'];
const HEATMAP_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const HEATMAP_HOURS = [8, 10, 12, 14, 16, 18];

const DEFAULT_STATS = {
  highlights: [
    { id: 'citas', module: 'citas', label: 'Citas', value: 0, delta: 0, helper: 'Sin datos disponibles' },
    { id: 'usuarios', module: 'usuarios', label: 'Usuarios', value: 0, delta: 0 },
    { id: 'administrativos', module: 'administrativos', label: 'Administrativos', value: 0, delta: 0 },
    { id: 'roles', module: 'roles', label: 'Roles', value: 0, delta: 0 }
  ],
  citas: { porEstado: [], porMes: [] },
  usuarios: { porRol: [] },
  administrativos: { porEstado: [] },
  roles: { porPermiso: [] },
  agendaHoy: [],
  heatmap: [],
  modulesAccess: {}
};

const HIGHLIGHT_THEMES = {
  citas: { gradient: 'from-sky-500 to-indigo-500', icon: MdCalendarToday },
  usuarios: { gradient: 'from-emerald-500 to-green-600', icon: MdPeople },
  administrativos: { gradient: 'from-fuchsia-500 to-purple-500', icon: MdAssignmentInd },
  roles: { gradient: 'from-amber-500 to-orange-500', icon: MdShield }
};

const formatNumber = (value = 0) => value.toLocaleString('es-CO');
const formatPercentage = (value = 0) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

const RangeSelector = ({ value, onChange, onRefresh, loading, className = '' }) => (
  <div className={`flex flex-wrap items-center gap-2 ${className}`}>
    {RANGE_OPTIONS.map((option) => (
      <button
        key={option.value}
        disabled={loading}
        onClick={() => onChange(option.value)}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
          option.value === value
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
            : 'text-slate-600 border-slate-200 hover:border-blue-400'
        }`}
      >
        {option.label}
      </button>
    ))}
    <button
      onClick={onRefresh}
      disabled={loading}
      className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-colors"
      title="Actualizar estadísticas"
    >
      <MdRefresh size={20} className={loading ? 'animate-spin' : ''} />
    </button>
  </div>
);

const HighlightCard = ({ item }) => {
  const theme = HIGHLIGHT_THEMES[item.module] || HIGHLIGHT_THEMES.citas;
  const Icon = theme.icon;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br ${theme.gradient}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/70 text-sm">{item.label}</p>
          <p className="text-3xl font-semibold mt-1">{formatNumber(item.value)}</p>
          {typeof item.delta === 'number' && (
            <p className={`text-sm mt-1 ${item.delta >= 0 ? 'text-white' : 'text-red-100'}`}>
              {formatPercentage(item.delta)}
            </p>
          )}
        </div>
        <div className="bg-white/20 p-3 rounded-2xl">
          <Icon size={32} />
        </div>
      </div>
      {item.helper && (
        <p className="text-white/70 text-xs mt-3">{item.helper}</p>
      )}
    </motion.div>
  );
};

const SectionCard = ({ title, description, children, actions }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="bg-white/90 border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4 w-full min-w-0"
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
      </div>
      {actions}
    </div>
    {children}
  </motion.div>
);

const HeatmapGrid = ({ data = [] }) => {
  const mapped = useMemo(() => {
    const map = new Map();
    data.forEach((entry) => {
      const dayKey = entry.diaIndice || 1;
      const hourKey = entry.hora;
      const key = `${dayKey}-${hourKey}`;
      map.set(key, (map.get(key) || 0) + entry.total);
    });
    return map;
  }, [data]);

  const maxValue = Math.max(1, ...Array.from(mapped.values()));

  const getColor = (value) => {
    const intensity = value / maxValue;
    return `rgba(59,130,246,${0.15 + intensity * 0.85})`;
  };

  return (
    <div className="overflow-x-auto w-full">
      <div className="min-w-[520px] grid grid-cols-7 gap-2 text-xs">
        {HEATMAP_DAYS.map((day, dayIndex) => (
          <div key={day} className="flex flex-col gap-2">
            <p className="text-center text-slate-500 font-medium">{day}</p>
            {HEATMAP_HOURS.map((hour) => {
              const key = `${dayIndex + 1}-${hour}`;
              const value = mapped.get(key) || 0;
              return (
                <div
                  key={key}
                  className="h-10 rounded-lg border border-slate-100 flex items-center justify-center text-[11px]"
                  style={{ backgroundColor: value ? getColor(value) : 'rgba(148, 163, 184, 0.1)' }}
                >
                  {value ? value : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const EmptyState = ({ message }) => (
  <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
    {message}
  </div>
);

const AgendaList = ({ items = [] }) => {
  if (!items.length) {
    return <EmptyState message="No hay citas programadas para hoy" />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3">
          <div>
            <p className="text-slate-800 font-medium">{item.cliente || 'Cliente sin nombre'}</p>
            <p className="text-slate-500 text-sm">{item.servicio || 'Servicio general'}</p>
            <p className="text-slate-400 text-xs mt-1">
              {item.agente ? `Agente: ${item.agente}` : 'Sin agente asignado'}
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end text-sm text-slate-500">
              <MdAccessTime className="mr-1" />
              {item.hora_inicio?.slice(0, 5)} - {item.hora_fin?.slice(0, 5)}
            </p>
            <span className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-600 uppercase">
              {item.estado || 'Pendiente'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const AgentsChart = ({ data = [] }) => {
  if (!data.length) {
    return <EmptyState message="Aún no hay agentes con citas registradas" />;
  }

  return (
    <div className="w-full min-w-0" style={{ minHeight: 256 }}>
      <ResponsiveContainer width="100%" height={256}>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey={(item) => item.nombre?.split(' ')[0] || 'Agente'} stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" allowDecimals={false} />
          <Tooltip formatter={(value) => formatNumber(value)} />
          <Bar dataKey="total" fill="#0ea5e9" radius={[8, 8, 0, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const DashboardPage = () => {
  const { user, hasPermission } = useAuth();
  const [range, setRange] = useState('all');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const canReadReports = hasPermission('reportes', 'ver');

  const loadStats = useCallback(async () => {
    if (!canReadReports) {
      setLoading(false);
      setError(null);
      setStats(DEFAULT_STATS);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await dashboardApiService.getDashboardStats({ range });
      setStats(response);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las estadísticas');


      setStats(DEFAULT_STATS);

    } finally {
      setLoading(false);
    }
  }, [canReadReports, range]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const modulesAccess = useMemo(() => {
    if (stats?.modulesAccess) {
      return stats.modulesAccess;
    }
      return {
        citas: hasPermission('citas'),
        usuarios: hasPermission('usuarios'),
        administrativos: hasPermission('administrativos'),
        roles: hasPermission('roles')
      };
  }, [stats, hasPermission]);

  const highlights = stats?.highlights || [];
  const citasData = stats?.citas;
  const usuariosData = stats?.usuarios;
  const administrativosData = stats?.administrativos;
  const rolesData = stats?.roles;

  const citasTrend = useMemo(() => {
    if (!citasData?.porMes) return [];
    return citasData.porMes.map((item) => {
      const [year, month] = item.periodo.split('-').map((value) => parseInt(value, 10));
      const date = new Date(year, month - 1, 1);
      return {
        periodo: new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(date),
        cantidad: item.cantidad
      };
    });
  }, [citasData]);

  const handleRefresh = () => {
    loadStats();
  };

  return (
    <div className="space-y-8 w-full min-w-0">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 w-full min-w-0">
          <div className="min-w-0 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 truncate">
              Bienvenido, {user?.nombre_completo || 'equipo'}
            </h1>
            <p className="text-slate-500 text-base mt-1">Panel inteligente con datos actualizados en tiempo real.</p>
          </div>
          <RangeSelector
            value={range}
            onChange={setRange}
            onRefresh={handleRefresh}
            loading={loading}
            className="justify-center md:justify-end"
          />
        </div>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {highlights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
              {highlights.map((item) => (
                <HighlightCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {modulesAccess.citas && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full min-w-0">
              <SectionCard
                title="Estado de las citas"
                description="Distribución por estado en el periodo seleccionado"
              >
                {citasData?.porEstado?.length ? (
                  <div className="w-full min-w-0" style={{ minHeight: 288 }}>
                    <ResponsiveContainer width="100%" height={288}>
                      <PieChart>
                        <Pie
                          data={citasData.porEstado}
                          dataKey="cantidad"
                          nameKey="estado"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                        >
                          {citasData.porEstado.map((entry, index) => (
                            <Cell key={entry.estado} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatNumber(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                      {citasData.porEstado.map((item, index) => (
                        <div key={item.estado} className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }}
                          ></span>
                          <span className="text-slate-600">{item.estado}</span>
                          <span className="ml-auto font-semibold text-slate-800">{formatNumber(item.cantidad)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState message="Aún no hay citas registradas en este periodo" />
                )}
              </SectionCard>

              <SectionCard
                title="Tendencia mensual"
                description="Histórico de citas por mes"
                actions={
                  <div className="flex items-center text-xs text-slate-400">
                    <MdTrendingUp className="mr-1" /> Última actualización {new Date(stats?.metadata?.generatedAt || Date.now()).toLocaleString('es-CO')}
                  </div>
                }
              >
                {citasTrend.length ? (
                  <div className="w-full min-w-0" style={{ minHeight: 288 }}>
                    <ResponsiveContainer width="100%" height={288}>
                      <AreaChart data={citasTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCitas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="periodo" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" allowDecimals={false} />
                        <Tooltip formatter={(value) => formatNumber(value)} />
                        <Area type="monotone" dataKey="cantidad" stroke="#2563eb" fillOpacity={1} fill="url(#colorCitas)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="No hay datos suficientes para graficar" />
                )}
              </SectionCard>

              <SectionCard title="Carga semanal" description="Horas con mayor concentración de citas">
                <HeatmapGrid data={citasData?.heatmap} />
              </SectionCard>

              <SectionCard title="Agentes destacados" description="Ranking por citas asignadas">
                <AgentsChart data={citasData?.topAgentes} />
              </SectionCard>

              <SectionCard title="Agenda para hoy" description="Citas programadas para la fecha actual">
                <AgendaList items={citasData?.agendaHoy} />
              </SectionCard>
            </div>
          )}

          {modulesAccess.usuarios && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full min-w-0">
              <SectionCard title="Resumen de usuarios" description="Estado general de cuentas activas">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-sm text-slate-500">Usuarios activos</p>
                    <p className="text-2xl font-semibold text-slate-800 mt-1">
                      {formatNumber(usuariosData?.resumen?.activos || 0)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-sm text-slate-500">Nuevos del mes</p>
                    <p className="text-2xl font-semibold text-slate-800 mt-1">
                      {formatNumber(usuariosData?.resumen?.nuevosMes || 0)}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      {formatPercentage(usuariosData?.resumen?.variacionNuevos || 0)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-slate-500">
                  Usuarios conectados ahora: <span className="text-slate-900 font-medium">{formatNumber(usuariosData?.resumen?.activosAhora || 0)}</span>
                </div>
              </SectionCard>

              <SectionCard title="Actividad reciente" description="Últimos accesos registrados">
                {usuariosData?.activosRecientes?.length ? (
                  <ul className="space-y-3 text-sm">
                    {usuariosData.activosRecientes.map((item) => (
                      <li key={item.id} className="flex items-center justify-between border border-slate-100 p-3 rounded-xl">
                        <div>
                          <p className="text-slate-800 font-medium">{item.nombre}</p>
                          <p className="text-slate-500 text-xs">{item.correo}</p>
                        </div>
                        <p className="text-xs text-slate-400">
                          {item.ultimo_acceso ? new Date(item.ultimo_acceso).toLocaleString('es-CO') : 'Sin registro'}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="No hay actividad reciente" />
                )}
              </SectionCard>

              <SectionCard title="Sin actividad" description="Usuarios que requieren seguimiento">
                {usuariosData?.sinActividad?.length ? (
                  <ul className="space-y-3 text-sm">
                    {usuariosData.sinActividad.map((item) => (
                      <li key={item.id} className="flex items-center justify-between border border-slate-100 p-3 rounded-xl">
                        <div>
                          <p className="text-slate-800 font-medium">{item.nombre}</p>
                          <p className="text-slate-500 text-xs">{item.correo}</p>
                        </div>
                        <span className="text-xs text-orange-500 font-semibold">
                          {item.dias_sin_actividad} días
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="Sin usuarios pendientes" />
                )}
              </SectionCard>
            </div>
          )}

          {modulesAccess.administrativos && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full min-w-0">
              <SectionCard title="Equipo administrativo" description="Distribución por estado laboral">
                {administrativosData?.distribucionEstado?.length ? (
                  <div className="w-full min-w-0" style={{ minHeight: 288 }}>
                    <ResponsiveContainer width="100%" height={288}>
                      <PieChart>
                        <Pie
                          data={administrativosData.distribucionEstado}
                          dataKey="cantidad"
                          nameKey="estado"
                          outerRadius={100}
                          label
                        >
                          {administrativosData.distribucionEstado.map((entry, index) => (
                            <Cell key={entry.estado} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatNumber(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="No hay administrativos registrados" />
                )}
              </SectionCard>

              <SectionCard title="Administrativos destacados" description="Basado en citas gestionadas en el periodo">
                {administrativosData?.destacados?.length ? (
                  <ul className="space-y-3">
                    {administrativosData.destacados.map((item) => (
                      <li key={item.id} className="border border-slate-100 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-slate-800 font-medium">{item.nombre}</p>
                            <p className="text-slate-500 text-xs">{item.cargo || 'Cargo no asignado'}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-slate-600">
                              {formatNumber(item.citas)} citas
                            </p>
                            <p className="text-emerald-600 text-xs">
                              {item.completadas} completadas
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="Sin registros en este periodo" />
                )}
              </SectionCard>
            </div>
          )}

          {modulesAccess.roles && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full min-w-0">
              <SectionCard title="Distribución de roles" description="Cantidad de usuarios por rol">
                {rolesData?.rolesMasUsados?.length ? (
                  <div className="w-full min-w-0" style={{ minHeight: 288 }}>
                    <ResponsiveContainer width="100%" height={288}>
                      <BarChart data={rolesData.rolesMasUsados} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="nombre" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" allowDecimals={false} />
                        <Tooltip formatter={(value) => formatNumber(value)} />
                        <Bar dataKey="asignados" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="Sin datos de roles asignados" />
                )}
              </SectionCard>

              <SectionCard title="Permisos por módulo" description="Permisos activos en cada módulo">
                {rolesData?.permisosPorModulo?.length ? (
                  <div className="space-y-3 text-sm">
                    {rolesData.permisosPorModulo.map((item, index) => (
                      <div
                        key={`${item.modulo}-${index}`}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                      >
                        <p className="text-slate-600 font-medium">{item.modulo}</p>
                        <span className="text-slate-900 font-semibold">{formatNumber(item.cantidad)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No hay permisos registrados" />
                )}
              </SectionCard>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardPage;
