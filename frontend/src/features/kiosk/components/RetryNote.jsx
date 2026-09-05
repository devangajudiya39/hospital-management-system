import React from 'react';

export default function RetryNote({ note }) {
  if (!note) return null;
  return (
    <div className="kiosk-retry-note">
      <p>{note}</p>
    </div>
  );
}
