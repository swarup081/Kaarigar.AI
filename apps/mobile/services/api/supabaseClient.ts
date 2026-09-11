// ============================================
// Kaarigar — Supabase Client
// Used for data/storage (NOT auth — auth is Firebase)
//
// Built lazily on purpose. createClient() throws when the URL is empty, and
// this module sits at the bottom of the import chain: supabaseClient is
// imported by syncService, which is imported by the publish screen, which
// expo-router imports at startup. A throw here took the whole app down with
// a black screen and "supabaseUrl is required" before anything rendered.
//
// The app is offline-first. Capturing, recording, generating a listing and
// saving it locally all work with no backend at all, so a missing Supabase
// config must degrade to "cannot sync yet", never to a dead app.
// ============================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RuntimeSettings } from '../config/settings';

export function isSupabaseConfigured(settings: RuntimeSettings): boolean {
  return Boolean(settings.supabaseUrl && settings.supabaseAnonKey);
}

// Each sync run keeps one immutable destination, even if settings change mid-upload.
export function getSupabase(settings: RuntimeSettings): SupabaseClient {
  if (!isSupabaseConfigured(settings)) throw new Error('Configure cloud storage in Profile → API & environment.');
  return createClient(settings.supabaseUrl, settings.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
// Storage bucket names
export const STORAGE_BUCKETS = {
  PRODUCT_IMAGES: 'product-images',
  VOICE_RECORDINGS: 'voice-recordings',
  ENHANCED_IMAGES: 'enhanced-images',
  AVATARS: 'avatars',
} as const;
