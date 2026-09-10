// ============================================
// Kaarigar — On-Device Image Enhancement
// Single entry point for the create flow.
// ============================================

export { enhanceProductPhoto } from './enhance';
export { isCutoutSupported, cutOutSubject } from './backgroundRemoval';
export { THRESHOLDS, CROP_RATIOS } from './thresholds';
export {
  DEFAULT_ENHANCE_OPTIONS,
  type BackgroundOption,
  type CropRatio,
  type EnhanceErrorCode,
  type EnhanceFailure,
  type EnhanceOptions,
  type EnhanceResult,
  type EnhanceSuccess,
  type EnhancedImage,
  type ImageQualityStats,
  type LocalImageAttributes,
} from './types';
