/*
  # Add Location Sharing and Voice Settings

  1. New Tables
    - `location_shares`: Track active location sharing sessions
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `contact_ids` (text[], stores emergency contact IDs)
      - `active` (boolean)
      - `last_location` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `voice_settings`: Store user voice command preferences
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `enabled` (boolean)
      - `trigger_words` (text[])
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
    - Set up updated_at triggers
*/

-- Create handle_updated_at function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create location_shares table
CREATE TABLE IF NOT EXISTS location_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  contact_ids text[] NOT NULL DEFAULT '{}',
  active boolean DEFAULT false,
  last_location jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create voice_settings table
CREATE TABLE IF NOT EXISTS voice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  enabled boolean DEFAULT true,
  trigger_words text[] DEFAULT ARRAY['help', 'sos', 'emergency'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE location_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can manage own location shares" ON location_shares;
DROP POLICY IF EXISTS "Users can manage own voice settings" ON voice_settings;

CREATE POLICY "Users can manage own location shares"
  ON location_shares
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own voice settings"
  ON voice_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create triggers
DROP TRIGGER IF EXISTS location_shares_updated_at ON location_shares;
DROP TRIGGER IF EXISTS voice_settings_updated_at ON voice_settings;

CREATE TRIGGER location_shares_updated_at
  BEFORE UPDATE ON location_shares
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER voice_settings_updated_at
  BEFORE UPDATE ON voice_settings
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();