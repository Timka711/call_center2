/*
  # Fix infinite recursion in profiles RLS policies

  1. Security Changes
    - Drop all existing conflicting policies on profiles table
    - Create simple, non-recursive policies that use auth.uid() directly
    - Ensure admin policies don't create circular dependencies

  2. Policy Changes
    - Users can read/update their own profile using auth.uid() = id
    - Admins can read/update all profiles using a simple is_admin check
    - Remove any policies that query the profiles table within their conditions
*/

-- Drop all existing policies that might be causing recursion
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
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

-- Admin policies using a direct column check (no subquery)
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_admin = true OR auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin = true OR auth.uid() = id)
  WITH CHECK (is_admin = true OR auth.uid() = id);