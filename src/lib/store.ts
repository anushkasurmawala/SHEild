import { create } from 'zustand';
import { supabase } from './supabase';
import type { Location } from './location-utils';

interface AppState {
  currentLocation: Location | null;
  isLocationSharing: boolean;
  emergencyContacts: any[];
  updateCurrentLocation: (location: Location) => void;
  startLocationSharing: (contactIds: string[]) => Promise<void>;
  stopLocationSharing: () => Promise<void>;
  fetchEmergencyContacts: () => Promise<void>;
  triggerEmergencyAlert: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentLocation: null,
  isLocationSharing: false,
  emergencyContacts: [],

  updateCurrentLocation: (location) => {
    set({ currentLocation: location });
    
    // Update location in Supabase if sharing is active
    if (get().isLocationSharing) {
      supabase
        .from('location_shares')
        .update({ last_location: location })
        .eq('user_id', supabase.auth.user()?.id)
        .eq('active', true)
        .single();
    }
  },

  startLocationSharing: async (contactIds) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('location_shares')
      .insert({
        user_id: user.id,
        contact_ids: contactIds,
        active: true,
        last_location: get().currentLocation
      });

    set({ isLocationSharing: true });
  },

  stopLocationSharing: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('location_shares')
      .update({ active: false })
      .eq('user_id', user.id)
      .eq('active', true);

    set({ isLocationSharing: false });
  },

  fetchEmergencyContacts: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: contacts } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id);

    if (contacts) {
      set({ emergencyContacts: contacts });
    }
  },

  triggerEmergencyAlert: async () => {
    const { currentLocation, emergencyContacts } = get();
    if (!currentLocation || emergencyContacts.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create an incident record
    await supabase
      .from('incidents')
      .insert({
        user_id: user.id,
        title: 'Emergency Alert',
        description: 'Voice-activated emergency alert',
        location: `${currentLocation.latitude},${currentLocation.longitude}`,
        status: 'pending'
      });

    // Start location sharing with all emergency contacts
    await get().startLocationSharing(emergencyContacts.map(c => c.id));
  }
}));