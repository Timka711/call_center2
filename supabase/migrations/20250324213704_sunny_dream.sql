/*
  # Update work schedule schema

  1. Changes
    - Modify work_schedule column to store an array of daily schedules
    - Each schedule includes date, start time, and end time

  2. Security
    - Existing RLS policies remain unchanged
*/

ALTER TABLE profiles
DROP COLUMN IF EXISTS work_schedule;

ALTER TABLE profiles
ADD COLUMN work_schedule jsonb[] DEFAULT '{}'::jsonb[];