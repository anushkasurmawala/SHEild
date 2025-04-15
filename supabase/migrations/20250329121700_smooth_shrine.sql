/*
  # Add Reset Tokens Table and Policies

  1. New Tables
    - `reset_tokens`
      - `id` (uuid, primary key)
      - `phone` (text, not null)
      - `token` (text, not null)
      - `expires_at` (timestamptz, not null)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for secure token management
    - Auto-cleanup through database constraints
*/

-- Create reset_tokens table
CREATE TABLE IF NOT EXISTS reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS reset_tokens_phone_idx ON reset_tokens (phone);

-- Create index for expiration cleanup
CREATE INDEX IF NOT EXISTS reset_tokens_expires_at_idx ON reset_tokens (expires_at);

-- Drop existing policy if it exists
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Service role can manage reset tokens" ON reset_tokens;
END $$;

-- Create policy for edge functions to manage tokens
CREATE POLICY "Service role can manage reset tokens"
  ON reset_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM reset_tokens
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;