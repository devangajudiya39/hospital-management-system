import { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';

export default function SummaryReviewPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/summary/generate', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: '{}' 
    })
     .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to generate summary');
        return data;
      })
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="p-8 text-rose-600">Error: {error}</div>;
  if (!summary) return <div className="p-8 text-teal-600">Generating summary...</div>;


  const updateStatus = async (status) => {
    const res = await fetch(`/api/summary/${summary._id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setSummary(await res.json());
  };

  if (!summary) return <div className="p-8 text-teal-600">Generating summary...</div>;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Clinical Summary</h2>
          <StatusBadge status={summary.status} />
        </div>
        {['chiefComplaint','hpi','pastHistory','drugHistory','familyHistory','personalHistory'].map(field => (
          <div key={field}>
            <label className="text-sm font-semibold text-teal-700 capitalize">{field.replace(/([A-Z])/g,' $1')}</label>
            <textarea
              className="w-full mt-1 p-2 border rounded-lg text-sm"
              defaultValue={summary[field]}
            />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <button onClick={() => updateStatus('accepted')} className="bg-teal-600 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-teal-700">Accept</button>
          <button onClick={() => updateStatus('amended')} className="bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-emerald-600">Save Amendment</button>
          <button onClick={() => updateStatus('rejected')} className="bg-white border border-rose-400 text-rose-600 px-4 py-2 rounded-xl">Reject</button>
        </div>
      </div>
    </div>
  );
}