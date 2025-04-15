import { supabase } from './supabase';

export interface Location {
  latitude: number;
  longitude: number;
}

export const watchLocation = (
  onSuccess: (location: Location) => void,
  onError: (error: GeolocationPositionError) => void
) => {
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      onSuccess({ latitude, longitude });
    },
    onError,
    { enableHighAccuracy: true }
  );

  return () => navigator.geolocation.clearWatch(watchId);
};

export const getAddressFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );
    const data = await response.json();
    return data.display_name || 'Address not found';
  } catch (error) {
    console.error('Error getting address:', error);
    return 'Address not available';
  }
};

export const findNearbyPlaces = async (
  latitude: number,
  longitude: number,
  type: 'police' | 'hospital'
): Promise<any[]> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${type}&lat=${latitude}&lon=${longitude}&bounded=1`
    );
    const data = await response.json();
    
    return data.map((place: any) => ({
      id: place.place_id,
      name: place.display_name.split(',')[0],
      address: place.display_name,
      distance: calculateDistance(latitude, longitude, place.lat, place.lon),
      latitude: place.lat,
      longitude: place.lon
    }));
  } catch (error) {
    console.error('Error finding nearby places:', error);
    return [];
  }
};

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 100) / 100; // Round to 2 decimal places
};

const toRad = (value: number): number => (value * Math.PI) / 180;