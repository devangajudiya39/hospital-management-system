const BASE_URL = import.meta.env.VITE_INTERVIEW_API_BASE_URL || 'https://vps-nisarg-10gb-bjyqw.aiccloud.online';

/**
 * Starts a new interview session.
 */
export async function startInterview(language = 'en', assessmentType = 'modern') {
  const payload = {
    input_mode: 'touch',
    language: language || 'en',
    assessment_type: assessmentType || 'modern',
    ayush_assessments: assessmentType === 'ayush' ? ['dashavidha_pariksha'] : [],
    patient_id: null,
    patient_message: ""
  };

  const response = await fetch(`${BASE_URL}/interview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errMsg = response.statusText;
    try {
      const errData = await response.json();
      if (errData && (errData.message || errData.error || errData.detail)) {
        errMsg = errData.message || errData.error || errData.detail;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(`Failed to start consultation: ${errMsg}`);
  }

  return response.json();
}

/**
 * Submits an answer to the interview API.
 */
export async function submitInterviewAnswer(
  sessionId,
  language = 'en',
  assessmentType = 'modern',
  patientMessage,
  inputMode = 'touch',
  ayushAssessments = []
) {
  const payload = {
    session_id: sessionId,
    patient_id: null,
    input_mode: inputMode || 'touch',
    patient_message: patientMessage,
    language: language || 'en',
    assessment_type: assessmentType || 'modern',
    ayush_assessments: ayushAssessments || []
  };

  const response = await fetch(`${BASE_URL}/interview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errMsg = response.statusText;
    try {
      const errData = await response.json();
      if (errData && (errData.message || errData.error || errData.detail)) {
        errMsg = errData.message || errData.error || errData.detail;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(`Failed to submit response: ${errMsg}`);
  }

  return response.json();
}

/**
 * Transcribes audio.
 */
export async function transcribeAudio(audioBlob, language) {
  const formData = new FormData();
  formData.append('audio', audioBlob);

  const url = new URL(`${BASE_URL}/transcribe`);
  if (language) {
    url.searchParams.append('language', language);
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Failed to transcribe audio: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Health check.
 */
export async function checkHealth() {
  const response = await fetch(`${BASE_URL}/health`);
  if (!response.ok) {
    throw new Error('API is not healthy');
  }
  return response.json();
}
