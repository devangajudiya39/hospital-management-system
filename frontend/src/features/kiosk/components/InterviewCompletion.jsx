import React from 'react';
import { FaCircleCheck, FaTriangleExclamation } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

export default function InterviewCompletion({ alertTriggered, onReset }) {
  const navigate = useNavigate();

  const handleReturnHome = () => {
    if (onReset) onReset();
    navigate('/kiosk');
  };

  if (alertTriggered) {
    return (
      <div className="kiosk-completion kiosk-urgent">
        <FaTriangleExclamation className="kiosk-completion-icon text-red" />
        <h2>URGENT</h2>
        <p>A priority clinical concern has been detected.</p>
        <p>Please wait while hospital staff are alerted.</p>
        <button className="kiosk-home-button" onClick={handleReturnHome}>
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="kiosk-completion">
      <FaCircleCheck className="kiosk-completion-icon text-green" />
      <h2>Thank you.</h2>
      <p>Your information has been recorded for the clinical team.</p>
      <button className="kiosk-home-button" onClick={handleReturnHome}>
        Done
      </button>
    </div>
  );
}
