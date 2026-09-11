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
import Constants from 'expo-constants';

const SUPABASE_URL =
  Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Whether a backend is configured at all. Check before queueing a sync. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

let client: SupabaseClient | null = null;

/**
 * Returns the client, building it on first use.
 *
 * Throws if no backend is configured. Callers should either check
 * `isSupabaseConfigured()` first or let the outbox retry later, which is what
 * the sync service does.
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env to enable syncing.'
    );
  }

  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // We use Firebase for auth, so disable Supabase auth auto-refresh
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}

// Storage bucket names
export const STORAGE_BUCKETS = {
  PRODUCT_IMAGES: 'product-images',
  VOICE_RECORDINGS: 'voice-recordings',
  ENHANCED_IMAGES: 'enhanced-images',
  AVATARS: 'avatars',
} as const;
