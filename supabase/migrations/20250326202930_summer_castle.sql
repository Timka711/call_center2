/*
  # Add form support to questions

  1. Changes
    - Add form_fields column to store form field definitions
    - Add answer_template column to store the template for generating answers
    - Add has_form flag to indicate if a question has a form

  2. Security
    - Existing RLS policies will cover the new columns
*/

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS form_fields jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS answer_template text,
ADD COLUMN IF NOT EXISTS has_form boolean DEFAULT false;