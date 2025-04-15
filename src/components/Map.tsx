import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { SafeZone } from '../types/database';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

// Fix default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  center: [number, number];
  safeZones?: SafeZone[];
  currentLocation?: [number, number];
  onLocationUpdate?: (lat: number, lng: number) => void;
  isSharing?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  isEditable?: boolean;
}

const MapClickHandler = ({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

const LocationTracker = ({ onLocationUpdate, isSharing }: { onLocationUpdate?: (lat: number, lng: number) => void, isSharing?: boolean }) => {
  const map = useMap();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 2000; // 2 seconds between retries
  const LOCATION_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 10000, // 10 seconds
    maximumAge: 0
  };

  useEffect(() => {
    if (!onLocationUpdate) return;

    const requestLocation = () => {
      try {
        // Clear existing watch if any
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }

        // Get initial position first
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            
            // Only update map if coordinates are valid
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
              throw new Error('Invalid coordinates received');
            }
            
            onLocationUpdate(latitude, longitude);
            
            // Only set view if map is properly initialized
            if (map && map.getContainer()) {
              map.setView([latitude, longitude], map.getZoom());
            }
            
            setRetryAttempt(0); // Reset retry count on success

            if (isSharing) {
              updateLocationShare(latitude, longitude);
            }
            
            // Start watching position after getting initial location
            startWatchPosition();
          },
          (error) => {
            console.error('Error getting initial location:', error);
            setLocationError(getLocationErrorMessage(error));

            if (retryAttempt < MAX_RETRIES) {
              setRetryAttempt(prev => prev + 1);
              // Retry with exponential backoff
              setTimeout(() => {
                requestLocation();
              }, RETRY_DELAY * Math.pow(2, retryAttempt));
            } else {
              startWatchPosition(); // Try watch position as fallback
            }
          },
          LOCATION_OPTIONS
        );
      } catch (error) {
        console.error('Location error:', error);
        setLocationError('Failed to get location access');
      }
    };

    const startWatchPosition = () => {
      try {
        const id = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
              return;
            }
            
            onLocationUpdate(latitude, longitude);
            
            if (map && map.getContainer()) {
              map.setView([latitude, longitude], map.getZoom());
            }
            
            if (isSharing) {
              updateLocationShare(latitude, longitude);
            }
            
            setLocationError(null);
          },
          (error) => {
            console.error('Watch position error:', error);
            setLocationError(getLocationErrorMessage(error));
          },
          LOCATION_OPTIONS
        );
        
        setWatchId(id);
      } catch (error) {
        console.error('Location error:', error);
        if (error instanceof GeolocationPositionError) {
          if (retryAttempt < MAX_RETRIES) {
            setRetryAttempt(prev => prev + 1);
            // Retry with exponential backoff
            setTimeout(() => {
              requestLocation();
            }, RETRY_DELAY * Math.pow(2, retryAttempt));
          } else {
            setLocationError(getLocationErrorMessage(error as GeolocationPositionError));
          }
        } else {
          setLocationError('Failed to get location access');
        }
      }
    };

    requestLocation();
    
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [map, onLocationUpdate, isSharing]);

  const updateLocationShare = async (latitude: number, longitude: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('location_shares')
      .upsert({
        user_id: user.id,
        last_location: { latitude, longitude },
        active: true,
        updated_at: new Date().toISOString()
      });
  };

  if (!map || !map.getContainer()) {
    return (
      <div className="absolute top-2 left-2 right-2 z-[1000] bg-purple-500/20 text-white px-4 py-2 rounded-lg text-sm">
        Accessing your location...
      </div>
    );
  }

  if (locationError) {
    return (
      <div className="absolute top-2 left-2 right-2 z-[1000] bg-red-500/20 text-white px-4 py-2 rounded-lg text-sm">
        {locationError}
      </div>
    );
  }

  return null;
};

const getLocationErrorMessage = (error: GeolocationPositionError): string => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location access denied. Please enable location services in your browser settings and refresh the page. On mobile, check your device settings.';
    case error.POSITION_UNAVAILABLE:
      return 'Unable to determine your location. Please check your device\'s GPS settings and ensure you have a clear view of the sky.';
    case error.TIMEOUT:
      return 'Location request timed out. Please check your internet connection and GPS signal. Try moving to an area with better reception.';
    default:
      return 'Unable to access location services. Please ensure location services are enabled and try again.';
  }
};

export const Map = ({ center, safeZones = [], currentLocation, onLocationUpdate, isSharing, onMapClick, isEditable }: MapProps) => {
  return (
    <MapContainer
      key={`map-${center[0]}-${center[1]}`}
      center={center}
      zoom={13}
      className={`w-full h-[300px] rounded-lg ${isEditable ? 'cursor-crosshair' : ''}`}
      style={{ zIndex: 1, position: 'relative' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">HOT</a>'
      />
      
      {safeZones.map((zone) => {
        if (typeof zone.latitude === 'number' && typeof zone.longitude === 'number' && typeof zone.radius === 'number') {
          return (
            <Circle
              key={zone.id}
              center={[zone.latitude, zone.longitude]}
              radius={zone.radius * 1000} // Convert km to meters
              pathOptions={{
                color: '#10B981', // Tailwind green-500
                fillColor: '#10B981',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '5, 10'
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">{zone.name}</h3>
                  {zone.address && (
                    <p className="text-sm text-gray-600">{zone.address}</p>
                  )}
                  <p className="text-sm text-green-600 mt-1">
                    Radius: {zone.radius.toFixed(1)}km
                  </p>
                </div>
              </Popup>
            </Circle>
          );
        }
        return null;
      })}

      {currentLocation && (
        <Marker 
          position={currentLocation}
          icon={new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })}
        >
          <Popup>
            <div className="p-2">
              <p className="font-semibold">Current Location</p>
            </div>
          </Popup>
        </Marker>
      )}
      
      {onLocationUpdate && (
        <LocationTracker onLocationUpdate={onLocationUpdate} isSharing={isSharing} />
      )}

      {isEditable && <MapClickHandler onMapClick={onMapClick} />}
    </MapContainer>
  );
}