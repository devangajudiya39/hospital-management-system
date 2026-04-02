import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HospitalHomepage from './component/utils/HospitalHomepage';
import Login from './component/auth/Login';
import Signup from './component/auth/Signup';
import ForgotPass from './component/auth/ForgotPass';
import ResetPass from './component/auth/ResetPass';
import Doctor_Des from './component/doctor/Doctor_Des';
import PatientDashboard from './component/paisant/PatientDashboard';
import AdminDashboard from './component/admin/AdminDashboard';
import ReceptionistDashboard from './component/receptionist/ReceptionistDashboard';
import PharmacyDashboard from './component/pharmacy/PharmacyDashboard';
import LabDashboard from './component/lab/LabDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HospitalHomepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPass />} />
        <Route path="/reset-password" element={<ResetPass />} />
        <Route path="/doctor-dashboard" element={<Doctor_Des />} />
        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/receptionist-dashboard" element={<ReceptionistDashboard />} />
        <Route path="/pharmacist-dashboard" element={<PharmacyDashboard />} />
        <Route path="/lab_staff-dashboard" element={<LabDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
