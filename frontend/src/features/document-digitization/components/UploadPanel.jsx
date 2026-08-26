import React from 'react';

export function UploadPanel({ onUpload, isLoading }) {
  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-teal-100 shadow-sm">
      <h3 className="font-semibold text-slate-800 mb-1">Upload Medical Document</h3>
      <p className="text-xs text-slate-500 mb-4">Upload handwritten/printed prescriptions or lab reports.</p>
      
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/20 p-6 rounded-xl cursor-pointer">
        <span className="text-sm font-medium text-teal-700">
          {isLoading ? "Running OCR Extraction..." : "Choose File or Drop Here"}
        </span>
        <input type="file" className="hidden" onChange={handleChange} disabled={isLoading} accept="image/*,.pdf" />
      </label>
    </div>
  );
}