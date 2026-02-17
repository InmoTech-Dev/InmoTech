const { Op, fn, col, where } = require('sequelize');
const { Permiso } = require('../models');
const logger = require('../utils/logger');
const {
  normalizeModuleKey,
  normalizePermissionKey,
  getModuleSearchValues,
  getPermissionAliases
} = require('../utils/permissions.helper');

const VIEW_PERMISSION = 'ver';

const toBoolean = (value, defaultValue = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return defaultValue;
};

const getViewSearchValues = () => {
  const aliases = getPermissionAliases(VIEW_PERMISSION) || [];
  return Array.from(new Set([VIEW_PERMISSION, ...aliases.map((alias) => alias.toLowerCase())]));
};

const runPermissionsBackfill = async () => {
  const enabled = toBoolean(process.env.PERMISSIONS_BACKFILL_ON_START, true);
  if (!enabled) {
    logger.info('[PERMISSIONS_BACKFILL] disabled by PERMISSIONS_BACKFILL_ON_START=false');
    return { checked: 0, created: 0, reactivated: 0, skipped: true };
  }

  const activePermissions = await Permiso.findAll({
    where: { estado: true },
    attributes: ['id_rol', 'modulo', 'permiso']
  });

  const groupedByRoleAndModule = new Map();

  activePermissions.forEach((permissionRecord) => {
    const normalizedModule =
      normalizeModuleKey(permissionRecord.modulo) ||
      (typeof permissionRecord.modulo === 'string' ? permissionRecord.modulo.trim().toLowerCase() : null);
    const normalizedPermission =
      normalizePermissionKey(permissionRecord.permiso) ||
      (typeof permissionRecord.permiso === 'string' ? permissionRecord.permiso.trim().toLowerCase() : null);

    if (!normalizedModule || !normalizedPermission) {
      return;
    }

    const key = `${permissionRecord.id_rol}:${normalizedModule}`;
    if (!groupedByRoleAndModule.has(key)) {
      groupedByRoleAndModule.set(key, {
        idRol: permissionRecord.id_rol,
        module: normalizedModule,
        permissions: new Set()
      });
    }

    groupedByRoleAndModule.get(key).permissions.add(normalizedPermission);
  });

  const viewSearchValues = getViewSearchValues();
  let checked = 0;
  let created = 0;
  let reactivated = 0;

  for (const entry of groupedByRoleAndModule.values()) {
    const hasNonViewPermission = Array.from(entry.permissions).some(
      (permission) => permission !== VIEW_PERMISSION
    );

    if (!hasNonViewPermission || entry.permissions.has(VIEW_PERMISSION)) {
      continue;
    }

    checked += 1;
    const moduleSearchValues = getModuleSearchValues(entry.module);
    const existingViewPermission = await Permiso.findOne({
      where: {
        [Op.and]: [
          { id_rol: entry.idRol },
          where(fn('LOWER', col('modulo')), { [Op.in]: moduleSearchValues }),
          where(fn('LOWER', col('permiso')), { [Op.in]: viewSearchValues })
        ]
      }
    });

    if (existingViewPermission) {
      if (existingViewPermission.estado !== true) {
        await existingViewPermission.update({ estado: true });
        reactivated += 1;
      }
      continue;
    }

    await Permiso.create({
      id_rol: entry.idRol,
      modulo: entry.module,
      permiso: VIEW_PERMISSION,
      estado: true
    });
    created += 1;
  }

  logger.info(
    `[PERMISSIONS_BACKFILL] completed: checked=${checked}, created=${created}, reactivated=${reactivated}`
  );

  return { checked, created, reactivated, skipped: false };
};

module.exports = {
  runPermissionsBackfill
};
