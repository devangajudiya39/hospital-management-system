import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LabDashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [result, setResult] = useState("");
  const [reportFile, setReportFile] = useState(null);
  const [selectedReq, setSelectedReq] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");
    fetchRequests(token);
  }, [navigate]);

  const fetchRequests = async (token) => {
    try {
      const res = await fetch("http://localhost:8080/api/lab/requests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if(res.ok) setRequests(await res.json());
    } catch (e) { console.error(e); }
  };

  const uploadReport = async () => {
    if(!selectedReq || !result) return alert("Select test and enter result");
    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("requestId", selectedReq._id);
    formData.append("resultDetails", result);
    if (reportFile) {
      formData.append("reportFile", reportFile);
    }

    const res = await fetch("http://localhost:8080/api/lab/upload-report", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    if(res.ok) {
      alert("Report Uploaded Successfully!");
      setResult("");
      setReportFile(null);
      setSelectedReq(null);
      fetchRequests(token);
    } else {
      const d = await res.json();
      alert(d.message);
    }
  };

  const updateStatus = async (id, status) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://localhost:8080/api/lab/update-status/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
    if(res.ok) {
      fetchRequests(token);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center bg-teal-800 text-white p-6 rounded-2xl shadow-md mb-8">
          <h1 className="text-3xl font-bold">Laboratory Control Panel</h1>
          <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="text-teal-200 font-bold hover:text-white transition-colors">Logout</button>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="font-bold text-xl text-slate-800 mb-4">Lab Requests</h2>
            <div className="space-y-4">
              {requests.map(r => (
                <div key={r._id} className="p-4 border rounded-xl bg-slate-50 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-lg text-teal-700">{r.testType}</p>
                      <p className="text-sm font-semibold text-slate-600">Patient: {r.patientId?.name || "Unknown"} | Dr. {r.doctorId?.name || "Unknown"}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border 
                      ${r.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                        r.status === 'in-progress' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                        'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {r.status !== 'completed' && (
                    <div className="flex gap-2 border-t pt-3 mt-1">
                      {r.status === 'pending' && (
                        <button onClick={() => updateStatus(r._id, 'in-progress')} className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-1.5 rounded transition-colors text-sm">
                          Start Process
                        </button>
                      )}
                      {(r.status === 'pending' || r.status === 'in-progress') && (
                        <button onClick={() => setSelectedReq(r)} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-1.5 rounded transition-colors text-sm">
                          Upload Results
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {!requests.length && <p className="text-slate-400 text-center py-8">No tests requested</p>}
            </div>
          </div>

          {selectedReq && (
            <div className="bg-white p-6 rounded-2xl border-2 border-teal-500 shadow-md h-fit relative">
              <button onClick={() => setSelectedReq(null)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 font-bold">X</button>
              <h2 className="font-bold text-2xl text-teal-800 mb-2">Upload Report</h2>
              <p className="text-sm text-slate-500 mb-6 font-semibold">Test: {selectedReq.testType} - Pt: {selectedReq.patientId?.name}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Result Details & Metrics</label>
                  <textarea 
                    className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-0 resize-none font-mono text-sm" 
                    rows="6" 
                    placeholder="E.g. Hb: 13.2 g/dL - WBC: 8,200 - All within normal range."
                    value={result} onChange={e => setResult(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Upload PDF Report (Optional)</label>
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    className="w-full p-2 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-0 text-sm" 
                    onChange={e => setReportFile(e.target.files[0])} />
                </div>
                <button onClick={uploadReport} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors text-lg shadow-sm">
                  Sign & Submit Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
