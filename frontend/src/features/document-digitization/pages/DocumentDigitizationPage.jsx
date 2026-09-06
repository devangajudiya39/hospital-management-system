import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useOcrProcessor } from "../hooks/useOcrProcessor";
import UploadPanel from "../components/UploadPanel";
import EntityExtractionTable from "../components/EntityExtractionTable";
import OcrResultViewer from "../components/OcrResultViewer";
import UploadDocumentNavbar from "../components/UploadDocumentNavbar";
export default function DocumentDigitizationPage() {
  const { isProcessing, rawTextLines, extractedEntities, error, processFile } = useOcrProcessor();
  const [processedFileName, setProcessedFileName] = useState(null);

  const handleFileUpload = (file) => {
    setProcessedFileName(file.name);
    processFile(file);
  };

  const hasResults = !isProcessing && (rawTextLines.length > 0 || extractedEntities.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      <UploadDocumentNavbar
        topBarTag="Document Digitization & OCR"
        rightAction={
          <Link to="/patient-dashboard" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-600">
            <span className="hidden sm:inline">← Patient Dashboard</span>
            <span className="block sm:hidden">← Back</span>
          </Link>
        }
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <header className="border-b pb-4">
          <span className="text-xs font-semibold tracking-wider text-teal-600 uppercase">
            Module B · Lab Reports, Prescriptions &amp; Entity Extraction
          </span>
          <h1 className="text-3xl font-bold text-slate-800">Document Digitization &amp; OCR</h1>
        </header>

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start gap-3">
            <span className="text-lg flex-shrink-0">❌</span>
            <div>
              <p className="font-bold text-sm">Processing Failed</p>
              <p className="text-xs mt-0.5">{error}</p>
              <p className="text-xs text-red-500 mt-1">Note: Camera-captured images are not yet supported for OCR text extraction. Please upload a PDF lab report for full analysis.</p>
            </div>
          </div>
        )}

        {/* Success banner */}
        {hasResults && !error && processedFileName && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
            <span className="text-lg flex-shrink-0">✅</span>
            <div>
              <p className="font-bold text-sm text-emerald-800">Document Processed Successfully</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {extractedEntities.length} clinical entities extracted from <strong>{processedFileName}</strong>
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Upload / Scan Panel */}
          <div className="space-y-4">
            <UploadPanel onFileUpload={handleFileUpload} isProcessing={isProcessing} />

            {/* Instructions card */}
            <div className="p-4 border rounded-xl bg-white text-xs text-slate-500 shadow-sm space-y-2 leading-relaxed">
              <p className="font-bold text-slate-700 text-sm">How it works</p>
              <p>📄 <strong>Gallery:</strong> Upload a PDF or photo of a lab report.</p>
              <p>📷 <strong>Camera:</strong> Capture a document directly using your device camera.</p>
              <p>🔍 Press <strong>Analyse Document</strong> to extract clinical entities and LOINC codes.</p>
              <p className="text-slate-400">Best results with clear, high-contrast PDF lab reports.</p>
            </div>
          </div>

          {/* Right: Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            <EntityExtractionTable entities={extractedEntities} isProcessing={isProcessing} />
            <OcrResultViewer rawLines={rawTextLines} />
          </div>
        </div>
      </main>
    </div>
  );
}