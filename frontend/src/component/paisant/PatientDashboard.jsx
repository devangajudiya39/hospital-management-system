import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [bills, setBills] = useState([]);
  
  // Booking state
  const [doctors, setDoctors] = useState([]); 
  const [selectedDoc, setSelectedDoc] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [bookingMsg, setBookingMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");
    fetchData(token);
    // Fetch real doctors from DB
    fetch("http://localhost:8080/api/patient/doctors", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDoctors(data.map(d => ({ id: d._id, name: d.name })));
        }
      })
      .catch(console.error);
  }, [navigate]);

  const fetchData = async (token) => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [histRes, repRes, billRes] = await Promise.all([
        fetch("http://localhost:8080/api/patient/history", { headers }),
        fetch("http://localhost:8080/api/patient/reports", { headers }),
        fetch("http://localhost:8080/api/patient/bills", { headers })
      ]);
      if(histRes.ok) setHistory(await histRes.json());
      if(repRes.ok) setReports(await repRes.json());
      if(billRes.ok) setBills(await billRes.json());
    } catch (e) { console.error(e); }
  };

  const checkAvailability = async (e) => {
    e.preventDefault();
    if(!selectedDoc || !date) return alert("Select doctor and date");
    const token = localStorage.getItem("token");
    const res = await fetch(`http://localhost:8080/api/patient/availability?doctorId=${selectedDoc}&date=${date}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setSlots(data.availableSlots || []);
      if(data.availableSlots?.length === 0) alert("No slots available on this date");
    }
  };

  const bookAppointment = async () => {
    if (!selectedSlot) return alert("Select a slot first");
    const token = localStorage.getItem("token");
    setBookingMsg("");
    const res = await fetch("http://localhost:8080/api/patient/book", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ doctorId: selectedDoc, date, slot: selectedSlot })
    });
    const data = await res.json();
    if (res.ok) {
      setBookingMsg("✅ Appointment booked! Check the Doctor dashboard.");
      setSelectedSlot("");
      setSlots([]);
      setDate("");
      fetchData(token);
    } else {
      setBookingMsg("❌ " + (data.message || "Booking failed"));
    }
  };

  const payFinalBill = async (billId) => {
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:8080/api/billing/process-final-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ billId, paymentMethod: "Online Banking" })
    });
    const data = await res.json();
    if(res.ok) {
      alert("Final bill paid! Patient is officially discharged.");
      fetchData(token);
    } else {
      alert(data.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-teal-800 text-white p-6 rounded-2xl shadow-md">
          <h1 className="text-3xl font-bold">Patient Portal</h1>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-teal-200">Welcome, {JSON.parse(localStorage.getItem("user") || "{}").name || "Patient"}</span>
            <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-lg font-bold transition-colors">Logout</button>
          </div>
        </header>

        {/* BOOKING SECTION */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-teal-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-teal-500"></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Book New Appointment</h2>
          <form onSubmit={checkAvailability} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-600 mb-2">Select Provider</label>
              <select required className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-teal-500 focus:ring-0 outline-none transition-colors" value={selectedDoc} onChange={e=>setSelectedDoc(e.target.value)}>
                <option value="">-- Choose Speciality/Doctor --</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-600 mb-2">Select Date</label>
              <input required type="date" className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-teal-500 focus:ring-0 outline-none transition-colors" value={date} onChange={e=>setDate(e.target.value)} />
            </div>
            <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-sm w-full md:w-auto h-[52px]">
              Search Slots
            </button>
          </form>

          {slots.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-600 mb-4">Select an Available Time Slot for {date}</label>
              <div className="flex gap-3 flex-wrap mb-6">
                {slots.map(s => (
                  <button key={s} type="button" onClick={()=>setSelectedSlot(s)}
                    className={`px-5 py-2.5 border-2 rounded-xl font-bold transition-all ${selectedSlot===s ? 'bg-teal-600 text-white border-teal-600 shadow-md transform -translate-y-0.5' : 'bg-white text-teal-700 border-teal-200 hover:border-teal-400'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={bookAppointment} disabled={!selectedSlot} className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-colors">
                Book Appointment
              </button>
              {bookingMsg && (
                <p className={`mt-4 font-bold text-sm ${bookingMsg.startsWith('✅') ? 'text-emerald-600' : 'text-rose-600'}`}>{bookingMsg}</p>
              )}
            </div>
          )}
        </section>

        {/* DATA PANELS */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[400px]">
            <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">🏥 Medical History</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {history.length ? history.map((h,i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-sm font-semibold text-slate-800 mb-1">{h.diagnosis || "Consultation"}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{h.notes}</p>
                </div>
              )) : (
                <div className="h-full flex items-center justify-center text-slate-400 font-semibold text-sm">No historical records found</div>
              )}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[400px]">
            <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">🔬 Lab Reports</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {reports.length ? reports.map((r,i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-sm font-bold text-teal-700 mb-1 flex justify-between">
                    <span>{r.testType}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">READY</span>
                  </p>
                  <p className="text-xs text-slate-600 font-mono mt-2">{r.resultDetails}</p>
                </div>
              )) : (
                <div className="h-full flex items-center justify-center text-slate-400 font-semibold text-sm">No lab reports available</div>
              )}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[400px]">
            <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">💳 Billing & Invoices</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {bills.length ? bills.map((b,i) => (
                <div key={i} className={`p-4 rounded-xl border-2 ${b.finalAmountDue > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-black text-slate-800">Total: ₹{b.totalAmount || 200}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${b.status === 'paid' ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                      {b.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Due: <span className="font-bold text-rose-600">₹{b.finalAmountDue || 0}</span></p>
                  
                  {b.finalAmountDue > 0 && (
                    <button onClick={() => payFinalBill(b._id)} className="w-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                      Pay Final Due
                    </button>
                  )}
                </div>
              )) : (
                <div className="h-full flex items-center justify-center text-slate-400 font-semibold text-sm">No active bills</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
