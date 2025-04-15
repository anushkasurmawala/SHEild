import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, X, Save, Home, Briefcase, GraduationCap, Building2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Map } from './Map';

const PRESET_LOCATIONS = [
  { icon: Home, name: 'Home', radius: 1 },
  { icon: Briefcase, name: 'Work', radius: 1 },
  { icon: GraduationCap, name: 'School/College', radius: 2 },
  { icon: Building2, name: 'Custom Location', radius: 1 }
];


interface SafeZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentLocation: [number, number];
  editZone?: SafeZone;
}


export const SafeZoneModal = ({ isOpen, onClose, onSuccess, currentLocation, editZone }: SafeZoneModalProps) => {
  const [formData, setFormData] = useState({
    name: editZone?.name ?? '',
    address: editZone?.address ?? '',
    radius: editZone?.radius ?? 1,
    latitude: editZone?.latitude ?? currentLocation[0],
    longitude: editZone?.longitude ?? currentLocation[1]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationInput, setLocationInput] = useState('');

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

  const handleLocationInput = (input: string) => {
    // Try parsing as Google Maps URL first
    if (input.includes('maps.google.com') || input.includes('google.com/maps')) {
      const location = parseGoogleMapsUrl(input);
      if (location) {
        setFormData({
          ...formData,
          latitude: location.lat,
          longitude: location.lng
        });
        setError(null);
        return;
      }
    }
    
    // Try parsing as direct coordinates (lat,lng)
    const coords = input.split(',').map(coord => parseFloat(coord.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      setFormData({
        ...formData,
        latitude: coords[0],
        longitude: coords[1]
      });
      setError(null);
    } else {
      setError('Invalid location format. Please enter a Google Maps URL or coordinates (lat,lng)');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const zoneData = {
          user_id: user.id,
          name: formData.name.trim(),
          address: formData.address.trim(),
          radius: formData.radius,
          latitude: formData.latitude,
          longitude: formData.longitude
      };

      const { error } = editZone
        ? await supabase
            .from('safe_zones')
            .update(zoneData)
            .eq('id', editZone.id)
        : await supabase
            .from('safe_zones')
            .insert(zoneData);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add safe zone');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 z-[9999] overflow-y-auto"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="glass-card w-full max-w-2xl p-6 space-y-6 relative z-[10000] my-8"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-400" />
            {editZone ? 'Edit Safe Zone' : 'Add Safe Zone'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!editZone && <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PRESET_LOCATIONS.map((location) => (
            <button
              key={location.name}
              onClick={() => setFormData({
                ...formData,
                name: location.name,
                radius: location.radius
              })}
              className={`glass-card p-4 flex flex-col items-center gap-2 transition-all ${
                formData.name === location.name ? 'bg-purple-500/20 border-purple-500' : ''
              }`}
            >
              <location.icon className="w-6 h-6" />
              <span className="text-sm">{location.name}</span>
            </button>
          ))}
        </div>}

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Location (Google Maps URL or coordinates)
          </label>
          <input
            type="text"
            value={locationInput}
            onChange={(e) => {
              setLocationInput(e.target.value);
              handleLocationInput(e.target.value);
            }}
            className="input-field"
            placeholder="https://maps.google.com/... or lat,lng"
          />
          {error && (
            <p className="text-sm text-red-400 mt-1">{error}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Zone Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="input-field"
              placeholder="e.g., Home, Office, School"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
              placeholder="Enter address (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Safe Zone Radius (km)
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={formData.radius}
                  onChange={(e) => {
                    const newRadius = Number((e.target as HTMLInputElement).value);
                    setFormData(prev => ({
                      ...prev,
                      radius: newRadius
                    }));
                  }}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500 touch-none relative
                    before:absolute before:top-1/2 before:-translate-y-1/2 before:h-0.5 before:w-full before:bg-purple-500/20
                    [&::-webkit-slider-thumb]:w-6 
                    [&::-webkit-slider-thumb]:h-6 
                    [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:bg-purple-500 
                    [&::-webkit-slider-thumb]:appearance-none 
                    [&::-webkit-slider-thumb]:shadow-lg 
                    [&::-webkit-slider-thumb]:shadow-purple-500/50
                    [&::-webkit-slider-thumb]:border-2 
                    [&::-webkit-slider-thumb]:border-white/20
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:w-6 
                    [&::-moz-range-thumb]:h-6 
                    [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:bg-purple-500 
                    [&::-moz-range-thumb]:border-2 
                    [&::-moz-range-thumb]:border-white/20 
                    [&::-moz-range-thumb]:shadow-lg 
                    [&::-moz-range-thumb]:shadow-purple-500/50
                    [&::-moz-range-thumb]:cursor-pointer"
                />
                <span className="text-sm font-mono bg-purple-500/20 px-3 py-1 rounded min-w-[80px] text-center">
                  {formData.radius}km
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Small (0.1km)</span>
                <span>Large (5km)</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              You'll receive alerts when you leave this radius
            </p>
          </div>


          <div className="h-[400px] rounded-lg overflow-hidden">
            <Map
              center={[formData.latitude, formData.longitude]}
              currentLocation={currentLocation}
              safeZones={[{
                id: 'preview',
                name: formData.name,
                address: formData.address,
                latitude: formData.latitude,
                longitude: formData.longitude,
                radius: formData.radius * 1000, // Convert km to meters for storage
                user_id: '',
                created_at: new Date().toISOString()
              }]}
              isEditable={true}
              onMapClick={(lat, lng) => setFormData({
                ...formData,
                latitude: lat,
                longitude: lng
              })}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="neon-button flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="neon-button flex-1 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white rounded-full border-t-transparent"
                />
              ) : (
                <>
                  <Save size={20} />
                  <span>Save Zone</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};