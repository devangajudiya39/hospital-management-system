const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  chiefComplaint: String,
  hpi: String,
  pastHistory: String,
  drugHistory: String,
  familyHistory: String,
  personalHistory: String,
  ros: [String],
  investigations: [{ name: String, value: String, flag: String }], // flag: 'normal'|'abnormal' — hook for Devang's Task 5 later
  documentTimeline: [{ date: Date, event: String }], // filled in Task 3
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'accepted', 'amended', 'rejected'],
    default: 'draft'
  },
  languageOutputs: {
    en: String,
    hi: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Summary', summarySchema);