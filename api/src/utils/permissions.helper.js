const path = require('path');
const permissionsConfig = require(path.resolve(__dirname, '../../..', 'shared/config/permissions-map.json'));

const modulesConfig = permissionsConfig.modules || {};
const permissionsConfigMap = permissionsConfig.permissions || {};

const moduleAliasToCanonical = {};
const canonicalModuleAliases = {};
const permissionAliasToCanonical = {};
const canonicalPermissionAliases = {};

const registerAlias = (targetMap, canonicalKey, aliasValue, aliasCollection) => {
  if (!aliasValue || typeof aliasValue !== 'string') {
    return;
  }
  const trimmed = aliasValue.trim();
  if (!trimmed) {
    return;
  }
  aliasCollection.add(trimmed);
  aliasCollection.add(trimmed.toLowerCase());
  targetMap[trimmed.toLowerCase()] = canonicalKey;
};

Object.entries(modulesConfig).forEach(([moduleKey, aliases = []]) => {
  if (!moduleKey || typeof moduleKey !== 'string') {
    return;
  }

  const canonical = moduleKey.trim().toLowerCase();
  if (!canonical) {
    return;
  }

  const aliasCollection = new Set([canonical]);
  registerAlias(moduleAliasToCanonical, canonical, canonical, aliasCollection);

  aliases.forEach((alias) => {
    registerAlias(moduleAliasToCanonical, canonical, alias, aliasCollection);
  });

  canonicalModuleAliases[canonical] = Array.from(aliasCollection)
    .filter((alias) => alias && alias !== canonical);
});

Object.entries(permissionsConfigMap).forEach(([permissionKey, aliases = []]) => {
  if (!permissionKey || typeof permissionKey !== 'string') {
    return;
  }

  const canonical = permissionKey.trim().toLowerCase();
  if (!canonical) {
    return;
  }

  const aliasCollection = new Set([canonical]);
  registerAlias(permissionAliasToCanonical, canonical, canonical, aliasCollection);

  aliases.forEach((alias) => {
    registerAlias(permissionAliasToCanonical, canonical, alias, aliasCollection);
  });

  canonicalPermissionAliases[canonical] = Array.from(aliasCollection)
    .filter((alias) => alias && alias !== canonical);
});

const normalizeModuleKey = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const key = value.trim().toLowerCase();
  return moduleAliasToCanonical[key] || null;
};

const normalizePermissionKey = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const key = value.trim().toLowerCase();
  return permissionAliasToCanonical[key] || null;
};

const getModuleAliases = (canonicalModule) => {
  if (!canonicalModule) {
    return [];
  }
  return canonicalModuleAliases[canonicalModule] || [];
};

const getPermissionAliases = (canonicalPermission) => {
  if (!canonicalPermission) {
    return [];
  }
  return canonicalPermissionAliases[canonicalPermission] || [];
};

const getModuleSearchValues = (moduleName) => {
  const canonical = normalizeModuleKey(moduleName);
  if (!canonical) {
    return [];
  }
  const aliasList = getModuleAliases(canonical);
  const values = new Set([canonical]);
  aliasList.forEach((alias) => {
    values.add(alias.toLowerCase());
  });
  return Array.from(values);
};

const getPermissionSearchValues = (permissionNames = []) => {
  const list = Array.isArray(permissionNames) ? permissionNames : [permissionNames];
  return list
    .map((permission) => normalizePermissionKey(permission))
    .filter(Boolean);
};

const VIEW_PERMISSION = 'ver';

const enforceViewDependency = (canonicalPermissions = {}) => {
  const normalized = {};

  Object.entries(canonicalPermissions).forEach(([moduleKey, modulePerms]) => {
    if (!modulePerms || typeof modulePerms !== 'object') {
      return;
    }

    const nextModulePerms = { ...modulePerms };
    const hasNonViewPermission = Object.entries(nextModulePerms).some(
      ([permissionKey, value]) => permissionKey !== VIEW_PERMISSION && value === true
    );

    if (hasNonViewPermission) {
      nextModulePerms[VIEW_PERMISSION] = true;
    }

    normalized[moduleKey] = nextModulePerms;
  });

  return normalized;
};

const normalizePermissionsStructure = (permisos = {}) => {
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
      if (permiso && permiso.modulo && permiso.permiso) {
        assignPermission(permiso.modulo, permiso.permiso);
      }
    });
    return enforceViewDependency(canonicalPermissions);
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

  return enforceViewDependency(canonicalPermissions);
};

const expandPermissionsMap = (canonicalPermissions = {}) => {
  const expanded = {};

  Object.entries(canonicalPermissions).forEach(([moduleKey, modulePerms]) => {
    const aliasList = getModuleAliases(moduleKey);
    const moduleNames = new Set([moduleKey]);

    aliasList.forEach((alias) => {
      moduleNames.add(alias);
      moduleNames.add(alias.toLowerCase());
    });

    moduleNames.forEach((name) => {
      expanded[name] = modulePerms;
    });
  });

  return expanded;
};

const buildPermissionsResponse = (rawPermissions = {}) => {
  const canonical = normalizePermissionsStructure(rawPermissions);
  return expandPermissionsMap(canonical);
};

const buildPermissionsPayload = (permisosInput = {}, idRol) => {
  if (!permisosInput || typeof permisosInput !== 'object') {
    return [];
  }

  const canonicalPermissions = enforceViewDependency(normalizePermissionsStructure(permisosInput));
  const payload = [];

  Object.entries(canonicalPermissions).forEach(([moduleKey, modulePerms]) => {
    Object.entries(modulePerms).forEach(([permissionKey, value]) => {
      if (!value) {
        return;
      }
      payload.push({
        id_rol: idRol,
        modulo: moduleKey,
        permiso: permissionKey,
        estado: true
      });
    });
  });

  return payload;
};

module.exports = {
  normalizeModuleKey,
  normalizePermissionKey,
  getModuleAliases,
  getPermissionAliases,
  getModuleSearchValues,
  getPermissionSearchValues,
  enforceViewDependency,
  normalizePermissionsStructure,
  buildPermissionsResponse,
  buildPermissionsPayload
};
