/*
  # Remove recursive RLS policies from profiles table

  1. Security Changes
    - Drop all existing policies on profiles table
    - Create only basic, non-recursive policies
    - Remove any admin-checking policies that cause recursion
    - Use simple auth.uid() = id checks only

  2. Important Notes
    - This removes admin-specific policies to prevent recursion
    - Admin functionality will need to be handled at application level
    - All users can only access their own profile data
*/

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Admin users can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin users can view all profiles" ON profiles;
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