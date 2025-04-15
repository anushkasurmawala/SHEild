import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useEffect } from 'react';

interface AuthState {
  user: User | null;
  loading: boolean;
  profile: any | null;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setProfile: (profile: any | null) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    set({ user: data.user, loading: false });
  },

  signUp: async (email: string, password: string) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // If signup successful, immediately fetch profile
    if (data.user && !error) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();
        
      set({ profile });
    }

    set({ loading: false });
    return { user: data.user, error: error as Error | null };
  },

  signOut: async () => {
    set({ loading: true });
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null, profile: null, loading: false });
  },

  setUser: (user: User | null) => set({ user }),
  setProfile: (profile: any | null) => set({ profile }),
  setInitialized: (initialized: boolean) => set({ initialized }),
}));

export const initAuth = async () => {
  if (useAuth.getState().initialized) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Get profile data if user exists
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
        
      useAuth.getState().setProfile(profile);
    }
    
    useAuth.getState().setUser(session?.user ?? null);
    useAuth.getState().setInitialized(true);
  } catch (error) {
    console.error('Error initializing auth:', error);
  }
}