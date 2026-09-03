const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { generateSummary } = require('./summary.service');
const Summary = require('./summary.model');

// Universal integration endpoint: Accepts payloads from Module A (Nisarg) & Module B (Devang)
router.post('/generate', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database connection not ready. Please try again.' });
    }

    const { patientId, interviewData, documentTimeline } = req.body;

    // Call service layer with cross-module inputs (will safely fallback to mock data if empty)
    const structuredSummary = await generateSummary(interviewData, documentTimeline);

    // Save linked summary record to MongoDB
    const doc = await Summary.create({
      ...structuredSummary,
      patientId: patientId || 'kiosk-patient-default',
      status: 'pending_review'
    });

    res.status(201).json({
      success: true,
      message: 'Summary successfully generated and integrated across modules.',
      data: doc
    });
  } catch (err) {
    console.error('Summary Generation Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Status update state machine endpoint (Accept / Amend / Reject) & text persistence
router.patch('/:id/status', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database connection not ready.' });
    }

    const { status, chiefComplaint, hpi, pastHistory, drugHistory, familyHistory, personalHistory } = req.body;
    const validStatuses = ['draft', 'pending_review', 'accepted', 'amended', 'rejected'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid state machine status provided.' });
    }

    // Build update payload, capturing text edits if provided
    const updateFields = {
      status,
      updatedAt: Date.now(),
      ...(chiefComplaint !== undefined && { chiefComplaint }),
      ...(hpi !== undefined && { hpi }),
      ...(pastHistory !== undefined && { pastHistory }),
      ...(drugHistory !== undefined && { drugHistory }),
      ...(familyHistory !== undefined && { familyHistory }),
      ...(personalHistory !== undefined && { personalHistory })
    };

    const updatedDoc = await Summary.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!updatedDoc) {
      return res.status(404).json({ error: 'Summary document not found.' });
    }

    res.json({ success: true, data: updatedDoc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;