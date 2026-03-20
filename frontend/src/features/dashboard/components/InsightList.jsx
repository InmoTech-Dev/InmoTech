import React from 'react';

const InsightList = ({ title, items = [], emptyMessage = 'Sin datos disponibles' }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {title ? (
        <div className="px-4 py-3 border-b border-slate-200">
          <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="px-4 py-5 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id || item.label} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  {item.description ? (
                    <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                  ) : null}
                </div>
                {item.value !== undefined ? (
                  <span className="text-sm font-semibold text-[#00457B]">{item.value}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default InsightList;
