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

// Redirect logged-in users away from login/register to their correct dashboard
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;
  if (user) {
    if (user.role === 'admin' || user.role === 'staff') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// Admin/staff only — redirect guests to login, redirect regular users to their dashboard
function ProtectedAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin' && user.role !== 'staff') return <Navigate to="/dashboard" replace />;
  return children;
}

// Regular users only — redirect guests to login, redirect admins to /admin
function ProtectedUser({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin' || user.role === 'staff') return <Navigate to="/admin" replace />;
  return children;
}

// Root redirect: send to login if not logged in, or to correct dashboard based on role
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin' || user.role === 'staff') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root: smart redirect based on auth state */}
          <Route path="/" element={<RootRedirect />} />

          {/* Guest-only pages: redirect logged-in users to their dashboard */}
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

          {/* Public pages (accessible to everyone) */}
          <Route path="/home" element={<Home />} />
          <Route path="/adopt" element={<Adopt />} />
          <Route path="/adopt/:id" element={<PetDetail />} />
          <Route path="/volunteer" element={<Volunteer />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/community" element={<Community />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/lost-and-found" element={<LostAndFound />} />

          {/* Regular user dashboard — admins are redirected away */}
          <Route path="/dashboard" element={<ProtectedUser><UserDashboard /></ProtectedUser>} />

          {/* Admin panel — regular users are redirected away */}
          <Route path="/admin" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
            <Route index element={<AdminDashboard />} />
            <Route path="pets" element={<PetsAndAdoptions />} />
            <Route path="volunteers" element={<VolunteersAndDonors />} />
            <Route path="community" element={<CommunityAndCampaigns />} />
            <Route path="lost-and-found" element={<AdminLostAndFound />} />
          </Route>

          {/* Fallback: unknown routes go to root (which then smart-redirects) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}