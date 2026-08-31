const mockInterview = require('./mocks/mockInterviewData');

async function generateSummary(interviewData = mockInterview) {
  const prompt = `
You are a clinical summarizer. Given this structured patient interview,
produce a concise physician-facing summary in the following fixed format:
Chief Complaint, HPI, Past History, Drug History, Family History, Personal History, ROS.

Interview data:
${JSON.stringify(interviewData, null, 2)}

Respond ONLY as JSON matching: {"chiefComplaint":"","hpi":"","pastHistory":"","drugHistory":"","familyHistory":"","personalHistory":"","ros":[]}
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
    throw new Error(data.error?.message || 'Gemini API request failed');
  }

  const text = data.candidates[0].content.parts[0].text;
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

module.exports = { generateSummary };