import { useState, useCallback } from 'react';
import { startInterview as apiStartInterview, submitInterviewAnswer as apiSubmitInterviewAnswer, transcribeAudio as apiTranscribeAudio } from '../services/interviewApi';

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

  const resetInterview = useCallback(() => {
    setSessionId(null);
    setCurrentQuestion(null);
    setIsLoading(false);
    setIsTranscribing(false);
    setError(null);
    setLastAction(null);
    setInterviewComplete(false);
    setRedFlagDetected(false);
    setRedFlagSeverity(null);
    setAlertTriggered(false);
    setClinicalSummary(null);
  }, []);

  const handleApiResponse = useCallback((data) => {
    if (data.session_id) {
      setSessionId(data.session_id);
    }
    
    // If next_question is returned (including any retry note), update currentQuestion
    if (data.next_question) {
      setCurrentQuestion(data.next_question);
    } else if (data.interview_complete) {
      setCurrentQuestion(null);
    }
    
    setInterviewComplete(!!data.interview_complete);
    setRedFlagDetected(!!data.red_flag_detected);
    setRedFlagSeverity(data.red_flag_severity || null);
    setAlertTriggered(!!data.alert_triggered);
    setClinicalSummary(data.clinical_summary || null);
  }, []);

  const startInterview = useCallback(async (lang = 'en', type = 'modern') => {
    setIsLoading(true);
    setError(null);
    setSelectedLanguage(lang);
    setAssessmentType(type);
    setLastAction(() => () => startInterview(lang, type));
    
    try {
      const data = await apiStartInterview(lang, type);
      handleApiResponse(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to start interview. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiResponse]);

  const submitAnswer = useCallback(async (answer, inputMode = 'touch') => {
    if (!sessionId || isLoading) return;
    setIsLoading(true);
    setError(null);
    setLastAction(() => () => submitAnswer(answer, inputMode));
    
    try {
      const data = await apiSubmitInterviewAnswer(
        sessionId,
        selectedLanguage,
        assessmentType,
        answer,
        inputMode || 'touch',
        ayushAssessments
      );
      handleApiResponse(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to submit answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, selectedLanguage, assessmentType, ayushAssessments, isLoading, handleApiResponse]);

  const retryLastAction = useCallback(() => {
    if (lastAction) {
      lastAction();
    } else if (!sessionId) {
      startInterview(selectedLanguage, assessmentType);
    }
  }, [lastAction, sessionId, selectedLanguage, assessmentType, startInterview]);

  const submitVoiceAnswer = useCallback(async (audioBlob) => {
    if (!sessionId) return;
    setIsTranscribing(true);
    setError(null);
    
    let transcript = '';
    try {
      const transcribeData = await apiTranscribeAudio(audioBlob, selectedLanguage);
      if (transcribeData.success && transcribeData.transcript) {
        transcript = transcribeData.transcript;
      } else {
        // success is false, or empty transcript -> treated as no speech detected
        setError('We couldn\'t hear your answer. Please try again.');
        setIsTranscribing(false);
        return;
      }
    } catch (err) {
      console.error(err);
      setError('Transcription failed. Please try again.');
      setIsTranscribing(false);
      return;
    }
    
    setIsTranscribing(false);
    
    // Now submit the transcript to /interview
    await submitAnswer(transcript, 'text'); // the backend expects 'text' for transcribed voice, or 'voice' if it's considered voice input mode. The prompt says input_mode: 'voice' does not perform transcription, but if we transcribe it, we can probably send input_mode: 'voice' alongside the transcript. Let's send input_mode: 'voice' just in case the backend tracks it. Wait, prompt says: "input_mode: 'voice' DOES NOT perform transcription. Voice is a two-step process... record audio -> POST /transcribe -> transcript -> POST /interview". It's safe to send inputMode 'voice' with the transcript text.
  }, [sessionId, selectedLanguage, submitAnswer]);

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
    setAyushAssessments
  };
}
