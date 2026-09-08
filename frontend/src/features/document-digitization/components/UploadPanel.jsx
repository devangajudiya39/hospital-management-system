// frontend/src/features/document-digitization/components/UploadPanel.jsx
import React, { useState } from "react";
import { FaFilePrescription, FaVial, FaUpload, FaSpinner } from "react-icons/fa";

export default function UploadPanel({ onFileUpload, isProcessing, docType: controlledDocType, onDocTypeChange }) {
  const [internalDocType, setInternalDocType] = useState("prescription");
  const docType = controlledDocType !== undefined ? controlledDocType : internalDocType;
  const setDocType = onDocTypeChange || setInternalDocType;

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file && onFileUpload) {
      onFileUpload(file, docType);
      // Reset input value so re-uploading the same file triggers change
      e.target.value = "";
    }
  };

  return (
    <div className="p-6 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl bg-white shadow-sm transition-colors text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setDocType("prescription")}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            docType === "prescription"
              ? "bg-teal-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <FaFilePrescription className="text-sm" />
          <span>Prescription</span>
        </button>

        <button
          type="button"
          onClick={() => setDocType("lab")}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            docType === "lab"
              ? "bg-teal-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <FaVial className="text-sm" />
          <span>Lab Report</span>
        </button>
      </div>

      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto mb-3 text-xl">
        {isProcessing ? <FaSpinner className="animate-spin" /> : <FaUpload />}
      </div>

      <h3 className="text-base font-bold text-slate-800">
        Upload {docType === "lab" ? "Lab Report" : "Prescription"}
      </h3>
      <p className="text-xs text-slate-500 mt-1 mb-4">
        Upload PDF, JPG, or PNG for AI clinical digitization & timeline sync
      </p>

      <label className={`block w-full text-center ${isProcessing ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleChange}
          disabled={isProcessing}
          className="hidden"
        />
        <span className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-sm transition-all hover:scale-[1.02] w-full">
          {isProcessing ? (
            <>
              <FaSpinner className="animate-spin" />
              <span>Analyzing Document...</span>
            </>
          ) : (
            <>
              <FaUpload />
              <span>Choose Document File</span>
            </>
          )}
        </span>
      </label>
    </div>
  );
}