import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [revenue, setRevenue] = useState({ totalRevenue: 0, billsCount: 0 });
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "doctor" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");
    fetchData(token);
  }, [navigate]);

  const fetchData = async (token) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [uRes, revRes] = await Promise.all([
        fetch("http://localhost:8080/api/admin/users", { headers }),
        fetch("http://localhost:8080/api/admin/revenue", { headers })
      ]);
      if(uRes.ok) setUsers(await uRes.json());
      if(revRes.ok) setRevenue(await revRes.json());
    } catch (e) { console.error(e); }
  };

  const toggleStatus = async (id) => {
    const token = localStorage.getItem("token");
    await fetch(`http://localhost:8080/api/admin/deactivate-user/${id}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` }
    });
    fetchData(token);
  };

  const createUser = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:8080/api/admin/create-user", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(newUser)
    });
    const data = await res.json();
    if(res.ok) {
      alert("User created successfully!");
      setNewUser({ name: "", email: "", password: "", role: "doctor" });
      fetchData(token);
    } else {
      alert(data.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center bg-teal-800 text-white p-6 rounded-2xl shadow-md mb-8">
          <h1 className="text-3xl font-bold">Hospital Administration</h1>
          <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="text-teal-200 font-bold hover:text-white transition-colors">Logout</button>
        </header>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Total Revenue</p>
            <p className="text-3xl font-black text-emerald-600 mt-2">₹{revenue.totalRevenue}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Processed Bills</p>
            <p className="text-3xl font-black text-teal-600 mt-2">{revenue.billsCount}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Active Staff</p>
            <p className="text-3xl font-black text-blue-600 mt-2">{users.filter(u=>u.isActive && u.role!=='patient').length}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border h-fit">
            <h2 className="font-bold text-xl text-slate-800 mb-4">Add New Staff</h2>
            <form onSubmit={createUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
                <input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-teal-500" value={newUser.name} onChange={e=>setNewUser({...newUser, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                <input required type="email" className="w-full border p-2 rounded focus:ring-2 focus:ring-teal-500" value={newUser.email} onChange={e=>setNewUser({...newUser, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Password</label>
                <input required type="password" className="w-full border p-2 rounded focus:ring-2 focus:ring-teal-500" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Role</label>
                <select className="w-full border p-2 rounded focus:ring-2 focus:ring-teal-500" value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value})}>
                  <option value="doctor">Doctor</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="lab_staff">Lab Staff</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-teal-600 text-white font-bold py-2 rounded hover:bg-teal-700 transition-colors">Create User</button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="font-bold text-xl text-slate-800 mb-4">Staff Directory</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-semibold">{u.name}</td>
                      <td className="p-3 text-sm text-slate-500">{u.email}</td>
                      <td className="p-3 uppercase text-xs font-bold text-teal-600">{u.role.replace("_", " ")}</td>
                      <td className="p-3 text-xs font-bold">
                        {u.isActive ? <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Active</span> : <span className="text-rose-500 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">Inactive</span>}
                      </td>
                      <td className="p-3">
                        {u.role !== "admin" && (
                          <button onClick={() => toggleStatus(u._id)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-600 transition-colors">
                            Toggle Status
                          </button>
                        )}
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
  );
}
