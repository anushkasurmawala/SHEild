import { useState, useEffect } from 'react';
import { Plus, MapPin, X } from 'lucide-react';
import { Map } from './Map';
import { supabase } from '../lib/supabase';
import type { SafeZone } from '../types/database';
import { sendEmergencyAlert, sendLocationUpdate } from '../lib/twilio';
import { SafeZoneModal } from './SafeZoneModal';

interface SafeZoneMapProps {
  currentLocation: [number, number] | null;
}

export function SafeZoneMap({ currentLocation }: SafeZoneMapProps) {
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<[number, number] | null>(currentLocation);
  const [isSharing, setIsSharing] = useState(false);
  const [showAddZone, setShowAddZone] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [safetyScore, setSafetyScore] = useState(100);
  const [showExitAlert, setShowExitAlert] = useState(false);
  const [exitedZone, setExitedZone] = useState<SafeZone | null>(null);
  const [lastNotificationTime, setLastNotificationTime] = useState<Record<string, number>>({});
  const NOTIFICATION_COOLDOWN = 300000; // 5 minutes in milliseconds
  const [selectedZone, setSelectedZone] = useState<SafeZone | null>(null);
  const [showEditZone, setShowEditZone] = useState(false);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch safe zones
    const { data: zonesData } = await supabase
      .from('safe_zones')
      .select('*')
      .eq('user_id', user.id);

    if (zonesData) setSafeZones(zonesData);

    // Fetch emergency contacts
    const { data: contactsData } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id);

    if (contactsData) setEmergencyContacts(contactsData);

    // Check if location is already being shared
    const { data: shareData, error } = await supabase
      .from('location_shares')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true);

    // If we found any active shares, set sharing to true
    if (!error && shareData && shareData.length > 0) {
      setIsSharing(true);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (currentLocation) {
      setLocation(currentLocation);
    }
  }, [currentLocation]);

  const toggleLocationSharing = async () => {
    if (!location) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!isSharing) {
      // Start sharing
      await supabase
        .from('location_shares')
        .upsert({
          user_id: user.id,
          contact_ids: emergencyContacts.map(c => c.id),
          active: true,
          last_location: {
            latitude: location[0],
            longitude: location[1]
          }
        });

      // Notify contacts
      emergencyContacts.forEach(contact => {
        sendLocationUpdate(
          contact.phone_number,
          { lat: location[0], lng: location[1] },
          'Location sharing started'
        );
      });

      setIsSharing(true);
    } else {
      // Stop sharing
      await supabase
        .from('location_shares')
        .update({ active: false })
        .eq('user_id', user.id);

      // Notify contacts
      emergencyContacts.forEach(contact => {
        sendLocationUpdate(
          contact.phone_number,
          { lat: location[0], lng: location[1] },
          'Location sharing stopped'
        );
      });

      setIsSharing(false);
    }
  };

  const checkSafeZones = async (lat: number, lng: number) => {
    let isInAnySafeZone = false;
    let exitedZoneFound = null;
    
    // Check all safe zones
    for (const zone of safeZones) {
      if (!zone.latitude || !zone.longitude || !zone.radius) return false;
      
      const distance = getDistance(
        lat,
        lng,
        zone.latitude,
        zone.longitude
      );
      
      const isInThisZone = distance <= (zone.radius * 1000);
      
      if (isInThisZone) {
        isInAnySafeZone = true;
        break; // No need to check other zones if we're in one
      }
      
      // Only track exited zone if we're not in any other zone
      if (!isInAnySafeZone && distance > zone.radius * 1000) {
        exitedZoneFound = zone;
      }
    }

    // Calculate safety score based on proximity to safe zones
    const distances = safeZones.map(zone => {
      if (!zone.latitude || !zone.longitude || !zone.radius) return Infinity;
      return getDistance(lat, lng, zone.latitude, zone.longitude);
    });

    const minDistance = Math.min(...distances);
    // Adjust score calculation to account for kilometers
    const score = Math.max(0, Math.min(100, 100 - (minDistance / 1000 * 20))); // 50m per 1% reduction
    setSafetyScore(Math.round(score));

    // Only show exit alert if we're not in any safe zone and we found an exited zone
    if (!isInAnySafeZone && exitedZoneFound) {
        const now = Date.now();
        const lastNotification = lastNotificationTime[exitedZoneFound.id] || 0;

        // Only show alert and send notifications if cooldown has passed
        if (now - lastNotification > NOTIFICATION_COOLDOWN) {
          // Play alert sound
          const audio = new Audio('https://www.soundjay.com/mechanical/sounds/alarm-1.mp3');
          audio.play();

          setLastNotificationTime(prev => ({
            ...prev,
            [exitedZoneFound.id]: now
          }));

          // // Send notifications to emergency contacts
          // emergencyContacts.forEach(contact => {
          //   sendEmergencyAlert(
          //     contact.phone_number,
          //     { lat, lng },
          //     `Alert: User has left the safe zone "${exitedZoneFound.name}"!`
          //   );
          // });
        }

        setExitedZone(exitedZoneFound);
        setShowExitAlert(true);

        // Auto-hide alert after 10 seconds
        setTimeout(() => {
          setShowExitAlert(false);
          setExitedZone(null);
        }, 10000);
    }
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const handleLocationUpdate = (lat: number, lng: number) => {
    checkSafeZones(lat, lng);
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      const { error } = await supabase
        .from('safe_zones')
        .delete()
        .eq('id', zoneId);

      if (error) throw error;
      
      // Refresh safe zones
      fetchData();
    } catch (err) {
      console.error('Error deleting safe zone:', err);
    }
  };

  const handleEditZone = (zone: SafeZone) => {
    setSelectedZone(zone);
    setShowEditZone(true);
  };

  if (loading) {
    return <div>Loading map...</div>;
  }

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Safe Zones</h3>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-400">Safety Score</div>
            <div className={`text-xl font-bold ${
              safetyScore > 80 ? 'text-green-400' :
              safetyScore > 50 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {safetyScore}%
            </div>
          </div>
          <button
            onClick={() => setShowAddZone(true)}
            className="neon-button !p-2"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
      
      {/* Safe Zone Exit Alert */}
      {showExitAlert && exitedZone && (
        <div className="glass-card p-4 mb-4 bg-red-500/20 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-red-400">Safe Zone Exit Alert</h4>
              <p className="text-sm text-gray-300">
                You have left the safe zone: {exitedZone.name}
              </p>
            </div>
            <button
              onClick={() => {
                setShowExitAlert(false);
                setExitedZone(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Safe Zones List */}
      <div className="space-y-2">
        {safeZones.map(zone => (
          <div key={zone.id} className="glass-card p-3 flex items-center justify-between">
            <div>
              <h4 className="font-medium">{zone.name}</h4>
              {zone.address && (
                <p className="text-sm text-gray-400">{zone.address}</p>
              )}
              <p className="text-xs text-purple-400">
                Radius: {zone.radius ? (zone.radius / 1000).toFixed(1) : 0}km
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEditZone(zone)}
                className="neon-button !p-2"
              >
                <MapPin size={16} />
              </button>
              <button
                onClick={() => handleDeleteZone(zone.id)}
                className="neon-button !p-2 !border-red-500 hover:!border-red-400"
              >
                <X size={16} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {location ? (
        <Map 
          center={location}
          safeZones={safeZones}
          currentLocation={location}
          onLocationUpdate={handleLocationUpdate}
          isSharing={isSharing}
        />
      ) : (
        <Map 
          center={[0, 0]}
          safeZones={safeZones}
          onLocationUpdate={handleLocationUpdate}
          isSharing={isSharing}
        />
      )}
      <button
        onClick={toggleLocationSharing}
        className={`neon-button w-full flex items-center justify-center gap-2 ${
          isSharing ? 'bg-purple-500/20' : ''
        }`}
      >
        {isSharing ? 'Stop Sharing Location' : 'Share Location'}
      </button>

      {location && (
        <SafeZoneModal
          isOpen={showAddZone}
          onClose={() => setShowAddZone(false)}
          onSuccess={() => {
            // Refresh safe zones
            fetchData();
            setShowAddZone(false);
          }}
          currentLocation={location}
        />
      )}

      {location && showEditZone && selectedZone && (
        <SafeZoneModal
          isOpen={showEditZone}
          onClose={() => {
            setShowEditZone(false);
            setSelectedZone(null);
          }}
          onSuccess={() => {
            fetchData();
            setShowEditZone(false);
            setSelectedZone(null);
          }}
          currentLocation={location}
          editZone={selectedZone}
        />
      )}
    </div>
  );
}