import { normalizeModuleKey, normalizePermissionKey } from '../../shared/utils/permissions';
import { HELP_MODULE_ORDER } from './helpData';

const SECURITY_MODULES = new Set(['usuarios', 'administrativos', 'roles']);
const MODULE_PARENT_MAP = {
  propietarios: 'inmuebles',
  comprador: 'ventas',
  arrendatario: 'arriendos'
};

const ACTION_ALIASES = {
  view: ['view', 'ver', 'read', 'listar', 'consultar'],
  create: ['create', 'crear', 'registrar', 'nuevo', 'add'],
  edit: ['edit', 'editar', 'actualizar', 'update'],
  delete: ['delete', 'eliminar', 'anular', 'remove', 'borrar'],
  download: ['download', 'descargar'],
  assign: ['assign', 'asignar'],
  changeStatus: [
    'changestatus',
    'change_status',
    'change-status',
    'cambiarestado',
    'cambiar_estado',
    'estado'
  ]
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const getRoleNames = (user) => {
  if (!Array.isArray(user?.roles)) return [];

  return user.roles
    .map((role) => {
      if (typeof role === 'string') return role;
      return role?.nombre_rol || role?.nombre || role?.name || '';
    })
    .map((roleName) => roleName.trim())
    .filter(Boolean);
};

const isSuperAdmin = (user) => getRoleNames(user).includes('Super Administrador');
const isAdmin = (user) => getRoleNames(user).includes('Administrador');

const resolvePermissionModule = (moduleId) =>
  MODULE_PARENT_MAP[moduleId] || normalizeModuleKey(moduleId) || moduleId;

const getActionCandidates = (action, moduleId) => {
  const requestedActions = Array.isArray(action) ? action : [action];
  const candidates = new Set();

  requestedActions.forEach((actionName) => {
    (ACTION_ALIASES[actionName] || [actionName]).forEach((alias) => {
      candidates.add(normalizeText(alias));
      const normalizedAlias = normalizePermissionKey(alias);
      if (normalizedAlias) {
        candidates.add(normalizeText(normalizedAlias));
      }
    });
  });

  if (requestedActions.includes('changeStatus')) {
    (ACTION_ALIASES.edit || []).forEach((alias) => candidates.add(normalizeText(alias)));
  }

  if (requestedActions.includes('assign') && moduleId === 'citas') {
    (ACTION_ALIASES.edit || []).forEach((alias) => candidates.add(normalizeText(alias)));
  }

  return Array.from(candidates).filter(Boolean);
};

const moduleKeysMatch = (sourceModule, targetModule) => {
  const normalizedSource = normalizeModuleKey(sourceModule) || normalizeText(sourceModule);
  const normalizedTarget = normalizeModuleKey(targetModule) || normalizeText(targetModule);

  return normalizedSource === normalizedTarget;
};

const objectHasActionPermission = (modulePerms, actionCandidates) => {
  if (!modulePerms || typeof modulePerms !== 'object') return false;

  return Object.entries(modulePerms).some(([permissionKey, value]) => {
    if (value !== true) return false;

    const normalizedPermission =
      normalizePermissionKey(permissionKey) || normalizeText(permissionKey);

    return actionCandidates.includes(normalizedPermission);
  });
};

const rawPermissionGranted = (rawPermissions, moduleId, action) => {
  const permissionModule = resolvePermissionModule(moduleId);
  const actionCandidates = getActionCandidates(action, moduleId);

  if (Array.isArray(rawPermissions)) {
    return rawPermissions.some((permissionItem) => {
      const sourceModule =
        permissionItem?.modulo || permissionItem?.module || permissionItem?.moduleName;
      const sourceAction =
        permissionItem?.permiso ||
        permissionItem?.permission ||
        permissionItem?.accion ||
        permissionItem?.action;

      if (!sourceModule || !sourceAction) return false;
      if (!moduleKeysMatch(sourceModule, permissionModule)) return false;

      const normalizedSourceAction =
        normalizePermissionKey(sourceAction) || normalizeText(sourceAction);

      return actionCandidates.includes(normalizedSourceAction);
    });
  }

  if (!rawPermissions || typeof rawPermissions !== 'object') {
    return false;
  }

  return Object.entries(rawPermissions).some(([sourceModule, modulePerms]) => {
    if (!moduleKeysMatch(sourceModule, permissionModule)) return false;
    return objectHasActionPermission(modulePerms, actionCandidates);
  });
};

export const hasEffectiveHelpPermission = (user, moduleId, action = 'view') => {
  if (moduleId === 'dashboard') return true;

  if (!user) return false;

  if (isSuperAdmin(user)) {
    return true;
  }

  if (SECURITY_MODULES.has(moduleId) && !(isAdmin(user) || isSuperAdmin(user))) {
    return false;
  }

  if (isAdmin(user)) {
    if (moduleId === 'roles') {
      return action === 'view';
    }

    return true;
  }

  const rawPermissions = user.permisos || user.permisosPorModulo || {};
  return rawPermissionGranted(rawPermissions, moduleId, action);
};

const sectionIsVisible = (section, user, moduleId) => {
  if (!section?.requiredAction) return true;

  if (Array.isArray(section.requiredAction)) {
    return section.requiredAction.some((action) =>
      hasEffectiveHelpPermission(user, moduleId, action)
    );
  }

  return hasEffectiveHelpPermission(user, moduleId, section.requiredAction);
};

export const filterSectionsForUser = (sections = [], user, moduleId) =>
  sections.filter((section) => sectionIsVisible(section, user, moduleId));

export const filterModulesForUser = (allModules = [], user) => {
  const modulesByOrder = [...allModules].sort(
    (left, right) => HELP_MODULE_ORDER.indexOf(left.id) - HELP_MODULE_ORDER.indexOf(right.id)
  );

  return modulesByOrder.filter((moduleItem) => {
    if (moduleItem.id === 'dashboard') return true;

    const requiredAction = moduleItem?.requiredAccess?.action || 'view';
    return hasEffectiveHelpPermission(user, moduleItem.id, requiredAction);
  });
};
