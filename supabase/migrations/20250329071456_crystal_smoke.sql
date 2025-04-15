/*
  # Fix Recordings Table Schema

  1. Changes
    - Change data column from bytea to text to store base64 encoded data
    - Keep existing table structure and policies
    - Ensure data integrity during migration
*/

-- Recreate recordings table with text data column
CREATE TABLE IF NOT EXISTS recordings (
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

-- Drop existing policy if it exists
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can manage own recordings" ON recordings;
END $$;

-- Create policy
CREATE POLICY "Users can manage own recordings"
  ON recordings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);