// ============================================
// Kaarigar — AI Service API Client
// Calls the AI gateway (Supabase Edge Function), which proxies
// to the FastAPI services in apps/ai-services.
//
// Image enhancement is NOT here. It runs on the phone, in
// services/image/. See docs/AI_INTEGRATION.md.
// ============================================

import type { LanguageCode } from '@kaarigar/shared-types';

const AI_GATEWAY_URL = process.env.EXPO_PUBLIC_AI_GATEWAY_URL ?? '';

// ─── Response shapes ─────────────────────────
// These mirror what the services actually emit. They are camelCase
// because the services emit camelCase; the contract markdown showing
// snake_case is wrong and would leave every field undefined here.

export interface Transcription {
  originalText: string;
  languageDetected: LanguageCode;
  confidence: number;
}

/** Only languages the model was asked for are present. Never assume a key exists. */
export type Multilingual = Partial<Record<LanguageCode, string>>;
export type MultilingualList = Partial<Record<LanguageCode, string[]>>;

export interface ExtractedAttributes {
  material?: string;
  technique?: string;
  region?: string;
  /** Only ever a tag that survived the server's shortlist check. */
  giTag?: string;
  colors?: string[];
  suitableFor?: string[];
  category?: string;
  subCategory?: string;
  hasPattern?: boolean;
  patternType?: string;
}

export interface GeneratedListing {
  title: Multilingual;
  description: Multilingual;
  bulletFeatures: MultilingualList;
  heritageStory: Multilingual;
  extractedAttributes: ExtractedAttributes;
}

export interface VoiceToListingResult {
  jobId: string;
  transcription: Transcription;
  listing: GeneratedListing;
  processingTimeMs: number;
}

export interface CostBreakdown {
  rawMaterial: number;
  labor: number;
  overhead: number;
  fairMargin: number;
  floorPrice: number;
}

export interface PricingResult {
  jobId: string;
  suggestedPrice: { min: number; max: number; recommended: number; currency: string };
  reasoning: {
    summary: string;
    summaryRegional?: string;
    costBreakdown: CostBreakdown;
    marketComparables: Array<{ title: string; price: number; source: string }>;
    adjustments: Array<{ factor: string; impact: string; reason: string }>;
    confidence: number;
    sampleSize: number;
    /** True when the model was unreachable and this is the floor price alone. */
    degraded: boolean;
  };
  processingTimeMs: number;
}

// ─── Errors ──────────────────────────────────

export class AIServiceError extends Error {
  constructor(
    /** Service error code, e.g. AUDIO_TOO_NOISY. NETWORK and TIMEOUT are added here. */
    public code: string,
    /** English detail, for logs. Screens should translate `code` instead. */
    message: string,
    public statusCode = 0
  ) {
    super(message);
    this.name = 'AIServiceError';
  }

  /** Whether trying the same request again could plausibly work. */
  get isRetryable(): boolean {
    return ['NETWORK', 'TIMEOUT', 'LLM_FAILED', 'AI_SERVICE_UNAVAILABLE'].includes(this.code);
  }
}

