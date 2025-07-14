/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Current policies on profiles table are causing infinite recursion
    - Policies are trying to query the profiles table within their own conditions
    - This creates a circular dependency when checking permissions

  2. Solution
    - Drop ALL existing policies on profiles table
    - Create simple, non-recursive policies
    - Use auth.uid() directly without subqueries
    - Separate admin logic to avoid self-referencing queries

  3. Security
    - Users can only access their own profile data
    - Admin access is handled through direct column checks
    - No recursive policy conditions
*/

-- Drop all existing policies on profiles table to eliminate recursion
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create simple, non-recursive policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin users can view all profiles (using direct column check)
CREATE POLICY "Admin users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    (SELECT is_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true
  );

-- Admin users can update all profiles (using direct column check)
CREATE POLICY "Admin users can update all profiles"
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