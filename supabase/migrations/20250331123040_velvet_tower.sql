/*
  # Fix Twilio Configuration Table and Trigger

  1. Changes
    - Create twilio_config table if not exists
    - Add trigger with existence check
    - Add policy for service role
    - Insert initial Twilio credentials if available

  2. Security
    - Enable RLS
    - Restrict access to service role only
*/

-- Create twilio_config table
CREATE TABLE IF NOT EXISTS twilio_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_sid text NOT NULL,
  auth_token text NOT NULL,
  phone_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE twilio_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Service role can access Twilio config" ON twilio_config;
END $$;

-- Create policy for service role only
CREATE POLICY "Service role can access Twilio config"
  ON twilio_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS set_updated_at_twilio_config ON twilio_config;
END $$;

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at_twilio_config
  BEFORE UPDATE ON twilio_config
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert initial Twilio credentials if provided
DO $$
BEGIN
  IF current_setting('app.settings.twilio_account_sid', true) IS NOT NULL THEN
    INSERT INTO twilio_config (account_sid, auth_token, phone_number)
    VALUES (
      current_setting('app.settings.twilio_account_sid'),
      current_setting('app.settings.twilio_auth_token'),
      current_setting('app.settings.twilio_phone_number')
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;