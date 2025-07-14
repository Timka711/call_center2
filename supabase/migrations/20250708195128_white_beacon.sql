/*
  # Add profile viewing policies for shift exchange

  1. New Policies
    - Allow admins to view all profiles
    - Allow users to view profiles of people they have shift exchange requests with

  2. Security
    - Maintains existing user privacy while allowing necessary access for shift exchanges
*/

-- Policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Policy for users to view profiles involved in their shift exchange requests
CREATE POLICY "Users can view profiles in their shift exchanges"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT requester_id FROM shift_exchange_requests 
      WHERE target_user_id = auth.uid()
      UNION
      SELECT target_user_id FROM shift_exchange_requests 
      WHERE requester_id = auth.uid()
      UNION
      SELECT requester_id FROM shift_exchange_requests 
      WHERE requester_id = auth.uid()
      UNION
      SELECT target_user_id FROM shift_exchange_requests 
      WHERE target_user_id = auth.uid()
    )
  );