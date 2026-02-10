import permissionsConfig from '../../../shared/config/permissions-map.json';

const modulesConfig = permissionsConfig.modules || {};
const permissionsConfigMap = permissionsConfig.permissions || {};

const moduleAliasToCanonical = new Map();
const permissionAliasToCanonical = new Map();

Object.entries(modulesConfig).forEach(([moduleKey, aliases = []]) => {
  if (typeof moduleKey !== 'string') {
    return;
  }

  const canonical = moduleKey.trim().toLowerCase();
  if (!canonical) {
    return;
  }

  moduleAliasToCanonical.set(canonical, canonical);
  aliases.forEach((alias) => {
    if (typeof alias === 'string') {
      const normalizedAlias = alias.trim().toLowerCase();
      if (normalizedAlias) {
        moduleAliasToCanonical.set(normalizedAlias, canonical);
      }
    }
  });
});

Object.entries(permissionsConfigMap).forEach(([permissionKey, aliases = []]) => {
  if (typeof permissionKey !== 'string') {
    return;
  }

  const canonical = permissionKey.trim().toLowerCase();
  if (!canonical) {
    return;
  }

  permissionAliasToCanonical.set(canonical, canonical);
  aliases.forEach((alias) => {
    if (typeof alias === 'string') {
      const normalizedAlias = alias.trim().toLowerCase();
      if (normalizedAlias) {
        permissionAliasToCanonical.set(normalizedAlias, canonical);
      }
    }
  });
});

export const normalizeModuleKey = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const key = value.trim().toLowerCase();
  return moduleAliasToCanonical.get(key) || null;
};

export const normalizePermissionKey = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const key = value.trim().toLowerCase();
  return permissionAliasToCanonical.get(key) || null;
};

export const canonicalizePermissions = (permisos) => {
  if (!permisos) {
    return {};
  }

  const canonicalPermissions = {};

  const assignPermission = (moduleKey, permissionKey) => {
    const canonicalModule = normalizeModuleKey(moduleKey);
    const canonicalPermission = normalizePermissionKey(permissionKey);

    if (!canonicalModule || !canonicalPermission) {
      return;
    }

    if (!canonicalPermissions[canonicalModule]) {
      canonicalPermissions[canonicalModule] = {};
    }

    canonicalPermissions[canonicalModule][canonicalPermission] = true;
  };

  if (Array.isArray(permisos)) {
    permisos.forEach((permiso) => {
      if (permiso?.modulo && permiso?.permiso) {
        assignPermission(permiso.modulo, permiso.permiso);
      }
    });
    return canonicalPermissions;
  }

  Object.entries(permisos).forEach(([moduleKey, modulePerms]) => {
    if (!modulePerms || typeof modulePerms !== 'object') {
      return;
    }

    Object.entries(modulePerms).forEach(([permissionKey, value]) => {
      if (value === true) {
        assignPermission(moduleKey, permissionKey);
      }
    });
  });

  return canonicalPermissions;
};

export const ADMIN_FULL_ACCESS_MODULES = [
  'inmuebles',
  'citas',
  'ventas',
  'arriendos',
  'reportes',
  'administrativos',
  'roles',
  'usuarios',
  'seguridad'
];
