import {
  MdCalendarToday,
  MdTrendingUp,
  MdBusiness,
  MdHomeWork,
  MdPeople,
  MdManageAccounts,
  MdShield,
  MdFactCheck
} from 'react-icons/md';

export const DASHBOARD_RANGE_OPTIONS = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' }
];

export const MODULE_META = {
  citas: {
    title: 'Citas',
    description: 'Operacion diaria, agenda y cumplimiento.',
    icon: MdCalendarToday,
    accent: '#00457B'
  },
  ventas: {
    title: 'Ventas',
    description: 'Rendimiento comercial del periodo.',
    icon: MdTrendingUp,
    accent: '#0B6FA4'
  },
  arriendos: {
    title: 'Arriendos',
    description: 'Contratos activos y flujo de cobros.',
    icon: MdBusiness,
    accent: '#0F766E'
  },
  inmuebles: {
    title: 'Inmuebles',
    description: 'Disponibilidad y estado del inventario.',
    icon: MdHomeWork,
    accent: '#2563EB'
  },
  usuarios: {
    title: 'Usuarios',
    description: 'Actividad de cuentas y crecimiento.',
    icon: MdPeople,
    accent: '#475569'
  },
  administrativos: {
    title: 'Administrativos',
    description: 'Salud operativa del equipo interno.',
    icon: MdManageAccounts,
    accent: '#0E7490'
  },
  roles: {
    title: 'Roles',
    description: 'Asignacion de perfiles y cobertura.',
    icon: MdShield,
    accent: '#7C3AED'
  },
  reportes: {
    title: 'Reportes',
    description: 'Seguimiento de casos de la empresa.',
    icon: MdFactCheck,
    accent: '#B45309'
  }
};

export const FALLBACK_MODULES = [
  'citas',
  'ventas',
  'arriendos',
  'inmuebles',
  'usuarios',
  'administrativos',
  'roles',
  'reportes'
];
