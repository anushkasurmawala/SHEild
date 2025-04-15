/*
  # Initial Schema Setup for Safety App

  1. New Tables
    - `profiles`
    - `emergency_contacts`
    - `incidents`
    - `safe_zones`
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

DO $$ 
BEGIN

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  full_name text,
  phone_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  phone_number text NOT NULL,
  relationship text,
  created_at timestamptz DEFAULT now()
);

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create safe_zones table
CREATE TABLE IF NOT EXISTS safe_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  address text,
  latitude float8,
  longitude float8,
  radius float8,
  created_at timestamptz DEFAULT now()
);

END $$;

-- Enable Row Level Security
DO $$ 
BEGIN
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE safe_zones ENABLE ROW LEVEL SECURITY;
END $$;

-- Create policies
DO $$ 
BEGIN
  -- Profiles policies
  CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

  -- Emergency contacts policies
  CREATE POLICY "Users can manage emergency contacts"
    ON emergency_contacts FOR ALL
    TO authenticated
    USING (auth.uid() = user_id);

  -- Incidents policies
  CREATE POLICY "Users can manage incidents"
    ON incidents FOR ALL
    TO authenticated
    USING (auth.uid() = user_id);

  -- Safe zones policies
  CREATE POLICY "Users can manage safe zones"
    ON safe_zones FOR ALL
    TO authenticated
    USING (auth.uid() = user_id);
END $$;