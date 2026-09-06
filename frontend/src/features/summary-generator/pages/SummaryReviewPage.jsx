import { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';

export default function SummaryReviewPage() {
  const [summary, setSummary] = useState(null);
  const [formData, setFormData] = useState({});
  const [activeLang, setActiveLang] = useState('en'); // Task 5: Interactive language switcher tab ('en' or 'hi')
  const [error, setError] = useState(null);
  const [hindiLoading, setHindiLoading] = useState(false);

  useEffect(() => {
    // ===== TEMPORARY TEST BLOCK — START =====
    // Paste the full contents of backend/prescription-sample.json into this object,
    // test the UI, then REVERT this whole block back to the simple version below
    // (the original single-line body) once you've confirmed "Prescriptions" renders.
    const testPrescriptionData = {
      "printed_ocr": "Dr. R. K. Sharma Sharma Gunic MBBS, MD (Medicine) Kanpur - 208001 Reg. No. 58746 Ph.: 0512-2345678 SS Name : Retut Vexma Age / Sex : 2e/M Date : 15 [05 [2024 Ix oO Prracetamel 500 ma = | tab trie daily after food 5 days (2) Tbuprofen \u201c00 ma - | tab twice daily after food 3 days 1 cap three times daily after food 5 days (4) Pamtoprazele Lo \"4 - | tab once daily before breakfast 5 daw: ee Dr. R. K. Sharma Reg. No. 58746",
      "handwritten_ocr": ["Reg. No. 58746. S.0005.0005. Philip St.2-343075", "Rohit Verma -000 Age 1 Sex : 28 (M.", "CD Paracetamol 500 mg", "- I tab thrice daily after food # 5 days", "Q Iburpnofen 400 mg", "\" \" tab twice daily after food # 3 days", "O Amoxicillin 500 mg", "- I cap three times daily after food - 5 days", "Pantoprazole 40 mg", "\" I tab once daily before breakfast - 5 days", "poor", "Fatt and David Wright spicy food . They", "nupkk Sharma"],
      "structured_medications": [
        { "drug_name": "Paracetamol", "dosage": "500 mg", "frequency": "thrice daily", "duration": "5 days" },
        { "drug_name": "Ibuprofen", "dosage": "400 mg", "frequency": "twice daily", "duration": "3 days" },
        { "drug_name": "Amoxicillin", "dosage": "500 mg", "frequency": "three times daily", "duration": "5 days" },
        { "drug_name": "Pantoprazole", "dosage": "40 mg", "frequency": "once daily", "duration": "5 days" }
      ],
      "timeline": [
        {
          "date": "2024-05-15",
          "events": [
            { "type": "medication", "detail": "Paracetamol, 500 mg, thrice daily, 5 days" },
            { "type": "medication", "detail": "Ibuprofen, 400 mg, twice daily, 3 days" },
            { "type": "medication", "detail": "Amoxicillin, 500 mg, three times daily, 5 days" },
            { "type": "medication", "detail": "Pantoprazole, 40 mg, once daily, 5 days" }
          ]
        }
      ]
    };

    fetch('/api/summary/generate', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({
          patientId: 'mock-patient-001',
          analyzedDocuments: [{ type: 'prescription', data: testPrescriptionData }]
        })
    })
    // ===== TEMPORARY TEST BLOCK — END =====
    // ORIGINAL (revert to this):
    // fetch('/api/summary/generate', {
    //     method: 'POST',
    //     headers: {'Content-Type':'application/json'},
    //     body: JSON.stringify({ patientId: 'mock-patient-001' })
    // })
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

  const handleHindiClick = async () => {
  setActiveLang('hi');
  if (summary.languageOutputs?.hi) return; // already translated, nothing to fetch

  setHindiLoading(true);
    try {
      const res = await fetch(`/api/summary/${summary._id}/translate?lang=hi`);
      const json = await res.json();
      if (res.ok) {
        setSummary(prev => ({
          ...prev,
          languageOutputs: { ...prev.languageOutputs, hi: json.hi }
        }));
      }
    } catch (err) {
      console.error('Hindi translation fetch failed:', err.message);
    } finally {
      setHindiLoading(false);
    }
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
      alert(`Summary ${status} and saved successfully!`);
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
                onClick={handleHindiClick}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${activeLang === 'hi' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-gray-600 border hover:bg-gray-100'}`}
              >
                Hindi (हिन्दी)
              </button>
              <button
                onClick={() => new Audio(`/api/summary/${summary._id}/audio?lang=${activeLang}`).play()}
                disabled={activeLang === 'hi' && hindiLoading}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-teal-100 text-teal-800 hover:bg-teal-200"
              >
                🔊 Play
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border italic">
            {activeLang === 'hi' && hindiLoading
              ? 'Translating to Hindi...'
              : (summary.languageOutputs?.[activeLang] || 'Translation output loading...')}
          </p>
        </div>

        {summary.documentTimeline && summary.documentTimeline.length > 0 && (() => {
          const groups = {
            prescription: { label: 'Prescriptions', items: [] },
            lab: { label: 'Lab Reports', items: [] },
            document: { label: 'Other Documents', items: [] }
          };
          summary.documentTimeline.forEach(item => {
            const key = groups[item.type] ? item.type : 'document'; // ungrouped/legacy entries fall into "Other Documents"
            groups[key].items.push(item);
          });

          return (
            <div className="bg-gray-50 border p-4 rounded-xl space-y-4">
              <span className="text-sm font-semibold text-teal-800">Document Timeline (from Module B)</span>
              {Object.entries(groups).map(([key, group]) =>
                group.items.length > 0 && (
                  <div key={key} className="space-y-1">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{group.label}</span>
                    {group.items.map((item, idx) => (
                      <div key={idx} className="text-sm bg-white p-2 rounded border">
                        <span className="font-medium">{new Date(item.date).toLocaleDateString()}</span>
                        {' — '}{item.event}
                        {item.sourceDocument && <span className="text-gray-500"> ({item.sourceDocument})</span>}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          );
        })()}

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