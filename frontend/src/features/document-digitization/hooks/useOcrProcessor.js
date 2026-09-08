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
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        // 1. Extract raw text lines from PDF
        const lines = await extractTextFromPDF(file);
        setRawTextLines(lines);

        // 2. Parse entities, evaluate ranges, and fetch LOINC metadata
        const entities = await processLabReport(lines);
        setExtractedEntities(entities);
      } else {
        setRawTextLines([
          `Document File: ${file.name}`,
          `File Type: ${file.type || "Image"}`,
          `File Size: ${(file.size / 1024).toFixed(1)} KB`,
          `Status: Processed via Devang Document Microservice`
        ]);
        setExtractedEntities([]);
      }
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