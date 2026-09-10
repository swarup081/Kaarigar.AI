// ============================================
// Kaarigar — Pixel Analysis
// Pure functions over RGBA byte arrays. No native modules and no
// React, so these run anywhere and can be unit tested on their own.
// Every function expects unpremultiplied RGBA, four bytes per pixel.
// ============================================

import { THRESHOLDS } from './thresholds';
import type { ImageQualityStats, LocalImageAttributes } from './types';

export interface Bitmap {
  pixels: Uint8Array;
  width: number;
  height: number;
}

/** Rec. 709 luminance, the weighting that matches how eyes see brightness. */
function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Grayscale copy, skipping fully transparent pixels by treating them as mid grey. */
function toGrayscale({ pixels, width, height }: Bitmap): Float32Array {
  const out = new Float32Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = luma(pixels[p], pixels[p + 1], pixels[p + 2]);
  }
  return out;
}

/**
 * Mean luminance and the share of blown-out pixels.
 * Transparent pixels are excluded so a cut-out is judged on the product alone.
 */
export function measureExposure(bitmap: Bitmap): { brightness: number; clippedFraction: number } {
  const { pixels } = bitmap;
  let sum = 0;
  let clipped = 0;
  let counted = 0;

  for (let p = 0; p < pixels.length; p += 4) {
    if (pixels[p + 3] < THRESHOLDS.alphaCutoff) continue;
    const value = luma(pixels[p], pixels[p + 1], pixels[p + 2]);
    sum += value;
    if (value >= 250) clipped++;
    counted++;
  }

  if (counted === 0) return { brightness: 0, clippedFraction: 0 };
  return { brightness: sum / counted, clippedFraction: clipped / counted };
}

/**
 * Variance of the Laplacian, the standard cheap sharpness estimate.
 * A blurred photo has little second-derivative energy, so the variance collapses.
 */
export function measureSharpness(bitmap: Bitmap): number {
  const { width, height } = bitmap;
  if (width < 3 || height < 3) return 0;

  const gray = toGrayscale(bitmap);
  const values: number[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      values.push(lap);
    }
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
  return variance;
}

/** Share of pixels the matte kept. Tells us whether the cut-out worked at all. */
export function measureSubjectCoverage({ pixels }: Bitmap): number {
  let kept = 0;
  const total = pixels.length / 4;
  for (let p = 3; p < pixels.length; p += 4) {
    if (pixels[p] >= THRESHOLDS.alphaCutoff) kept++;
  }
  return total === 0 ? 0 : kept / total;
}

/**
 * Edge density over the product only, used as a proxy for "is this patterned".
 * A plain terracotta pot has smooth gradients. A Banarasi weave does not.
 */
export function measurePatternStrength(bitmap: Bitmap): number {
  const { width, height, pixels } = bitmap;
  if (width < 3 || height < 3) return 0;

  const gray = toGrayscale(bitmap);
  let edgeSum = 0;
  let counted = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (pixels[i * 4 + 3] < THRESHOLDS.alphaCutoff) continue;

      // Sobel magnitude, approximated with the cheaper absolute-sum form.
      const gx =
        -gray[i - width - 1] - 2 * gray[i - 1] - gray[i + width - 1] +
        gray[i - width + 1] + 2 * gray[i + 1] + gray[i + width + 1];
      const gy =
        -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] +
        gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];

      edgeSum += Math.min(1, (Math.abs(gx) + Math.abs(gy)) / 255);
      counted++;
    }
  }

  return counted === 0 ? 0 : edgeSum / counted;
}

// ─── Dominant colours ─────────────────────────

function toHex(r: number, g: number, b: number): string {
  const part = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/**
 * k-means over the product pixels. Runs on a downscaled bitmap, so a few
 * thousand samples and ten iterations is more than enough and stays instant.
 * Background pixels are excluded, which is the whole reason this is worth doing
 * after the matte rather than before it.
 */
export function extractDominantColors(bitmap: Bitmap, k = 5): string[] {
  const { pixels } = bitmap;
  const samples: number[][] = [];

  for (let p = 0; p < pixels.length; p += 4) {
    if (pixels[p + 3] < THRESHOLDS.alphaCutoff) continue;
    samples.push([pixels[p], pixels[p + 1], pixels[p + 2]]);
  }

  if (samples.length === 0) return [];
  const clusters = Math.min(k, samples.length);

  // Seed the centroids by spreading them across the sample list rather than at
  // random, so the same photo always yields the same palette.
  let centroids = Array.from({ length: clusters }, (_, i) =>
    samples[Math.floor((i * samples.length) / clusters)].slice()
  );

  let assignments = new Array<number>(samples.length).fill(0);

  for (let iteration = 0; iteration < 10; iteration++) {
    let moved = false;

    for (let i = 0; i < samples.length; i++) {
      const [r, g, b] = samples[i];
      let best = 0;
      let bestDistance = Infinity;

      for (let c = 0; c < centroids.length; c++) {
        const [cr, cg, cb] = centroids[c];
        const distance = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = c;
        }
      }

      if (assignments[i] !== best) {
        assignments[i] = best;
        moved = true;
      }
    }

    const sums = Array.from({ length: clusters }, () => [0, 0, 0, 0]);
    for (let i = 0; i < samples.length; i++) {
      const bucket = sums[assignments[i]];
      bucket[0] += samples[i][0];
      bucket[1] += samples[i][1];
      bucket[2] += samples[i][2];
      bucket[3] += 1;
    }

    centroids = centroids.map((current, c) => {
      const [r, g, b, count] = sums[c];
      return count === 0 ? current : [r / count, g / count, b / count];
    });

    if (!moved) break;
  }

  const populations = new Array<number>(clusters).fill(0);
  for (const a of assignments) populations[a]++;

  return centroids
    .map((c, i) => ({ hex: toHex(c[0], c[1], c[2]), weight: populations[i] }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((entry) => entry.hex);
}

// ─── Convenience wrappers ─────────────────────

/** Everything measurable before a cut-out exists. */
export function analyseSource(bitmap: Bitmap): ImageQualityStats {
  const { brightness, clippedFraction } = measureExposure(bitmap);
  return { brightness, clippedFraction, sharpness: measureSharpness(bitmap) };
}

/** Everything worth knowing once the background is gone. */
export function analyseSubject(bitmap: Bitmap): LocalImageAttributes {
  const patternStrength = measurePatternStrength(bitmap);
  return {
    dominantColors: extractDominantColors(bitmap),
    hasPattern: patternStrength >= THRESHOLDS.patternMin,
    patternStrength,
  };
}
