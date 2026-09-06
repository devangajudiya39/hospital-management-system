import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useOcrProcessor } from "../hooks/useOcrProcessor";
import UploadPanel from "../components/UploadPanel";
import EntityExtractionTable from "../components/EntityExtractionTable";
import OcrResultViewer from "../components/OcrResultViewer";

export default function DocumentDigitizationPage() {
  const { isProcessing, rawTextLines, extractedEntities, error, processFile } = useOcrProcessor();
  const [activeDocument, setActiveDocument] = useState(null);

  const handleFileUpload = (file) => {
    setActiveDocument(file);
    processFile(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Emergency Bar (Matches Site Theme) */}
      <div className="bg-teal-700 text-white text-xs py-2 px-8 flex justify-between items-center">
        <div>📞 24/7 Emergency: +91 98765 43210</div>
        <div>🕒 OPD Hours: Mon–Sat, 8AM – 8PM</div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold text-xl">
            🏥
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 leading-none">MultiSpecialist</h1>
            <span className="text-xs text-teal-600 font-semibold tracking-wide">HOSPITAL</span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-teal-600">Home</Link>
          <Link to="/" className="hover:text-teal-600">About</Link>
          <Link to="/" className="hover:text-teal-600">Services</Link>
          <Link to="/" className="hover:text-teal-600">Doctors</Link>
          <Link to="/login" className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold transition">
            Login
          </Link>
        </div>
      </nav>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <header className="border-b pb-4">
          <span className="text-xs font-semibold tracking-wider text-teal-600 uppercase">
            Module B • Prescriptions, Lab Reports, Entity Extraction & Timeline
          </span>
          <h1 className="text-3xl font-bold text-slate-800">Document Digitization & OCR</h1>
        </header>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Control Panel */}
          <div className="space-y-6">
            <UploadPanel onFileUpload={handleFileUpload} isProcessing={isProcessing} />
            <div className="p-4 border rounded-lg bg-white text-xs text-slate-400 shadow-sm">
              Timeline module pending implementation.
            </div>
          </div>

          {/* Right Output Panel */}
          <div className="lg:col-span-2 space-y-6">
            <EntityExtractionTable entities={extractedEntities} isProcessing={isProcessing} />
            <OcrResultViewer rawLines={rawTextLines} />
          </div>
        </div>
      </main>
    </div>
  );
}