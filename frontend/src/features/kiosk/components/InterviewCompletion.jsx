import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaArrowRight, FaPhoneAlt, FaSpinner, FaRedo } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function InterviewCompletion({
  alertTriggered,
  redFlagDetected,
  redFlagSeverity,
  summaryStatus,
  onRetrySummary,
  onReset
}) {
  const navigate = useNavigate();

  const handleReturnHome = () => {
    if (onReset) onReset();
    navigate('/kiosk');
  };

  const isUrgent = alertTriggered || (redFlagDetected && redFlagSeverity === 'critical');

  if (isUrgent) {
    return (
      <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-lg shadow-rose-100/50 my-6 animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-rose-600 text-white font-black text-xs uppercase px-4 py-1.5 rounded-full tracking-widest mb-6 animate-pulse">
          <FaExclamationTriangle className="text-sm" />
          <span>Priority Clinical Alert</span>
        </div>

        <div className="w-20 h-20 rounded-3xl bg-white border-2 border-rose-300 text-rose-600 flex items-center justify-center mx-auto mb-6 text-4xl shadow-md shadow-rose-200">
          <FaExclamationTriangle />
        </div>

        <h2 className="font-display text-2xl sm:text-3xl font-black text-rose-950 mb-3">
          Urgent Clinical Attention Required
        </h2>

        <p className="text-base sm:text-lg text-rose-900 leading-relaxed max-w-lg mx-auto mb-6">
          A high-priority medical symptom has been detected during your questionnaire. 
          Please inform the nearest nurse or receptionist immediately. Hospital staff have been notified.
        </p>

        {redFlagSeverity && (
          <div className="inline-block bg-white border border-rose-200 text-rose-800 text-xs font-black uppercase px-3 py-1 rounded-lg mb-6">
            Classification: {redFlagSeverity.toUpperCase()}
          </div>
        )}

        <div className="bg-white/80 border border-rose-200 rounded-2xl p-4 mb-8 text-sm text-rose-900 flex items-center justify-center gap-3">
          <FaPhoneAlt className="text-rose-600" />
          <span>Emergency Assistance: <strong>+91 98765 43210</strong> (Ext: 101)</span>
        </div>

        {summaryStatus?.success && (
          <div className="mb-6 inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 border border-emerald-300 px-4 py-2 rounded-xl text-xs font-bold">
            <FaCheckCircle className="text-emerald-600" />
            <span>Consultation summary saved successfully.</span>
          </div>
        )}

        <div>
          <button
            type="button"
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-base sm:text-lg px-8 py-3.5 rounded-xl shadow-md shadow-rose-300/60 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer inline-flex items-center gap-2"
            onClick={handleReturnHome}
          >
            <span>Return to Kiosk Main Menu</span>
            <FaArrowRight className="text-sm" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-teal-100 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm my-6 animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-6 text-4xl shadow-md shadow-emerald-100">
        <FaCheckCircle />
      </div>

      <span className="text-xs font-black uppercase tracking-widest text-teal-600 bg-teal-50 px-3.5 py-1.5 rounded-full border border-teal-200 inline-block mb-3">
        Intake Completed
      </span>

      <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-800 mb-3">
        Thank You
      </h2>

      <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg mx-auto mb-6">
        Your preliminary health information has been recorded securely and transmitted to your doctor's clinical review dashboard.
      </p>

      {/* Summary persistence status indicator */}
      {summaryStatus?.loading && (
        <div className="inline-flex items-center gap-2.5 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold px-4 py-2 rounded-xl mb-6 animate-pulse">
          <FaSpinner className="animate-spin text-sm" />
          <span>Saving consultation summary...</span>
        </div>
      )}

      {summaryStatus?.success && (
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-2 rounded-xl mb-6">
          <FaCheckCircle className="text-emerald-500 text-sm" />
          <span>Clinical summary generated successfully.</span>
        </div>
      )}

      {summaryStatus?.error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 mb-6 text-xs text-center max-w-md mx-auto">
          <p className="font-semibold mb-2">
            {typeof summaryStatus.error === 'string' ? summaryStatus.error : 'Consultation completed, but your clinical summary could not be saved. Please contact staff.'}
          </p>
          {onRetrySummary && (
            <button
              type="button"
              onClick={onRetrySummary}
              className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              <FaRedo className="text-[10px]" />
              <span>Retry Saving Summary</span>
            </button>
          )}
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 text-sm text-slate-700 max-w-md mx-auto">
        <div className="font-bold text-slate-800 mb-1">Next Step</div>
        <div>Please proceed to the OPD waiting lounge. Your doctor will call you shortly.</div>
      </div>

      <button
        type="button"
        className="teal-grad text-white font-bold text-base sm:text-lg px-10 py-3.5 rounded-xl shadow-md shadow-teal-300/40 hover:opacity-90 hover:scale-105 active:scale-[0.99] transition-all cursor-pointer inline-flex items-center gap-2"
        onClick={handleReturnHome}
      >
        <span>Done • Return to Kiosk</span>
        <FaArrowRight className="text-sm" />
      </button>
    </div>
  );
}
