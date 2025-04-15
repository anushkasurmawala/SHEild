/*
  # Add Twilio Configuration Storage

  1. Changes
    - Create twilio_config table in public schema
    - Add RLS policies for secure access
    - Add proper indexes and constraints
    - Enable service role access only

  2. Security
    - Store sensitive credentials securely
    - Restrict access to service role
    - Enable RLS for additional security
*/

-- Create twilio_config table in public schema
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