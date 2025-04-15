/*
  # Add Safe Zones Table and Policies

  1. New Tables
    - `safe_zones`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `address` (text, optional)
      - `latitude` (float8)
      - `longitude` (float8)
      - `radius` (float8)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Drop existing table and policies if they exist
DROP TABLE IF EXISTS safe_zones CASCADE;

-- Create safe_zones table
CREATE TABLE safe_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  address text,
  latitude float8,
  longitude float8,
  radius float8,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE safe_zones ENABLE ROW LEVEL SECURITY;

-- Create policy for managing safe zones
CREATE POLICY "Users can manage safe zones"
  ON safe_zones
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);