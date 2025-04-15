/*
  # Add Location-based Incident Reporting

  1. Changes
    - Add location coordinates to incidents table
    - Add severity and category fields
    - Add function for calculating distances
    - Add function for finding nearby incidents

  2. Security
    - Maintain RLS policies
    - Add security definer functions
*/

-- Modify incidents table to support location-based queries
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS severity text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';

-- Add check constraint for severity
ALTER TABLE incidents
ADD CONSTRAINT incidents_severity_check 
CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- Add check constraint for category
ALTER TABLE incidents
ADD CONSTRAINT incidents_category_check 
CHECK (category IN ('harassment', 'suspicious_activity', 'theft', 'assault', 'other'));

-- Create btree indexes for coordinates
CREATE INDEX IF NOT EXISTS incidents_latitude_idx ON incidents (latitude);
CREATE INDEX IF NOT EXISTS incidents_longitude_idx ON incidents (longitude);

-- Function to calculate distance between coordinates
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision AS $$
DECLARE
  R double precision := 6371000; -- Earth's radius in meters
  φ1 double precision := radians(lat1);
  φ2 double precision := radians(lat2);
  Δφ double precision := radians(lat2 - lat1);
  Δλ double precision := radians(lon2 - lon1);
  a double precision;
  c double precision;
  d double precision;
BEGIN
  -- Skip calculation if any coordinate is null
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;

  a := sin(Δφ/2) * sin(Δφ/2) +
       cos(φ1) * cos(φ2) *
       sin(Δλ/2) * sin(Δλ/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  d := R * c;
  RETURN d;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get nearby incidents
CREATE OR REPLACE FUNCTION get_nearby_incidents(
  user_lat double precision,
  user_lon double precision,
  radius_meters double precision DEFAULT 5000
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
  severity text,
  category text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz,
  distance double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.title,
    i.description,
    i.status,
    i.severity,
    i.category,
    i.latitude,
    i.longitude,
    i.created_at,
    calculate_distance(user_lat, user_lon, i.latitude, i.longitude) as distance
  FROM incidents i
  WHERE i.latitude IS NOT NULL 
    AND i.longitude IS NOT NULL
    AND i.latitude BETWEEN user_lat - radius_meters/111111 AND user_lat + radius_meters/111111
    AND i.longitude BETWEEN user_lon - radius_meters/(111111*cos(radians(user_lat))) AND user_lon + radius_meters/(111111*cos(radians(user_lat)))
  HAVING calculate_distance(user_lat, user_lon, i.latitude, i.longitude) <= radius_meters
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;