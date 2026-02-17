import React from 'react';

export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-4 py-2 rounded-lg font-medium transition-all ${
          currentPage === 1
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
        }`}
      >
        Anterior
      </button>

      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            currentPage === page
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-4 py-2 rounded-lg font-medium transition-all ${
          currentPage === totalPages
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
        }`}
      >
        Siguiente
      </button>
    </div>
  );
};