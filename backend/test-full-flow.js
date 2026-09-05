require('dotenv').config();
const { buildDocumentTimeline } = require('./summaryModule/adapters/documentAdapter');
const { generateSummary } = require('./summaryModule/summary.service');
const devangResponse = require('./prescription-sample.json');

(async () => {
  console.log('--- Testing adapter output flowing through generateSummary() ---');
  try {
    const analyzedDocuments = [{ type: 'prescription', data: devangResponse }];
    const timeline = buildDocumentTimeline(analyzedDocuments);
    const result = await generateSummary(null, timeline);
    console.log(JSON.stringify(result.documentTimeline, null, 2));
  } catch (err) {
    console.error('FAILED:', err.message);
  }
})();