export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      emergency_contacts: {
        Row: EmergencyContact;
        Insert: Omit<EmergencyContact, 'id' | 'created_at'>;
        Update: Partial<Omit<EmergencyContact, 'id'>>;
      };
      incidents: {
        Row: Incident;
        Insert: Omit<Incident, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Incident, 'id'>>;
      };
      safe_zones: {
        Row: SafeZone;
        Insert: Omit<SafeZone, 'id' | 'created_at'>;
        Update: Partial<Omit<SafeZone, 'id'>>;
      };
    };
  };
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  relationship: string | null;
  created_at: string;
}

export interface Incident {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SafeZone {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  created_at: string;
}