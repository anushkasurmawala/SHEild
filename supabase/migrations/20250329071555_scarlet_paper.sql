/*
  # Fix Recordings Table Schema

  1. Changes
    - Drop and recreate recordings table with correct schema
    - Ensure data column exists and has correct type
    - Maintain RLS policies
    - Keep existing constraints

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Drop existing table and policies
DROP TABLE IF EXISTS recordings;

-- Create recordings table with correct schema
CREATE TABLE recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  type text NOT NULL CHECK (type IN ('audio', 'video')),
  data text NOT NULL,
  name text NOT NULL,
  mime_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Create policy for managing recordings
CREATE POLICY "Users can manage own recordings"
  ON recordings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);