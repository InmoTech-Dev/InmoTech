const { Op, fn, col, where, QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const {
  Cita,
  EstadoCita,
  Persona,
  ServicioCita,
  Sale,
  Lease,
  Payment,
  Inmueble,
  Acceso,
  Administrativo,
  Rol,
  Permiso,
  Reporte,
  Notificacion
} = require('../models');
const {
  normalizeModuleKey,
  getPermissionAliases
} = require('../utils/permissions.helper');

const ADMIN_ROLES = ['Super Administrador', 'Administrador'];
const DASHBOARD_MODULES = [
  'citas',
  'ventas',
  'arriendos',
  'inmuebles',
  'usuarios',
  'administrativos',
  'roles',
  'reportes'
];

const RANGE_TO_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90
};

const QUICK_ACTIONS = {
  citas: {
    id: 'go-citas',
    label: 'Gestionar citas',
    description: 'Revisar agenda y estados',
    to: '/dashboard/citas'
  },
  ventas: {
    id: 'go-ventas',
    label: 'Ver ventas',
    description: 'Seguimiento comercial',
    to: '/dashboard/salesManagement'
  },
  arriendos: {
    id: 'go-arriendos',
    label: 'Ver arriendos',
    description: 'Cobros y contratos activos',
    to: '/dashboard/leasesManagement'
  },
  inmuebles: {
    id: 'go-inmuebles',
    label: 'Ver inmuebles',
    description: 'Disponibilidad y ocupacion',
    to: '/inmuebles/gestion'
  },
  usuarios: {
    id: 'go-usuarios',
    label: 'Usuarios',
    description: 'Cuentas y actividad',
    to: '/seguridad/usuarios'
  },
  administrativos: {
    id: 'go-administrativos',
    label: 'Administrativos',
    description: 'Estado del equipo',
    to: '/seguridad/administrativos'
  },
  roles: {
    id: 'go-roles',
    label: 'Roles',
    description: 'Permisos y asignaciones',
    to: '/seguridad/roles'
  },
  reportes: {
    id: 'go-reportes',
    label: 'Reportes',
    description: 'Pendientes y resueltos',
    to: '/reportes/gestion'
  }
};

const normalizeRange = (range) => {
  if (range && RANGE_TO_DAYS[range]) {
    return range;
  }
  return '30d';
};

const atStartOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const atEndOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateOnly = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const toPositiveInt = (rawValue, fallbackValue) => {
  const parsed = parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
};

const DASHBOARD_OVERVIEW_CACHE_TTL_MS = toPositiveInt(
  process.env.DASHBOARD_OVERVIEW_CACHE_TTL_MS,
  15000
);
const DASHBOARD_MODULE_TIMEOUT_MS = toPositiveInt(
  process.env.DASHBOARD_MODULE_TIMEOUT_MS,
  8000
);
const DASHBOARD_MODULE_CONCURRENCY = toPositiveInt(
  process.env.DASHBOARD_MODULE_CONCURRENCY,
  2
);

class DashboardService {
  constructor() {
    this.overviewCache = new Map();
    this.inFlightOverview = new Map();
  }

  buildOverviewCacheKey({ userId, userRoles, range }) {
    const sortedRoles = [...(userRoles || [])].sort((a, b) => String(a).localeCompare(String(b)));
    return `${userId}::${range}::${sortedRoles.join('|')}`;
  }

