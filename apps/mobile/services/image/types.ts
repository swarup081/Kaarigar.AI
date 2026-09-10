// ============================================
// Kaarigar — On-Device Image Enhancement Types
// Mirrors docs/api-contracts/image-enhancer.md, but the
// enhancement runs on the phone, so paths are local file
// URIs rather than Supabase URLs. The sync service uploads
// them later and fills in the remote URLs.
// ============================================

export type BackgroundOption = 'white' | 'wood' | 'cloth' | 'transparent';
export type CropRatio = '1:1' | '4:5' | '3:4';

/** Same error codes the server contract defines, so both paths behave alike. */
export type EnhanceErrorCode =
  | 'IMAGE_TOO_DARK'
  | 'IMAGE_TOO_BRIGHT'
  | 'IMAGE_BLURRY'
  | 'NO_PRODUCT_DETECTED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FORMAT'
  | 'PROCESSING_ERROR';

export interface EnhanceOptions {
  background: BackgroundOption;
  cropRatio: CropRatio;
  /** Auto levels, contrast and saturation correction. */
  enhanceQuality: boolean;
  /** Longest edge of the output, in pixels. */
  outputSize: number;
  /** Longest edge of the thumbnail, in pixels. */
  thumbnailSize: number;
  /** Skip the quality gates. Used when the artisan insists on keeping a photo. */
  skipGates: boolean;
}

export const DEFAULT_ENHANCE_OPTIONS: EnhanceOptions = {
  background: 'white',
  cropRatio: '1:1',
  enhanceQuality: true,
  outputSize: 1080,
  thumbnailSize: 320,
  skipGates: false,
};

/** Measurements taken from the pixels, kept so the UI can explain a rejection. */
export interface ImageQualityStats {
  /** Mean luminance, 0 to 255. */
  brightness: number;
  /** Share of pixels at or near pure white, 0 to 1. */
  clippedFraction: number;
  /** Variance of the Laplacian. Higher is sharper. */
  sharpness: number;
  /** Share of pixels the matte kept, 0 to 1. Only set once a cut-out exists. */
  subjectCoverage?: number;
}

/**
 * Attributes read off the photo on-device. The category guess is deliberately
 * absent: Gemini sees the same photo during the voice step and names the
 * category there, which avoids shipping a classifier inside the app.
 */
export interface LocalImageAttributes {
  /** Up to five dominant hex colours of the product itself, background excluded. */
  dominantColors: string[];
  hasPattern: boolean;
  /** Normalised edge density, 0 to 1. Feeds hasPattern and is useful for tuning. */
  patternStrength: number;
}

export interface EnhancedImage {
  /** file:// URI of the composited, corrected image. */
  uri: string;
  /** file:// URI of the small version used in lists and the review screen. */
  thumbnailUri: string;
  width: number;
  height: number;
}

export interface EnhanceSuccess {
  status: 'completed';
  source: { uri: string; width: number; height: number };
  enhanced: EnhancedImage;
  /** False when the device could not cut out the subject and we kept the frame as shot. */
  backgroundRemoved: boolean;
  /** True when the caller should retry through the server for a better matte. */
  serverFallbackSuggested: boolean;
  attributes: LocalImageAttributes;
  quality: ImageQualityStats;
  processingTimeMs: number;
}

export interface EnhanceFailure {
  status: 'failed';
  error: {
    code: EnhanceErrorCode;
    /** i18n key. The screen translates it; never show this string raw. */
    messageKey: string;
    /** i18n keys for what the artisan should do about it. */
    suggestionKeys: string[];
  };
  quality?: ImageQualityStats;
  processingTimeMs: number;
}

export type EnhanceResult = EnhanceSuccess | EnhanceFailure;
