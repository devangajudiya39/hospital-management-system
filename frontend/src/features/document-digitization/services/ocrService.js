import { evaluateLabResult } from "../utils/referenceRanges";
import { lookupLoincCode } from "./loincService";

async function getPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
  return pdfjsLib;
}

export async function extractTextFromPDF(file) {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const extractedLines = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageLines = textContent.items
      .map((item) => item.str.trim())
      .filter((line) => line.length > 0);

    extractedLines.push(...pageLines);
  }

  return extractedLines;
}

export async function processLabReport(lines) {
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line contains a standalone number (potential test result value)
    const numMatch = line.match(/^([0-9]+\.?[0-9]*)$/);
    if (numMatch) {
      const numericValue = parseFloat(numMatch[1]);

      // Look backward for test name in previous lines
      for (let j = Math.max(0, i - 4); j < i; j++) {
        let rawLine = lines[j].replace(/[:]/g, "").trim();

        // 1. Clean out method descriptions & trailing text noise
        const cleanName = rawLine
          .replace(/^Method\b.*$/i, "")
          .replace(/c-Cholesterol.*/i, "Cholesterol")
          .replace(/Diazo Colorimetric.*/i, "")
          .replace(/IFCC with.*/i, "")
          .replace(/BCG Colorimetric.*/i, "")
          .replace(/Kinetic Alkaline.*/i, "")
          .trim();

        if (!cleanName) continue;

        // 2. Evaluate cleaned test name
        const evaluation = evaluateLabResult(cleanName, numericValue);

        if (evaluation.status !== "UNCHECKED") {
          let loincDetails = null;
          if (evaluation.loincCode && evaluation.loincCode !== "N/A") {
            loincDetails = await lookupLoincCode(evaluation.loincCode);
          }

          const displayName = evaluation.displayName || cleanName;

          // Avoid duplicate entries
          if (!results.some((r) => r.rawTestName === displayName)) {
            results.push({
              rawTestName: displayName,
              value: numericValue,
              unit: evaluation.unit || "",
              status: evaluation.status,
              isAbnormal: evaluation.isAbnormal,
              loincCode: evaluation.loincCode,
              referenceRange: evaluation.range
                ? `${evaluation.range.min} - ${evaluation.range.max}`
                : "N/A",
              fhirMetadata: loincDetails,
            });
          }
          break;
        }
      }
    }
  }

  return results;
}