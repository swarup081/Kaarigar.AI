// ============================================
// Kaarigar — AI Service Request/Response Types
// These define the contract between our app and
// the AI teammate's services.
// ============================================

import type { LanguageCode } from './product';

// ─── Image Enhancement ───────────────────────

export type BackgroundOption = 'white' | 'wood' | 'cloth' | 'transparent';
export type CropRatio = '1:1' | '4:5' | '3:4';

export interface ImageEnhanceRequest {
  /** Binary image file (sent as multipart/form-data) */
  image: File | Blob;
  options: {
    background: BackgroundOption;
    cropRatio: CropRatio;
    enhanceQuality: boolean;
    upscale: boolean;
  };
}

export interface DetectedImageAttributes {
  dominantColors: string[];
  productCategoryGuess: string;
  hasPattern: boolean;
  patternType?: string;
}

export interface ImageEnhanceResponse {
  jobId: string;
  status: 'completed' | 'failed';
  results?: {
    enhancedImageUrl: string;
    thumbnailUrl: string;
    originalDimensions: { width: number; height: number };
    enhancedDimensions: { width: number; height: number };
    detectedAttributes: DetectedImageAttributes;
  };
  error?: {
    code: string;
    message: string;
    suggestions?: string[];
  };
  processingTimeMs: number;
}

// ─── Voice-to-Listing ────────────────────────

export interface VoiceToListingRequest {
  /** Binary audio file (WAV/M4A, sent as multipart/form-data) */
  audio: File | Blob;
  sourceLanguage: LanguageCode;
  targetLanguages: LanguageCode[];
  productCategory?: string;
  detectedAttributes?: DetectedImageAttributes;
}

export interface TranscriptionResult {
  originalText: string;
  languageDetected: LanguageCode;
  confidence: number;
}

export interface GeneratedListing {
  title: Partial<Record<LanguageCode, string>>;
  description: Partial<Record<LanguageCode, string>>;
  bulletFeatures: Partial<Record<LanguageCode, string[]>>;
  heritageStory: Partial<Record<LanguageCode, string>>;
  extractedAttributes: {
    material?: string;
    technique?: string;
    region?: string;
    giTag?: string;
    colors?: string[];
    suitableFor?: string[];
  };
}

export interface VoiceToListingResponse {
  jobId: string;
  status: 'completed' | 'failed';
  results?: {
    transcription: TranscriptionResult;
    listing: GeneratedListing;
  };
  error?: {
    code: string;
    message: string;
  };
  processingTimeMs: number;
}

// ─── Pricing Suggestion ──────────────────────

export interface PricingSuggestionRequest {
  category: string;
  subCategory?: string;
  material?: string;
  technique?: string;
  region?: string;
  giTag?: string;
  rawMaterialCost?: number;
  laborHours?: number;
  dimensions?: { length: number; width: number; unit: string };
  colors?: string[];
  qualityIndicators?: {
    threadCount?: 'low' | 'medium' | 'high';
    patternComplexity?: 'simple' | 'medium' | 'complex';
  };
}

export interface PricingSuggestionResponse {
  jobId: string;
  suggestedPrice: {
    min: number;
    max: number;
    recommended: number;
    currency: string;
  };
  reasoning: {
    summary: string;
    summaryHi?: string;
    costBreakdown: {
      rawMaterial: number;
      labor: number;
      overhead: number;
      fairMargin: number;
      floorPrice: number;
    };
    marketComparables: Array<{
      title: string;
      price: number;
      source: string;
    }>;
    adjustments: Array<{
      factor: string;
      impact: string;
      reason: string;
    }>;
    confidence: number;
    sampleSize: number;
  };
}

// ─── Text-to-Speech ──────────────────────────

export interface TTSRequest {
  text: string;
  language: LanguageCode;
  voiceGender?: 'male' | 'female';
}

export interface TTSResponse {
  audioUrl: string;
  durationSeconds: number;
  language: LanguageCode;
}
