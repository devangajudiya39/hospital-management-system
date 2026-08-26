import { useState } from "react";
import { extractTextFromPDF, processLabReport } from "../services/ocrService";

export function useOcrProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawTextLines, setRawTextLines] = useState([]);
  const [extractedEntities, setExtractedEntities] = useState([]);
  const [error, setError] = useState(null);

  const processFile = async (file) => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Extract raw text lines from PDF
      const lines = await extractTextFromPDF(file);
      setRawTextLines(lines);

      // 2. Parse entities, evaluate ranges, and fetch LOINC metadata
      const entities = await processLabReport(lines);
      setExtractedEntities(entities);
    } catch (err) {
      console.error("OCR Processor Error:", err);
      setError(err.message || "Failed to parse document.");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    rawTextLines,
    extractedEntities,
    error,
    processFile,
  };
}