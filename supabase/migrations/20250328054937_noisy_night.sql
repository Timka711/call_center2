/*
  # Add image support to questions

  1. Changes
    - Add image_url column to questions table to store image URLs
    - Default to null for questions without images

  2. Security
    - Existing RLS policies will cover the new column
*/

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS image_url text;