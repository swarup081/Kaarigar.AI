// ============================================
// Kaarigar — Offline Sync Service
// Processes the outbox queue when connectivity returns
// ============================================

import { getPendingOutboxEntries, markOutboxSynced, markOutboxError } from './database';
import { supabase, STORAGE_BUCKETS } from '../api/supabaseClient';
import * as FileSystem from 'expo-file-system';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
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
      const { data, error } = await supabase
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
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', payload.id);

      if (error) throw new Error(`Supabase update error: ${error.message}`);
      break;
    }
    case 'delete': {
      const { error } = await supabase
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

    // Read file
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (!fileInfo.exists) {
      console.warn(`File not found: ${localPath}`);
      continue;
    }

    const base64 = await FileSystem.readAsStringAsync(localPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, decode(base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw new Error(`Storage upload error: ${error.message}`);
  }
}

async function syncProfile(entry: {
  operation: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const { operation, payload } = entry;

  const { error } = await supabase
    .from('artisans')
    .upsert(payload);

  if (error) throw new Error(`Profile sync error: ${error.message}`);
}

// Base64 decode helper
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
