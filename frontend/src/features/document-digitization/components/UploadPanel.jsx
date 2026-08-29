// frontend/src/features/document-digitization/components/UploadPanel.jsx
import React from "react";

export default function UploadPanel({ onFileUpload, isProcessing }) {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  };

  return (
    <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-white text-center hover:border-teal-500 transition-colors">
      <h3 className="text-lg font-semibold text-slate-700">Upload Lab Report / Document</h3>
      <p className="text-xs text-slate-500 mt-1 mb-4">Upload a PDF to extract clinical entities & LOINC data</p>
      
      <input
        type="file"
        accept="application/pdf"
        onChange={handleChange}
        disabled={isProcessing}
        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer disabled:opacity-50"
      />
    </div>
  );
}