import React from 'react';

export default function SingleSelectQuestion({ question, onSubmit, disabled }) {
  return (
    <div className="kiosk-question-options">
      {question.options.map((option) => (
        <button
          key={option.value}
          className="kiosk-option-button"
          onClick={() => onSubmit(option.value)}
          disabled={disabled}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
