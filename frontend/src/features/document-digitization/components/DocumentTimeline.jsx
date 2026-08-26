import React from 'react';

export function DocumentTimeline({ documents, selectedDocId, onSelect }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-teal-100 shadow-sm">
      <h3 className="font-semibold text-slate-800 mb-3">Chronological Timeline</h3>
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => onSelect(doc)}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedDocId === doc.id ? 'bg-teal-50 border-teal-500' : 'border-slate-200 hover:border-teal-300'
            }`}
          >
            <p className="text-sm font-semibold text-slate-800">{doc.fileName}</p>
            <p className="text-xs text-teal-600">{doc.date}</p>
          </div>
        ))}
        {documents.length === 0 && <p className="text-xs text-slate-400">No documents processed yet.</p>}
      </div>
    </div>
  );
}