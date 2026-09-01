const mockInterview = require('./mocks/mockInterviewData');

async function generateSummary(incomingInterviewData, incomingTimeline) {
  // Fallback gracefully to mocks if other modules haven't sent data yet
  const interviewData = incomingInterviewData || mockInterview;
  const documentTimeline = Array.isArray(incomingTimeline) ? incomingTimeline : [];

  const prompt = `
You are an expert clinical summarizer for a hospital kiosk system. 
Synthesize the following structured patient interview data and historical document timeline into a clinical summary.

Patient Interview Data:
${JSON.stringify(interviewData, null, 2)}

Digitized Document Timeline (from Module B - OCR/Extraction):
${JSON.stringify(documentTimeline, null, 2)}

Respond ONLY as a valid JSON object matching this exact structure:
{
  "chiefComplaint": "string",
  "hpi": "string",
  "pastHistory": "string",
  "drugHistory": "string",
  "familyHistory": "string",
  "personalHistory": "string",
  "ros": ["string"],
  "investigations": [{"name": "string", "value": "string", "flag": "string"}],
  "languageOutputs": {
    "en": "English clinical summary paragraph combining chief complaint and HPI.",
    "hi": "Hindi translation of the clinical summary."
  }
}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Gemini API summarization failed');
  }

  const text = data.candidates[0].content.parts[0].text;
  let parsed;
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (parseErr) {
    throw new Error('Failed to parse LLM structured output format.');
  }

  // Merge and normalize Devang's document timeline securely
  const normalizedTimeline = documentTimeline.length > 0 
    ? documentTimeline.map(item => ({
        date: item.date ? new Date(item.date) : new Date(),
        event: item.event || item.title || 'Digitized Document Record',
        sourceDocument: item.sourceDocument || item.documentType || 'Kiosk Upload'
      }))
    : [{ date: new Date(), event: 'Initial kiosk intake synchronized', sourceDocument: 'System Default' }];

  return {
    ...parsed,
    documentTimeline: normalizedTimeline
  };
}
async function translateTextViaIndicTrans2(englishText, targetLang = 'hi') {
  if (targetLang === 'en') return englishText;

  const translationEndpoint = process.env.INDICTRANS_LOCAL_ENDPOINT || 'http://localhost:5001/translate';

  try {
    const response = await fetch(translationEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: englishText,
        src_lang: 'eng_Latn',
        tgt_lang: 'hin_Deva'
      })
    });
    
    const result = await response.json();
    if (response.ok && (result.translatedText || result.translation)) {
      return result.translatedText || result.translation;
    }
  } catch (err) {
    console.warn("Local IndicTrans2 container offline, using fallback:", err.message);
  }

  return `[IndicTrans2 Pipeline - hi]: ${englishText}`;
}

async function generateSummary(incomingInterviewData, incomingTimeline) {
  const interviewData = incomingInterviewData || mockInterview;
  const documentTimeline = Array.isArray(incomingTimeline) ? incomingTimeline : [];

  const prompt = `
You are an expert clinical summarizer for a hospital kiosk system. 
Synthesize the following structured patient interview data and historical document timeline into a clinical summary.

Patient Interview Data:
${JSON.stringify(interviewData, null, 2)}

Digitized Document Timeline:
${JSON.stringify(documentTimeline, null, 2)}

Respond ONLY as a valid JSON object matching this exact structure:
{
  "chiefComplaint": "string",
  "hpi": "string",
  "pastHistory": "string",
  "drugHistory": "string",
  "familyHistory": "string",
  "personalHistory": "string",
  "ros": ["string"],
  "investigations": [{"name": "string", "value": "string", "flag": "string"}],
  "languageOutputs": {
    "en": "English clinical summary paragraph combining chief complaint and HPI.",
    "hi": ""
  }
}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gemini API summarization failed');
  }

  const text = data.candidates[0].content.parts[0].text;
  let parsed;
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (parseErr) {
    throw new Error('Failed to parse LLM structured output format.');
  }

  // Combine edited/generated fields into English narrative and translate dynamically
  const englishNarrative = parsed.languageOutputs?.en || `Chief Complaint: ${parsed.chiefComplaint}. HPI: ${parsed.hpi}`;
  const hindiTranslation = await translateTextViaIndicTrans2(englishNarrative, 'hi');

  parsed.languageOutputs = {
    en: englishNarrative,
    hi: hindiTranslation
  };

  const normalizedTimeline = documentTimeline.length > 0 
    ? documentTimeline.map(item => ({
        date: item.date ? new Date(item.date) : new Date(),
        event: item.event || item.title || 'Digitized Document Record',
        sourceDocument: item.sourceDocument || item.documentType || 'Kiosk Upload'
      }))
    : [{ date: new Date(), event: 'Initial kiosk intake synchronized', sourceDocument: 'System Default' }];

  return {
    ...parsed,
    documentTimeline: normalizedTimeline
  };
}

// NEW: Helper function to re-translate when user saves edits/amendments from form fields
async function updateSummaryTranslation(updatedFields) {
  const englishNarrative = `Chief Complaint: ${updatedFields.chiefComplaint || ''}. HPI: ${updatedFields.hpi || ''}. Past History: ${updatedFields.pastHistory || ''}. Drug History: ${updatedFields.drugHistory || ''}. Family History: ${updatedFields.familyHistory || ''}. Personal History: ${updatedFields.personalHistory || ''}`;
  const hindiTranslation = await translateTextViaIndicTrans2(englishNarrative, 'hi');
  
  return {
    en: englishNarrative,
    hi: hindiTranslation
  };
}

module.exports = { generateSummary, updateSummaryTranslation };
