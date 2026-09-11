// ============================================
// Kaarigar — Offline SQLite Database
// Local-first storage for products, drafts, sync outbox
// ============================================

import * as SQLite from 'expo-sqlite';
import { defaultSettings, getRuntimeSettings } from '../config/settings';

const DB_NAME = 'kaarigar.db';
const DB_VERSION = 2;

let db: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (!opening) opening = (async () => {
    const database = await SQLite.openDatabaseAsync(DB_NAME);
    try {
      await database.execAsync('PRAGMA journal_mode = WAL;');
      await database.execAsync('PRAGMA foreign_keys = ON;');
      await runMigrations(database);
      db = database;
      return database;
    } catch (error) {
      await database.closeAsync();
      throw error;
    } finally { opening = null; }
  })();
  return opening;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  const result = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version;'
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    await database.execAsync(`
      -- Products table (local-first)
      CREATE TABLE IF NOT EXISTS products (
        local_id TEXT PRIMARY KEY,
        server_id TEXT,
        artisan_id TEXT NOT NULL,
        
        title_regional TEXT,
        title_english TEXT,
        title_hindi TEXT,
        description_regional TEXT,
        description_english TEXT,
        description_hindi TEXT,
        bullet_features TEXT,
        
        category TEXT,
        sub_category TEXT,
        material TEXT,
        technique TEXT,
        colors TEXT,
        dimensions TEXT,
        weight_grams INTEGER,
        
        heritage_story TEXT,
        gi_tag TEXT,
        region_of_origin TEXT,
        
        raw_material_cost REAL,
        labor_cost REAL,
        labor_hours REAL,
        floor_price REAL,
        suggested_price_min REAL,
        suggested_price_max REAL,
        suggested_price_recommended REAL,
        final_price REAL,
        pricing_reasoning TEXT,
        
        local_image_paths TEXT,
        server_image_urls TEXT,
        local_voice_path TEXT,
        server_voice_url TEXT,
        voice_transcript TEXT,
        
        status TEXT DEFAULT 'draft',
        ai_status TEXT DEFAULT '{}',
        published_channels TEXT DEFAULT '[]',
        storefront_url TEXT,
        
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        sync_status TEXT DEFAULT 'pending'
      );

      -- Sync outbox for offline-first
      CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_local_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        media_paths TEXT,
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        last_attempt TEXT,
        error_message TEXT
      );

      -- Artisan profile (local cache)
      CREATE TABLE IF NOT EXISTS artisan_profile (
        id TEXT PRIMARY KEY,
        firebase_uid TEXT,
        phone TEXT,
        name TEXT,
        display_name TEXT,
        language_code TEXT DEFAULT 'hi',
        avatar_url TEXT,
        craft_type TEXT,
        region TEXT,
        state TEXT,
        storefront_slug TEXT,
        profile_completeness INTEGER DEFAULT 0,
        onboarding_completed INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- App settings
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      PRAGMA user_version = 1;
    `);
  }
  if (currentVersion < 2) {
    await database.withTransactionAsync(async () => {
      await database.execAsync('ALTER TABLE sync_outbox ADD COLUMN backend_url TEXT;');
      await database.runAsync('UPDATE sync_outbox SET backend_url = ?', [defaultSettings().supabaseUrl.replace(/\/+$/, '')]);
      await database.execAsync(`PRAGMA user_version = ${DB_VERSION};`);
    });
  }
}

// ─── Product CRUD ─────────────────────────────

