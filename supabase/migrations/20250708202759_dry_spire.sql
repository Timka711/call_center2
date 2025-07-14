/*
  # Create shift exchange requests system

  1. New Tables
    - `shift_exchange_requests`
      - `id` (uuid, primary key)
      - `requester_id` (uuid, references profiles)
      - `target_user_id` (uuid, references profiles)
      - `requester_date` (date, the date requester wants to give away)
      - `target_date` (date, the date requester wants to take)
      - `requester_shift` (jsonb, shift details for requester's date)
      - `target_shift` (jsonb, shift details for target date)
      - `status` (text, enum: pending, approved, rejected, cancelled)
      - `message` (text, optional message from requester)
      - `admin_notified` (boolean, whether admin has been notified)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for users to manage their own requests
    - Add policies for admins to view all requests
*/

-- Drop table if it exists to ensure clean creation
DROP TABLE IF EXISTS shift_exchange_requests CASCADE;

-- Drop function if it exists
DROP FUNCTION IF EXISTS update_shift_exchange_updated_at() CASCADE;

CREATE TABLE shift_exchange_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  requester_date date NOT NULL,
  target_date date NOT NULL,
  requester_shift jsonb NOT NULL,
  target_shift jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  message text,
  admin_notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE shift_exchange_requests 
    ADD CONSTRAINT fk_requester_profile 
    FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;
    
    ALTER TABLE shift_exchange_requests 
    ADD CONSTRAINT fk_target_user_profile 
    FOREIGN KEY (target_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE shift_exchange_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own exchange requests" ON shift_exchange_requests;
DROP POLICY IF EXISTS "Users can create exchange requests" ON shift_exchange_requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON shift_exchange_requests;
DROP POLICY IF EXISTS "Admins can view all exchange requests" ON shift_exchange_requests;
DROP POLICY IF EXISTS "Admins can update all exchange requests" ON shift_exchange_requests;

-- Policies for users to view requests they're involved in
CREATE POLICY "Users can view their own exchange requests"
  ON shift_exchange_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id OR 
    auth.uid() = target_user_id
  );

-- Policies for users to create requests
CREATE POLICY "Users can create exchange requests"
  ON shift_exchange_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Policies for users to update their own requests
CREATE POLICY "Users can update their own requests"
  ON shift_exchange_requests
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = requester_id OR 
    auth.uid() = target_user_id
  )
  WITH CHECK (
    auth.uid() = requester_id OR 
    auth.uid() = target_user_id
  );

-- Policies for admins to view all requests
CREATE POLICY "Admins can view all exchange requests"
  ON shift_exchange_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policies for admins to update all requests
CREATE POLICY "Admins can update all exchange requests"
  ON shift_exchange_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shift_exchange_requests_requester ON shift_exchange_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_shift_exchange_requests_target ON shift_exchange_requests(target_user_id);
CREATE INDEX IF NOT EXISTS idx_shift_exchange_requests_status ON shift_exchange_requests(status);
CREATE INDEX IF NOT EXISTS idx_shift_exchange_requests_dates ON shift_exchange_requests(requester_date, target_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shift_exchange_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_shift_exchange_requests_updated_at ON shift_exchange_requests;
CREATE TRIGGER update_shift_exchange_requests_updated_at
  BEFORE UPDATE ON shift_exchange_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_exchange_updated_at();