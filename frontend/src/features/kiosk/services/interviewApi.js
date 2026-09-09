const BASE_URL = import.meta.env.VITE_INTERVIEW_API_BASE_URL || 'https://vps-nisarg-10gb-bjyqw.aiccloud.online';

/**
 * Starts a new interview session.
 */
export async function startInterview(language = 'en', assessmentType = 'modern', initialComplaint = '', inputMode = 'touch') {
  const payload = {
    input_mode: inputMode || 'touch',
    language: language || 'en',
    assessment_type: assessmentType || 'modern',
    ayush_assessments: assessmentType === 'ayush' ? ['dashavidha_pariksha'] : [],
    patient_id: null,
    patient_message: initialComplaint || ""
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

  const startTime = performance.now();
  console.log('[VOICE] /interview request payload:', JSON.stringify(payload));
  console.log('[VOICE] /interview session_id:', sessionId);
  console.log('[VOICE] /interview patient_message:', patientMessage);
  console.log('[VOICE] /interview input_mode:', inputMode);
  console.log('[VOICE] /interview language:', language);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${BASE_URL}/interview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const duration = (performance.now() - startTime).toFixed(1);
    console.log(`[VOICE] /interview response received in ${duration}ms, status: ${response.status}`);

    if (!response.ok) {
      console.error('[VOICE] /interview non-ok status:', response.status, response.statusText);
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

    const responseData = await response.json();
    console.log('[VOICE] /interview response body:', JSON.stringify(responseData));
    console.log('[VOICE] /interview next_question:', responseData.next_question ? JSON.stringify(responseData.next_question) : 'null');
    console.log('[VOICE] /interview interview_complete:', responseData.interview_complete);
    console.log('[VOICE] /interview red_flag_detected:', responseData.red_flag_detected);
    return responseData;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Interview request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Transcribes audio.
 */
export async function transcribeAudio(audioBlob, language, extension = 'wav') {
  const formData = new FormData();
  const filename = `recording.${extension || 'wav'}`;
  formData.append('audio', audioBlob, filename);

  const url = new URL(`${BASE_URL}/transcribe`);
  if (language) {
    url.searchParams.append('language', language);
  }

  const startTime = performance.now();
  console.log(`[VOICE] /transcribe request started: language=${language}, extension=${extension}, blobType=${audioBlob?.type}, blobSize=${audioBlob?.size}, filename=${filename}, url=${url.toString()}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    const duration = (performance.now() - startTime).toFixed(1);
    console.log(`[VOICE] /transcribe response received in ${duration}ms, status: ${response.status}`);
    if (!response.ok) {
      console.error('[VOICE] /transcribe non-ok status:', response.status, response.statusText);
      let errMsg = response.statusText;
      try {
        const errData = await response.json();
        if (errData && (errData.detail || errData.message || errData.error)) {
          if (Array.isArray(errData.detail)) {
            errMsg = errData.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
          } else {
            errMsg = errData.detail || errData.message || errData.error;
          }
        }
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(`Failed to transcribe audio: ${errMsg}`);
    }

    const transcribeResult = await response.json();
    console.log('[VOICE] /transcribe response body:', JSON.stringify(transcribeResult));
    console.log('[VOICE] /transcribe success:', transcribeResult.success);
    console.log('[VOICE] /transcribe transcript:', transcribeResult.transcript);
    return transcribeResult;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Transcription request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
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
