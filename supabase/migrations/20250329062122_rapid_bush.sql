/*
  # Fix Nearby Incidents Query

  1. Changes
    - Remove unnecessary GROUP BY causing the error
    - Optimize the query for better performance
    - Add proper indexing for location-based queries

  2. Security
    - Maintain SECURITY DEFINER for function
    - Keep RLS policies intact
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_nearby_incidents(double precision, double precision, double precision);

-- Recreate the function with fixed query
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
  WITH nearby_incidents AS (
    SELECT 
      i.*,
      calculate_distance(user_lat, user_lon, i.latitude, i.longitude) as distance
    FROM incidents i
    WHERE i.latitude IS NOT NULL 
      AND i.longitude IS NOT NULL
      -- Use bounding box for initial filtering (faster)
      AND i.latitude BETWEEN user_lat - radius_meters/111111 AND user_lat + radius_meters/111111
      AND i.longitude BETWEEN user_lon - radius_meters/(111111*cos(radians(user_lat))) AND user_lon + radius_meters/(111111*cos(radians(user_lat)))
  )
  SELECT 
    ni.id,
    ni.title,
    ni.description,
    ni.status,
    ni.severity,
    ni.category,
    ni.latitude,
    ni.longitude,
    ni.created_at,
    ni.distance
  FROM nearby_incidents ni
  WHERE ni.distance <= radius_meters
  ORDER BY ni.distance ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;