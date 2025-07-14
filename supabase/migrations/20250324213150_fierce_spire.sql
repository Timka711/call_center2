/*
  # Add Profile Sections

  1. Changes
    - Add chat_rating column to profiles table
    - Add work_schedule column to profiles table
    - Add color_scheme column to profiles table

  2. Security
    - Existing RLS policies will cover the new columns
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS chat_rating integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS work_schedule jsonb DEFAULT '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"18:00"},"friday":{"start":"09:00","end":"18:00"},"saturday":{"start":"","end":""},"sunday":{"start":"","end":""}}',
ADD COLUMN IF NOT EXISTS color_scheme text DEFAULT 'light';