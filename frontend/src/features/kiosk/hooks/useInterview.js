import { useState, useCallback, useRef } from 'react';
import { startInterview as apiStartInterview, submitInterviewAnswer as apiSubmitInterviewAnswer, transcribeAudio as apiTranscribeAudio } from '../services/interviewApi';
import { convertBlobToWav } from '../utils/audioConverter';

export function useInterview() {
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [assessmentType, setAssessmentType] = useState('modern');
  const [ayushAssessments, setAyushAssessments] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);
  
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [redFlagDetected, setRedFlagDetected] = useState(false);
  const [redFlagSeverity, setRedFlagSeverity] = useState(null);
  const [alertTriggered, setAlertTriggered] = useState(false);
  const [clinicalSummary, setClinicalSummary] = useState(null);

  const [lastAction, setLastAction] = useState(null);

  // Refs mirror the corresponding state values so async callbacks always
  // read the current value without stale-closure risk.
  const sessionIdRef = useRef(null);
  const selectedLanguageRef = useRef('en');
  const assessmentTypeRef = useRef('modern');
  const ayushAssessmentsRef = useRef([]);
  const isLoadingRef = useRef(false);
  const isTranscribingRef = useRef(false);

  // Keep refs in sync with state
  const syncSetSessionId = (v) => { sessionIdRef.current = v; setSessionId(v); };
  const syncSetSelectedLanguage = (v) => { selectedLanguageRef.current = v; setSelectedLanguage(v); };
  const syncSetAssessmentType = (v) => { assessmentTypeRef.current = v; setAssessmentType(v); };
  const syncSetAyushAssessments = (v) => { ayushAssessmentsRef.current = v; setAyushAssessments(v); };
  const syncSetIsLoading = (v) => { isLoadingRef.current = v; setIsLoading(v); };
  const syncSetIsTranscribing = (v) => { isTranscribingRef.current = v; setIsTranscribing(v); };

  const resetInterview = useCallback(() => {
    syncSetSessionId(null);
    setCurrentQuestion(null);
    syncSetIsLoading(false);
    syncSetIsTranscribing(false);
    setError(null);
    setLastAction(null);
    setInterviewComplete(false);
    setRedFlagDetected(false);
    setRedFlagSeverity(null);
    setAlertTriggered(false);
    setClinicalSummary(null);
  }, []);

  const handleApiResponse = useCallback((data) => {
    console.log('[VOICE] handleApiResponse called, data:', JSON.stringify(data));
    console.log('[VOICE] next_question:', data.next_question);
    console.log('[VOICE] interview_complete:', data.interview_complete);
    console.log('[VOICE] red_flag_detected:', data.red_flag_detected);
    console.log('[VOICE] alert_triggered:', data.alert_triggered);

    if (data.session_id) {
      syncSetSessionId(data.session_id);
      console.log('[VOICE] session_id updated to:', data.session_id);
    }
    
    // If next_question is returned (including any retry note), update currentQuestion
    if (data.next_question) {
      setCurrentQuestion(data.next_question);
      console.log('[VOICE] currentQuestion updated to:', JSON.stringify(data.next_question));
    } else if (data.interview_complete) {
      setCurrentQuestion(null);
      console.log('[VOICE] Interview marked complete, currentQuestion cleared');
    }
    
    setInterviewComplete(!!data.interview_complete);
    setRedFlagDetected(!!data.red_flag_detected);
    setRedFlagSeverity(data.red_flag_severity || null);
    setAlertTriggered(!!data.alert_triggered);
    setClinicalSummary(data.clinical_summary || null);
  }, []);

  const startInterview = useCallback(async (lang = 'en', type = 'modern') => {
    syncSetIsLoading(true);
    setError(null);
    syncSetSelectedLanguage(lang);
    syncSetAssessmentType(type);
    setLastAction(() => () => startInterview(lang, type));
    
    try {
      const data = await apiStartInterview(lang, type);
      handleApiResponse(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to start interview. Please check your network connection.');
    } finally {
      syncSetIsLoading(false);
    }
  }, [handleApiResponse]);

  // submitAnswer uses refs for guards so it never silently returns due to stale closure
  const submitAnswer = useCallback(async (answer, inputMode = 'touch') => {
    const currentSessionId = sessionIdRef.current;
    const currentIsLoading = isLoadingRef.current;

    console.log('[VOICE] submitAnswer called:', {
      answer,
      inputMode,
      sessionId: currentSessionId,
      isLoading: currentIsLoading,
      language: selectedLanguageRef.current,
      assessmentType: assessmentTypeRef.current,
    });

    if (!currentSessionId) {
      console.error('[VOICE] submitAnswer BLOCKED — sessionId is null/empty');
      return;
    }
    if (currentIsLoading) {
      console.error('[VOICE] submitAnswer BLOCKED — isLoading is true (guard hit)');
      return;
    }

    syncSetIsLoading(true);
    setError(null);
    setLastAction(() => () => submitAnswer(answer, inputMode));
    
    const payload = {
      sessionId: currentSessionId,
      language: selectedLanguageRef.current,
      assessmentType: assessmentTypeRef.current,
      answer,
      inputMode: inputMode || 'touch',
      ayushAssessments: ayushAssessmentsRef.current,
    };
    console.log('[VOICE] Sending /interview request:', JSON.stringify(payload));

    try {
      const data = await apiSubmitInterviewAnswer(
        currentSessionId,
        selectedLanguageRef.current,
        assessmentTypeRef.current,
        answer,
        inputMode || 'touch',
        ayushAssessmentsRef.current
      );
      console.log('[VOICE] /interview response received:', JSON.stringify(data));
      handleApiResponse(data);
      setError(null);
    } catch (err) {
      console.error('[VOICE] /interview request failed:', err);
      setError(err.message || 'Failed to submit answer. Please try again.');
    } finally {
      syncSetIsLoading(false);
      console.log('[VOICE] submitAnswer finished, isLoading reset to false');
    }
  }, [handleApiResponse]);

  const retryLastAction = useCallback(() => {
    if (lastAction) {
      lastAction();
    } else if (!sessionIdRef.current) {
      startInterview(selectedLanguageRef.current, assessmentTypeRef.current);
    }
  }, [lastAction, startInterview]);

  const submitVoiceAnswer = useCallback(async (audioBlob) => {
    const currentSessionId = sessionIdRef.current;
    const currentIsLoading = isLoadingRef.current;
    const currentIsTranscribing = isTranscribingRef.current;

    console.log('[VOICE] submitVoiceAnswer called:', {
      blobSize: audioBlob?.size,
      blobType: audioBlob?.type,
      sessionId: currentSessionId,
      isLoading: currentIsLoading,
      isTranscribing: currentIsTranscribing,
    });

    if (!currentSessionId) {
      console.error('[VOICE] submitVoiceAnswer BLOCKED — sessionId is null');
      return;
    }
    if (currentIsLoading) {
      console.error('[VOICE] submitVoiceAnswer BLOCKED — isLoading is true');
      return;
    }
    if (currentIsTranscribing) {
      console.error('[VOICE] submitVoiceAnswer BLOCKED — isTranscribing is true');
      return;
    }

    syncSetIsTranscribing(true);
    setError(null);
    
    let transcript = '';
    try {
      // useVoiceRecorder already converts to WAV; skip redundant conversion
      let wavBlob = audioBlob;
      if (!audioBlob.type || !audioBlob.type.includes('wav')) {
        console.log('[VOICE] Blob is not WAV, converting:', audioBlob.type);
        wavBlob = await convertBlobToWav(audioBlob);
        console.log('[VOICE] WAV conversion completed, size:', wavBlob.size);
      } else {
        console.log('[VOICE] Blob is already WAV, skipping conversion:', audioBlob.type, 'size:', audioBlob.size);
      }

      const lang = selectedLanguageRef.current;
      console.log('[VOICE] Sending audio to /transcribe, language:', lang, 'WAV size:', wavBlob.size);

      const transcribeData = await apiTranscribeAudio(wavBlob, lang, 'wav');
      console.log('[VOICE] /transcribe response:', JSON.stringify(transcribeData));
      console.log('[VOICE] transcribeData.success:', transcribeData.success);
      console.log('[VOICE] transcribeData.transcript:', transcribeData.transcript);

      if (transcribeData.success && transcribeData.transcript && transcribeData.transcript.trim().length > 0) {
        transcript = transcribeData.transcript.trim();
        console.log('[VOICE] Transcript received:', transcript);
        console.log('[VOICE] Transcript length:', transcript.length);
      } else {
        const msg = transcribeData.message || "We couldn't hear your answer. Please tap and try speaking again.";
        console.warn('[VOICE] Transcription returned empty or failed:', transcribeData);
        setError(msg);
        syncSetIsTranscribing(false);
        return;
      }
    } catch (err) {
      console.error('[VOICE] Transcription error:', err);
      setError(err.message || 'Transcription failed. Please try again or use the touch options.');
      syncSetIsTranscribing(false);
      return;
    }
    
    syncSetIsTranscribing(false);
    console.log('[VOICE] isTranscribing set to false, calling submitAnswer...');
    console.log('[VOICE] Calling submitAnswer() with transcript:', transcript, 'inputMode: voice');
    console.log('[VOICE] sessionId at this point:', sessionIdRef.current);
    console.log('[VOICE] patientMessage (transcript):', transcript);

    // Seamlessly forward the resulting transcript into the existing Task 2 answer submission flow
    await submitAnswer(transcript, 'voice');
    console.log('[VOICE] submitAnswer() completed');
  }, [submitAnswer]);

  return {
    sessionId,
    currentQuestion,
    selectedLanguage,
    assessmentType,
    ayushAssessments,
    isLoading,
    isTranscribing,
    error,
    interviewComplete,
    redFlagDetected,
    redFlagSeverity,
    alertTriggered,
    clinicalSummary,
    startInterview,
    submitAnswer,
    submitVoiceAnswer,
    resetInterview,
    retryLastAction,
    setAyushAssessments: syncSetAyushAssessments,
  };
}
