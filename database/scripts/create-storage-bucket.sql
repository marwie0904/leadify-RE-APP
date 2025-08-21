-- Create storage bucket for agent documents
-- Run this in Supabase SQL Editor

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent-documents',
  'agent-documents',
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'text/plain', 'text/csv', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for authenticated users
-- Policy for uploading files
CREATE POLICY "Users can upload agent documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'agent-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM agents WHERE user_id = auth.uid()
  )
);

-- Policy for viewing files
CREATE POLICY "Users can view their agent documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'agent-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM agents WHERE user_id = auth.uid()
  )
);

-- Policy for deleting files
CREATE POLICY "Users can delete their agent documents" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'agent-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM agents WHERE user_id = auth.uid()
  )
);

-- Policy for updating files (if needed)
CREATE POLICY "Users can update their agent documents" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'agent-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM agents WHERE user_id = auth.uid()
  )
);