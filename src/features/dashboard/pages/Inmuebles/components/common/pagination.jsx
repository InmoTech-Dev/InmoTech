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