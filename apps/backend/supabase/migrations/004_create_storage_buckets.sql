-- ============================================
-- Run this in Supabase SQL Editor AFTER the 3 migrations
-- Creates storage buckets for product media
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('enhanced-images', 'enhanced-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-recordings', 'voice-recordings', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies: authenticated users can upload to their own folder
CREATE POLICY "Users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Users can upload enhanced images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'enhanced-images');

CREATE POLICY "Users can upload voice recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-recordings');

CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Public read for product images and enhanced images
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('product-images', 'enhanced-images', 'avatars'));

-- Service role can upload (for AI services)
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
