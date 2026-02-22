import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';

export async function pickImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export async function uploadImage(
  bucket: string,
  path: string,
  uri: string
): Promise<string | null> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadVerificationDoc(
  businessId: string,
  uri: string,
  fileName: string
): Promise<string | null> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();
  const ext = fileName.split('.').pop() || 'pdf';
  const path = `${businessId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('verification-docs')
    .upload(path, arrayBuffer, {
      contentType: blob.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    console.error('Verification doc upload error:', error);
    return null;
  }

  // Return the path (not public URL since this is a private bucket)
  return path;
}
