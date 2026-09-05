import { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';

export default function SummaryReviewPage() {
  const [summary, setSummary] = useState(null);
  const [formData, setFormData] = useState({});
  const [activeLang, setActiveLang] = useState('en'); // Task 5: Interactive language switcher tab ('en' or 'hi')
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/summary/generate', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({ patientId: 'mock-patient-001' }) 
    })
     .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'Failed to generate summary');
        return json.data || json; // Unwraps backend response properly
      })
      .then((data) => {
        setSummary(data);
        setFormData({
          chiefComplaint: data.chiefComplaint || '',
          hpi: data.hpi || '',
          pastHistory: data.pastHistory || '',
          drugHistory: data.drugHistory || '',
          familyHistory: data.familyHistory || '',
          personalHistory: data.personalHistory || ''
        });
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateStatus = async (status) => {
    if (!summary || !summary._id) {
      alert("Summary ID is missing!");
      return;
    }

    try {
      const res = await fetch(`/api/summary/${summary._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status, 
          ...formData // This explicitly sends your edited text box fields to the backend!
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update status');
      
      setSummary(json.data || json);
      alert("Successfully saved edits and updated status in MongoDB!");
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  if (error) return <div className="p-8 text-rose-600">Error: {error}</div>;
  if (!summary) return <div className="p-8 text-teal-600 font-medium">Generating summary & merging timelines via Gemini AI...</div>;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        
        {/* Header & Status Badge */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Clinical Summary & Review</h2>
          <StatusBadge status={summary.status} />
        </div>

        {/* Task 5: Interactive Language Switcher Tab (English / Hindi Toggle) */}
        <div className="bg-gray-50 border p-4 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-teal-800">Bilingual Narrative Output (EN / HI)</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveLang('en')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${activeLang === 'en' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-gray-600 border hover:bg-gray-100'}`}
              >
                English
              </button>
              <button 
                onClick={() => setActiveLang('hi')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${activeLang === 'hi' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-gray-600 border hover:bg-gray-100'}`}
              >
                Hindi (हिन्दी)
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border italic">
            {summary.languageOutputs?.[activeLang] || 'Translation output loading...'}
          </p>
        </div>

        {/* Editable Structured Fields */}
        {['chiefComplaint','hpi','pastHistory','drugHistory','familyHistory','personalHistory'].map(field => (
          <div key={field}>
            <label className="text-sm font-semibold text-teal-700 capitalize">{field.replace(/([A-Z])/g,' $1')}</label>
            <textarea
              className="w-full mt-1 p-2 border rounded-lg text-sm bg-gray-50 focus:bg-white"
              value={formData[field] || ''}
              onChange={(e) => handleChange(field, e.target.value)}
            />
          </div>
        ))}

        {/* Action State Buttons */}
        <div className="flex gap-3 pt-2">
          <button onClick={() => updateStatus('accepted')} className="bg-teal-600 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-teal-700">Accept</button>
          <button onClick={() => updateStatus('amended')} className="bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-emerald-600">Save Amendment</button>
          <button onClick={() => updateStatus('rejected')} className="bg-white border border-rose-400 text-rose-600 px-4 py-2 rounded-xl">Reject</button>
        </div>

      </div>
    </div>
  );
}