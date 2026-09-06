const { normalizePrescription } = require('./summaryModule/adapters/documentAdapter');
const devangResponse = require('./prescription-sample.json'); // paste his JSON response into this file

const result = normalizePrescription(devangResponse);
console.log(JSON.stringify(result, null, 2));