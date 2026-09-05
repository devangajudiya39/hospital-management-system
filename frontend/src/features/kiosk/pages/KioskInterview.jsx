import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaHospital,
  FaArrowLeft,
  FaAmbulance,
  FaClock,
  FaRedo,
  FaSpinner,
  FaStethoscope,
  FaCheck
} from 'react-icons/fa';
import { useInterview } from '../hooks/useInterview';

import QuestionRenderer from '../components/QuestionRenderer';
import RetryNote from '../components/RetryNote';
import InterviewCompletion from '../components/InterviewCompletion';
import KioskNavbar from '../components/KioskNavbar';

const PHASES = [
  { key: 'chief_complaint', label: 'Chief Complaint' },
  { key: 'hpi', label: 'Present Illness' },
  { key: 'extended_history', label: 'Medical History' },
  { key: 'ros', label: 'Systems Review' },
  { key: 'ayush', label: 'AYUSH Care' }
];

const getPhaseMeta = (sectionKey) => {
  switch (sectionKey) {
    case 'chief_complaint':
      return { title: 'Chief Complaint', subtitle: 'Describe your primary health concern' };
    case 'hpi':
      return { title: 'History of Present Illness (HPI)', subtitle: 'Understanding your symptom patterns, onset, and duration' };
    case 'extended_history':
      return { title: 'Medical History & Background', subtitle: 'Prior conditions, routine medications, and allergies' };
    case 'ros':
      return { title: 'Review of Systems', subtitle: 'Checking general body systems and associated symptoms' };
    case 'ayush':
      return { title: 'AYUSH Constitutional Evaluation', subtitle: 'Holistic lifestyle and physiological assessment' };
    default:
      return { title: sectionKey ? sectionKey.toUpperCase().replace(/_/g, ' ') : 'Intake Consultation', subtitle: 'Clinical evaluation in progress' };
  }
};

export default function KioskInterview() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedLanguage = location.state?.language || 'en';
  const assessmentType = location.state?.assessmentType || 'modern';

  const {
    sessionId,
    currentQuestion,
    isLoading,
    error,
    interviewComplete,
    redFlagDetected,
    redFlagSeverity,
    alertTriggered,
    clinicalSummary,
    startInterview,
    submitAnswer,
    retryLastAction,
    resetInterview
  } = useInterview();

  // Start interview on mount using chosen language
  useEffect(() => {
    startInterview(selectedLanguage, assessmentType);
    return () => {
      resetInterview();
    };
  }, [startInterview, resetInterview, selectedLanguage, assessmentType]);

  const handleReturnHome = () => {
    resetInterview();
    navigate('/kiosk');
  };

  const handleTouchSubmit = (answer) => {
    submitAnswer(answer, 'touch');
  };

  const currentSection = currentQuestion?.section || 'chief_complaint';
  const phaseMeta = getPhaseMeta(currentSection);

  // Find index of current phase for dynamic progress indicator
  const activePhaseIndex = PHASES.findIndex(p => p.key === currentSection);

  // Completion screen (normal or urgent alert)
  if (interviewComplete || alertTriggered) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:ital,wght@0,600;1,500&display=swap');
          * { font-family: 'Nunito', sans-serif; }
          .font-display { font-family: 'Lora', serif; }
          .teal-grad { background: linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf); }
        `}</style>

        {/* Hospital Branding Header & Emergency Bar */}
        <KioskNavbar topBarTag="Consultation Intake Desk" />

        {/* Completion Main View */}
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
          <InterviewCompletion 
            alertTriggered={alertTriggered}
            redFlagDetected={redFlagDetected}
            redFlagSeverity={redFlagSeverity}
            onReset={resetInterview} 
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:ital,wght@0,600;1,500&display=swap');
        * { font-family: 'Nunito', sans-serif; }
        .font-display { font-family: 'Lora', serif; }
        .teal-grad { background: linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf); }
        .card-hover { transition: all 0.2s ease-in-out; }
      `}</style>

      {/* Hospital Branding Header & Emergency Bar */}
      <KioskNavbar
        topBarTag="Touch-Mode Patient Consultation"
        rightAction={
          <button
            type="button"
            onClick={handleReturnHome}
            className="flex items-center gap-2 px-4 py-2 border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-bold rounded-xl text-sm transition-all cursor-pointer"
          >
            <FaArrowLeft className="text-xs" />
            <span>Exit Consultation</span>
          </button>
        }
      />

      {/* Dynamic Phase Progression Tracker */}
      <div className="bg-white/80 border-b border-slate-200/80 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between overflow-x-auto gap-2 py-1 scrollbar-none">
          {PHASES.map((p, idx) => {
            const isCurrent = p.key === currentSection;
            const isCompleted = activePhaseIndex > idx;
            return (
              <div key={p.key} className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-teal-600 text-white shadow-sm'
                      : isCompleted
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <FaCheck className="text-[10px]" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                  )}
                  <span>{p.label}</span>
                </div>
                {idx < PHASES.length - 1 && (
                  <div className={`w-4 sm:w-8 h-0.5 ${isCompleted ? 'bg-teal-300' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        {/* Error Alert Box */}
        {error && (
          <div className="bg-rose-50 border-2 border-rose-200 text-rose-800 rounded-2xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm font-semibold">
              <strong className="block text-rose-900 font-bold mb-0.5">Connection Notice</strong>
              {error}
            </div>
            <button
              type="button"
              onClick={retryLastAction}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <FaRedo className="text-xs" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Initial Connecting State */}
        {isLoading && !currentQuestion && (
          <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-12 text-center my-6">
            <div className="w-16 h-16 rounded-2xl teal-grad flex items-center justify-center text-white text-2xl mx-auto mb-5 shadow-lg shadow-teal-300/40 animate-pulse">
              <FaStethoscope />
            </div>
            <h3 className="font-display text-xl font-bold text-slate-800 mb-2">
              Preparing Your Consultation
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              Connecting securely to the MultiSpecialist clinical evaluation engine...
            </p>
            <div className="inline-flex items-center gap-2 text-teal-600 font-bold text-sm bg-teal-50 px-4 py-2 rounded-xl">
              <FaSpinner className="animate-spin text-base" />
              <span>Loading next question...</span>
            </div>
          </div>
        )}

        {/* Current Active Question Card */}
        {currentQuestion && (
          <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-6 sm:p-10 relative overflow-hidden transition-all duration-200">
            {/* Top Phase Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                  <FaStethoscope className="text-[11px]" />
                  <span>{phaseMeta.title}</span>
                </div>
                <div className="text-xs text-slate-400 font-semibold mt-1">
                  {phaseMeta.subtitle}
                </div>
              </div>

              {sessionId && (
                <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
                  Session: {sessionId.slice(0, 8)}...
                </div>
              )}
            </div>

            {/* In-Flight Submitting Banner */}
            {isLoading && (
              <div className="absolute inset-x-0 top-0 bg-teal-600/90 text-white text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-2 z-20 backdrop-blur-xs transition-all">
                <FaSpinner className="animate-spin text-xs" />
                <span>Recording your answer...</span>
              </div>
            )}

            {/* Question Text */}
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 leading-snug mb-3">
              {currentQuestion.question}
            </h2>

            {/* Feedback / Retry Note */}
            {currentQuestion.note && (
              <RetryNote note={currentQuestion.note} />
            )}

            {/* Touch Question Option Input Widgets */}
            <div className="mt-6">
              <QuestionRenderer 
                question={currentQuestion} 
                onSubmit={handleTouchSubmit} 
                disabled={isLoading} 
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
