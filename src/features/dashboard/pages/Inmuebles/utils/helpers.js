import { ESTADOS_INMUEBLE, ESTADOS_DOT_COLORS } from './constants';

export const getEstadoColor = (estado) => {
  return ESTADOS_INMUEBLE[estado] || 'bg-gray-100 text-gray-800';
};

export const getEstadoDotColor = (estado) => {
  return ESTADOS_DOT_COLORS[estado] || 'bg-gray-500';
};

export const formatPrice = (price) => {
  return `$${price?.toLocaleString()}`;
};

export const generateRegistro = (id) => {
  return `INM-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;
};