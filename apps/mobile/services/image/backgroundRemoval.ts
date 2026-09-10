// ============================================
// Kaarigar — On-Device Background Removal
// Android uses ML Kit Subject Segmentation, iOS 17+ uses the
// Vision framework. Both run entirely on the phone, so this
// works with no connection at all.
//
// Note on model choice: this must be SUBJECT segmentation, not
// SELFIE segmentation. Selfie models only find people and would
// return an empty matte for a pot or a dupatta.
// ============================================

import { Platform } from 'react-native';

type RemoveBackgroundFn = (uri: string, options?: { trim?: boolean }) => Promise<string>;
type SupportCheckFn = () => Promise<boolean>;

let removeBackgroundNative: RemoveBackgroundFn | null = null;
let isSupportedNative: SupportCheckFn | null = null;

// The module is native-only. Requiring it on web, or in a build where it was
// not linked, must not take the whole create flow down with it.
if (Platform.OS !== 'web') {
  try {
    const module = require('@six33/react-native-bg-removal');
    removeBackgroundNative = module.removeBackground;
    isSupportedNative = module.isNativeBackgroundRemovalSupported;
  } catch {
    removeBackgroundNative = null;
    isSupportedNative = null;
  }
}

export type CutoutFailureReason =
  /** Old Android, iOS below 17, or the module is not in this build. */
  | 'UNSUPPORTED_DEVICE'
  /** The native call ran but could not find a subject. */
  | 'NO_SUBJECT'
  /** Anything else, including simulator quirks. */
  | 'NATIVE_ERROR';

export type CutoutResult =
  | { ok: true; uri: string }
  | { ok: false; reason: CutoutFailureReason; detail?: string };

let supportCache: boolean | null = null;

/**
 * Whether this device can cut out a subject locally.
 * Cached, because the answer cannot change while the app is running and the
 * capture screen wants to know before the artisan presses the shutter.
 */
export async function isCutoutSupported(): Promise<boolean> {
  if (supportCache !== null) return supportCache;
  if (!isSupportedNative) {
    supportCache = false;
    return false;
  }

  try {
    supportCache = await isSupportedNative();
  } catch {
    supportCache = false;
  }
  return supportCache;
}

/**
 * Removes the background, returning a PNG with transparency.
 * `trim` crops away the empty margin, which saves the compositor from
 * re-deriving the subject's bounding box.
 */
export async function cutOutSubject(imageUri: string): Promise<CutoutResult> {
  if (!removeBackgroundNative) {
    return { ok: false, reason: 'UNSUPPORTED_DEVICE' };
  }

  try {
    const uri = await removeBackgroundNative(imageUri, { trim: true });

    // iOS simulators hand back the original file rather than failing, which
    // would otherwise look like a perfect matte covering the entire frame.
    if (uri === imageUri) {
      return { ok: false, reason: 'UNSUPPORTED_DEVICE', detail: 'simulator returned source' };
    }
    return { ok: true, uri };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // The library signals "this OS is too old, use your API" this way.
    if (message.includes('REQUIRES_API_FALLBACK')) {
      return { ok: false, reason: 'UNSUPPORTED_DEVICE', detail: message };
    }
    return { ok: false, reason: 'NATIVE_ERROR', detail: message };
  }
}

/** Test seam. Clears the cached support answer. */
export function resetSupportCache(): void {
  supportCache = null;
}
