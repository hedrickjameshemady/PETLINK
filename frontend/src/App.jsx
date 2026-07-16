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
import VolunteerRecords from './pages/admin/VolunteerRecords';
import Donors from './pages/admin/Donors';
import CommunityAndCampaigns from './pages/admin/CommunityAndCampaigns';
import AdminLostAndFound from './pages/admin/AdminLostAndFound';
import ManageAccounts from './pages/admin/ManageAccounts';
import FosterApplicants from './pages/admin/FosterApplicants';

import UserDashboard from './pages/user/UserDashboard';
import Profile from './pages/Profile';
import ChatWidget from './components/ChatWidget';
import AdminMessages from './pages/admin/AdminMessages';

// Any staff-type role that belongs inside the /admin panel
const STAFF_ROLES = ['admin', 'staff', 'foster', 'lost_found_manager'];
const isStaff = (u) => u && STAFF_ROLES.includes(u.role);

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;
  if (user) {
    if (isStaff(user)) return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function ProtectedAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isStaff(user)) return <Navigate to="/dashboard" replace />;
  return children;
}

function ProtectedUser({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isStaff(user)) return <Navigate to="/admin" replace />;
  return children;
}

// Root doorman: staff-type users who open the site go straight to the admin panel
function RootGate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;
  if (isStaff(user)) return <Navigate to="/admin" replace />;
  return <Home />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root: admins go to /admin, everyone else sees the landing page */}
          <Route path="/" element={<RootGate />} />

          {/* Guest-only: redirect logged-in users to their dashboard */}
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

          {/* Public pages — accessible to everyone */}
          <Route path="/home" element={<Home />} />
          <Route path="/adopt" element={<Adopt />} />
          <Route path="/adopt/:id" element={<PetDetail />} />
          <Route path="/volunteer" element={<Volunteer />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/community" element={<Community />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/lost-and-found" element={<LostAndFound />} />

          {/* User dashboard */}
          <Route path="/dashboard" element={<ProtectedUser><UserDashboard /></ProtectedUser>} />

          {/* Profile — any logged-in user (including admin/staff) */}
          <Route path="/profile" element={<Profile />} />

          {/* Admin panel */}
          <Route path="/admin" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
            <Route index element={<AdminDashboard />} />
            <Route path="pets" element={<PetsAndAdoptions />} />
            <Route path="volunteers" element={<VolunteerRecords />} />
            <Route path="donors" element={<Donors />} />
            <Route path="community" element={<CommunityAndCampaigns />} />
            <Route path="lost-and-found" element={<AdminLostAndFound />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="accounts" element={<ManageAccounts />} />
            <Route path="foster-applicants" element={<FosterApplicants />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* The floating chat bubble. It hides itself for admins and logged-out visitors. */}
        <ChatWidget />
      </BrowserRouter>
    </AuthProvider>
  );
}