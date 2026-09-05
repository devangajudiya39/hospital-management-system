import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHospital, FaArrowLeft, FaSpinner } from 'react-icons/fa6';
import { useInterview } from '../hooks/useInterview';

import QuestionRenderer from '../components/QuestionRenderer';
import VoiceRecorder from '../components/VoiceRecorder';
import RetryNote from '../components/RetryNote';
import InterviewCompletion from '../components/InterviewCompletion';

export default function KioskInterview() {
  const navigate = useNavigate();
  const {
    currentQuestion,
    isLoading,
    isTranscribing,
    error,
    interviewComplete,
    alertTriggered,
    startInterview,
    submitAnswer,
    submitVoiceAnswer,
    resetInterview
  } = useInterview();

  // The existing KioskHome may pass state, or we default it here.
  // We'll just hardcode 'en' and 'modern' for this Kiosk session start for now,
  // or fetch it from a location state if needed.
  useEffect(() => {
    // Start interview on mount
    startInterview('en', 'modern');
    return () => {
      // Cleanup on unmount or refresh if needed
      resetInterview();
    };
  }, [startInterview, resetInterview]);

  const handleReturnHome = () => {
    resetInterview();
    navigate('/kiosk');
  };

  const handleTextTouchSubmit = (answer) => {
    submitAnswer(answer, 'touch');
  };

  const handleVoiceSubmit = (audioBlob) => {
    submitVoiceAnswer(audioBlob);
  };

  if (interviewComplete || alertTriggered) {
    return (
      <div className="kiosk-page kiosk-interview-page">
        <header className="kiosk-header">
          <div className="kiosk-brand">
            <div className="kiosk-logo"><FaHospital /></div>
            <div className="kiosk-brand-text">
              <h1>MultiSpecialist</h1>
              <span>HOSPITAL</span>
            </div>
          </div>
        </header>
        <main className="kiosk-main">
          <InterviewCompletion 
            alertTriggered={alertTriggered} 
            onReset={resetInterview} 
          />
        </main>
      </div>
    );
  }

  return (
    <div className="kiosk-page kiosk-interview-page">
      <header className="kiosk-header">
        <div className="kiosk-brand">
          <div className="kiosk-logo"><FaHospital /></div>
          <div className="kiosk-brand-text">
            <h1>MultiSpecialist</h1>
            <span>HOSPITAL</span>
          </div>
        </div>
        <div className="kiosk-header-right">
          <button className="kiosk-language-button" onClick={handleReturnHome}>
            <FaArrowLeft />
            <span>Cancel</span>
          </button>
        </div>
      </header>

      <main className="kiosk-main">
        <div className="kiosk-content kiosk-interview-content">
          
          {error && <div className="kiosk-error-banner">{error}</div>}
          
          {currentQuestion && (
            <div className="kiosk-section-indicator">
              Section: {currentQuestion.section.toUpperCase().replace('_', ' ')}
            </div>
          )}

          <div className="kiosk-question-container">
            {isLoading && !currentQuestion && (
              <div className="kiosk-loading">
                <FaSpinner className="kiosk-spinner" />
                <p>Loading...</p>
              </div>
            )}
            
            {currentQuestion && (
              <>
                <h2 className="kiosk-question-text">{currentQuestion.question}</h2>
                <RetryNote note={currentQuestion.note} />
                
                <div className="kiosk-input-area">
                  <QuestionRenderer 
                    question={currentQuestion} 
                    onSubmit={handleTextTouchSubmit} 
                    disabled={isLoading || isTranscribing} 
                  />
                  
                  <div className="kiosk-or-divider"><span>OR</span></div>
                  
                  <VoiceRecorder 
                    onVoiceSubmit={handleVoiceSubmit}
                    isTranscribing={isTranscribing}
                    disabled={isLoading || isTranscribing}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
