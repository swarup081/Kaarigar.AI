// ============================================
// Kaarigar — AI Service API Client
// Calls the AI gateway (Supabase Edge Functions)
// which proxies to friend's AI server
// ============================================

import { supabase } from './supabaseClient';
import type {
  ImageEnhanceResponse,
  VoiceToListingResponse,
  PricingSuggestionRequest,
  PricingSuggestionResponse,
  TTSResponse,
} from '@kaarigar/shared-types';
import type { LanguageCode } from '@kaarigar/shared-types';

const AI_GATEWAY_URL = process.env.EXPO_PUBLIC_AI_GATEWAY_URL ?? '';

interface AIServiceOptions {
  /** Firebase auth token for authentication */
  authToken?: string;
  /** Timeout in ms (default: 30000 for most, 60000 for voice) */
  timeout?: number;
}

// ─── Image Enhancement ───────────────────────

export async function enhanceImage(
  imageUri: string,
  options: {
    background?: 'white' | 'wood' | 'cloth' | 'transparent';
    cropRatio?: '1:1' | '4:5' | '3:4';
    enhanceQuality?: boolean;
    upscale?: boolean;
  } = {},
  serviceOptions: AIServiceOptions = {}
): Promise<ImageEnhanceResponse> {
  const formData = new FormData();

  // Read the local file and create a blob
  const response = await fetch(imageUri);
  const blob = await response.blob();
  formData.append('image', blob, 'product.jpg');
  formData.append('options', JSON.stringify({
    background: options.background ?? 'white',
    crop_ratio: options.cropRatio ?? '1:1',
    enhance_quality: options.enhanceQuality ?? true,
    upscale: options.upscale ?? false,
  }));

  const result = await fetchAI('/enhance-image', {
    method: 'POST',
    body: formData,
    timeout: serviceOptions.timeout ?? 30000,
    authToken: serviceOptions.authToken,
  });

  return result as ImageEnhanceResponse;
}

// ─── Voice-to-Listing ────────────────────────

export async function voiceToListing(
  audioUri: string,
  sourceLanguage: LanguageCode,
  options: {
    targetLanguages?: LanguageCode[];
    productCategory?: string;
    detectedAttributes?: Record<string, unknown>;
  } = {},
  serviceOptions: AIServiceOptions = {}
): Promise<VoiceToListingResponse> {
  const formData = new FormData();

  const response = await fetch(audioUri);
  const blob = await response.blob();
  formData.append('audio', blob, 'voice.m4a');
  formData.append('source_language', sourceLanguage);
  formData.append('target_languages', JSON.stringify(options.targetLanguages ?? ['en', 'hi']));
  if (options.productCategory) {
    formData.append('product_category', options.productCategory);
  }
  if (options.detectedAttributes) {
    formData.append('detected_attributes', JSON.stringify(options.detectedAttributes));
  }

  const result = await fetchAI('/voice-to-listing', {
    method: 'POST',
    body: formData,
    timeout: serviceOptions.timeout ?? 60000, // Voice processing takes longer
    authToken: serviceOptions.authToken,
  });

  return result as VoiceToListingResponse;
}

// ─── Pricing Suggestion ──────────────────────

export async function suggestPrice(
  request: PricingSuggestionRequest,
  serviceOptions: AIServiceOptions = {}
): Promise<PricingSuggestionResponse> {
  const result = await fetchAI('/suggest-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    timeout: serviceOptions.timeout ?? 15000,
    authToken: serviceOptions.authToken,
  });

  return result as PricingSuggestionResponse;
}

// ─── Text-to-Speech ──────────────────────────

export async function textToSpeech(
  text: string,
  language: LanguageCode,
  voiceGender: 'male' | 'female' = 'female',
  serviceOptions: AIServiceOptions = {}
): Promise<TTSResponse> {
  const result = await fetchAI('/text-to-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language, voice_gender: voiceGender }),
    timeout: serviceOptions.timeout ?? 10000,
    authToken: serviceOptions.authToken,
  });

  return result as TTSResponse;
}

// ─── Internal fetch helper ───────────────────

interface FetchOptions {
  method: string;
  headers?: Record<string, string>;
  body?: FormData | string;
  timeout?: number;
  authToken?: string;
}

async function fetchAI(endpoint: string, options: FetchOptions): Promise<unknown> {
  const url = `${AI_GATEWAY_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? 30000);

  try {
    const headers: Record<string, string> = {
      ...options.headers,
    };

    if (options.authToken) {
      headers['Authorization'] = `Bearer ${options.authToken}`;
    }

    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AIServiceError(
        `AI service error: ${response.status}`,
        response.status,
        errorBody
      );
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof AIServiceError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new AIServiceError('Request timed out', 408, 'The AI service took too long to respond');
    }
    throw new AIServiceError(
      'Network error',
      0,
      'Could not reach the AI service. Please check your connection.'
    );
  }
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details: string
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}
