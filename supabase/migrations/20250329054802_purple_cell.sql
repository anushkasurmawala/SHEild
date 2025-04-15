/*
  # Fix Profile Data Handling

  1. Changes
    - Update handle_new_user function to properly store profile data
    - Add NOT NULL constraints to required fields
    - Add trigger to sync profile data with auth.users
*/

-- Modify profiles table constraints
ALTER TABLE profiles
ALTER COLUMN full_name SET NOT NULL,
ALTER COLUMN phone_number SET NOT NULL;

-- Create or replace the function to handle new user creation with proper data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number',
    now(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update existing profiles with data from auth.users
UPDATE profiles p
SET 
  full_name = COALESCE(u.raw_user_meta_data->>'full_name', p.full_name),
  email = COALESCE(u.email, p.email),
  phone_number = COALESCE(u.raw_user_meta_data->>'phone_number', p.phone_number)
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.full_name IS NULL OR p.email IS NULL OR p.phone_number IS NULL);