import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  FileText,
  Moon,
  Phone,
  Sun,
  LogOut,
  Shield,
  Mail,
  UserCircle,
  AlertTriangle,
  Plus,
  ChevronRight,
  Siren,
  MapPin,
  MapPinned,
  Navigation,
  MessageSquare,
  Radio,
  FileWarning,
  Share2,
  Users,
  Award,
  BadgeCheck,
  Building2,
  AlertOctagon,
  X
} from 'lucide-react';
import { sendEmergencyAlert, callPolice, textWomenHelpline } from '../../lib/twilio';
import { QuickRecord } from '../../components/QuickRecord';
import { FakeCall } from '../../components/FakeCall';
import { EmergencyContactModal } from '../../components/EmergencyContactModal';
import { GestureDetector } from '../../components/GestureDetector';
import { CommunityResponders } from '../../components/CommunityResponders';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useCallback } from 'react';

const mockAlerts = [
  { id: 1, type: 'emergency', message: 'Suspicious activity reported near Central Park', time: '2 mins ago' },
  { id: 2, type: 'incident', message: 'New safety advisory issued for downtown area', time: '1 hour ago' },
  { id: 3, type: 'update', message: 'Your incident report #2024-03 has been processed', time: '3 hours ago' },
];

const mockIncidents = [
  { id: 1, status: 'processing', title: 'Harassment Report', date: '2024-03-15', location: 'Downtown' },
  { id: 2, status: 'completed', title: 'Suspicious Activity', date: '2024-03-10', location: 'Central Park' },
];

const mockCommunityResponders = [
  { id: 1, name: 'Emily Chen', distance: '0.3 km', rating: 4.9, verified: true },
  { id: 2, name: 'Maria Garcia', distance: '0.5 km', rating: 4.8, verified: true },
  { id: 3, name: 'John Smith', distance: '0.8 km', rating: 4.7, verified: true },
];

