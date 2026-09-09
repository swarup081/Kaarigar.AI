// ============================================
// Kaarigar — Supabase Client
// Used for data/storage (NOT auth — auth is Firebase)
// ============================================

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // We use Firebase for auth, so disable Supabase auth auto-refresh
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Storage bucket names
export const STORAGE_BUCKETS = {
  PRODUCT_IMAGES: 'product-images',
  VOICE_RECORDINGS: 'voice-recordings',
  ENHANCED_IMAGES: 'enhanced-images',
  AVATARS: 'avatars',
} as const;
