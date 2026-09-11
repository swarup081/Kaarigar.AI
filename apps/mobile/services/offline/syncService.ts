// ============================================
// Kaarigar — Offline Sync Service
// Processes the outbox queue when connectivity returns
// ============================================

import { getPendingOutboxEntries, markOutboxSynced, markOutboxError } from './database';
import { getSupabase, isSupabaseConfigured, STORAGE_BUCKETS } from '../api/supabaseClient';
import { File } from 'expo-file-system';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  // No backend configured yet. Leave the outbox untouched so the work syncs
  // once someone fills in the Supabase keys, rather than exhausting retries.
  if (!isSupabaseConfigured()) {
    console.warn('[sync] Supabase not configured, leaving the queue for later');
    return { synced: 0, failed: 0 };
  }

  const entries = await getPendingOutboxEntries();
  let synced = 0;
  let failed = 0;

  for (const entry of entries) {
    if ((entry.retryCount ?? 0) >= MAX_RETRIES) {
      await markOutboxError(entry.id, 'Max retries exceeded');
      failed++;
      continue;
    }

    try {
      switch (entry.entityType) {
        case 'product':
          await syncProduct(entry);
          break;
        case 'media':
          await syncMedia(entry);
          break;
        case 'profile':
          await syncProfile(entry);
          break;
        default:
          console.warn(`Unknown entity type: ${entry.entityType}`);
      }

      await markOutboxSynced(entry.id);
      synced++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await markOutboxError(entry.id, message);
      failed++;
    }
  }

  return { synced, failed };
}

async function syncProduct(entry: {
  operation: string;
  payload: Record<string, unknown>;
  entityLocalId: string;
}): Promise<void> {
  const { operation, payload, entityLocalId } = entry;

  switch (operation) {
    case 'create': {
      const { data, error } = await getSupabase()
        .from('products')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw new Error(`Supabase insert error: ${error.message}`);

      // Update local record with server ID
      // TODO: Update SQLite product with server_id
      break;
    }
    case 'update': {
      const { error } = await getSupabase()
        .from('products')
        .update(payload)
        .eq('id', payload.id);

      if (error) throw new Error(`Supabase update error: ${error.message}`);
      break;
    }
    case 'delete': {
      const { error } = await getSupabase()
        .from('products')
        .delete()
        .eq('id', payload.id);

      if (error) throw new Error(`Supabase delete error: ${error.message}`);
      break;
    }
  }
}

async function syncMedia(entry: {
  payload: Record<string, unknown>;
  mediaPaths?: string[];
}): Promise<void> {
  const { payload, mediaPaths } = entry;
  if (!mediaPaths || mediaPaths.length === 0) return;

  for (const localPath of mediaPaths) {
    const fileName = localPath.split('/').pop() ?? `file_${Date.now()}`;
    const bucket = (payload.bucket as string) ?? STORAGE_BUCKETS.PRODUCT_IMAGES;
    const storagePath = `${payload.artisanId}/${payload.productId}/${fileName}`;

    // expo-file-system 57 replaced the module-level helpers with File and
    // Directory classes. The old getInfoAsync and readAsStringAsync now throw.
    const file = new File(localPath);
    if (!file.exists) {
      console.warn(`[sync] file missing, skipping: ${localPath}`);
      continue;
    }

    const bytes = await file.bytes();
    const contentType =
      (payload.contentType as string) ??
      (fileName.endsWith('.png')
        ? 'image/png'
        : fileName.endsWith('.m4a')
          ? 'audio/m4a'
          : 'image/jpeg');

    const { error } = await getSupabase().storage
      .from(bucket)
      .upload(storagePath, bytes, { contentType, upsert: true });

    if (error) throw new Error(`Storage upload error: ${error.message}`);
  }
}

async function syncProfile(entry: {
  operation: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const { operation, payload } = entry;

  const { error } = await getSupabase()
    .from('artisans')
    .upsert(payload);

  if (error) throw new Error(`Profile sync error: ${error.message}`);
}

// The base64 decode helper that used to live here is gone: File.bytes()
// returns a Uint8Array directly, so there is nothing left to convert.
