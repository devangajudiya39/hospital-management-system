const express = require('express');
const router = express.Router();
const { generateSummary } = require('./summary.service');
const Summary = require('./summary.model');

router.post('/generate', async (req, res) => {
  try {
    const structured = await generateSummary(req.body.interviewData); // falls back to mock if omitted
    const doc = await Summary.create({ ...structured, patientId: req.body.patientId || 'mock-patient-001' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body; // accepted | amended | rejected
  const doc = await Summary.findByIdAndUpdate(req.params.id, { status, updatedAt: Date.now() }, { new: true });
  res.json(doc);
});

module.exports = router;