interface Incident {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  category: string;
  latitude: number;
  longitude: number;
  created_at: string;
  distance: number;
}

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    title: '',
    description: '',
    category: 'other',
    severity: 'medium'
  });
  const [darkMode, setDarkMode] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [sosActive, setSosActive] = React.useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState(Date.now());
  const [showAddContact, setShowAddContact] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      // Fetch emergency contacts and incidents in parallel
      const [contactsResponse, incidentsResponse] = await Promise.all([
        supabase
          .from('emergency_contacts')
          .select('*')
          .eq('user_id', user.id),
        currentLocation ? supabase.rpc(
          'get_nearby_incidents',
          { 
            user_lat: currentLocation.lat,
            user_lon: currentLocation.lng,
            radius_meters: 5000
          }
        ) : supabase
          .from('incidents')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (contactsResponse.error) throw contactsResponse.error;
      if (incidentsResponse?.error) throw incidentsResponse.error;

      setEmergencyContacts(contactsResponse.data || []);
      setIncidents(incidentsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentLocation]);

  useEffect(() => {
    if (user) {
      // Get current location first
      try {
        const options = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        };

        const fallbackOptions = {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000
        };

        const handleSuccess = (position: GeolocationPosition) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationError(null);
        };

        const handleError = (error: GeolocationPositionError) => {
          console.warn('Geolocation error:', error);
          setLocationError('Unable to get precise location. Showing all incidents.');
          // Continue with fetchData even without location
          fetchData();
        };

        // Try high accuracy first
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          () => {
            // If high accuracy fails, try with lower accuracy
            navigator.geolocation.getCurrentPosition(
              handleSuccess,
              handleError,
              fallbackOptions
            );
          },
          options
        );
      } catch (error) {
        console.error('Error accessing geolocation:', error);
        setLocationError('Location services not available. Showing all incidents.');
        // Continue with fetchData even without location
        fetchData();
      }
    }
  }, [user, fetchData]);

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const incidentData = {
        user_id: user.id,
        title: reportForm.title,
        description: reportForm.description,
        category: reportForm.category,
        severity: reportForm.severity,
        status: 'pending'
      };

      // Add location if available
      if (currentLocation) {
        Object.assign(incidentData, {
          latitude: currentLocation.lat,
          longitude: currentLocation.lng
        });
      }

      const { error } = await supabase
        .from('incidents')
        .insert(incidentData);

      if (error) throw error;

      setShowReportModal(false);
      setReportForm({
        title: '',
        description: '',
        category: 'other',
        severity: 'medium'
      });

      // Refresh incidents
      fetchData();
    } catch (error) {
      console.error('Error reporting incident:', error);
    }
  };

  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
          <p className="text-purple-400 animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const handlePullToRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
      setLastRefresh(Date.now());
    }, 1500);
  };

  const handleSOS = async () => {
    if (!emergencyContacts || emergencyContacts.length === 0) {
      alert('Please add emergency contacts first');
      return;
    }

    setSosActive(true);

    try {
      // Send alerts sequentially to avoid overwhelming the edge function
      for (const contact of emergencyContacts) {
        await sendEmergencyAlert(
          contact.phone_number.trim(),
          currentLocation || { lat: 0, lng: 0 }, // Fallback coordinates if location is not available
          `EMERGENCY: ${profile?.full_name || 'A user'} needs immediate assistance!`
        );
      }

      if (user) {
        const incidentData = {
          user_id: user.id,
          title: 'SOS Emergency Alert',
          description: 'Emergency assistance requested via SOS button',
          severity: 'critical',
          category: 'other',
          status: 'pending'
        };

        // Add location if available
        if (currentLocation) {
          Object.assign(incidentData, {
            latitude: currentLocation.lat,
            longitude: currentLocation.lng
          });
        }

        await supabase
          .from('incidents')
          .insert(incidentData);
      }
    } catch (error) {
      console.error('Error in SOS:', error);
    } finally {
      setSosActive(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 space-y-6 pb-24"
    >
      {locationError && (
        <div className="glass-card p-4 mb-4 bg-yellow-500/10 border-yellow-500/50">
          <p className="text-yellow-400 text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            {locationError}
          </p>
        </div>
      )}

      {refreshing && (
        <div className="pull-to-refresh">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-6 h-6 border-2 border-white rounded-full border-t-transparent"
          />
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330"
              alt="Profile"
              className="w-12 h-12 rounded-full border-2 border-purple-500 active:border-pink-500 transition-colors duration-300"
            />
            <div className="absolute inset-0 rounded-full animate-glow"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Welcome back, {profile?.full_name || 'User'}!
            </h1>
            <p className="text-gray-300">Stay safe and connected</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="neon-button !p-2"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="neon-button !p-2 relative"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full"></span>
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-80 glass-card p-4 z-50"
                >
                  <h3 className="font-semibold mb-3">Recent Notifications</h3>
                  <div className="space-y-2">
                    {mockAlerts.map(alert => (
                      <div key={alert.id} className="flex items-start space-x-3 p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <AlertTriangle size={16} className="text-pink-500 mt-1" />
                        <div>
                          <p className="text-sm">{alert.message}</p>
                          <p className="text-xs text-gray-400">{alert.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={() => signOut()} 
            className="neon-button !p-2"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-4">
        {/* Incident Reports */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-purple-400" />
              {currentLocation ? 'Nearby Incidents' : 'Recent Incidents'}
            </h2>
            <button
              onClick={() => setShowReportModal(true)}
              className="neon-button !p-2"
            >
              <FileText size={20} />
            </button>
          </div>
          <div className="space-y-4">
            {incidents.length === 0 ? (
              <p className="text-center text-gray-400">No incidents reported</p>
            ) : incidents.map(incident => (
              <div key={incident.id} className="p-4 glass-card space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{incident.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      incident.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      incident.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      incident.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {incident.severity}
                    </span>
                    {incident.distance && (
                      <span className="text-xs text-gray-400">
                        {Math.round(incident.distance / 1000)}km away
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  <p>{incident.description}</p>
                  <p className="mt-1 text-xs">
                    {new Date(incident.created_at).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })} • {incident.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SOS Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSOS}
          className={`glass-card p-6 flex items-center justify-center gap-4 ${
            sosActive ? 'bg-red-500/20 border-red-500' : ''
          }`}
        >
          <Siren
            size={32}
            className={`${
              sosActive ? 'text-red-500 animate-pulse' : 'text-purple-400'
            }`}
          />
          <div className="text-left">
            <h3 className="font-bold text-lg">SOS Alert</h3>
            <p className="text-sm text-gray-400">
              {sosActive ? 'Alerting contacts...' : 'Tap for emergency'}
            </p>
          </div>
        </motion.button>

        {/* Live Location */}
        <div className="glass-card p-6 flex items-center gap-4">
          <MapPin size={32} className="text-purple-400" />
          <div className="flex-1">
            <h3 className="font-bold text-lg">Live Location</h3>
            <p className="text-sm text-gray-400">
              {currentLocation ? 'Sharing with 3 contacts' : 'Location unavailable'}
            </p>
          </div>
          <Share2 size={20} className="text-purple-400" />
        </div>

        <FakeCall />
      </div>

      <QuickRecord />
      <GestureDetector />

        {/* Emergency Services */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Radio size={24} className="text-purple-400" />
            Emergency Services
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => callPolice()}
              className="neon-button flex items-center justify-center gap-2"
            >
              <Phone size={16} />
              <span>Police</span>
            </button>
            <button
              onClick={() => textWomenHelpline(currentLocation || { lat: 0, lng: 0 })}
              className="neon-button flex items-center justify-center gap-2"
            >
              <MessageSquare size={16} />
              <span>Chat</span>
            </button>
          </div>
        </div>

      {/* Community & Government Support */}
      <div className="grid grid-cols-1 gap-4">
        {/* Community SOS Network */}
        <CommunityResponders />

        {/* Police & Authority Integration */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Building2 size={24} className="text-purple-400" />
              Authority Integration
            </h3>
            <span className="text-sm text-green-400">Connected</span>
          </div>
          <div className="space-y-4">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertOctagon size={20} className="text-purple-400" />
                  <span className="font-medium">Incident Verification</span>
                </div>
                <span className="text-sm text-green-400">Active</span>
              </div>
              <p className="text-sm text-gray-400">
                All reports are automatically logged with local authorities
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="neon-button flex items-center justify-center gap-2">
                <FileWarning size={16} />
                <span>File Report</span>
              </button>
              <button className="neon-button flex items-center justify-center gap-2">
                <MessageSquare size={16} />
                <span>Contact Police</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Report Incident Modal */}
      {showReportModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="glass-card w-full max-w-md p-6 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                Report Incident
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleReportIncident} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  required
                  className="input-field"
                  placeholder="Brief description of the incident"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Description
                </label>
                <textarea
                  value={reportForm.description}
                  onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                  required
                  className="input-field min-h-[100px]"
                  placeholder="Detailed description of what happened"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Category
                  </label>
                  <select
                    value={reportForm.category}
                    onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                    className="input-field"
                  >
                    <option value="harassment">Harassment</option>
                    <option value="suspicious_activity">Suspicious Activity</option>
                    <option value="theft">Theft</option>
                    <option value="assault">Assault</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Severity
                  </label>
                  <select
                    value={reportForm.severity}
                    onChange={(e) => setReportForm({ ...reportForm, severity: e.target.value })}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="neon-button flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="neon-button flex-1 flex items-center justify-center gap-2"
                >
                  <FileText size={20} />
                  <span>Submit Report</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Dashboard;