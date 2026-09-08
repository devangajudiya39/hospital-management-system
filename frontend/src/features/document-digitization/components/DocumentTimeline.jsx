import React from "react";
import { FaCheckCircle, FaSpinner, FaExclamationCircle } from "react-icons/fa";

export default function DocumentTimeline({ activeDoc, devangStatus, history = [] }) {
  return (
    <div className="border border-slate-200 rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="font-bold text-slate-800 text-sm mb-3">Document Processing History</h3>
      
      {devangStatus?.loading && (
        <div className="mb-3 p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-center gap-2 animate-pulse">
          <FaSpinner className="animate-spin text-teal-600" />
          <span>{devangStatus.step || "Processing..."}</span>
        </div>
      )}

      {devangStatus?.error && (
        <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <FaExclamationCircle className="text-rose-600 shrink-0" />
          <span>{devangStatus.error}</span>
        </div>
      )}

      {devangStatus?.success && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <FaCheckCircle className="text-emerald-600 shrink-0" />
          <span>Document digitized & attached to patient summary.</span>
        </div>
      )}

      {history && history.length > 0 ? (
        <ul className="space-y-2 text-xs text-slate-600 divide-y divide-slate-100">
          {history.map((item, idx) => (
            <li key={item.id || idx} className="pt-2 flex items-start justify-between gap-2">
              <div>
                <span className="font-bold text-slate-700 block truncate max-w-[150px]">{item.name}</span>
                <span className="text-[11px] text-slate-400 capitalize">{item.type} • {item.date}</span>
              </div>
              <span className="shrink-0 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                {item.status || "Synced"}
              </span>
            </li>
          ))}
        </ul>
      ) : activeDoc ? (
        <ul className="space-y-2 text-xs text-slate-600">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            <span>Uploaded: <strong className="text-slate-800">{activeDoc.name}</strong></span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Size: {(activeDoc.size / 1024).toFixed(1)} KB</span>
          </li>
        </ul>
      ) : (
        <p className="text-xs text-slate-400">No active document processing history.</p>
      )}
    </div>
  );
}