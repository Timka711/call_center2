/*
  # Add approval status tracking for shift exchanges

  1. Changes
    - Add user_approved column to track user approval
    - Add admin_approved column to track admin approval
    - Update status logic to require both approvals

  2. Security
    - Existing RLS policies will cover the new columns
*/

-- Add approval tracking columns
ALTER TABLE shift_exchange_requests
ADD COLUMN IF NOT EXISTS user_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_approved boolean DEFAULT false;

-- Update existing records to maintain current behavior
UPDATE shift_exchange_requests 
SET user_approved = (status = 'approved'),
    admin_approved = (status = 'approved')
WHERE status = 'approved';