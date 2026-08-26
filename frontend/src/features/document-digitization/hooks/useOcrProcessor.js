import { useState } from 'react';
import { processDocumentOCR } from '../services/ocrService';

export function useOcrProcessor() {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const processFile = async (file) => {
    setLoading(true);
    try {
      const result = await processDocumentOCR(file);
      setDocuments((prev) => [result, ...prev]);
      setSelectedDoc(result);
    } catch (err) {
      console.error("OCR Processing failed", err);
    } finally {
      setLoading(false);
    }
  };

  return { loading, documents, selectedDoc, setSelectedDoc, processFile };
}