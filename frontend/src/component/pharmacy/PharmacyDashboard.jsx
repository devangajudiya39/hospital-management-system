import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [newStock, setNewStock] = useState({ name: "", quantity: "", price: "", lowStockThreshold: 10 });
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const downloadPDF = async (prescription) => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text("Prescription Information", 105, 15, { align: "center" });
      
      // Subtitle
      doc.setFontSize(12);
      doc.text(`Patient: ${prescription.patientId?.name || "Unknown"}`, 14, 25);
      doc.text(`Doctor: Dr. ${prescription.doctorId?.name || "Unknown"}`, 14, 32);
      doc.text(`Status: ${prescription.status.toUpperCase()}`, 14, 39);

      // Table Data
      const tableColumn = ["Sr No", "Medicine", "Dose & Frequency", "Duration", "Quantity"];
      const tableRows = [];

      prescription.medicines.forEach((m, index) => {
        const rowData = [
          index + 1,
          m.medicineId?.name || "Unknown",
          m.dosage || "-",
          m.duration || "-",
          m.quantity || "-"
        ];
        tableRows.push(rowData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [54, 162, 235], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
      });

      doc.save(`Prescription_${prescription._id}.pdf`);
    } catch(err) {
      console.error(err);
      alert("Failed to download PDF. Please try again.");
    }
  };

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
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedPrescription(p)} className="flex-1 bg-teal-100 hover:bg-teal-200 text-teal-800 font-bold py-2.5 rounded-lg transition-colors text-sm shadow-sm">
                      👁️ View
                    </button>
                    <button onClick={() => downloadPDF(p)} className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-2.5 rounded-lg transition-colors text-sm shadow-sm">
                      📄 PDF
                    </button>
                    <button onClick={() => dispenseMeds(p._id)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-sm transition-colors text-sm">
                      Dispense & Bill
                    </button>
                  </div>
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

        {selectedPrescription && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-teal-800 p-4 flex justify-between items-center">
                <h3 className="text-white font-bold text-lg">Digital Prescription</h3>
                <button onClick={() => setSelectedPrescription(null)} className="text-teal-200 hover:text-white font-bold text-2xl">&times;</button>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="mb-4">
                  <p className="text-xs text-slate-500 uppercase font-black tracking-wider">Patient Name</p>
                  <p className="text-lg font-bold text-slate-800">{selectedPrescription.patientId?.name || "Unknown"}</p>
                  <p className="text-xs text-slate-500 uppercase font-black tracking-wider mt-2">Prescribed By</p>
                  <p className="text-sm font-bold text-slate-600">Dr. {selectedPrescription.doctorId?.name}</p>
                </div>
                <table className="w-full text-sm mt-4 text-left">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-600">
                      <th className="pb-2">Medicine</th>
                      <th className="pb-2">Dose & Freq</th>
                      <th className="pb-2 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPrescription.medicines?.map((m, idx) => (
                      <tr key={idx}>
                        <td className="py-3 font-semibold text-teal-800">{m.medicineId?.name || "Unknown"}</td>
                        <td className="py-3 text-slate-600 font-mono text-xs">{m.dosage} <br/> {m.duration}</td>
                        <td className="py-3 text-right font-black text-slate-800">{m.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 p-4 border-t flex justify-end gap-3">
                <button onClick={() => downloadPDF(selectedPrescription)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
                  Download PDF
                </button>
                <button onClick={() => setSelectedPrescription(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-sm transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
