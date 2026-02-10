export const COMODIDADES_POR_TIPO = {
  Casa: ['Habitaciones', 'Baños', 'Parqueaderos', 'Cocina integral', 'Sala-comedor', 'Patio', 'Jardín', 'Lavandería', 'Balcón'],
  Apartamento: ['Habitaciones', 'Baños', 'Parqueaderos', 'Cocina integral', 'Balcón', 'Zona de lavandería', 'Ascensor', 'Portería'],
  Apartaestudio: ['Baños', 'Parqueaderos', 'Cocina integral', 'Balcón', 'Zona de lavandería', 'Ascensor', 'Portería'],
  Finca: ['Habitaciones', 'Baños', 'Parqueaderos', 'Cocina', 'Piscina', 'Kiosco', 'Establos', 'Cultivos', 'Lago'],
  Lote: ['Área construible', 'Servicios públicos', 'Acceso vehicular', 'Documentación al día'],
  Oficina: ['Baños', 'Parqueaderos', 'Recepción', 'Sala de juntas', 'Cocina', 'Aire acondicionado', 'Internet']
};

export const PROPIETARIOS_EJEMPLO = [
  { id: 1, nombre: 'Juan Carlos Pérez García', email: 'juan.perez@email.com', telefono: '3001234567' },
  { id: 2, nombre: 'María González López', email: 'maria.gonzalez@email.com', telefono: '3009876543' },
  { id: 3, nombre: 'Pedro Luis Martínez', email: 'pedro.martinez@email.com', telefono: '3005556789' }
];

export const ESTADOS_INMUEBLE = {
  'Disponible': 'bg-green-100 text-green-800',
  'Vendido': 'bg-gray-100 text-gray-800',
  'Arrendado': 'bg-blue-100 text-blue-800',
  'En proceso de venta': 'bg-yellow-100 text-yellow-800',
  'En proceso de arrendamiento': 'bg-orange-100 text-orange-800'
};

export const ESTADOS_DOT_COLORS = {
  'Disponible': 'bg-green-500',
  'Vendido': 'bg-gray-500',
  'Arrendado': 'bg-blue-500',
  'En proceso de venta': 'bg-yellow-500',
  'En proceso de arrendamiento': 'bg-orange-500'
};
