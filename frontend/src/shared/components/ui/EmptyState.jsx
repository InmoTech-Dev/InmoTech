import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ message = 'No hay datos disponibles' }) => {
  return (
    <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-lg">
      <div className="flex justify-center items-center mb-4">
        <Inbox className="w-12 h-12 text-slate-400" />
      </div>
      <p className="text-slate-500">{message}</p>
    </div>
  );
};

export default EmptyState;
