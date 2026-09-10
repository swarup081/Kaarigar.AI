// ============================================
// Kaarigar — Image Quality Thresholds
// Every number here is a guess until it is tuned against real
// artisan photos shot on low-end phones in workshop lighting.
// Keep them in one file so tuning is a single diff.
// ============================================

export const THRESHOLDS = {
  /** Mean luminance below this is unusable. Tungsten workshop bulbs sit near 70. */
  brightnessMin: 60,
  /** Mean luminance above this means the highlights are gone. */
  brightnessMax: 215,
  /** Share of pixels at 250 or above that counts as blown out. */
  clippedMax: 0.1,
  /** Variance of the Laplacian. Below this the weave detail is lost. */
  sharpnessMin: 90,
  /** A matte keeping less than this is almost certainly a failed cut-out. */
  subjectCoverageMin: 0.05,
  /** A matte keeping more than this did not find a background at all. */
  subjectCoverageMax: 0.95,
  /** Normalised edge density above which we call the product patterned. */
  patternMin: 0.18,
  /** Longest edge used for pixel analysis. Small keeps it fast, 256 is plenty. */
  analysisSize: 256,
  /** Alpha at or above this counts as product rather than background. */
  alphaCutoff: 128,
  /** Padding added around the subject before the ratio crop, as a fraction. */
  subjectPadding: 0.08,
  /** Hard ceiling on the source file, matching the server contract. */
  maxSourceBytes: 10 * 1024 * 1024,
} as const;

/** Aspect ratios as width divided by height. */
export const CROP_RATIOS = {
  '1:1': 1,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
} as const;
