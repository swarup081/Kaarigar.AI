import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface RuntimeSettings {
  aiMode: 'direct' | 'gateway';
  geminiApiKey: string;
  geminiModel: string;
  gatewayUrl: string;
  gatewayToken: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const STORAGE_KEY = 'kaarigar.connection-settings.v1';

// Only public defaults may enter the bundle. Provider secrets are entered on-device.
export function defaultSettings(): RuntimeSettings {
  return {
    aiMode: 'direct',
    geminiApiKey: '',
    geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.6-flash',
    gatewayUrl: process.env.EXPO_PUBLIC_AI_GATEWAY_URL || '',
    gatewayToken: '',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  };
}

export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  if (Platform.OS === 'web') return defaultSettings();
  const saved = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!saved) return defaultSettings();
  // Fail visibly on storage corruption instead of silently switching destinations.
  return { ...defaultSettings(), ...JSON.parse(saved) };
}

function httpsUrl(value: string, label: string): string {
  if (!value) return '';
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error(`${label} must be a full HTTPS address.`); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`${label} must use HTTPS, without passwords, query parameters or fragments.`);
  }
  return value.replace(/\/+$/, '');
}

export function validateSettings(input: RuntimeSettings): RuntimeSettings {
  const value = Object.fromEntries(Object.entries(input).map(([key, item]) => [key, item.trim()])) as unknown as RuntimeSettings;
  if (!['direct', 'gateway'].includes(value.aiMode)) throw new Error('Choose an API connection mode.');
  if (!/^[a-zA-Z0-9._-]+$/.test(value.geminiModel)) throw new Error('Enter a valid Gemini model name.');
  // A stale development URL is retained but is never used in standalone mode.
  if (value.aiMode === 'gateway') {
    value.gatewayUrl = httpsUrl(value.gatewayUrl, 'Hosted API URL');
    if (!value.gatewayUrl) throw new Error('Enter your hosted API URL.');
  }
  value.supabaseUrl = httpsUrl(value.supabaseUrl, 'Supabase URL');
  if (Boolean(value.supabaseUrl) !== Boolean(value.supabaseAnonKey)) {
    throw new Error('Enter both Supabase fields, or clear both to use local storage only.');
  }
  if (value.supabaseAnonKey.startsWith('sb_secret_')) throw new Error('Use a Supabase publishable or anon key, never a secret key.');
  if (value.supabaseAnonKey && !value.supabaseAnonKey.startsWith('sb_publishable_')) {
    try {
      const segment = value.supabaseAnonKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const claims = JSON.parse(atob(segment.padEnd(Math.ceil(segment.length / 4) * 4, '=')));
      if (claims.role !== 'anon') throw new Error('role');
    } catch { throw new Error('Use a valid Supabase anon or publishable key.'); }
  }
  return value;
}

export async function saveRuntimeSettings(input: RuntimeSettings): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Save API credentials in the installed mobile app.');
  const value = validateSettings(input);
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(value), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