export async function saveProductLocally(product: LocalProduct): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT OR REPLACE INTO products (
      local_id, server_id, artisan_id,
      title_regional, title_english, title_hindi,
      description_regional, description_english, description_hindi,
      bullet_features, category, sub_category, material, technique,
      colors, dimensions, weight_grams,
      heritage_story, gi_tag, region_of_origin,
      raw_material_cost, labor_cost, labor_hours,
      floor_price, suggested_price_min, suggested_price_max,
      suggested_price_recommended, final_price, pricing_reasoning,
      local_image_paths, server_image_urls,
      local_voice_path, server_voice_url, voice_transcript,
      status, ai_status, published_channels, storefront_url,
      created_at, updated_at, sync_status
    ) VALUES (
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )`,
    [
      product.localId, product.serverId ?? null, product.artisanId,
      product.titleRegional ?? null, product.titleEnglish ?? null, product.titleHindi ?? null,
      product.descriptionRegional ?? null, product.descriptionEnglish ?? null, product.descriptionHindi ?? null,
      product.bulletFeatures ? JSON.stringify(product.bulletFeatures) : null,
      product.category ?? null, product.subCategory ?? null,
      product.material ?? null, product.technique ?? null,
      product.colors ? JSON.stringify(product.colors) : null,
      product.dimensions ? JSON.stringify(product.dimensions) : null,
      product.weightGrams ?? null,
      product.heritageStory ?? null, product.giTag ?? null, product.regionOfOrigin ?? null,
      product.rawMaterialCost ?? null, product.laborCost ?? null, product.laborHours ?? null,
      product.floorPrice ?? null, product.suggestedPriceMin ?? null, product.suggestedPriceMax ?? null,
      product.suggestedPriceRecommended ?? null, product.finalPrice ?? null,
      product.pricingReasoning ? JSON.stringify(product.pricingReasoning) : null,
      product.localImagePaths ? JSON.stringify(product.localImagePaths) : null,
      product.serverImageUrls ? JSON.stringify(product.serverImageUrls) : null,
      product.localVoicePath ?? null, product.serverVoiceUrl ?? null,
      product.voiceTranscript ?? null,
      product.status ?? 'draft',
      JSON.stringify(product.aiStatus ?? {}),
      JSON.stringify(product.publishedChannels ?? []),
      product.storefrontUrl ?? null,
      product.createdAt ?? now, now, product.syncStatus ?? 'pending',
    ]
  );
}

export async function getLocalProducts(artisanId: string): Promise<LocalProduct[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE artisan_id = ? ORDER BY updated_at DESC',
    [artisanId]
  );
  return rows.map(parseProductRow);
}

export async function getLocalProduct(localId: string): Promise<LocalProduct | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE local_id = ?',
    [localId]
  );
  return row ? parseProductRow(row) : null;
}

export async function deleteLocalProduct(localId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM products WHERE local_id = ?', [localId]);
}

// ─── Sync Outbox ──────────────────────────────

export async function addToOutbox(entry: OutboxEntry): Promise<void> {
  const db = await getDatabase();
  const settings = await getRuntimeSettings();
  await db.runAsync(
    `INSERT INTO sync_outbox (id, entity_type, entity_local_id, operation, payload, media_paths, backend_url, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
    [
      entry.id,
      entry.entityType,
      entry.entityLocalId,
      entry.operation,
      JSON.stringify(entry.payload),
      entry.mediaPaths ? JSON.stringify(entry.mediaPaths) : null,
      (entry.backendUrl ?? settings.supabaseUrl).replace(/\/+$/, ''),
    ]
  );
}

export async function getPendingOutboxEntries(): Promise<OutboxEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sync_outbox WHERE status = 'pending' ORDER BY created_at ASC`
  );
  return rows.map((row) => ({
    id: row.id as string,
    entityType: row.entity_type as string,
    entityLocalId: row.entity_local_id as string,
    operation: row.operation as string,
    payload: JSON.parse(row.payload as string),
    mediaPaths: row.media_paths ? JSON.parse(row.media_paths as string) : undefined,
    status: row.status as string,
    retryCount: row.retry_count as number,
    createdAt: row.created_at as string,
    backendUrl: row.backend_url as string | undefined,
  }));
}

/** Bind local-only uploads once, before making any network requests. */
export async function bindUnassignedOutbox(backendUrl: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "UPDATE sync_outbox SET backend_url = ? WHERE (backend_url IS NULL OR backend_url = '') AND status != 'synced'",
    [backendUrl.replace(/\/+$/, '')],
  );
}

export async function markOutboxSynced(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sync_outbox SET status = 'synced', last_attempt = datetime('now') WHERE id = ?`,
    [id]
  );
}

