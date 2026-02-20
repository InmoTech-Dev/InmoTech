export const formatNumber = (value = 0) => {
  const numeric = Number(value) || 0;
  return numeric.toLocaleString('es-CO');
};

export const formatCurrency = (value = 0) => {
  const numeric = Number(value) || 0;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(numeric);
};

export const formatDateTime = (value) => {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin registro';
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateLabel = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-CO', {
    month: 'short',
    day: '2-digit'
  });
};

export const toChartSeries = (items = [], key = 'total') => {
  return items.map((item) => ({
    ...item,
    value: Number(item?.[key]) || 0
  }));
};
