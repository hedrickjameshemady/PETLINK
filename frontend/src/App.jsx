import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

import Home from './pages/Home';
import Adopt from './pages/Adopt';
import PetDetail from './pages/PetDetail';
import Volunteer from './pages/Volunteer';
import Donate from './pages/Donate';
import Community from './pages/Community';
import Feedback from './pages/Feedback';
import Login from './pages/Login';
import Register from './pages/Register';
import LostAndFound from './pages/LostAndFound';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import PetsAndAdoptions from './pages/admin/PetsAndAdoptions';
import VolunteersAndDonors from './pages/admin/VolunteersAndDonors';
import CommunityAndCampaigns from './pages/admin/CommunityAndCampaigns';
import AdminLostAndFound from './pages/admin/AdminLostAndFound';

import UserDashboard from './pages/user/UserDashboard';

function ProtectedAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin' && user.role !== 'staff') return <Navigate to="/" replace />;
  return children;
}

function ProtectedUser({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/adopt" element={<Adopt />} />
          <Route path="/adopt/:id" element={<PetDetail />} />
          <Route path="/volunteer" element={<Volunteer />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/community" element={<Community />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/lost-and-found" element={<LostAndFound />} />

          <Route path="/dashboard" element={<ProtectedUser><UserDashboard /></ProtectedUser>} />

          <Route path="/admin" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
            <Route index element={<AdminDashboard />} />
            <Route path="pets" element={<PetsAndAdoptions />} />
            <Route path="volunteers" element={<VolunteersAndDonors />} />
            <Route path="community" element={<CommunityAndCampaigns />} />
            <Route path="lost-and-found" element={<AdminLostAndFound />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}