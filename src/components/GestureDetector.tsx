import { useEffect, useState, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { sendEmergencyAlert } from '../lib/twilio';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

export function GestureDetector() {
  const [shakeCount, setShakeCount] = useState(0);
  const lastShakeRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(true);
  const [sensitivity, setSensitivity] = useState(15);
  const baselineRef = useRef({ x: 0, y: 0, z: 0 });
  const [locationError, setLocationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const locationTimeoutRef = useRef<number | null>(null);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 10000; // 10 seconds
  const LOCATION_TIMEOUT = 30000; // 30 seconds
  const STALE_LOCATION_TIMEOUT = 60000; // 1 minute
  
  const getLocationOptions = (retry: number) => ({
    enableHighAccuracy: retry < 2, // Try high accuracy for first two attempts
    timeout: LOCATION_TIMEOUT * (retry + 1), // Increase timeout with each retry
    maximumAge: retry > 1 ? 60000 : 0 // Allow cached positions after second retry
  });

  const isLocationStale = (position: GeolocationPosition) => {
    const positionTime = position.timestamp;
    const now = Date.now();
    return now - positionTime > STALE_LOCATION_TIMEOUT;
  };

  const handleLocationSuccess = (position: GeolocationPosition) => {
    if (isLocationStale(position)) {
      setLocationError('Location data is stale. Retrying...');
      startLocationWatch(retryCount + 1);
      return;
    }

    const newLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

    // Check if location has actually changed
    if (lastPositionRef.current) {
      const distance = calculateDistance(
        lastPositionRef.current.lat,
        lastPositionRef.current.lng,
        newLocation.lat,
        newLocation.lng
      );
      
      // If location hasn't changed significantly in a while, consider it stale
      if (distance < 1) { // Less than 1 meter change
        if (locationTimeoutRef.current) {
          clearTimeout(locationTimeoutRef.current);
        }
        locationTimeoutRef.current = window.setTimeout(() => {
          setLocationError('Location updates seem stalled. Retrying...');
          startLocationWatch(retryCount + 1);
        }, STALE_LOCATION_TIMEOUT);
      }
    }

    lastPositionRef.current = newLocation;
    setLocation(newLocation);
    setLocationError(null);
    setRetryCount(0);
    setHasLocation(true);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

  const getLocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location services in your device settings.';
      case error.POSITION_UNAVAILABLE:
        return 'Unable to determine your location. Please check your GPS signal.';
      case error.TIMEOUT:
        return 'Location request timed out. Please check your internet connection.';
      default:
        return 'Unable to access location services. Please try again.';
    }
  };

  const startLocationWatch = (retry = 0) => {
    // Clear existing watchers and timeouts
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (locationTimeoutRef.current) {
      clearTimeout(locationTimeoutRef.current);
      locationTimeoutRef.current = null;
    }

    try {
      const options = getLocationOptions(retry);
      
      // Try getCurrentPosition first for immediate feedback
      navigator.geolocation.getCurrentPosition(
        handleLocationSuccess,
        async (error) => {
          // If getCurrentPosition fails, try watchPosition
          watchIdRef.current = navigator.geolocation.watchPosition(
            handleLocationSuccess,
            async (watchError) => {
              console.error('Location watch error:', watchError);
              
              if (retry < MAX_RETRIES) {
                setRetryCount(retry + 1);
                // Exponential backoff
                setTimeout(() => {
                  startLocationWatch(retry + 1);
                }, RETRY_DELAY * Math.pow(2, retry));
              } else {
                setLocationError(getLocationErrorMessage(watchError));
                setHasLocation(false);
                
                // Final fallback: try IP-based geolocation 
                try {
                  const response = await fetch('https://ipapi.co/json/');
                  const data = await response.json();
                  if (data.latitude && data.longitude) {
                    handleLocationSuccess({
                      coords: {
                        latitude: data.latitude,
                        longitude: data.longitude,
                        accuracy: 5000, // Assume 5km accuracy for IP geolocation
                        altitude: null,
                        altitudeAccuracy: null,
                        heading: null,
                        speed: null
                      },
                      timestamp: Date.now()
                    });
                  }
                } catch (ipError) {
                  console.error('IP geolocation failed:', ipError);
                }
              }
            },
            options
          );
        },
        {
          ...options,
          timeout: 5000 // Short timeout for initial position
        }
      );

      // Set a timeout to check for stale location data
      locationTimeoutRef.current = window.setTimeout(() => {
        if (lastPositionRef.current) {
          const now = Date.now();
          const lastUpdate = lastPositionRef.current.timestamp || 0;
          if (now - lastUpdate > STALE_LOCATION_TIMEOUT) {
            setLocationError('Location updates seem stalled. Retrying...');
            startLocationWatch(retry + 1);
          }
        }
      }, STALE_LOCATION_TIMEOUT);

    } catch (error) {
      console.error('Error setting up location watch:', error);
      setLocationError('Failed to initialize location tracking');
      setHasLocation(false);
    }
  };

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/943/943-preview.mp3');
    
    // Calibration period
    setTimeout(() => {
      setIsCalibrating(false);
    }, 2000);

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const { x = 0, y = 0, z = 0 } = acceleration;
      
      if (isCalibrating) {
        baselineRef.current = { x, y, z };
        return;
      }

      const deltaX = Math.abs(x - baselineRef.current.x);
      const deltaY = Math.abs(y - baselineRef.current.y);
      const deltaZ = Math.abs(z - baselineRef.current.z);
      
      const totalAcceleration = deltaX + deltaY + deltaZ;

      if (totalAcceleration > sensitivity) {
        const now = Date.now();
        if (now - lastShakeRef.current > 500) { // Debounce shakes
          // Play feedback sound
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
          }
          
          setShakeCount(prev => prev + 1);
          lastShakeRef.current = now;
          
          // Update baseline for next detection
          baselineRef.current = { x, y, z };
        }
      }
    };

    // Start location tracking
    startLocationWatch();
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, []);

  useEffect(() => {
    const sendAlert = async () => {
      if (shakeCount >= 3 && location) {
        // Reset shake count
        setShakeCount(0);

        // Get emergency contacts
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: contacts } = await supabase
          .from('emergency_contacts')
          .select('*')
          .eq('user_id', user.id);

        if (contacts) {
          // Send alerts to all emergency contacts
          contacts.forEach(contact => {
            sendEmergencyAlert(
              contact.phone_number,
              location,
              'Emergency: SOS gesture detected!'
            );
          });
        }
      }
    };

    sendAlert();
  }, [shakeCount, location]);

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className={`w-6 h-6 ${isCalibrating ? 'text-yellow-400' : 'text-purple-400'}`} />
        <h3 className="text-xl font-semibold">Gesture Detection</h3>
      </div>
      {isCalibrating ? (
        <div className="text-center space-y-2">
          <p className="text-yellow-400">Calibrating sensors...</p>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-yellow-500 h-2 rounded-full animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {locationError && (
            <div className="glass-card p-4 mb-4 bg-red-500/10 border-red-500/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p className="text-red-400 text-sm">{locationError}</p>
              </div>
              <button
                onClick={() => startLocationWatch()}
                className="mt-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          <p className="text-gray-400">
            Shake your device {3 - (shakeCount % 3)} more times to trigger SOS
          </p>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Sensitivity</label>
            <input
              type="range"
              min="10"
              max="20"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>More Sensitive</span>
              <span>Less Sensitive</span>
            </div>
          </div>
        </>
      )}
      <div className="w-full bg-white/10 rounded-full h-2">
        <div
          className="bg-purple-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(shakeCount % 3) * 33.33}%` }}
        />
      </div>
      <div className="flex items-center justify-center gap-2 text-xs">
        {hasLocation ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-green-400 rounded-full"
            />
            <span className="text-green-400">Location tracking active</span>
          </>
        ) : (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"
            />
            <span className="text-purple-400">Acquiring location...</span>
          </>
        )}
      </div>
    </div>
  );
}