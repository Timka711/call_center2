/*
  # Create question-images storage bucket

  1. Storage Setup
    - Create 'question-images' bucket for storing question images
    - Configure bucket to be publicly accessible for reading
    - Set up RLS policies for secure upload/delete operations

  2. Security
    - Allow authenticated users to upload images
    - Allow public read access to images
    - Allow users to delete their own uploaded images
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'question-images');

-- Allow public read access to images
CREATE POLICY "Public can view images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'question-images');

-- Allow users to delete images (for cleanup)
CREATE POLICY "Authenticated users can delete images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'question-images');

-- Allow users to update images (for replacements)
CREATE POLICY "Authenticated users can update images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'question-images')
WITH CHECK (bucket_id = 'question-images');