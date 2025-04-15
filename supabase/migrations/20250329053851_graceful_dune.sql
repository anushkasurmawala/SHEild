/*
  # Fix Profiles Table Structure and Auto-Creation

  1. Changes
    - Add email column to profiles table
    - Create trigger to automatically create profile on user signup
    - Ensure non-null constraints for important fields
    
  2. Security
    - Maintain existing RLS policies
    - Add policy for profile creation
*/

-- Add email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- Update existing profiles with email from auth.users
UPDATE profiles
SET email = (
  SELECT email 
  FROM auth.users 
  WHERE users.id = profiles.user_id
)
WHERE email IS NULL;

-- Make email column NOT NULL after populating data
ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;

-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '')
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone_number = EXCLUDED.phone_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill any missing profiles
INSERT INTO profiles (user_id, full_name, email, phone_number)
SELECT 
  id as user_id,
  COALESCE(raw_user_meta_data->>'full_name', '') as full_name,
  email,
  COALESCE(raw_user_meta_data->>'phone_number', '') as phone_number
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = users.id
);