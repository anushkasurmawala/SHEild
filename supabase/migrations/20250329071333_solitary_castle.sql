/*
  # Fix Recordings Table Migration

  1. Changes
    - Add recordings table if it doesn't exist
    - Enable RLS
    - Add policy with existence check
*/

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  type text NOT NULL CHECK (type IN ('audio', 'video')),
  data bytea NOT NULL,
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