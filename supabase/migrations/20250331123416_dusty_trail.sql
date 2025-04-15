/*
  # Add Nearby Users Table with Safe Index Creation

  1. New Tables
    - `nearby_users`
      - User profile fields
      - Location tracking
      - Rating and verification
      - Response history

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Add functions for location queries
*/

-- Create nearby_users table
CREATE TABLE IF NOT EXISTS nearby_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  location jsonb NOT NULL,
  last_active timestamptz DEFAULT now(),
  status text DEFAULT 'available',
  rating float DEFAULT 5.0,
  total_responses int DEFAULT 0,
  successful_responses int DEFAULT 0,
  is_verified boolean DEFAULT false,
  response_time_avg int,
  specialties text[],
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE nearby_users ENABLE ROW LEVEL SECURITY;

-- Safely create indexes
DO $$ 
BEGIN
  -- Create user_id index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'nearby_users' 
    AND indexname = 'nearby_users_user_id_idx'
  ) THEN
    CREATE INDEX nearby_users_user_id_idx ON nearby_users (user_id);
  END IF;

  -- Create status index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'nearby_users' 
    AND indexname = 'nearby_users_status_idx'
  ) THEN
    CREATE INDEX nearby_users_status_idx ON nearby_users (status);
  END IF;

  -- Create location index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'nearby_users' 
    AND indexname = 'nearby_users_location_idx'
  ) THEN
    CREATE INDEX nearby_users_location_idx ON nearby_users USING gin (location);
  END IF;
END $$;

-- Create function to find nearby users
CREATE OR REPLACE FUNCTION get_nearby_users(
  user_lat double precision,
  user_lon double precision,
  radius_meters double precision DEFAULT 5000,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  distance double precision,
  rating float,
  is_verified boolean,
  status text,
  last_active timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nu.id,
    nu.full_name,
    nu.avatar_url,
    calculate_distance(
      user_lat,
      user_lon,
      (nu.location->>'latitude')::float,
      (nu.location->>'longitude')::float
    ) as distance,
    nu.rating,
    nu.is_verified,
    nu.status,
    nu.last_active
  FROM nearby_users nu
  WHERE nu.status = 'available'
    AND nu.last_active > now() - interval '15 minutes'
    -- Use jsonb operators to filter by location bounds
    AND (nu.location->>'latitude')::float BETWEEN (user_lat - radius_meters/111111) AND (user_lat + radius_meters/111111)
    AND (nu.location->>'longitude')::float BETWEEN (user_lon - radius_meters/(111111*cos(radians(user_lat)))) AND (user_lon + radius_meters/(111111*cos(radians(user_lat))))
  ORDER BY distance ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can manage their location" ON nearby_users;
  DROP POLICY IF EXISTS "Users can view nearby users" ON nearby_users;
END $$;

CREATE POLICY "Users can manage their location"
  ON nearby_users
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view nearby users"
  ON nearby_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Create trigger to update last_active
CREATE OR REPLACE FUNCTION update_nearby_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_nearby_user_last_active ON nearby_users;

CREATE TRIGGER update_nearby_user_last_active
  BEFORE UPDATE ON nearby_users
  FOR EACH ROW
  EXECUTE FUNCTION update_nearby_user_timestamp();