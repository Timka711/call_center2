/*
  # Create Questions Table Schema

  1. New Tables
    - `questions`
      - `id` (bigint, primary key)
      - `content` (text, required)
      - `parent_id` (bigint, nullable, self-referential foreign key)
      - `created_at` (timestamptz, auto-generated)
      - `user_id` (uuid, required, references auth.users)

  2. Security
    - Enable RLS on questions table
    - Add policies for:
      - Select: Users can read all questions
      - Insert: Authenticated users can create questions
      - Update/Delete: Users can modify their own questions
*/

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  content text NOT NULL,
  parent_id bigint REFERENCES questions(id),
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions
ADD COLUMN description TEXT;

-- Policies
CREATE POLICY "Anyone can read questions"
  ON questions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create questions"
  ON questions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questions"
  ON questions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questions"
  ON questions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);