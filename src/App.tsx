import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Home, Bell, Shield, Settings, Menu, MapPin, Phone, FileText } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import Dashboard from './pages/dashboard/Dashboard';
import Profile from './pages/profile/Profile';
import EmergencyContacts from './pages/contacts/EmergencyContacts';
import SafeRoutes from './pages/routes/SafeRoutes';
import Recordings from './pages/recordings/Recordings';
import { useAuth, initAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = React.useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setIsNavigating(true);
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading || isNavigating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
          <p className="text-purple-400 animate-pulse">Loading your secure dashboard...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
};

const MobileNav = () => {
  const location = useLocation();
  
  return (
    <nav className="mobile-nav">
      <Link to="/dashboard" className={`mobile-nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
        <Shield size={24} />
        <span className="text-xs">Emergency</span>
      </Link>
      <Link to="/contacts" className={`mobile-nav-item ${location.pathname === '/contacts' ? 'active' : ''}`}>
        <Phone size={24} />
        <span className="text-xs">Contacts</span>
      </Link>
      <Link to="/routes" className={`mobile-nav-item ${location.pathname === '/routes' ? 'active' : ''}`}>
        <MapPin size={24} />
        <span className="text-xs">Routes</span>
      </Link>
      <Link to="/recordings" className={`mobile-nav-item ${location.pathname === '/recordings' ? 'active' : ''}`}>
        <FileText size={24} />
        <span className="text-xs">Records</span>
      </Link>
      <Link to="/profile" className={`mobile-nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
        <Settings size={24} />
        <span className="text-xs">Profile</span>
      </Link>
    </nav>
  );
};

function App() {
  useEffect(() => {
    // Initialize auth
    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      useAuth.getState().setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/contacts" element={<PrivateRoute><EmergencyContacts /></PrivateRoute>} />
          <Route path="/routes" element={<PrivateRoute><SafeRoutes /></PrivateRoute>} />
          <Route path="/recordings" element={<PrivateRoute><Recordings /></PrivateRoute>} />
        </Routes>
      </AnimatePresence>
      {useAuth().user && <MobileNav />}
      </div>
    </BrowserRouter>
  );
}

export default App;
