import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';

export default function RetryNote({ note }) {
  if (!note) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex items-start gap-3 my-4 shadow-sm animate-fade-in" role="alert">
      <FaInfoCircle className="text-amber-600 text-lg mt-0.5 flex-shrink-0" />
      <div className="text-sm font-semibold leading-relaxed">
        {note}
      </div>
    </div>
  );
}
