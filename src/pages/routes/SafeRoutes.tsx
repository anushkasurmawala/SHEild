import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { SafeZoneMap } from '../../components/SafeZoneMap';
import { Navigation, MapPin, AlertTriangle, Search, LocateFixed, Route } from 'lucide-react';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { supabase } from '../../lib/supabase';

// Default location (will be updated once we get actual location)
const DEFAULT_LOCATION: [number, number] = [0, 0];

// Fix default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 30000, // 30 seconds
  maximumAge: 0
};

const FALLBACK_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 5000, // 5 seconds
  maximumAge: 60000 // 1 minute
};

interface Incident {
  latitude: number;
  longitude: number;
  severity: string;
  created_at: string;
}

const SafeRoutes = () => {
  const [currentLocation, setCurrentLocation] = useState<[number, number]>(DEFAULT_LOCATION);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const [startLocation, setStartLocation] = useState<[number, number] | null>(null);
  const [endLocation, setEndLocation] = useState<[number, number] | null>(null);
  const [customStartAddress, setCustomStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState(''); 
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const routingControlRef = useRef<any>(null);

  const parseGoogleMapsUrl = (url: string): { lat: number; lng: number } | null => {
    try {
      // Handle different Google Maps URL formats
      const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const match = url.match(regex);
      
      if (match) {
        return {
          lat: parseFloat(match[1]),
          lng: parseFloat(match[2])
        };
      }
      return null;
    } catch (error) {
      console.error('Error parsing Google Maps URL:', error);
      return null;
    }
  };

  const parseLocationInput = (input: string): [number, number] | null => {
    // Try parsing as Google Maps URL first
    if (input.includes('maps.google.com') || input.includes('google.com/maps')) {
      const location = parseGoogleMapsUrl(input);
      if (location) {
        return [location.lat, location.lng];
      }
    }
    
    // Try parsing as direct coordinates (lat,lng)
    const coords = input.split(',').map(coord => parseFloat(coord.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      return [coords[0], coords[1]];
    }
    
    return null;
  };

  const RoutingMachineComponent = () => {
    const map = useMap();
    
    useEffect(() => {
      if (!map || !startLocation || !endLocation) return;

      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }

      const calculateSafetyScore = (lat: number, lon: number): number => {
        let score = 100;
        incidents.forEach(incident => {
          const distance = L.latLng(lat, lon).distanceTo(L.latLng(incident.latitude, incident.longitude));
          if (distance < 1000) { // Within 1km
            const severity = {
              'low': 10,
              'medium': 25,
              'high': 40,
              'critical': 60
            }[incident.severity] || 10;
            
            // More recent incidents have more impact
            const daysAgo = (Date.now() - new Date(incident.created_at).getTime()) / (1000 * 60 * 60 * 24);
            const timeImpact = Math.max(0.3, 1 - (daysAgo / 14)); // Stronger decay over 14 days
            
            score -= severity * timeImpact * (1 - distance/1000);
          }
        });
        return Math.max(0, score);
      };

      const routingControl = L.Routing.control({
        waypoints: [
          L.latLng(startLocation[0], startLocation[1]),
          L.latLng(endLocation[0], endLocation[1])
        ],
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'walking',
          geometryOnly: false
        }),
        lineOptions: {
          styles: [{ color: '#10B981', weight: 4 }], // Default to green
          extendToWaypoints: true,
          missingRouteTolerance: 0
        },
        showAlternatives: true,
        altLineOptions: {
          styles: [
            { color: '#6366f1', weight: 4 }, // Alternative routes in blue
            { color: '#8B5CF6', weight: 4 }
          ]
        },
        routeWhileDragging: false,
        addWaypoints: false,
        fitSelectedRoutes: true
      }).addTo(map);

      routingControl.on('routesfound', (e) => {
        const routes = e.routes;
        routes.forEach((route, index) => {
          let totalSafetyScore = 0;
          route.coordinates.forEach((coord: L.LatLng) => {
            totalSafetyScore += calculateSafetyScore(coord.lat, coord.lng);
            
            // Add incident markers near the route
            incidents.forEach(incident => {
              const distance = L.latLng(coord.lat, coord.lng)
                .distanceTo(L.latLng(incident.latitude, incident.longitude));
              if (distance < 500) { // Show incidents within 500m of route
                const marker = L.circle([incident.latitude, incident.longitude], {
                  color: incident.severity === 'critical' ? '#EF4444' :
                         incident.severity === 'high' ? '#F97316' :
                         incident.severity === 'medium' ? '#F59E0B' : '#10B981',
                  fillColor: incident.severity === 'critical' ? '#EF4444' :
                            incident.severity === 'high' ? '#F97316' :
                            incident.severity === 'medium' ? '#F59E0B' : '#10B981',
                  fillOpacity: 0.2,
                  radius: 100
                }).addTo(map);
                
                // Remove marker when route changes
                return () => map.removeLayer(marker);
              }
            });
          });
          const avgSafetyScore = totalSafetyScore / route.coordinates.length;
          
          // Update route style based on safety score
          const hue = Math.min(120, avgSafetyScore * 1.2); // 0-120 range (red to green)
          route.routeLine.setStyle({
            color: `hsl(${hue}, 70%, 50%)`,
            weight: index === 0 ? 6 : 4,
            opacity: index === 0 ? 0.8 : 0.6
          });

          // Add safety score to route summary
          const originalName = route.summary.totalDistance
            ? `${(route.summary.totalDistance / 1000).toFixed(1)} km, ${Math.round(route.summary.totalTime / 60)} min`
            : 'Route';
          route.name = `${originalName} (Safety: ${Math.round(avgSafetyScore)}%)`;
        });

        // Sort routes by safety score
        routes.sort((a, b) => {
          const safetyA = parseInt(a.name.match(/Safety: (\d+)%/)?.[1] || '0');
          const safetyB = parseInt(b.name.match(/Safety: (\d+)%/)?.[1] || '0');
          return safetyB - safetyA;
        });
      });

      routingControlRef.current = routingControl;
    }, [map, startLocation, endLocation, incidents]);

    return null;
  };

  const searchLocation = async (address: string): Promise<[number, number] | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      
      if (data && data[0]) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      return null;
    } catch (error) {
      console.error('Error searching location:', error);
      return null;
    }
  };

  const handleStartLocationSelect = async (useCurrentLocation: boolean) => {
    if (useCurrentLocation) {
      if (currentLocation) {
        setStartLocation(currentLocation);
        setCustomStartAddress('');
        setLocationError(null);
      }
    } else if (customStartAddress) {
      const location = parseLocationInput(customStartAddress);
      if (location) {
        setStartLocation(location);
        setLocationError(null);
      } else {
        // Try geocoding if not coordinates or Maps URL
        const geocodedLocation = await searchLocation(customStartAddress);
        if (geocodedLocation) {
          setStartLocation(geocodedLocation);
          setLocationError(null);
        } else {
          setLocationError('Invalid location format. Please enter a Google Maps URL, coordinates (lat,lng), or an address');
        }
      }
    }
  };

  const handleEndLocationSelect = async () => {
    if (endAddress) {
      const location = parseLocationInput(endAddress);
      if (location) {
        setEndLocation(location);
        setLocationError(null);
      } else {
        // Try geocoding if not coordinates or Maps URL
        const geocodedLocation = await searchLocation(endAddress);
        if (geocodedLocation) {
          setEndLocation(geocodedLocation);
          setLocationError(null);
        } else {
          setLocationError('Invalid location format. Please enter a Google Maps URL, coordinates (lat,lng), or an address');
        }
      }
    }
  };

  const fetchIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('latitude, longitude, severity, created_at')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;
      if (data) setIncidents(data);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    }
  };

  useEffect(() => {
    const setupLocation = () => {
      // Always define a cleanup function
      const cleanupFn = () => {
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
          setWatchId(null);
        }
      };

      try {
        // First try to get a quick, less accurate position
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation([position.coords.latitude, position.coords.longitude]);
            setLocationError(null);
            setIsLoadingLocation(false);
          },
          (error) => {
            console.warn('Initial position error:', error);
            setLocationError('Using approximate location');
            setIsLoadingLocation(false);
          },
          FALLBACK_OPTIONS
        );

        // Then start watching for more accurate position
        const id = navigator.geolocation.watchPosition(
          (position) => {
            setCurrentLocation([position.coords.latitude, position.coords.longitude]);
            setIsLoadingLocation(false);
            setLocationError(null);
            setRetryCount(0);
          },
          (error) => {
            console.error('Watch position error:', error);
            
            if (retryCount < MAX_RETRIES) {
              setRetryCount(prev => prev + 1);
              // Clear existing watch and retry
              cleanupFn();
              setupLocation();
            } else {
              setLocationError(getLocationErrorMessage(error));
              setIsLoadingLocation(false);
            }
          },
          LOCATION_OPTIONS
        );
        setWatchId(id);
      } catch (error) {
        console.error('Location setup error:', error);
        setLocationError('Location services not available');
        setIsLoadingLocation(false);
      }

      // Always return the cleanup function
      return cleanupFn;
    };
    
    const cleanup = setupLocation();
    fetchIncidents();

    // Use the cleanup function in the useEffect cleanup
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [watchId, retryCount]);

  const getLocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location services in your browser settings and refresh the page.';
      case error.POSITION_UNAVAILABLE:
        return 'Unable to determine your location. Please check your device\'s GPS settings.';
      case error.TIMEOUT:
        return 'Location request timed out. Please check your internet connection and GPS signal.';
      default:
        return 'Unable to access location services. Please try again.';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 space-y-6 pb-24 max-w-2xl mx-auto"
    >
      <div>
        {isLoadingLocation && (
          <div className="glass-card p-4 mb-4 flex items-center justify-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full"
            />
            <p className="text-purple-400">Getting your location...</p>
          </div>
        )}
        
        {locationError && (
          <div className="glass-card p-4 mb-4 bg-yellow-500/10 border-yellow-500/50 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <p className="text-yellow-400 text-sm flex-1">{locationError}</p>
          </div>
        )}
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Navigation className="w-6 h-6 text-purple-400" />
            Safe Navigation
          </h2>
        </div>

        <div className="space-y-4">
          {/* Start Location */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Start Location</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleStartLocationSelect(true)}
                className={`neon-button flex-1 flex items-center justify-center gap-2 ${
                  startLocation === currentLocation ? 'bg-purple-500/20' : ''
                }`}
              >
                <LocateFixed size={16} />
                Use Current Location
              </button>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={customStartAddress}
                  onChange={(e) => setCustomStartAddress(e.target.value)}
                  placeholder="Maps URL, coordinates (lat,lng), or address"
                  className="input-field flex-1"
                />
                <button
                  onClick={() => handleStartLocationSelect(false)}
                  disabled={!customStartAddress}
                  className="neon-button !p-2"
                >
                  <Search size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* End Location */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Destination</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={endAddress}
                onChange={(e) => setEndAddress(e.target.value)}
                placeholder="Maps URL, coordinates (lat,lng), or address"
                className="input-field flex-1"
              />
              <button
                onClick={handleEndLocationSelect}
                disabled={!endAddress}
                className="neon-button !p-2"
              >
                <Search size={16} />
              </button>
            </div>
          </div>

          {/* Map */}
          <div className="h-[400px] rounded-lg overflow-hidden">
            <div className="glass-card p-2 absolute bottom-4 right-4 z-[1000] space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs">Critical Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-xs">High Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-xs">Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs">Low Risk</span>
              </div>
            </div>
            <MapContainer
              key={`map-${currentLocation?.[0]}-${currentLocation?.[1]}`}
              center={currentLocation || [0, 0]}
              zoom={13}
              style={{ height: '400px', width: '100%' }}
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {currentLocation && (
                <Marker position={currentLocation}>
                  <Popup>Current Location</Popup>
                </Marker>
              )}
              {startLocation && (
                <Marker position={startLocation}>
                  <Popup>Start Location</Popup>
                </Marker>
              )}
              {endLocation && (
                <Marker position={endLocation}>
                  <Popup>Destination</Popup>
                </Marker>
              )}
              {startLocation && endLocation && <RoutingMachineComponent />}
            </MapContainer>
          </div>
        </div>
      </div>
      
      <SafeZoneMap currentLocation={currentLocation} />
    </motion.div>
  );
};

export default SafeRoutes;