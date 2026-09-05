// Normalizes raw responses from Devang's document-analysis microservices
// (prescription, lab, general document) into the flat {date, event, sourceDocument, type}
// shape that generateSummary() expects for documentTimeline. `type` lets the
// frontend group entries into separate Prescription/Lab/Document sections.

function normalizePrescription(analyzeResponse) {
  if (!analyzeResponse || !Array.isArray(analyzeResponse.timeline)) return [];
  return analyzeResponse.timeline.flatMap(entry =>
    (entry.events || []).map(ev => ({
      date: entry.date,
      event: ev.detail,
      sourceDocument: 'Prescription (OCR)',
      type: 'prescription'
    }))
  );
}

// TODO(Vedanti): implement once Devang's lab-extraction endpoint is live.
// Expected to also populate the Summary model's `investigations` field
// (name/value/flag) separately from documentTimeline — ask Devang if his
// lab response includes a normal/abnormal flag per test.
function normalizeLabReport(analyzeResponse) {
  return [];
}

// TODO(Vedanti): implement once Devang's general document-extraction endpoint is live.
function normalizeGeneralDocument(analyzeResponse) {
  return [];
}

function buildDocumentTimeline(analyzedDocuments = []) {
  return analyzedDocuments.flatMap(({ type, data }) => {
    if (type === 'prescription') return normalizePrescription(data);
    if (type === 'lab') return normalizeLabReport(data);
    if (type === 'document') return normalizeGeneralDocument(data);
    return [];
  });
}

module.exports = { normalizePrescription, normalizeLabReport, normalizeGeneralDocument, buildDocumentTimeline };