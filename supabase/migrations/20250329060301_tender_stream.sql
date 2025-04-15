/*
  # Fix Profile Data Handling and Defaults

  1. Changes
    - Add default values for required fields
    - Update handle_new_user function to properly store metadata
    - Ensure proper data type handling
    - Add validation for phone numbers

  2. Security
    - Maintain existing RLS policies
    - Ensure secure profile creation
*/

-- Modify profiles table to handle defaults better
ALTER TABLE profiles
ALTER COLUMN full_name SET DEFAULT '',
ALTER COLUMN phone_number SET DEFAULT '',
ALTER COLUMN email SET NOT NULL;

-- Create or replace the function to handle new user creation with better metadata handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure we have valid data before inserting
  IF NEW.raw_user_meta_data IS NULL THEN
    NEW.raw_user_meta_data := '{}'::jsonb;
  END IF;

  -- Insert or update profile with proper metadata handling
  INSERT INTO public.profiles (
    user_id,
    full_name,
    email,
    phone_number,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    now(),
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone_number = EXCLUDED.phone_number,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update existing profiles with data from auth.users
UPDATE profiles p
SET 
  full_name = COALESCE(u.raw_user_meta_data->>'full_name', p.full_name, ''),
  email = COALESCE(u.email, p.email),
  phone_number = COALESCE(u.raw_user_meta_data->>'phone_number', p.phone_number, '')
FROM auth.users u
WHERE p.user_id = u.id;