// ============================================
// Kaarigar — Image Enhancement Orchestrator
// Runs the whole pipeline on the phone:
//   gates -> cut out -> composite -> measure -> save
//
// The server endpoint in docs/api-contracts/image-enhancer.md
// stays as the rescue path for devices that cannot cut out a
// subject locally. Most photos never leave the phone.
// ============================================

import { File } from 'expo-file-system';

import { analyseSource, analyseSubject, measureSubjectCoverage } from './analysis';
import { cutOutSubject, isCutoutSupported } from './backgroundRemoval';
import { composite, loadImage, readBitmap, resize, writeImage } from './canvas';
import { THRESHOLDS } from './thresholds';
import {
  DEFAULT_ENHANCE_OPTIONS,
  type EnhanceErrorCode,
  type EnhanceOptions,
  type EnhanceResult,
  type ImageQualityStats,
} from './types';

/** Error copy lives in the translation files, keyed by code. */
const SUGGESTIONS: Record<EnhanceErrorCode, string[]> = {
  IMAGE_TOO_DARK: ['camera.tips.moveToLight', 'camera.tips.turnOnLamp', 'camera.tips.useDaylight'],
  IMAGE_TOO_BRIGHT: ['camera.tips.avoidDirectSun', 'camera.tips.moveToShade'],
  IMAGE_BLURRY: ['camera.tips.holdStill', 'camera.tips.tapToFocus', 'camera.tips.restPhone'],
  NO_PRODUCT_DETECTED: ['camera.tips.plainBackground', 'camera.tips.moveCloser', 'camera.tips.centreProduct'],
  FILE_TOO_LARGE: ['camera.tips.retake'],
  INVALID_FORMAT: ['camera.tips.retake'],
  PROCESSING_ERROR: ['camera.tips.retake'],
};

function fail(code: EnhanceErrorCode, startedAt: number, quality?: ImageQualityStats): EnhanceResult {
  return {
    status: 'failed',
    error: {
      code,
      messageKey: `camera.errors.${code}`,
      suggestionKeys: SUGGESTIONS[code],
    },
    quality,
    processingTimeMs: Date.now() - startedAt,
  };
}

/** Checks the gates that only need the original frame. */
function checkGates(quality: ImageQualityStats): EnhanceErrorCode | null {
  if (quality.brightness < THRESHOLDS.brightnessMin) return 'IMAGE_TOO_DARK';
  if (
    quality.brightness > THRESHOLDS.brightnessMax ||
    quality.clippedFraction > THRESHOLDS.clippedMax
  ) {
    return 'IMAGE_TOO_BRIGHT';
  }
  if (quality.sharpness < THRESHOLDS.sharpnessMin) return 'IMAGE_BLURRY';
  return null;
}

/**
 * Enhances one captured photo.
 *
 * @param sourceUri file:// URI of the photo as taken
 * @param outputDir directory under the document root, e.g. `enhanced`
 * @param overrides partial options, merged over the defaults
 */
export async function enhanceProductPhoto(
  sourceUri: string,
  outputDir: string,
  overrides: Partial<EnhanceOptions> = {}
): Promise<EnhanceResult> {
  const startedAt = Date.now();
  const options: EnhanceOptions = { ...DEFAULT_ENHANCE_OPTIONS, ...overrides };

  try {
    const sourceFile = new File(sourceUri);
    if (sourceFile.exists && sourceFile.size > THRESHOLDS.maxSourceBytes) {
      return fail('FILE_TOO_LARGE', startedAt);
    }

    const source = await loadImage(sourceUri);
    if (!source) return fail('INVALID_FORMAT', startedAt);

    const sourceBitmap = readBitmap(source);
    if (!sourceBitmap) return fail('PROCESSING_ERROR', startedAt);

    const quality = analyseSource(sourceBitmap);
    if (!options.skipGates) {
      const gateFailure = checkGates(quality);
      if (gateFailure) return fail(gateFailure, startedAt, quality);
    }

    // ─── Cut out the subject ─────────────────

    const supported = await isCutoutSupported();
    const cutout = supported ? await cutOutSubject(sourceUri) : null;

    let subject = source;
    let backgroundRemoved = false;
    let serverFallbackSuggested = !supported;

    if (cutout?.ok) {
      const cutoutImage = await loadImage(cutout.uri);
      const cutoutBitmap = cutoutImage ? readBitmap(cutoutImage) : null;

      if (cutoutImage && cutoutBitmap) {
        const coverage = measureSubjectCoverage(cutoutBitmap);
        quality.subjectCoverage = coverage;

        const usable =
          coverage >= THRESHOLDS.subjectCoverageMin && coverage <= THRESHOLDS.subjectCoverageMax;

        if (usable) {
          subject = cutoutImage;
          backgroundRemoved = true;
        } else {
          // A matte that kept nothing, or kept everything, is worse than none.
          // Keep the original frame and let the server try if we get online.
          serverFallbackSuggested = true;
          if (coverage < THRESHOLDS.subjectCoverageMin) {
            return fail('NO_PRODUCT_DETECTED', startedAt, quality);
          }
        }
      } else {
        serverFallbackSuggested = true;
      }
    } else if (cutout) {
      serverFallbackSuggested = true;
    }

    // ─── Compose the marketplace image ───────

    const transparent = options.background === 'transparent' && backgroundRemoved;
    const composed = composite(subject, {
      background: backgroundRemoved ? options.background : 'white',
      cropRatio: options.cropRatio,
      outputSize: options.outputSize,
      correction: options.enhanceQuality ? quality : undefined,
      withShadow: backgroundRemoved && !transparent,
    });
    if (!composed) return fail('PROCESSING_ERROR', startedAt, quality);

    const thumbnail = resize(composed, options.thumbnailSize);
    if (!thumbnail) return fail('PROCESSING_ERROR', startedAt, quality);

    // ─── Measure the product itself ──────────

    const subjectBitmap = readBitmap(backgroundRemoved ? subject : composed);
    const attributes = subjectBitmap
      ? analyseSubject(subjectBitmap)
      : { dominantColors: [], hasPattern: false, patternStrength: 0 };

    // ─── Save ────────────────────────────────

    const stamp = Date.now();
    const extension = transparent ? 'png' : 'jpg';
    const enhancedUri = writeImage(composed, `${outputDir}/enhanced_${stamp}.${extension}`, transparent);
    const thumbnailUri = writeImage(thumbnail, `${outputDir}/thumb_${stamp}.jpg`, false);

    return {
      status: 'completed',
      source: { uri: sourceUri, width: source.width(), height: source.height() },
      enhanced: {
        uri: enhancedUri,
        thumbnailUri,
        width: composed.width(),
        height: composed.height(),
      },
      backgroundRemoved,
      serverFallbackSuggested,
      attributes,
      quality,
      processingTimeMs: Date.now() - startedAt,
    };
  } catch (error) {
    console.warn('[image] enhancement failed', error);
    return fail('PROCESSING_ERROR', startedAt);
  }
}
