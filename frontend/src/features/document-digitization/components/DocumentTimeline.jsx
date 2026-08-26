import React from "react";

export default function DocumentTimeline({ activeDoc }) {
  return (
    <div className="border rounded-lg bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-700 mb-3">Document Processing History</h3>
      {activeDoc ? (
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            <span>Uploaded: <strong>{activeDoc.name}</strong></span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Status: Extracted & Parsed</span>
          </li>
        </ul>
      ) : (
        <p className="text-xs text-slate-400">No active document processing history.</p>
      )}
    </div>
  );
}