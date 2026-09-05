import React, { useState } from 'react';

export default function MultiSelectQuestion({ question, onSubmit, disabled }) {
  const [selected, setSelected] = useState(new Set());

  const toggleSelection = (value) => {
    const newSelected = new Set(selected);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    setSelected(newSelected);
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    onSubmit(Array.from(selected));
  };

  return (
    <div className="kiosk-multi-select">
      <div className="kiosk-question-options">
        {question.options.map((option) => {
          const isSelected = selected.has(option.value);
          return (
            <button
              key={option.value}
              className={`kiosk-option-button ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleSelection(option.value)}
              disabled={disabled}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <button 
        className="kiosk-submit-button"
        onClick={handleSubmit} 
        disabled={disabled || selected.size === 0}
      >
        Submit
      </button>
    </div>
  );
}
