/*
  # Add Chat and Incident Management

  1. New Tables
    - `chat_messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references auth.users)
      - `receiver_id` (uuid, references auth.users)
      - `content` (text)
      - `location` (jsonb)
      - `created_at` (timestamp)
    
    - `nearby_users`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `location` (jsonb)
      - `last_active` (timestamp)
      - `status` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users NOT NULL,
  receiver_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  location jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create nearby_users table
CREATE TABLE IF NOT EXISTS nearby_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  location jsonb NOT NULL,
  last_active timestamptz DEFAULT now(),
  status text DEFAULT 'available',
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE nearby_users ENABLE ROW LEVEL SECURITY;

-- Chat messages policies
CREATE POLICY "Users can send and receive messages"
  ON chat_messages
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (sender_id, receiver_id))
  WITH CHECK (auth.uid() = sender_id);

-- Nearby users policies
CREATE POLICY "Users can manage their location"
  ON nearby_users
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view nearby users"
  ON nearby_users
  FOR SELECT
  TO authenticated
  USING (true);