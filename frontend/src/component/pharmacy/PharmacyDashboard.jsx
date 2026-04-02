import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [newStock, setNewStock] = useState({ name: "", quantity: "", price: "", lowStockThreshold: 10 });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");
    fetchData(token);
  }, [navigate]);

  const fetchData = async (token) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [rxRes, invRes] = await Promise.all([
        fetch("http://localhost:8080/api/pharmacy/prescriptions", { headers }),
        fetch("http://localhost:8080/api/pharmacy/inventory", { headers })
      ]);
      if (rxRes.ok) setPrescriptions(await rxRes.json());
      if (invRes.ok) setInventory(await invRes.json());
    } catch (e) { console.error(e); }
  };

  const dispenseMeds = async (id) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://localhost:8080/api/pharmacy/dispense/${id}`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      alert("Medicines dispensed and billed successfully!");
      fetchData(token);
    } else {
      const d = await res.json();
      alert(d.message);
    }
  };

  const addStock = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:8080/api/pharmacy/stock", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newStock.name, quantity: Number(newStock.quantity), price: Number(newStock.price), lowStockThreshold: Number(newStock.lowStockThreshold) })
    });
    if (res.ok) {
      alert("Inventory updated!");
      setNewStock({ name: "", quantity: "", price: "", lowStockThreshold: 10 });
      fetchData(token);
    } else {
      const d = await res.json();
      alert(d.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center bg-teal-800 text-white p-6 rounded-2xl shadow-md mb-8">
          <h1 className="text-3xl font-bold">Pharmacy & Dispensary</h1>
          <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="text-teal-200 font-bold hover:text-white transition-colors">Logout</button>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">

          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="font-bold text-xl text-slate-800 mb-4">Pending Prescriptions</h2>
            <div className="space-y-4">
              {prescriptions.map(p => (
                <div key={p._id} className="p-5 border-2 border-slate-100 rounded-xl bg-slate-50">
                  <div className="flex justify-between items-start mb-3">
                    <p className="font-bold text-lg text-teal-700">Pt: {p.patientId?.name || "Unknown"}</p>
                    <p className="text-xs font-bold text-slate-500 uppercase"> {p.doctorId?.name}</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-200 mb-4">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-slate-500"><th className="pb-1">Medicine</th><th className="pb-1 text-right">Qty</th></tr></thead>
                      <tbody>
                        {p.medicines.map((m, i) => (
                          <tr key={i} className="border-b border-slate-50 last:border-0">
                            <td className="py-2 font-semibold text-slate-700">{m.medicineId?.name}</td>
                            <td className="py-2 text-right font-bold text-teal-600">{m.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={() => dispenseMeds(p._id)} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-sm transition-colors text-sm">
                    Dispense & Auto-Bill Items
                  </button>
                </div>
              ))}
              {!prescriptions.length && (
                <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-slate-400 font-bold">No approved prescriptions pending</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h2 className="font-bold text-xl text-slate-800 mb-4">Add Medicine / Update Stock</h2>
              <form onSubmit={addStock} className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Medicine Name</label>
                  <input required type="text" className="w-full border p-2 rounded focus:ring-teal-500" value={newStock.name} onChange={e => setNewStock({ ...newStock, name: e.target.value })} placeholder="e.g. Paracetamol 500mg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Quantity</label>
                  <input required type="number" min="1" className="w-full border p-2 rounded focus:ring-teal-500" value={newStock.quantity} onChange={e => setNewStock({ ...newStock, quantity: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Price Per Unit (₹)</label>
                  <input required type="number" step="0.5" className="w-full border p-2 rounded focus:ring-teal-500" value={newStock.price} onChange={e => setNewStock({ ...newStock, price: e.target.value })} />
                </div>
                <button type="submit" className="col-span-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-sm">
                  Add Stock Entry
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h2 className="font-bold text-xl text-slate-800 mb-4">Current Inventory</h2>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left bg-white">
                  <thead className="bg-slate-50 border-b">
                    <tr><th className="p-3 text-xs uppercase text-slate-500">Medicine</th><th className="p-3 text-xs uppercase text-slate-500">Price</th><th className="p-3 text-xs uppercase text-slate-500">Stock</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 max-h-64 overflow-y-auto block">
                    {inventory.map(m => (
                      <tr key={m._id} className="w-full flex">
                        <td className="p-3 flex-1 font-semibold text-sm">{m.name}</td>
                        <td className="p-3 w-24 text-sm text-slate-500">₹{m.unitPrice}</td>
                        <td className="p-3 w-24">
                          <span className={`px-2 py-1 rounded text-xs font-bold inline-block w-full text-center ${m.stockQuantity < m.lowStockThreshold ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {m.stockQuantity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
