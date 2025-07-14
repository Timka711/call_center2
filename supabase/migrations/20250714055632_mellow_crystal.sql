/*
  # Add board position column to questions table

  1. Changes
    - Add `board_position` column to store Miro-like board positioning data
    - Column stores JSON with x, y, width, height coordinates

  2. Security
    - No changes to RLS policies needed as this uses existing question permissions
*/

-- Add board_position column to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS board_position jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN questions.board_position IS 'Stores position and size data for Miro-like board view: {x, y, width, height}';