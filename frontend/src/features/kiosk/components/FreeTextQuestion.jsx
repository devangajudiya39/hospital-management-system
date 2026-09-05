import React, { useState } from 'react';

export default function FreeTextQuestion({ onSubmit, disabled }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text.trim());
  };

  return (
    <form className="kiosk-free-text" onSubmit={handleSubmit}>
      <textarea
        className="kiosk-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer here..."
        rows={4}
      />
      <button 
        type="submit"
        className="kiosk-submit-button"
        disabled={disabled || !text.trim()}
      >
        Submit
      </button>
    </form>
  );
}
