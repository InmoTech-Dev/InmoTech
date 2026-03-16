/**
 * Utility to build pagination metadata for API responses.
 */

/**
 * Builds the pagination metadata object.
 * 
 * @param {Object} options - Pagination options.
 * @param {number} options.total - Total number of items.
 * @param {number} options.page - Current page number.
 * @param {number} options.limit - Items per page.
 * @param {boolean} options.enabled - Whether pagination is enabled.
 * @returns {Object} Pagination metadata.
 */
const buildPaginationMeta = ({ total, page, limit, enabled }) => {
    if (!enabled) {
        return {
            total,
            pagina: 1,
            limite: total,
            paginas_totales: 1,
            has_next_page: false,
            has_prev_page: false
        };
    }

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Number(limit) || 10, 1);
    const totalPages = Math.ceil(total / safeLimit) || 1;

    return {
        total,
        pagina: safePage,
        limite: safeLimit,
        paginas_totales: totalPages,
        has_next_page: safePage < totalPages,
        has_prev_page: safePage > 1
    };
};

/**
 * Normalizes pagination parameters from request query.
 * 
 * @param {Object} query - Request query object.
 * @param {Object} options - Normalization options.
 * @returns {Object} Normalized pagination object.
 */
const normalizePagination = (query = {}, options = {}) => {
    const { defaultLimit = 10, maxLimit = 50 } = options;
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);

    return {
        enabled: true,
        page,
        limit,
        offset: (page - 1) * limit
    };
};

module.exports = {
    buildPaginationMeta,
    normalizePagination
};
