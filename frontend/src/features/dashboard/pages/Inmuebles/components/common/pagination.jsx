import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ currentPage, totalPages, onPageChange, hasPrevPage, hasNextPage }) => {
  const safeCurrentPage = Math.max(currentPage || 1, 1);
  const safeTotalPages = Math.max(totalPages || 1, 1);
  const canGoBack =
    typeof hasPrevPage === 'boolean' ? hasPrevPage || safeCurrentPage > 1 : safeCurrentPage > 1;
  const canGoForward =
    typeof hasNextPage === 'boolean'
      ? hasNextPage || safeCurrentPage < safeTotalPages
      : safeCurrentPage < safeTotalPages;
  const maxVisiblePages = 5;

  const getVisiblePages = () => {
    if (safeTotalPages <= maxVisiblePages) {
      return Array.from({ length: safeTotalPages }, (_, index) => index + 1);
    }

    const sideWindow = Math.floor(maxVisiblePages / 2);
    let start = Math.max(safeCurrentPage - sideWindow, 1);
    let end = start + maxVisiblePages - 1;

    if (end > safeTotalPages) {
      end = safeTotalPages;
      start = Math.max(end - maxVisiblePages + 1, 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
      <div className="text-sm text-slate-600">
        {`Pagina ${safeCurrentPage} de ${safeTotalPages}`}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => canGoBack && onPageChange(safeCurrentPage - 1)}
          disabled={!canGoBack}
          aria-label="Pagina anterior"
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
            canGoBack
              ? 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              : 'cursor-not-allowed text-slate-300'
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {visiblePages[0] > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="inline-flex min-w-8 items-center justify-center rounded-full px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-200 hover:text-slate-700"
            >
              1
            </button>
            {visiblePages[0] > 2 && (
              <span className="px-1 text-sm text-slate-400">...</span>
            )}
          </>
        )}

        {visiblePages.map((page) => {
          const isActive = page === safeCurrentPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              disabled={isActive}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex min-w-8 items-center justify-center rounded-full px-3 py-1 text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              {page}
            </button>
          );
        })}

        {visiblePages[visiblePages.length - 1] < safeTotalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < safeTotalPages - 1 && (
              <span className="px-1 text-sm text-slate-400">...</span>
            )}
            <button
              type="button"
              onClick={() => onPageChange(safeTotalPages)}
              className="inline-flex min-w-8 items-center justify-center rounded-full px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-200 hover:text-slate-700"
            >
              {safeTotalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => canGoForward && onPageChange(safeCurrentPage + 1)}
          disabled={!canGoForward}
          aria-label="Pagina siguiente"
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
            canGoForward
              ? 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              : 'cursor-not-allowed text-slate-300'
          }`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