  getCachedOverview(cacheKey) {
    const cached = this.overviewCache.get(cacheKey);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      this.overviewCache.delete(cacheKey);
      return null;
    }
    return cached.value;
  }

  setCachedOverview(cacheKey, value) {
    this.overviewCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + DASHBOARD_OVERVIEW_CACHE_TTL_MS
    });
  }

  async withTimeout(promise, timeoutMs) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const timeoutError = new Error(`Timeout excedido (${timeoutMs}ms)`);
        timeoutError.code = 'DASHBOARD_MODULE_TIMEOUT';
        reject(timeoutError);
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async runWithConcurrency(items, concurrency, worker) {
    if (!Array.isArray(items) || items.length === 0) return;
    const maxWorkers = Math.max(1, Math.min(concurrency, items.length));
    let cursor = 0;

    const runWorker = async () => {
      while (true) {
        const currentIndex = cursor;
        cursor += 1;
        if (currentIndex >= items.length) return;
        await worker(items[currentIndex], currentIndex);
      }
    };

    await Promise.all(Array.from({ length: maxWorkers }, () => runWorker()));
  }

  resolveDateContext(range) {
    const normalizedRange = normalizeRange(range);
    const now = new Date();
    const todayStart = atStartOfDay(now);
    const todayEnd = atEndOfDay(now);
    const rangeDays = RANGE_TO_DAYS[normalizedRange];
    const rangeStart = atStartOfDay(addDays(now, -(rangeDays - 1)));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = atEndOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const next24Hours = addDays(now, 1);
    const todayIso = formatDateOnly(todayStart);
    const rangeStartIso = formatDateOnly(rangeStart);
    const monthStartIso = formatDateOnly(monthStart);
    const monthEndIso = formatDateOnly(monthEnd);
    const seriesStart = atStartOfDay(addDays(now, -29));
    const seriesStartIso = formatDateOnly(seriesStart);

    return {
      now,
      normalizedRange,
      todayStart,
      todayEnd,
      todayIso,
      rangeStart,
      rangeStartIso,
      monthStart,
      monthEnd,
      monthStartIso,
      monthEndIso,
      next24Hours,
      seriesStart,
      seriesStartIso
    };
  }

  async resolveRoleIds(roles = []) {
    if (!Array.isArray(roles) || roles.length === 0) {
      return [];
    }

    const roleRows = await Rol.findAll({
      where: {
        nombre_rol: { [Op.in]: roles },
        estado: true
      },
      attributes: ['id_rol'],
      raw: true
    });

    return roleRows.map((row) => row.id_rol).filter(Boolean);
  }

  async resolveVisibleModules(userRoles = [], roleIds = []) {
    if (userRoles.some((role) => ADMIN_ROLES.includes(role))) {
      return [...DASHBOARD_MODULES];
    }

    if (!roleIds.length) {
      return [];
    }

    const viewPermissionAliases = Array.from(
      new Set(['ver', ...getPermissionAliases('ver').map((alias) => alias.toLowerCase())])
    );

    const rows = await Permiso.findAll({
      where: {
        id_rol: { [Op.in]: roleIds },
        estado: true,
        [Op.and]: [
          where(fn('LOWER', col('permiso')), { [Op.in]: viewPermissionAliases })
        ]
      },
      attributes: ['modulo'],
      raw: true
    });

    const allowed = new Set();
    rows.forEach((row) => {
      const normalized = normalizeModuleKey(row.modulo);
      if (normalized && DASHBOARD_MODULES.includes(normalized)) {
        allowed.add(normalized);
      }
    });

    return DASHBOARD_MODULES.filter((moduleKey) => allowed.has(moduleKey));
  }

  buildQuickActions(visibleModules = []) {
    const actions = visibleModules
      .map((moduleKey) => QUICK_ACTIONS[moduleKey])
      .filter(Boolean)
      .slice(0, 6);

    return [
      {
        id: 'go-profile',
        label: 'Mi perfil',
        description: 'Editar datos personales',
        to: '/dashboard/profile'
      },
      ...actions
    ];
  }

  async buildPersonalBlock(userId, roleIds, dateContext) {
    const agendaRows = await Cita.findAll({
      where: {
        fecha_cita: dateContext.todayIso,
        [Op.or]: [
          { id_agente_asignado: userId },
          { id_usuario_creador: userId },
          { id_persona: userId }
        ]
      },
      include: [
        { model: EstadoCita, as: 'estado', attributes: ['nombre_estado'] },
        { model: Persona, as: 'cliente', attributes: ['nombre_completo', 'apellido_completo'] },
        { model: ServicioCita, as: 'servicio', attributes: ['nombre_servicio'] }
      ],
      attributes: ['id_cita', 'fecha_cita', 'hora_inicio', 'hora_fin'],
      order: [['hora_inicio', 'ASC']],
      limit: 8
    });

    const agendaHoy = agendaRows.map((cita) => ({
      id: cita.id_cita,
      fecha_cita: cita.fecha_cita,
      hora_inicio: cita.hora_inicio,
      hora_fin: cita.hora_fin,
      estado: cita.estado?.nombre_estado || 'Sin estado',
      servicio: cita.servicio?.nombre_servicio || 'Servicio',
      cliente: `${cita.cliente?.nombre_completo || ''} ${cita.cliente?.apellido_completo || ''}`.trim()
    }));

    const pendientesUsuario = await Cita.count({
      where: {
        fecha_cita: { [Op.gte]: dateContext.todayIso },
        id_estado_cita: { [Op.notIn]: [5, 6] },
        [Op.or]: [
          { id_agente_asignado: userId },
          { id_usuario_creador: userId },
          { id_persona: userId }
        ]
      }
    });

    const notificationWhere = roleIds.length
      ? {
          [Op.or]: [
            { id_persona_destino: userId },
            { id_rol_destino: { [Op.in]: roleIds } }
          ],
          leida: false
        }
      : {
          id_persona_destino: userId,
          leida: false
        };

    const notificacionesNoLeidas = await Notificacion.count({ where: notificationWhere });

    return {
      agendaHoy,
      pendientesUsuario,
      notificacionesNoLeidas
    };
  }

  async buildCitasModule(dateContext) {
    const hoyTotalPromise = Cita.count({ where: { fecha_cita: dateContext.todayIso } });
    const hoyPendientesPromise = Cita.count({
      where: {
        fecha_cita: dateContext.todayIso,
        id_estado_cita: { [Op.in]: [1, 2, 3, 4] }
      }
    });
    const hoyConfirmadasPromise = Cita.count({
      where: {
        fecha_cita: dateContext.todayIso,
        id_estado_cita: 2
      }
    });
    const hoyCanceladasPromise = Cita.count({
      where: {
        fecha_cita: dateContext.todayIso,
        id_estado_cita: 6
      }
    });

    const upcomingRowsPromise = Cita.findAll({
      where: {
        fecha_cita: {
          [Op.between]: [
            dateContext.todayIso,
            formatDateOnly(addDays(dateContext.todayStart, 1))
          ]
        },
        id_estado_cita: { [Op.notIn]: [5, 6] }
      },
      attributes: ['id_cita', 'fecha_cita', 'hora_inicio'],
      raw: true
    });

    const porEstadoRowsPromise = Cita.findAll({
      attributes: [
        [col('estado.nombre_estado'), 'estado'],
        [fn('COUNT', col('id_cita')), 'total']
      ],
      include: [{ model: EstadoCita, as: 'estado', attributes: [] }],
      where: {
        fecha_cita: {
          [Op.between]: [dateContext.rangeStartIso, dateContext.todayIso]
        }
      },
      group: [col('estado.nombre_estado')],
      raw: true
    });

    const serieRowsPromise = Cita.findAll({
      attributes: ['fecha_cita', [fn('COUNT', col('id_cita')), 'total']],
      where: {
        fecha_cita: {
          [Op.between]: [dateContext.seriesStartIso, dateContext.todayIso]
        }
      },
      group: ['fecha_cita'],
      raw: true
    });

    const agendaRowsPromise = Cita.findAll({
      where: { fecha_cita: dateContext.todayIso },
      include: [
        { model: EstadoCita, as: 'estado', attributes: ['nombre_estado'] },
        { model: ServicioCita, as: 'servicio', attributes: ['nombre_servicio'] },
        { model: Persona, as: 'cliente', attributes: ['nombre_completo', 'apellido_completo'] },
        { model: Persona, as: 'agente', attributes: ['nombre_completo', 'apellido_completo'] }
      ],
      attributes: ['id_cita', 'fecha_cita', 'hora_inicio', 'hora_fin'],
      order: [['hora_inicio', 'ASC']],
      limit: 10
    });

    const [
      hoy_total,
      hoy_pendientes,
      hoy_confirmadas,
      hoy_canceladas,
      upcomingRows,
      porEstadoRows,
      serieRows,
      agendaRows
    ] = await Promise.all([
      hoyTotalPromise,
      hoyPendientesPromise,
      hoyConfirmadasPromise,
      hoyCanceladasPromise,
      upcomingRowsPromise,
      porEstadoRowsPromise,
      serieRowsPromise,
      agendaRowsPromise
    ]);

    let proximas_24h = 0;
    upcomingRows.forEach((row) => {
      const hour = String(row.hora_inicio || '00:00:00').slice(0, 8);
      const appointmentDate = new Date(`${row.fecha_cita}T${hour}`);
      if (appointmentDate >= dateContext.now && appointmentDate <= dateContext.next24Hours) {
        proximas_24h += 1;
      }
    });

    const serieMap = new Map(
      serieRows.map((row) => [String(row.fecha_cita), toNumber(row.total)])
    );
    const serie_ultimos_30d = [];
    for (let i = 0; i < 30; i += 1) {
      const date = addDays(dateContext.seriesStart, i);
      const dateKey = formatDateOnly(date);
      serie_ultimos_30d.push({
        fecha: dateKey,
        total: serieMap.get(dateKey) || 0
      });
    }

    const agenda_hoy = agendaRows.map((cita) => ({
      id: cita.id_cita,
      fecha_cita: cita.fecha_cita,
      hora_inicio: cita.hora_inicio,
      hora_fin: cita.hora_fin,
      estado: cita.estado?.nombre_estado || 'Sin estado',
      servicio: cita.servicio?.nombre_servicio || 'Servicio',
      cliente: `${cita.cliente?.nombre_completo || ''} ${cita.cliente?.apellido_completo || ''}`.trim(),
      agente: `${cita.agente?.nombre_completo || ''} ${cita.agente?.apellido_completo || ''}`.trim()
    }));

    const por_estado = porEstadoRows.map((row) => ({
      estado: row.estado || 'Sin estado',
      total: toNumber(row.total)
    }));

    return {
      hoy_total,
      hoy_pendientes,
      hoy_confirmadas,
      hoy_canceladas,
      proximas_24h,
      por_estado,
      serie_ultimos_30d,
      agenda_hoy
    };
  }

  async buildVentasModule(dateContext) {
    const [ventas_este_mes, totalFacturadoMesRaw, porEstadoRows] = await Promise.all([
      Sale.count({
        where: {
          estado: 'Finalizada',
          fecha_venta: {
            [Op.between]: [dateContext.monthStart, dateContext.monthEnd]
          }
        }
      }),
      Sale.sum('valor_venta', {
        where: {
          estado: 'Finalizada',
          fecha_venta: {
            [Op.between]: [dateContext.monthStart, dateContext.monthEnd]
          }
        }
      }),
      Sale.findAll({
        attributes: [
          'estado',
          [fn('COUNT', col('id_venta')), 'total'],
          [fn('SUM', col('valor_venta')), 'monto_total']
        ],
        where: {
          fecha_venta: {
            [Op.between]: [dateContext.rangeStart, dateContext.todayEnd]
          }
        },
        group: ['estado'],
        raw: true
      })
    ]);

    const total_facturado_mes = toNumber(totalFacturadoMesRaw);
    const ticket_promedio_mes = ventas_este_mes > 0 ? total_facturado_mes / ventas_este_mes : 0;

    const por_estado = porEstadoRows.map((row) => ({
      estado: row.estado || 'Sin estado',
      total: toNumber(row.total),
      monto_total: toNumber(row.monto_total)
    }));

    return {
      ventas_este_mes,
      total_facturado_mes,
      ticket_promedio_mes,
      por_estado
    };
  }

  async buildArriendosModule(dateContext) {
    const [activos, ingresosMesRaw, cobros_pendientes, porEstadoRows] = await Promise.all([
      Lease.count({ where: { estado: 'Activo' } }),
      Payment.sum('valor_pago', {
        where: {
          estado: 'Pagado',
          fecha_pago: {
            [Op.between]: [dateContext.monthStartIso, dateContext.monthEndIso]
          }
        }
      }),
      Payment.count({ where: { estado: 'Pendiente' } }),
      Lease.findAll({
        attributes: [
          'estado',
          [fn('COUNT', col('id_arrendamiento')), 'total'],
          [fn('SUM', col('valor_mensual')), 'monto_mensual']
        ],
        group: ['estado'],
        raw: true
      })
    ]);

    const ingresos_este_mes = toNumber(ingresosMesRaw);
    const por_estado = porEstadoRows.map((row) => ({
      estado: row.estado || 'Sin estado',
      total: toNumber(row.total),
      monto_mensual: toNumber(row.monto_mensual)
    }));

    return {
      activos,
      ingresos_este_mes,
      cobros_pendientes,
      por_estado
    };
  }

  async buildInmueblesModule() {
    const [total_inmuebles, estadoRows] = await Promise.all([
      Inmueble.count(),
      Inmueble.findAll({
        attributes: [
          'estado_frontend',
          [fn('COUNT', col('id_inmueble')), 'total']
        ],
        group: ['estado_frontend'],
        raw: true
      })
    ]);

    let disponibles = 0;
    let arrendados = 0;
    let vendidos = 0;
    let en_proceso_arrendamiento = 0;

    estadoRows.forEach((row) => {
      const status = normalizeText(row.estado_frontend);
      const amount = toNumber(row.total);

      if (status.includes('dispon')) {
        disponibles += amount;
      } else if (status.includes('arrend')) {
        if (status.includes('proceso')) {
          en_proceso_arrendamiento += amount;
        } else {
          arrendados += amount;
        }
      } else if (status.includes('vend')) {
        vendidos += amount;
      }
    });

    return {
      total_inmuebles,
      disponibles,
      arrendados,
      vendidos,
      en_proceso_arrendamiento
    };
  }

  async buildUsuariosModule(dateContext) {
    const nuevos30dDesde = addDays(dateContext.todayStart, -29);

    const [activos, inactivos, nuevos_30d, accesosRecientes] = await Promise.all([
      Persona.count({ where: { tiene_cuenta: true, estado: true } }),
      Persona.count({ where: { tiene_cuenta: true, estado: false } }),
      Persona.count({
        where: {
          tiene_cuenta: true,
          fecha_registro: {
            [Op.gte]: nuevos30dDesde
          }
        }
      }),
      Acceso.findAll({
        where: {
          ultimo_acceso: { [Op.not]: null }
        },
        include: [
          {
            model: Persona,
            as: 'persona',
            attributes: ['id_persona', 'nombre_completo', 'apellido_completo', 'correo'],
            where: { tiene_cuenta: true },
            required: true
          }
        ],
        attributes: ['id_persona', 'ultimo_acceso'],
        order: [['ultimo_acceso', 'DESC']],
        limit: 6
      })
    ]);

    const activos_recientes = accesosRecientes.map((item) => ({
      id_persona: item.id_persona,
      nombre: `${item.persona?.nombre_completo || ''} ${item.persona?.apellido_completo || ''}`.trim(),
      correo: item.persona?.correo || '',
      ultimo_acceso: item.ultimo_acceso
    }));

    return {
      activos,
      inactivos,
      nuevos_30d,
      activos_recientes
    };
  }

  async buildAdministrativosModule() {
    const [estadoRows, cargoRows] = await Promise.all([
      Administrativo.findAll({
        attributes: ['estado_laboral', [fn('COUNT', col('id_administrativo')), 'total']],
        group: ['estado_laboral'],
        raw: true
      }),
      sequelize.query(
        `
          SELECT TOP 6
            r.nombre_rol AS cargo,
            COUNT(*) AS total
          FROM Administrativos a
          INNER JOIN Personas_rol pr ON pr.id_persona = a.id_persona AND pr.estado = 1
          INNER JOIN Roles r ON r.id_rol = pr.id_rol AND r.estado = 1
          GROUP BY r.nombre_rol
          ORDER BY COUNT(*) DESC
        `,
        { type: QueryTypes.SELECT }
      )
    ]);

    const distribucion_estado = estadoRows.map((row) => ({
      estado: row.estado_laboral || 'Sin estado',
      total: toNumber(row.total)
    }));

    const total = distribucion_estado.reduce((acc, row) => acc + row.total, 0);
    const activos = distribucion_estado
      .filter((row) => normalizeText(row.estado) === 'activo')
      .reduce((acc, row) => acc + row.total, 0);
    const inactivos = Math.max(total - activos, 0);

    const distribucion_cargo = cargoRows.map((row) => ({
      cargo: row.cargo || 'Sin cargo',
      total: toNumber(row.total)
    }));

    return {
      activos,
      inactivos,
      distribucion_estado,
      distribucion_cargo
    };
  }

  async buildRolesModule() {
    const [rolesRows, usersSinRolRows] = await Promise.all([
      sequelize.query(
        `
          SELECT TOP 8
            r.id_rol,
            r.nombre_rol,
            COUNT(pr.id_persona) AS total
          FROM Roles r
          LEFT JOIN Personas_rol pr ON pr.id_rol = r.id_rol AND pr.estado = 1
          WHERE r.estado = 1
          GROUP BY r.id_rol, r.nombre_rol
          ORDER BY COUNT(pr.id_persona) DESC, r.nombre_rol ASC
        `,
        { type: QueryTypes.SELECT }
      ),
      sequelize.query(
        `
          SELECT COUNT(*) AS total
          FROM Personas p
          LEFT JOIN Personas_rol pr ON pr.id_persona = p.id_persona AND pr.estado = 1
          WHERE p.tiene_cuenta = 1
            AND p.estado = 1
            AND pr.id_rol IS NULL
        `,
        { type: QueryTypes.SELECT }
      )
    ]);

    const roles_mas_asignados = rolesRows.map((row) => ({
      id_rol: row.id_rol,
      nombre_rol: row.nombre_rol,
      total: toNumber(row.total)
    }));

    const usuarios_sin_rol = toNumber(usersSinRolRows?.[0]?.total);

    return {
      roles_mas_asignados,
      usuarios_sin_rol
    };
  }

  async buildReportesModule(dateContext) {
    const [reportes_mes, pendientes, resueltos, porEstadoRows] = await Promise.all([
      Reporte.count({
        where: {
          fecha_creacion: {
            [Op.between]: [dateContext.monthStart, dateContext.monthEnd]
          }
        }
      }),
      Reporte.count({ where: { estado: 'Pendiente' } }),
      Reporte.count({ where: { estado: 'Completado' } }),
      Reporte.findAll({
        attributes: ['estado', [fn('COUNT', col('id_reporte')), 'total']],
        group: ['estado'],
        raw: true
      })
    ]);

    const por_estado = porEstadoRows.map((row) => ({
      estado: row.estado || 'Sin estado',
      total: toNumber(row.total)
    }));

    return {
      reportes_mes,
      pendientes,
      resueltos,
      por_estado
    };
  }

  async generateOverview({ userId, userRoles, range }) {
    const dateContext = this.resolveDateContext(range);
    const roleIds = await this.resolveRoleIds(userRoles);
    const visibleModules = await this.resolveVisibleModules(userRoles, roleIds);

    const [personal] = await Promise.all([
      this.buildPersonalBlock(userId, roleIds, dateContext)
    ]);

    const moduleBuilders = {
      citas: () => this.buildCitasModule(dateContext),
      ventas: () => this.buildVentasModule(dateContext),
      arriendos: () => this.buildArriendosModule(dateContext),
      inmuebles: () => this.buildInmueblesModule(),
      usuarios: () => this.buildUsuariosModule(dateContext),
      administrativos: () => this.buildAdministrativosModule(),
      roles: () => this.buildRolesModule(),
      reportes: () => this.buildReportesModule(dateContext)
    };

    const modules = {};
    const moduleErrors = {};

    await this.runWithConcurrency(
      visibleModules,
      DASHBOARD_MODULE_CONCURRENCY,
      async (moduleKey) => {
        const builder = moduleBuilders[moduleKey];
        if (!builder) return;
        try {
          modules[moduleKey] = await this.withTimeout(builder(), DASHBOARD_MODULE_TIMEOUT_MS);
        } catch (error) {
          logger.warn(`[Dashboard] Error construyendo modulo ${moduleKey}: ${error.message}`);
          modules[moduleKey] = {};
          moduleErrors[moduleKey] = 'No fue posible cargar este modulo';
        }
      }
    );

    const response = {
      generatedAt: new Date().toISOString(),
      refreshInSec: 60,
      range: dateContext.normalizedRange,
      visibility: {
        modules: visibleModules
      },
      global: {
        personal,
        quickActions: this.buildQuickActions(visibleModules)
      },
      modules
    };

    if (Object.keys(moduleErrors).length) {
      response.moduleErrors = moduleErrors;
    }

    return response;
  }

  async getOverview({ user, range }) {
    const userId = user?.id;
    const userRoles = Array.isArray(user?.roles) ? user.roles : [];
    if (!userId) {
      const error = new Error('Usuario no autenticado');
      error.status = 401;
      throw error;
    }

    const normalizedRange = normalizeRange(range);
    const cacheKey = this.buildOverviewCacheKey({
      userId,
      userRoles,
      range: normalizedRange
    });

    const cachedOverview = this.getCachedOverview(cacheKey);
    if (cachedOverview) {
      return cachedOverview;
    }

    if (this.inFlightOverview.has(cacheKey)) {
      return this.inFlightOverview.get(cacheKey);
    }

    const requestPromise = this.generateOverview({
      userId,
      userRoles,
      range: normalizedRange
    })
      .then((overview) => {
        this.setCachedOverview(cacheKey, overview);
        return overview;
      })
      .finally(() => {
        this.inFlightOverview.delete(cacheKey);
      });

    this.inFlightOverview.set(cacheKey, requestPromise);
    return requestPromise;
  }
}

module.exports = new DashboardService();
