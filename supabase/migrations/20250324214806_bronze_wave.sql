/*
  # Update admin role and policies

  1. Changes
    - Add is_admin column to profiles table if it doesn't exist
    - Drop existing work schedule policy if it exists
    - Create new work schedule policy for admin access

  2. Security
    - Only admins can modify work schedules
    - Users can still modify their own non-schedule data
*/

-- Add admin column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Drop existing policy if it exists
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Only admins can update work schedules" ON profiles;
END $$;

-- Create new policy for work schedule updates
CREATE POLICY "Only admins can update work schedules"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = id AND NOT (work_schedule::text <> coalesce((SELECT work_schedule::text FROM profiles WHERE id = auth.uid()), '[]'::text)))
    OR
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    (auth.uid() = id AND NOT (work_schedule::text <> coalesce((SELECT work_schedule::text FROM profiles WHERE id = auth.uid()), '[]'::text)))
    OR
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );