const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizePagination = (query = {}, options = {}) => {
  const {
    defaultLimit = 5,
    maxLimit = 100
  } = options;

  const rawPage = parsePositiveInt(query.page ?? query.pagina);
  const rawLimit = parsePositiveInt(query.limit ?? query.limite);
  const hasExplicitPagination = rawPage !== null || rawLimit !== null;

  const page = rawPage || 1;
  const limitBase = rawLimit || defaultLimit || maxLimit;
  const limit = Math.min(limitBase, maxLimit);

  return {
    enabled: true,
    page,
    limit,
    offset: (page - 1) * limit
  };
};

const buildPaginationMeta = ({ total = 0, page = 1, limit = null, enabled = false }) => {
  const safeLimit = limit || Math.max(total, 1);
  const totalPages = enabled ? Math.max(Math.ceil(total / safeLimit), 1) : 1;

  return {
    total,
    pagina: page,
    limite: safeLimit,
    paginas_totales: totalPages,
    has_next_page: page < totalPages,
    has_prev_page: page > 1
  };
};

module.exports = {
  normalizePagination,
  buildPaginationMeta
};
