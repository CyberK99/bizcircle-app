-- Create listing-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to listing-images bucket
CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'listing-images');

-- Allow public read access to listing images
CREATE POLICY "Public read access for listing images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'listing-images');

-- Allow users to delete their own listing images
CREATE POLICY "Users can delete own listing images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);
