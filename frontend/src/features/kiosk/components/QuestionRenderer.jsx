import React from 'react';
import SingleSelectQuestion from './SingleSelectQuestion';
import MultiSelectQuestion from './MultiSelectQuestion';
import FreeTextQuestion from './FreeTextQuestion';
import ScaleQuestion from './ScaleQuestion';

export default function QuestionRenderer({ question, onSubmit, disabled }) {
  if (!question) return null;

  switch (question.type) {
    case 'single_select':
      return (
        <SingleSelectQuestion 
          question={question} 
          onSubmit={onSubmit} 
          disabled={disabled} 
        />
      );
    case 'multi_select':
      return (
        <MultiSelectQuestion 
          question={question} 
          onSubmit={onSubmit} 
          disabled={disabled} 
        />
      );
    case 'free_text':
      return (
        <FreeTextQuestion 
          question={question} 
          onSubmit={onSubmit} 
          disabled={disabled} 
        />
      );
    case 'scale_1_10':
      return (
        <ScaleQuestion 
          question={question} 
          onSubmit={onSubmit} 
          disabled={disabled} 
        />
      );
    default:
      return (
        <div className="kiosk-error-text">
          Unsupported question type: {question.type}
        </div>
      );
  }
}
