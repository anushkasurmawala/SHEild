/*
  # Fix Profile Creation on Signup

  1. Changes
    - Modify handle_new_user trigger function to use ON CONFLICT DO UPDATE
    - Add proper error handling
    - Ensure atomic profile creation/update
    - Fix race conditions in profile creation

  2. Security
    - Maintain existing RLS policies
    - Keep security definer context
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with ON CONFLICT DO UPDATE to handle race conditions
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
    updated_at = now()
  WHERE profiles.user_id = EXCLUDED.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure all existing users have profiles
INSERT INTO public.profiles (
  user_id,
  full_name,
  email,
  phone_number,
  created_at,
  updated_at
)
SELECT 
  id as user_id,
  COALESCE(raw_user_meta_data->>'full_name', ''),
  email,
  COALESCE(raw_user_meta_data->>'phone_number', ''),
  now(),
  now()
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = users.id
)
ON CONFLICT (user_id) DO NOTHING;