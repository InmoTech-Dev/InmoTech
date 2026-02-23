const SUPER_ADMIN_ROLE = 'Super Administrador';
const ADMINISTRATOR_ROLE = 'Administrador';

const PROTECTED_ROLES = [SUPER_ADMIN_ROLE, ADMINISTRATOR_ROLE];
const SYSTEM_ROLES = [
  SUPER_ADMIN_ROLE,
  ADMINISTRATOR_ROLE,
  'Empleado',
  'Usuario',
  'Propietario',
];

module.exports = {
  SUPER_ADMIN_ROLE,
  ADMINISTRATOR_ROLE,
  PROTECTED_ROLES,
  SYSTEM_ROLES,
};
