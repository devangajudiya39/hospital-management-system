require('dotenv').config();
const { generateSummary } = require('./summaryModule/summary.service');

(async () => {
  console.log('--- Testing generateSummary() in isolation (no Express, no Mongo) ---');
  try {
    const result = await generateSummary(null, null); // null = uses mock interview data, no timeline
    console.log('SUCCESS — Gemini call + parsing worked:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('FAILED — this is the exact error breaking /generate:');
    console.error(err.message);
  }
})();