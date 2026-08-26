import React from 'react';
import { useOcrProcessor } from '../hooks/useOcrProcessor';
import { UploadPanel } from '../components/UploadPanel';
import { EntityExtractionTable } from '../components/EntityExtractionTable';
import { DocumentTimeline } from '../components/DocumentTimeline';
import { MODULE_CONFIG } from '../constants/moduleConfig';

export default function DocumentDigitizationPage() {
  const { loading, documents, selectedDoc, setSelectedDoc, processFile } = useOcrProcessor();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-teal-800 text-white p-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <span className="text-xs font-semibold bg-teal-700 px-2.5 py-1 rounded-full text-teal-200">
            {MODULE_CONFIG.subtitle}
          </span>
          <h1 className="text-2xl font-bold mt-2">{MODULE_CONFIG.title}</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <UploadPanel onUpload={processFile} isLoading={loading} />
          <DocumentTimeline documents={documents} selectedDocId={selectedDoc?.id} onSelect={setSelectedDoc} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedDoc ? (
            <>
              <div className="bg-white p-6 rounded-xl border border-teal-100 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-4">Extracted Entities: {selectedDoc.fileName}</h3>
                <EntityExtractionTable entities={selectedDoc.entities} />
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-semibold text-slate-500 mb-2">Raw OCR Text Output</h4>
                <pre className="bg-slate-900 text-teal-300 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                  {selectedDoc.rawText}
                </pre>
              </div>
            </>
          ) : (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-400">
              Upload a prescription or select a report from the timeline to view OCR and extracted entities.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}