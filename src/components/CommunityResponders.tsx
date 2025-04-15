import React, { useState, useEffect, useRef } from 'react';
import { Users, BadgeCheck, Award, MessageSquare, MapPin, Navigation } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface NearbyUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  distance: number;
  rating: number;
  is_verified: boolean;
  status: string;
  last_active: string;
}

interface ManualLocation {
  lat: number;
  lng: number;
}

export function CommunityResponders() {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000; // 5 seconds
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const locationTimeoutRef = useRef<number | null>(null);
  const LOCATION_TIMEOUT = 30000; // 30 seconds
  const STALE_LOCATION_THRESHOLD = 60000; // 1 minute

  const getLocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location services in your browser settings or enter your location manually.';
      case error.POSITION_UNAVAILABLE:
        return 'Unable to determine your location. You can enter your location manually.';
      case error.TIMEOUT:
        return 'Location request timed out. You can enter your location manually.';
      default:
        return 'Unable to access location services. You can enter your location manually.';
    }
  };

  const startLocationWatch = (retry = 0) => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (locationTimeoutRef.current) {
      clearTimeout(locationTimeoutRef.current);
      locationTimeoutRef.current = null;
    }

    const options = {
      enableHighAccuracy: retry < 2,
      timeout: LOCATION_TIMEOUT * (retry + 1),
      maximumAge: retry > 1 ? 60000 : 0
    };

    try {
      // Try getCurrentPosition first for immediate feedback
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const now = Date.now();
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: now
          };
          
          lastPositionRef.current = newLocation;
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationError(null);
          setRetryCount(0);
          
          // Start watching for updates
          startWatchPosition(options, retry);
        },
        (error) => {
          console.error('Initial position error:', error);
          setLocationError(getLocationErrorMessage(error));
          setShowManualInput(true);
          // Fall back to watch position
          startWatchPosition(options, retry);
        },
        { ...options, timeout: 5000 } // Short timeout for initial position
      );
    } catch (error) {
      console.error('Error starting location watch:', error);
      setLocationError('Failed to initialize location tracking. You can enter your location manually.');
      setShowManualInput(true);
      setLoading(false);
    }
  };

  const startWatchPosition = (options: PositionOptions, retry: number) => {
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        
        // Check if position is stale
        if (now - position.timestamp > STALE_LOCATION_THRESHOLD) {
          setLocationError('Location data is stale. Retrying...');
          startLocationWatch(retryCount + 1);
          return;
        }
        
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: now
        };
        
        lastPositionRef.current = newLocation;
        setCurrentLocation({
          lat: newLocation.lat,
          lng: newLocation.lng
        });
        setLocationError(null);
        setRetryCount(0);
      },
      (error) => {
        console.error('Location error:', error);
        setLocationError(getLocationErrorMessage(error));
        setShowManualInput(true);

        if (retry < MAX_RETRIES) {
          setTimeout(() => {
            setRetryCount(retry + 1);
            startLocationWatch(retry + 1);
          }, RETRY_DELAY * Math.pow(2, retry));
        } else {
          setLoading(false);
        }
      },
      options
    );
  };

  useEffect(() => {
    startLocationWatch(retryCount);
    
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (currentLocation) {
      fetchNearbyUsers(currentLocation);
    }
  }, [currentLocation]);

  const fetchNearbyUsers = async (location: { lat: number; lng: number }) => {
    try {
      const { data, error } = await supabase.rpc(
        'get_nearby_users',
        {
          user_lat: location.lat,
          user_lon: location.lng,
          radius_meters: 5000,
          limit_count: 10
        }
      );

      if (error) throw error;
      if (data) setNearbyUsers(data);
    } catch (error) {
      console.error('Error fetching nearby users:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Users size={24} className="text-purple-400" />
          Community Responders
        </h3>
        <span className="text-sm text-green-400">
          {locationError ? '—' : `${nearbyUsers.length} Active Nearby`}
        </span>
      </div>

      {locationError && (
        <div className="glass-card p-4 mb-4 bg-red-500/10 border-red-500/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm">{locationError}</p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => startLocationWatch(0)}
              className="neon-button !p-2 flex items-center gap-2"
            >
              <Navigation size={16} />
              Try Again
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full"
          />
        </div>
      ) : nearbyUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No community responders found nearby
        </div>
      ) : (
        <div className="space-y-3">
          {nearbyUsers.map(user => (
            <div key={user.id} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center overflow-hidden">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users size={20} className="text-purple-400" />
                    )}
                  </div>
                  {user.is_verified && (
                    <BadgeCheck size={16} className="absolute -bottom-1 -right-1 text-green-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.full_name}</span>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      {formatDistance(user.distance)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Award size={14} className="text-yellow-400" />
                      <span>{user.rating.toFixed(1)} Rating</span>
                    </div>
                    <span>•</span>
                    <span>{getTimeAgo(user.last_active)}</span>
                  </div>
                </div>
              </div>
              <button className="neon-button !p-2">
                <MessageSquare size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}