/*
  # Add image positioning support

  1. Changes
    - Add image_positioning column to questions table to store positioning data
    - This will store JSON data with x, y, width, height, rotation, and scale values

  2. Security
    - Existing RLS policies will cover the new column
*/

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS image_positioning jsonb;