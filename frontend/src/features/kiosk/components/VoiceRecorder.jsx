import React, { useState, useRef } from 'react';
import { FaMicrophone, FaStop, FaSpinner } from 'react-icons/fa6';

export default function VoiceRecorder({ onVoiceSubmit, isTranscribing, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/mp4' }; // fallback
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = {}; // let browser decide
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        if (audioBlob.size === 0) {
          setError('Recording was empty. Please try again.');
          return;
        }
        onVoiceSubmit(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone error:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="kiosk-voice-recorder">
      {error && <p className="kiosk-error-text">{error}</p>}
      
      {!isRecording && !isTranscribing && (
        <button 
          className="kiosk-voice-button" 
          onClick={startRecording}
          disabled={disabled}
        >
          <FaMicrophone /> 
          <span>Record Answer</span>
        </button>
      )}

      {isRecording && !isTranscribing && (
        <button 
          className="kiosk-voice-button recording" 
          onClick={stopRecording}
        >
          <FaStop /> 
          <span>Stop Recording</span>
        </button>
      )}

      {isTranscribing && (
        <div className="kiosk-voice-status">
          <FaSpinner className="kiosk-spinner" />
          <span>Transcribing...</span>
        </div>
      )}
    </div>
  );
}