interface RequestOptions {
  authToken?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** React Native's FormData wants this shape for a file, not a Blob. */
function filePart(uri: string, name: string, type: string) {
  return { uri, name, type } as unknown as Blob;
}

async function callGateway(
  endpoint: string,
  init: { method: string; body: FormData | string; contentTypeJson?: boolean },
  options: RequestOptions
): Promise<unknown> {
  if (!AI_GATEWAY_URL) {
    throw new AIServiceError('NOT_CONFIGURED', 'EXPO_PUBLIC_AI_GATEWAY_URL is not set');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30000);
  options.signal?.addEventListener('abort', () => controller.abort());

  const headers: Record<string, string> = {};
  if (init.contentTypeJson) headers['Content-Type'] = 'application/json';
  if (options.authToken) headers['Authorization'] = `Bearer ${options.authToken}`;
  // Never set Content-Type for FormData. The runtime must add its own
  // multipart boundary, and overriding it makes the server reject the body.

  let response: Response;
  try {
    response = await fetch(`${AI_GATEWAY_URL}${endpoint}`, {
      method: init.method,
      headers,
      body: init.body,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    if ((error as Error).name === 'AbortError') {
      throw new AIServiceError('TIMEOUT', 'The AI service took too long to respond', 408);
    }
    throw new AIServiceError('NETWORK', 'Could not reach the AI service');
  }
  clearTimeout(timeout);

  const text = await response.text();
  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new AIServiceError('PROCESSING_ERROR', `Unreadable response: ${text.slice(0, 200)}`, response.status);
  }

  // The services return a typed error body on failure. Prefer its code over
  // the HTTP status, because that is what the screens translate.
  if (!response.ok || payload?.status === 'failed' || payload?.error) {
    const error = payload?.error ?? {};
    throw new AIServiceError(
      error.code ?? 'PROCESSING_ERROR',
      error.message ?? `AI service returned ${response.status}`,
      response.status
    );
  }

  return payload;
}

// ─── Voice to listing ────────────────────────

export interface VoiceToListingParams {
  audioUri: string;
  sourceLanguage: LanguageCode;
  targetLanguages?: LanguageCode[];
  /** Hint from the artisan's craft type. The model may correct it. */
  productCategory?: string;
  /** Filters the Geographical Indication shortlist. Send it whenever known. */
  region?: string;
  /** Colours measured on-device, so the model names them the way buyers search. */
  dominantColors?: string[];
  /** The enhanced photo. Optional, but it improves category and colour accuracy. */
  imageUri?: string;
}

export async function voiceToListing(
  params: VoiceToListingParams,
  options: RequestOptions = {}
): Promise<VoiceToListingResult> {
  const form = new FormData();

  const audioName = params.audioUri.split('/').pop() || 'voice.m4a';
  const audioType = audioName.endsWith('.wav') ? 'audio/wav' : 'audio/m4a';
  form.append('audio', filePart(params.audioUri, audioName, audioType));

  form.append('source_language', params.sourceLanguage);
  form.append('target_languages', JSON.stringify(params.targetLanguages ?? ['en', params.sourceLanguage]));

  if (params.productCategory) form.append('product_category', params.productCategory);
  if (params.region) form.append('region', params.region);
  if (params.dominantColors?.length) {
    form.append('detected_attributes', JSON.stringify({ dominantColors: params.dominantColors }));
  }
  if (params.imageUri) {
    form.append('image', filePart(params.imageUri, 'product.jpg', 'image/jpeg'));
  }

  const payload = (await callGateway(
    '/voice-to-listing',
    { method: 'POST', body: form },
    // Speech plus generation in one call. Measured around 20 seconds, so the
    // ceiling is generous; the screen shows progress rather than blocking.
    { ...options, timeoutMs: options.timeoutMs ?? 90000 }
  )) as any;

  return {
    jobId: payload.jobId,
    transcription: payload.results.transcription,
    listing: payload.results.listing,
    processingTimeMs: payload.processingTimeMs,
  };
}

// ─── Pricing ─────────────────────────────────

export interface PricingParams {
  category: string;
  subCategory?: string;
  material?: string;
  technique?: string;
  region?: string;
  giTag?: string;
  /** Rupees the artisan spent on materials. Required for a floor price. */
  rawMaterialCost?: number;
  /** Hours of work. Required for a floor price. */
  laborHours?: number;
  colors?: string[];
  dimensions?: { length?: number; width?: number; unit: string };
  qualityIndicators?: {
    threadCount?: 'low' | 'medium' | 'high';
    patternComplexity?: 'simple' | 'medium' | 'complex';
  };
  /** Which language the spoken explanation comes back in. */
  language?: LanguageCode;
}

export async function suggestPrice(
  params: PricingParams,
  options: RequestOptions = {}
): Promise<PricingResult> {
  const payload = (await callGateway(
    '/suggest-price',
    { method: 'POST', body: JSON.stringify(params), contentTypeJson: true },
    { ...options, timeoutMs: options.timeoutMs ?? 45000 }
  )) as PricingResult;

  return payload;
}
