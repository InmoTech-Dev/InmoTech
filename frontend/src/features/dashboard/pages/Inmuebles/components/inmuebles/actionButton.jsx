import React from 'react';
import { Eye, Edit, FileText, Star } from 'lucide-react';

export const ActionButtons = ({
  onView,
  onEdit,
  onDocument,
  onToggleFeatured,
  isFeatured,
  isFeaturedDisabled = false,
  isEditDisabled = false
}) => {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <button
        onClick={onView}
        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all group relative"
      >
        <Eye className="w-4 h-4" />
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          Ver detalle
        </span>
      </button>
      <button
        onClick={onEdit}
        disabled={isEditDisabled}
        className={`p-1.5 rounded-lg transition-all group relative ${
          isEditDisabled
            ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
            : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
        }`}
      >
        <Edit className="w-4 h-4" />
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          {isEditDisabled ? 'No disponible en estado Vendido' : 'Editar'}
        </span>
      </button>
      <button
        onClick={onDocument}
        className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all group relative"
      >
        <FileText className="w-4 h-4" />
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          Fichas técnicas
        </span>
      </button>
      {onToggleFeatured && (
        <button
          type="button"
          onClick={onToggleFeatured}
          disabled={isFeaturedDisabled}
          className={`p-1.5 rounded-lg transition-all group relative ${
            isFeaturedDisabled
              ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
              : isFeatured
                ? 'text-amber-600 bg-amber-50 hover:text-amber-700'
                : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
          }`}
        >
          <Star className={`w-4 h-4 ${isFeatured ? 'fill-amber-400' : ''}`} />
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {isFeaturedDisabled
              ? 'No disponible en estado Vendido o Arrendado'
              : isFeatured
                ? 'Quitar destacado'
                : 'Marcar como destacado'}
          </span>
        </button>
      )}
    </div>
  );
};
