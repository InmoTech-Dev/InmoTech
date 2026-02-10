// Centralizado de rutas para el proyecto inmobiliario
// Importa rutas de módulos específicos y las exporta para uso global

// Rutas públicas (de routes.js original)
export const publicRoutes = {
  home: '/',
  about: '/nosotros',
  services: '/servicios',
  properties: '/inmuebles',
  propertyDetails: '/inmuebles/:id',
  contact: '/contactanos',
  userAppointments: '/mis-citas'
};

export const publicNavigationLinks = [
  { name: 'Inicio', path: publicRoutes.home },
  { name: 'Nosotros', path: publicRoutes.about },
  { name: 'Inmuebles', path: publicRoutes.properties },
  { name: 'Servicios', path: publicRoutes.services },
  { name: 'Contáctanos', path: publicRoutes.contact }
];

// Rutas del dashboard (de navigationData.js original)
export const dashboardRoutes = {
  dashboard: '/dashboard',
  properties: '/inmuebles/gestion',
  owners: '/inmuebles/propietarios',
  appointments: '/dashboard/citas',
  clients: '/dashboard/citas/clientes',
  sales: '/dashboard/salesManagement',
  buyers: '/dashboard/buyersManagement',
  rentals: '/dashboard/renantManagement',
  tenants: '/dashboard/leasesManagement',
  reports: '/reportes/gestion',
  security: '/seguridad',
  users: '/seguridad/usuarios',
  roles: '/seguridad/roles',
  administrativos: '/seguridad/administrativos',
  profile: '/dashboard/profile'
};

// Combinación de todas las rutas para acceso fácil
export const allRoutes = {
  ...publicRoutes,
  ...dashboardRoutes
};
