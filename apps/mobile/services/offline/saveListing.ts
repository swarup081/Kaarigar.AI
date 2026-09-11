// ============================================
// Kaarigar — Persist a finished listing
// Writes the product to SQLite first, then queues the upload.
//
// Local write always succeeds, even with no connection. That is
// the whole point of the offline-first design: the artisan's work
// is safe the moment they press publish, and the network catches
// up later.
// ============================================

import { saveProductLocally, addToOutbox, type LocalProduct } from './database';
import { STORAGE_BUCKETS } from '../api/supabaseClient';
import type { GeneratedListing, PricingResult, Transcription } from '../api/ai';
import type { LanguageCode } from '@kaarigar/shared-types';

function id(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface SaveListingInput {
  artisanId: string;
  language: LanguageCode;
  listing: GeneratedListing;
  transcript: Transcription | null;
  /** Artisan corrections, keyed by field name. These win over the generated text. */
  edits: Record<string, string>;
  pricing: PricingResult | null;
  finalPrice: number | null;
  rawMaterialCost: number | null;
  laborHours: number | null;
  /** Enhanced images where available, originals where enhancement failed. */
  imageUris: string[];
  voiceUri: string | null;
  channels: string[];
}

export interface SaveListingResult {
  localId: string;
  product: LocalProduct;
  /** How many uploads are waiting on a connection. */
  queuedUploads: number;
}

/**
 * Saves the listing locally and queues everything the server needs.
 *
 * Order matters. The product row goes in first so that a crash between the
 * two writes loses the sync queue, not the artisan's work.
 */
export async function saveListing(input: SaveListingInput): Promise<SaveListingResult> {
  const localId = id('product');
  const { listing, edits, pricing, language } = input;
  const attributes = listing.extractedAttributes;

  // Edits override the generated text for the artisan's own language only.
  // The other languages keep what the model wrote, since the artisan did not
  // review those and we should not guess at a translation of their correction.
  const title = { ...listing.title, [language]: edits.title ?? listing.title[language] };
  const description = {
    ...listing.description,
    [language]: edits.description ?? listing.description[language],
  };
  const heritage = {
    ...listing.heritageStory,
    [language]: edits.heritage ?? listing.heritageStory[language],
  };

  const product: LocalProduct = {
    localId,
    artisanId: input.artisanId,

    titleRegional: title[language],
    titleEnglish: title.en,
    titleHindi: title.hi,
    descriptionRegional: description[language],
    descriptionEnglish: description.en,
    descriptionHindi: description.hi,
    bulletFeatures: listing.bulletFeatures as Record<string, string[]>,
    heritageStory: heritage[language],

    category: attributes.category,
    subCategory: attributes.subCategory,
    material: attributes.material,
    technique: attributes.technique,
    colors: attributes.colors,
    giTag: attributes.giTag,
    regionOfOrigin: attributes.region,

    rawMaterialCost: input.rawMaterialCost ?? undefined,
    laborHours: input.laborHours ?? undefined,
    laborCost: pricing?.reasoning.costBreakdown.labor,
    floorPrice: pricing?.reasoning.costBreakdown.floorPrice,
    suggestedPriceMin: pricing?.suggestedPrice.min,
    suggestedPriceMax: pricing?.suggestedPrice.max,
    suggestedPriceRecommended: pricing?.suggestedPrice.recommended,
    finalPrice: input.finalPrice ?? undefined,
    pricingReasoning: pricing?.reasoning as unknown as Record<string, unknown>,

    localImagePaths: input.imageUris,
    localVoicePath: input.voiceUri ?? undefined,
    voiceTranscript: input.transcript?.originalText,

    status: 'ready',
    aiStatus: {
      image: 'completed',
      voice: input.transcript ? 'completed' : 'pending',
      listing: 'completed',
      pricing: pricing ? 'completed' : 'pending',
    },
    publishedChannels: input.channels.map((channel) => ({
      channel,
      status: 'pending',
      publishedAt: new Date().toISOString(),
    })),
    syncStatus: 'pending',
  };

  await saveProductLocally(product);

  // Media first. The product row on the server references these URLs, so
  // uploading images before the record avoids a row pointing at nothing.
  let queuedUploads = 0;

  if (input.imageUris.length > 0) {
    await addToOutbox({
      id: id('media'),
      entityType: 'media',
      entityLocalId: localId,
      operation: 'upload',
      payload: {
        bucket: STORAGE_BUCKETS.ENHANCED_IMAGES,
        artisanId: input.artisanId,
        productId: localId,
      },
      mediaPaths: input.imageUris,
    });
    queuedUploads += input.imageUris.length;
  }

  if (input.voiceUri) {
    await addToOutbox({
      id: id('media'),
      entityType: 'media',
      entityLocalId: localId,
      operation: 'upload',
      payload: {
        bucket: STORAGE_BUCKETS.VOICE_RECORDINGS,
        artisanId: input.artisanId,
        productId: localId,
        contentType: 'audio/m4a',
      },
      mediaPaths: [input.voiceUri],
    });
    queuedUploads += 1;
  }

  await addToOutbox({
    id: id('sync'),
    entityType: 'product',
    entityLocalId: localId,
    operation: 'create',
    payload: toServerRow(product),
  });

  return { localId, product, queuedUploads };
}

/** Maps the local camelCase row onto the snake_case Postgres columns. */
function toServerRow(product: LocalProduct): Record<string, unknown> {
  return {
    artisan_id: product.artisanId,
    title_regional: product.titleRegional,
    title_english: product.titleEnglish,
    title_hindi: product.titleHindi,
    description_regional: product.descriptionRegional,
    description_english: product.descriptionEnglish,
    description_hindi: product.descriptionHindi,
    bullet_features: product.bulletFeatures ?? {},
    category: product.category,
    sub_category: product.subCategory,
    material: product.material,
    technique: product.technique,
    colors: product.colors,
    heritage_story: product.heritageStory ? { text: product.heritageStory } : {},
    gi_tag: product.giTag,
    region_of_origin: product.regionOfOrigin,
    raw_material_cost: product.rawMaterialCost,
    labor_cost: product.laborCost,
    labor_hours: product.laborHours,
    floor_price: product.floorPrice,
    suggested_price_min: product.suggestedPriceMin,
    suggested_price_max: product.suggestedPriceMax,
    suggested_price_recommended: product.suggestedPriceRecommended,
    final_price: product.finalPrice,
    pricing_reasoning: product.pricingReasoning ?? {},
    currency: 'INR',
    voice_transcript: product.voiceTranscript,
    status: product.status,
    ai_processing_status: product.aiStatus ?? {},
    published_channels: product.publishedChannels ?? [],
    device_id: product.localId,
  };
}