export async function markOutboxError(id: string, error: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sync_outbox SET status = 'error', error_message = ?, retry_count = retry_count + 1, last_attempt = datetime('now') WHERE id = ?`,
    [error, id]
  );
}

// ─── Settings ─────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

// ─── Types ────────────────────────────────────

export interface LocalProduct {
  localId: string;
  serverId?: string;
  artisanId: string;
  titleRegional?: string;
  titleEnglish?: string;
  titleHindi?: string;
  descriptionRegional?: string;
  descriptionEnglish?: string;
  descriptionHindi?: string;
  bulletFeatures?: Record<string, string[]>;
  category?: string;
  subCategory?: string;
  material?: string;
  technique?: string;
  colors?: string[];
  dimensions?: Record<string, unknown>;
  weightGrams?: number;
  heritageStory?: string;
  giTag?: string;
  regionOfOrigin?: string;
  rawMaterialCost?: number;
  laborCost?: number;
  laborHours?: number;
  floorPrice?: number;
  suggestedPriceMin?: number;
  suggestedPriceMax?: number;
  suggestedPriceRecommended?: number;
  finalPrice?: number;
  pricingReasoning?: Record<string, unknown>;
  localImagePaths?: string[];
  serverImageUrls?: string[];
  localVoicePath?: string;
  serverVoiceUrl?: string;
  voiceTranscript?: string;
  status: string;
  aiStatus?: Record<string, string>;
  publishedChannels?: Array<Record<string, unknown>>;
  storefrontUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: string;
}

export interface OutboxEntry {
  backendUrl?: string;
  id: string;
  entityType: string;
  entityLocalId: string;
  operation: string;
  payload: Record<string, unknown>;
  mediaPaths?: string[];
  status?: string;
  retryCount?: number;
  createdAt?: string;
}

// ─── Helpers ──────────────────────────────────

function parseProductRow(row: Record<string, unknown>): LocalProduct {
  return {
    localId: row.local_id as string,
    serverId: row.server_id as string | undefined,
    artisanId: row.artisan_id as string,
    titleRegional: row.title_regional as string | undefined,
    titleEnglish: row.title_english as string | undefined,
    titleHindi: row.title_hindi as string | undefined,
    descriptionRegional: row.description_regional as string | undefined,
    descriptionEnglish: row.description_english as string | undefined,
    descriptionHindi: row.description_hindi as string | undefined,
    bulletFeatures: row.bullet_features ? JSON.parse(row.bullet_features as string) : undefined,
    category: row.category as string | undefined,
    subCategory: row.sub_category as string | undefined,
    material: row.material as string | undefined,
    technique: row.technique as string | undefined,
    colors: row.colors ? JSON.parse(row.colors as string) : undefined,
    dimensions: row.dimensions ? JSON.parse(row.dimensions as string) : undefined,
    weightGrams: row.weight_grams as number | undefined,
    heritageStory: row.heritage_story as string | undefined,
    giTag: row.gi_tag as string | undefined,
    regionOfOrigin: row.region_of_origin as string | undefined,
    rawMaterialCost: row.raw_material_cost as number | undefined,
    laborCost: row.labor_cost as number | undefined,
    laborHours: row.labor_hours as number | undefined,
    floorPrice: row.floor_price as number | undefined,
    suggestedPriceMin: row.suggested_price_min as number | undefined,
    suggestedPriceMax: row.suggested_price_max as number | undefined,
    suggestedPriceRecommended: row.suggested_price_recommended as number | undefined,
    finalPrice: row.final_price as number | undefined,
    pricingReasoning: row.pricing_reasoning ? JSON.parse(row.pricing_reasoning as string) : undefined,
    localImagePaths: row.local_image_paths ? JSON.parse(row.local_image_paths as string) : undefined,
    serverImageUrls: row.server_image_urls ? JSON.parse(row.server_image_urls as string) : undefined,
    localVoicePath: row.local_voice_path as string | undefined,
    serverVoiceUrl: row.server_voice_url as string | undefined,
    voiceTranscript: row.voice_transcript as string | undefined,
    status: (row.status as string) ?? 'draft',
    aiStatus: row.ai_status ? JSON.parse(row.ai_status as string) : undefined,
    publishedChannels: row.published_channels ? JSON.parse(row.published_channels as string) : undefined,
    storefrontUrl: row.storefront_url as string | undefined,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
    syncStatus: row.sync_status as string | undefined,
  };
}
