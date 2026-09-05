import React, { useState } from 'react';

export default function ScaleQuestion({ onSubmit, disabled }) {
  const [value, setValue] = useState(5);

  const handleSubmit = () => {
    if (value < 1 || value > 10) return;
    onSubmit(value);
  };

  return (
    <div className="kiosk-scale-question">
      <div className="kiosk-scale-container">
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          disabled={disabled}
          className="kiosk-scale-slider"
        />
        <div className="kiosk-scale-value">{value}</div>
      </div>
      <button 
        className="kiosk-submit-button"
        onClick={handleSubmit} 
        disabled={disabled || value < 1 || value > 10}
      >
        Submit
      </button>
    </div>
  );
}
