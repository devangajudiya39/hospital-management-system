import React from 'react';

export function AbnormalFlagBadge({ status }) {
  if (status === 'HIGH') {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">HIGH FLAG</span>;
  }
  if (status === 'LOW') {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">LOW FLAG</span>;
  }
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">NORMAL</span>;
}