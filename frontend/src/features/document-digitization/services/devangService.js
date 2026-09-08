// frontend/src/features/document-digitization/services/devangService.js
// Devang's Document Analysis Microservice integration

const DEVANG_BASE_URL = 'http://15.206.164.15:8000';

/**
 * Sends a prescription or lab report file to Devang's microservice for OCR and clinical extraction.
 * @param {File} file - The uploaded prescription or lab report (PDF or image).
 * @param {'prescription' | 'lab'} type - Document category.
 * @returns {Promise<any>} Raw Devang API response object.
 */
export async function analyzeDocumentWithDevang(file, type = 'prescription') {
  const formData = new FormData();
  // Devang OpenAPI specification specifies multipart field name "file"
  formData.append('file', file);

  const endpoint = type === 'lab'
    ? `${DEVANG_BASE_URL}/analyze-lab-report`
    : `${DEVANG_BASE_URL}/analyze`;

  console.log(`[DEVANG] Submitting ${type} document (${file.name}, ${(file.size / 1024).toFixed(1)} KB) to ${endpoint}...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error(`[DEVANG] API Error (${response.status}):`, errorText);
    throw new Error(`Devang Analysis Service returned status ${response.status}: ${errorText}`);
  }

  // Schema is open ({}) — keep and log the raw response without schema assumptions
  const rawResponse = await response.json();
  console.log('[DEVANG RAW RESPONSE]:', rawResponse);
  return rawResponse;
}
