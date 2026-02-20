import React from 'react';
import { Eye, Edit, FileText, Star } from 'lucide-react';

export const ActionButtons = ({ onView, onEdit, onDocument, onToggleFeatured, isFeatured }) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onView}
        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all group relative"
      >
        <Eye className="w-5 h-5" />
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          Ver detalle
        </span>
      </button>
      <button
        onClick={onEdit}
        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all group relative"
      >
        <Edit className="w-5 h-5" />
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          Editar
        </span>
      </button>
      <button
        onClick={onDocument}
        className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all group relative"
      >
        <FileText className="w-5 h-5" />
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          Fichas técnicas
        </span>
      </button>
      {onToggleFeatured && (
        <button
          onClick={onToggleFeatured}
          className={`p-2 rounded-lg transition-all group relative ${
            isFeatured
              ? 'text-amber-600 bg-amber-50 hover:text-amber-700'
              : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
          }`}
        >
          <Star className={`w-5 h-5 ${isFeatured ? 'fill-amber-400' : ''}`} />
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {isFeatured ? 'Quitar destacado' : 'Marcar como destacado'}
          </span>
        </button>
      )}
    </div>
  );
};
