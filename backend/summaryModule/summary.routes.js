const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { generateSummary, updateSummaryTranslation } = require('./summary.service');
const Summary = require('./summary.model');
const { buildDocumentTimeline, buildInvestigations } = require('./adapters/documentAdapter');


// Universal integration endpoint: Accepts payloads from Module A (Nisarg) & Module B (Devang)
router.post('/generate', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database connection not ready. Please try again.' });
    }

    const { patientId, interviewData, documentTimeline, analyzedDocuments } = req.body; // <-- ADD analyzedDocuments here

    // <-- ADD THIS LINE (new, right after the destructure above, before calling generateSummary)
    const finalTimeline = documentTimeline || (analyzedDocuments ? buildDocumentTimeline(analyzedDocuments) : undefined);
    const finalInvestigations = analyzedDocuments ? buildInvestigations(analyzedDocuments) : [];
    // Call service layer with cross-module inputs (will safely fallback to mock data if empty)
    const structuredSummary = await generateSummary(interviewData, finalTimeline); // <-- CHANGED: documentTimeline -> finalTimeline

    // Save linked summary record to MongoDB
    console.log("-> Generating summary and saving to DB...");
    // ★★★ ADD THIS MISSING LINE — fetches the existing document BEFORE the merge logic below uses it
    const targetPatientId = patientId || 'kiosk-patient-default';
    const existingDoc = await Summary.findOne({ patientId: targetPatientId });

    // ★★★ NEW BLOCK — merge new timeline entries onto existing ones instead of
    // letting the upsert below silently overwrite/erase previously attached documents
    let mergedTimeline = structuredSummary.documentTimeline;
    if (existingDoc && existingDoc.documentTimeline && existingDoc.documentTimeline.length > 0) {
      const hadNewDocuments = Boolean(documentTimeline || analyzedDocuments);
      if (hadNewDocuments) {
        const newRealEntries = structuredSummary.documentTimeline.filter(item => {
        if (item.sourceDocument === 'System Default') return false;
        // Skip if an identical entry (same date + event) already exists — prevents
        // re-running /generate with the same document from creating duplicates
        const alreadyExists = existingDoc.documentTimeline.some(
          existing => existing.event === item.event && 
          new Date(existing.date).getTime() === new Date(item.date).getTime()
        );
        return !alreadyExists;
        });
        mergedTimeline = [...existingDoc.documentTimeline, ...newRealEntries];
      } else {
        // This call had no new documents — keep exactly what was already there
        mergedTimeline = existingDoc.documentTimeline;
      }
    }
    // ★★★ NEW BLOCK END

    const doc = await Summary.findOneAndUpdate(
    { patientId: targetPatientId },
    {
      $set: {
        ...structuredSummary,
        documentTimeline: mergedTimeline,
        investigations: finalInvestigations.length > 0 ? finalInvestigations : structuredSummary.investigations,
        patientId: targetPatientId,
        status: 'pending_review',
        updatedAt: Date.now()
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
    console.log("-> SUCCESS! Saved document ID:", doc._id);

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

// Status update state machine endpoint (Accept / Amend / Reject) & text persistence + dynamic re-translation
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

    // Dynamically re-translate updated text fields into Hindi via IndicTrans2 when edits occur
    let languageOutputs = undefined;
    if (
      chiefComplaint !== undefined || 
      hpi !== undefined || 
      pastHistory !== undefined || 
      drugHistory !== undefined || 
      familyHistory !== undefined || 
      personalHistory !== undefined
    ) {
      const englishNarrative = `Chief Complaint: ${chiefComplaint || ''}. HPI: ${hpi || ''}. Past History: ${pastHistory || ''}. Drug History: ${drugHistory || ''}. Family History: ${familyHistory || ''}. Personal History: ${personalHistory || ''}`;
      languageOutputs = { en: englishNarrative, hi: '' }; // stale Hindi cleared; re-translated lazily on next Hindi tab click
    }

    // Build update payload, capturing text edits and newly translated outputs if provided
    const updateFields = {
      status,
      updatedAt: Date.now(),
      ...(chiefComplaint !== undefined && { chiefComplaint }),
      ...(hpi !== undefined && { hpi }),
      ...(pastHistory !== undefined && { pastHistory }),
      ...(drugHistory !== undefined && { drugHistory }),
      ...(familyHistory !== undefined && { familyHistory }),
      ...(personalHistory !== undefined && { personalHistory }),
      ...(languageOutputs !== undefined && { languageOutputs })
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

router.get('/:id/audio', async (req, res) => {
  try {
    const { lang } = req.query;
    const doc = await Summary.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Summary not found' });

    const text = doc.languageOutputs?.[lang] || doc.languageOutputs?.en;
    if (!text) return res.status(400).json({ error: 'No narrative text available' });

    const ttsResponse = await fetch(process.env.TTS_ENDPOINT || 'http://localhost:5001/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: lang === 'hi' ? 'hi' : 'en' })
    });

    if (!ttsResponse.ok) {
      return res.status(502).json({ error: 'TTS service failed' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    const buffer = Buffer.from(await ttsResponse.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// On-demand Hindi translation: only called when user actually views the Hindi tab
router.get('/:id/translate', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database connection not ready.' });
    }

    const { lang } = req.query;
    if (lang !== 'hi') {
      return res.status(400).json({ error: 'Only lang=hi is supported for on-demand translation.' });
    }

    const doc = await Summary.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Summary not found.' });

    // Already translated earlier — return cached value, skip re-translating
    if (doc.languageOutputs?.hi) {
      return res.json({ success: true, hi: doc.languageOutputs.hi });
    }

    const { translateTextViaIndicTrans2 } = require('./summary.service');
    const hindiTranslation = await translateTextViaIndicTrans2(doc.languageOutputs.en, 'hi');

    doc.languageOutputs.hi = hindiTranslation;
    await doc.save();

    res.json({ success: true, hi: hindiTranslation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;