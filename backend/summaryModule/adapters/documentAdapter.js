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
  if (!analyzeResponse || !Array.isArray(analyzeResponse.tests)) return [];

  const realTests = analyzeResponse.tests.filter(t => t.range_source === 'report_flag');

  return realTests.map(test => ({
    // No structured date field in Devang's lab response yet — using processing
    // date as a placeholder. Revisit once/if he adds a report date field.
    date: new Date(),
    event: `${test.test_name}: ${test.value}${test.unit ? ' ' + test.unit : ''} (${test.status})`,
    sourceDocument: 'Lab Report (OCR)',
    type: 'lab'
  }));
}

// Separately extracts investigations for the Summary schema's dedicated
// `investigations` field (name/value/flag) — kept apart from documentTimeline
// since investigations has its own structured slot in summary.model.js.
function extractInvestigations(analyzeResponse) {
  if (!analyzeResponse || !Array.isArray(analyzeResponse.tests)) return [];

  return analyzeResponse.tests
    .filter(t => t.range_source === 'report_flag')
    .map(t => ({
      name: t.test_name,
      value: `${t.value}${t.unit ? ' ' + t.unit : ''}`,
      flag: t.status // actual values are 'normal'/'high'/'low', not just 'normal'/'abnormal'
    }));
}

function buildInvestigations(analyzedDocuments = []) {
  return analyzedDocuments.flatMap(({ type, data }) => {
    if (type === 'lab') return extractInvestigations(data);
    return [];
  });
}

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

module.exports = { normalizePrescription, normalizeLabReport, normalizeGeneralDocument, buildDocumentTimeline, extractInvestigations, buildInvestigations };