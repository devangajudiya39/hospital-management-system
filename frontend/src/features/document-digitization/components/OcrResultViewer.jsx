import React from "react";

export default function OcrResultViewer({ rawLines = [] }) {
  return (
    <div className="border rounded-lg bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-700 mb-2">Raw OCR Text Output</h3>
      <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-xs max-h-48 overflow-y-auto">
        {rawLines.length === 0 ? (
          <span className="text-slate-500">No raw text extracted yet.</span>
        ) : (
          rawLines.map((line, idx) => <div key={idx}>{line}</div>)
        )}
      </div>
    </div>
  );
}