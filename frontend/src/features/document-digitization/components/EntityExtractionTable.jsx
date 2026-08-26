import React from 'react';
import { AbnormalFlagBadge } from './AbnormalFlagBadge';

export function EntityExtractionTable({ entities }) {
  if (!entities || entities.length === 0) {
    return <p className="text-sm text-slate-500 italic">No extracted entities found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
            <th className="p-3 font-semibold">Entity / Test</th>
            <th className="p-3 font-semibold">Category</th>
            <th className="p-3 font-semibold">Extracted Value</th>
            <th className="p-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entities.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="p-3 font-medium text-slate-800">{item.name}</td>
              <td className="p-3 text-slate-600">{item.category}</td>
              <td className="p-3 text-slate-700">
                {item.value ? `${item.value} ${item.unit || ''}` : item.dosage || 'N/A'}
              </td>
              <td className="p-3">
                <AbnormalFlagBadge status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}