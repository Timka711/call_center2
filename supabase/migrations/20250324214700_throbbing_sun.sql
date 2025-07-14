/*
  # Add admin role to profiles

  1. Changes
    - Add is_admin column to profiles table
    - Add admin-specific policies

  2. Security
    - Only admins can view and modify work schedules
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Update policies to restrict work schedule modifications to admins
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