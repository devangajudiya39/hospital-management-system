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

module.exports = { generateSummary };