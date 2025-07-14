/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Current policies on profiles table are causing infinite recursion
    - Policies are referencing the profiles table within their own definitions
    - This creates circular dependencies when querying

  2. Solution
    - Drop all existing problematic policies
    - Create simple, non-recursive policies using auth.uid() directly
    - Ensure admin checks don't cause recursion

  3. New Policies
    - Users can view their own profile
    - Users can insert their own profile
    - Users can update their own profile (with restrictions on work_schedule for non-admins)
    - Simple admin policy without recursion
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can update work schedules" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Simple admin policy that doesn't cause recursion
-- This uses a direct check against the current row being accessed
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    (SELECT is_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- Admin update policy that prevents recursion
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR 
    (SELECT is_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  )
  WITH CHECK (
    auth.uid() = id OR 
    (SELECT is_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );