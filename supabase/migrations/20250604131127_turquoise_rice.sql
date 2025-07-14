/*
  # Create storage bucket for question images

  1. Storage
    - Create a new bucket 'question-images' for storing question-related images
  2. Security
    - Enable public access for authenticated users
    - Add policies for authenticated users to upload and delete their own images
*/

-- Enable storage by creating the bucket
INSERT INTO storage.buckets (id, name)
VALUES ('question-images', 'question-images');

-- Set up RLS policies for the bucket
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'question-images');

CREATE POLICY "Allow authenticated users to delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'question-images' AND auth.uid() = owner);

CREATE POLICY "Allow public read access to images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'question-images');