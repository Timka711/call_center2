/*
  # Create shift exchange requests table

  1. New Tables
    - `shift_exchange_requests`
      - `id` (uuid, primary key)
      - `requester_id` (uuid, references profiles.id)
      - `target_user_id` (uuid, references profiles.id)
      - `requester_date` (date, not null)
      - `target_date` (date, not null)
      - `requester_shift` (jsonb, stores shift details)
      - `target_shift` (jsonb, stores shift details)
      - `status` (text, default 'pending')
      - `message` (text, optional)
      - `admin_notified` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `shift_exchange_requests` table
    - Add policies for authenticated users to manage their own requests
    - Add policy for admins to view all requests

  3. Constraints
    - Status check constraint for valid values
    - Foreign key constraints to profiles table
*/

CREATE TABLE IF NOT EXISTS shift_exchange_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requester_date date NOT NULL,
  target_date date NOT NULL,
  requester_shift jsonb NOT NULL,
  target_shift jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  admin_notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add check constraint for valid status values
ALTER TABLE shift_exchange_requests 
ADD CONSTRAINT shift_exchange_requests_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- Enable RLS
ALTER TABLE shift_exchange_requests ENABLE ROW LEVEL SECURITY;

-- Policy for users to view requests they are involved in
CREATE POLICY "Users can view their own exchange requests"
  ON shift_exchange_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = target_user_id);

-- Policy for admins to view all requests
CREATE POLICY "Admins can view all exchange requests"
  ON shift_exchange_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Policy for users to create their own requests
CREATE POLICY "Users can create exchange requests"
  ON shift_exchange_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Policy for users to update requests they are involved in
CREATE POLICY "Users can update their exchange requests"
  ON shift_exchange_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = target_user_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = target_user_id);

-- Policy for admins to update any request
CREATE POLICY "Admins can update all exchange requests"
  ON shift_exchange_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Policy for users to delete their own requests
CREATE POLICY "Users can delete their own exchange requests"
  ON shift_exchange_requests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = requester_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_shift_exchange_requests_requester_id ON shift_exchange_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_shift_exchange_requests_target_user_id ON shift_exchange_requests(target_user_id);
CREATE INDEX IF NOT EXISTS idx_shift_exchange_requests_status ON shift_exchange_requests(status);
CREATE INDEX IF NOT EXISTS idx_shift_exchange_requests_created_at ON shift_exchange_requests(created_at DESC);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shift_exchange_requests_updated_at
    BEFORE UPDATE ON shift_exchange_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();