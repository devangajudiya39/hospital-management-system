import React from "react";
import AbnormalFlagBadge from "./AbnormalFlagBadge";

export default function EntityExtractionTable({ entities, isProcessing }) {
  if (isProcessing) {
    return (
      <div className="p-8 border rounded-lg bg-white shadow-sm text-center">
        <p className="text-slate-500 font-medium animate-pulse">
          Parsing PDF text & matching LOINC reference metadata...
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-slate-50">
        <h3 className="font-semibold text-slate-700">Extracted Clinical Entities</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-slate-100/50 text-xs text-slate-500 font-semibold uppercase">
              <th className="p-3">Entity / Test</th>
              <th className="p-3">LOINC Code</th>
              <th className="p-3">Value</th>
              <th className="p-3">Reference Range</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm text-slate-700">
            {entities.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-slate-400">
                  No entities extracted yet. Upload a document to view parsed data.
                </td>
              </tr>
            ) : (
              entities.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{item.rawTestName}</td>
                  <td className="p-3 font-mono text-xs text-slate-500">{item.loincCode || "N/A"}</td>
                  <td className="p-3 font-semibold">{item.value} {item.unit}</td>
                  <td className="p-3 text-xs text-slate-500">
                    {/* ✅ Safe fallback: checks if referenceRange is a string or object */}
                    {typeof item.referenceRange === "string"
                      ? item.referenceRange
                      : item.referenceRange?.min !== undefined
                      ? `${item.referenceRange.min} - ${item.referenceRange.max} ${item.unit || ""}`
                      : "N/A"}
                  </td>
                  <td className="p-3">
                    <AbnormalFlagBadge status={item.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}