import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allocation, setAllocation] = useState({ patientId: "", roomId: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");
    fetchData(token);
  }, [navigate]);

  const fetchData = async (token) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [appRes, roomRes] = await Promise.all([
        fetch("http://localhost:8080/api/receptionist/appointments", { headers }),
        fetch("http://localhost:8080/api/receptionist/rooms/available", { headers })
      ]);
      if(appRes.ok) setAppointments(await appRes.json());
      if(roomRes.ok) setRooms(await roomRes.json());
    } catch (e) { console.error(e); }
  };

  const allocateRoom = async (e) => {
    e.preventDefault();
    if(!allocation.patientId || !allocation.roomId) return alert("Select patient and room");
    
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:8080/api/receptionist/rooms/allocate", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(allocation)
    });
    const data = await res.json();
    if(res.ok) {
      alert("Room allocated successfully!");
      setAllocation({ patientId: "", roomId: "" });
      fetchData(token);
    } else {
      alert(data.message);
    }
  };

  // Extract unique patients from appointments who might need a room
  const uniquePatients = Array.from(new Set(appointments.map(a => a.patientId?._id))).map(id => {
    return appointments.find(a => a.patientId?._id === id)?.patientId;
  }).filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center bg-teal-800 text-white p-6 rounded-2xl shadow-md mb-8">
          <h1 className="text-3xl font-bold">Front Desk Reception</h1>
          <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="text-teal-200 font-bold hover:text-white transition-colors">Logout</button>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h2 className="font-bold text-xl text-slate-800 mb-4">Today's Appointments</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {appointments.map(a => (
                  <div key={a._id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-lg text-slate-800">{a.patientId?.name || "Unknown Patient"}</p>
                      <p className="text-sm font-semibold text-slate-500">Dr. {a.doctorId?.name || "Unknown"} <span className="mx-2">|</span> <span className="text-teal-600 font-bold">{a.slot}</span></p>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border 
                        ${a.status === 'scheduled' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                          a.status === 'in-progress' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                          'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        {a.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
                {!appointments.length && <p className="text-slate-400 py-4">No appointments found</p>}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h2 className="font-bold text-xl text-slate-800 mb-4">Available Ward Rooms</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {rooms.map(r => (
                  <div key={r._id} className="p-4 border-2 border-emerald-100 rounded-xl text-center bg-emerald-50/50 hover:bg-emerald-50 transition-colors shadow-sm">
                    <p className="text-2xl font-black text-emerald-700">{r.roomNumber}</p>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-1">{r.type}</p>
                  </div>
                ))}
                {!rooms.length && <p className="text-sm text-slate-400 col-span-4 text-center py-4">No rooms available at the moment.</p>}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border sticky top-8">
              <h2 className="font-bold text-xl text-slate-800 mb-4">Admit Patient / Allocate Room</h2>
              <p className="text-sm text-slate-500 mb-6">Assign an available room to a patient arriving for admittance.</p>
              
              <form onSubmit={allocateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Select Patient</label>
                  <select 
                    className="w-full border p-3 rounded-xl focus:ring-teal-500 font-semibold text-slate-700 bg-slate-50"
                    value={allocation.patientId} onChange={e=>setAllocation({...allocation, patientId: e.target.value})}>
                    <option value="">-- Choose Patient --</option>
                    {uniquePatients.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Select Room</label>
                  <select 
                    className="w-full border p-3 rounded-xl focus:ring-teal-500 font-semibold text-slate-700 bg-slate-50"
                    value={allocation.roomId} onChange={e=>setAllocation({...allocation, roomId: e.target.value})}>
                    <option value="">-- Choose Room --</option>
                    {rooms.map(r => (
                      <option key={r._id} value={r._id}>Room {r.roomNumber} - {r.type}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm mt-2">
                  Confirm Admission
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
