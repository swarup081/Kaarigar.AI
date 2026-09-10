// ============================================
// Kaarigar — Skia Canvas Operations
// Loading, downscaling, pixel reads, colour correction and
// compositing. Everything here runs offscreen, so no Canvas
// component needs to be mounted and this works from a plain
// async function during the capture flow.
// ============================================

import {
  Skia,
  AlphaType,
  ColorType,
  ImageFormat,
  FilterMode,
  MipmapMode,
  TileMode,
  BlurStyle,
  BlendMode,
  type SkCanvas,
  type SkImage,
  type SkPaint,
} from '@shopify/react-native-skia';
import { File, Directory, Paths } from 'expo-file-system';

import type { Bitmap } from './analysis';
import { THRESHOLDS, CROP_RATIOS } from './thresholds';
import type { BackgroundOption, CropRatio, ImageQualityStats } from './types';

/** Decodes a local or remote image into a Skia image. Null when the bytes are not an image. */
export async function loadImage(uri: string): Promise<SkImage | null> {
  const data = await Skia.Data.fromURI(uri);
  return Skia.Image.MakeImageFromEncoded(data);
}

/**
 * Draws the image into a small offscreen surface and reads the pixels back.
 * Analysis never needs full resolution, and a 256 pixel copy keeps the whole
 * pass well under a frame even on a budget phone.
 */
export function readBitmap(image: SkImage, maxEdge = THRESHOLDS.analysisSize): Bitmap | null {
  const scale = Math.min(1, maxEdge / Math.max(image.width(), image.height()));
  const width = Math.max(1, Math.round(image.width() * scale));
  const height = Math.max(1, Math.round(image.height() * scale));

  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) return null;

  surface
    .getCanvas()
    .drawImageRectOptions(
      image,
      Skia.XYWHRect(0, 0, image.width(), image.height()),
      Skia.XYWHRect(0, 0, width, height),
      FilterMode.Linear,
      MipmapMode.None
    );

  const snapshot = surface.makeImageSnapshot();
  const pixels = snapshot.readPixels(0, 0, {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!pixels || pixels instanceof Float32Array) return null;
  return { pixels, width, height };
}

/**
 * Builds a colour matrix that lifts a dull photo without inventing detail.
 * Gain comes from the measured luminance, so a dim workshop shot gets more
 * correction than one taken by a window. Contrast and saturation are fixed and
 * gentle on purpose: overcooking either misrepresents the dye colour.
 */
function buildCorrectionPaint(stats: ImageQualityStats): SkPaint {
  const targetBrightness = 148;
  const gain = Math.max(0.85, Math.min(1.6, targetBrightness / Math.max(stats.brightness, 1)));

  const contrast = 1.12;
  const saturation = 1.12;
  // Offset keeps mid grey anchored while contrast scales around it.
  const offset = 128 * (1 - contrast * gain);

  const lumaR = 0.2126;
  const lumaG = 0.7152;
  const lumaB = 0.0722;
  const s = saturation;
  const k = contrast * gain;

  // Saturation matrix folded into the same pass as brightness and contrast.
  const matrix = [
    k * (lumaR * (1 - s) + s), k * (lumaG * (1 - s)), k * (lumaB * (1 - s)), 0, offset,
    k * (lumaR * (1 - s)), k * (lumaG * (1 - s) + s), k * (lumaB * (1 - s)), 0, offset,
    k * (lumaR * (1 - s)), k * (lumaG * (1 - s)), k * (lumaB * (1 - s) + s), 0, offset,
    0, 0, 0, 1, 0,
  ];

  const paint = Skia.Paint();
  paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix));
  return paint;
}

/**
 * Paints the chosen backdrop across the whole canvas.
 * Wood and cloth are generated rather than shipped as assets, which keeps the
 * bundle small and means they scale to any output size without resampling.
 */
function paintBackground(
  canvas: SkCanvas,
  background: Exclude<BackgroundOption, 'transparent'>,
  size: number
): void {
  const rect = Skia.XYWHRect(0, 0, size, size);
  const paint = Skia.Paint();

  if (background === 'white') {
    paint.setColor(Skia.Color('#FFFFFF'));
    canvas.drawRect(rect, paint);
    return;
  }

  const palette =
    background === 'wood'
      ? { base: '#C99A6B', shade: '#9A6B44', freq: 0.004, tint: '#7A4A28' }
      : { base: '#F3EDE3', shade: '#E2D8C7', freq: 0.02, tint: '#C9BCA6' };

  paint.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: 0, y: 0 },
      { x: size, y: size },
      [Skia.Color(palette.base), Skia.Color(palette.shade)],
      null,
      TileMode.Clamp
    )
  );
  canvas.drawRect(rect, paint);

  // A whisper of noise so the flat gradient reads as a surface, not a fill.
  try {
    const grain = Skia.Paint();
    grain.setShader(Skia.Shader.MakeTurbulence(palette.freq, palette.freq, 2, 0, size, size));
    grain.setColorFilter(Skia.ColorFilter.MakeBlend(Skia.Color(palette.tint), BlendMode.Multiply));
    grain.setAlphaf(0.18);
    canvas.drawRect(rect, grain);
  } catch {
    // Turbulence is unavailable on some backends. The gradient alone is fine.
  }
}

/** Soft contact shadow under the product. Cheap, and it sells the composite. */
function paintShadow(
  canvas: SkCanvas,
  centerX: number,
  bottomY: number,
  width: number,
  size: number
): void {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color('#00000055'));
  paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, size * 0.02, false));
  canvas.drawOval(
    Skia.XYWHRect(centerX - width * 0.42, bottomY - size * 0.015, width * 0.84, size * 0.035),
    paint
  );
}

export interface CompositeOptions {
  background: BackgroundOption;
  cropRatio: CropRatio;
  outputSize: number;
  correction?: ImageQualityStats;
  withShadow: boolean;
}

/**
 * Places the subject on the chosen background at the requested aspect ratio.
 * The subject is fitted with padding rather than cropped, because trimming a
 * dupatta's border to fill a square loses the part a buyer is looking for.
 */
export function composite(image: SkImage, options: CompositeOptions): SkImage | null {
  const ratio = CROP_RATIOS[options.cropRatio];
  const width = options.outputSize;
  const height = Math.round(options.outputSize / ratio);

  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) return null;
  const canvas = surface.getCanvas();

  if (options.background !== 'transparent') {
    paintBackground(canvas, options.background, Math.max(width, height));
  }

  const pad = 1 - THRESHOLDS.subjectPadding * 2;
  const scale = Math.min(
    (width * pad) / image.width(),
    (height * pad) / image.height()
  );
  const drawWidth = image.width() * scale;
  const drawHeight = image.height() * scale;
  const left = (width - drawWidth) / 2;
  const top = (height - drawHeight) / 2;

  if (options.withShadow && options.background !== 'transparent') {
    paintShadow(canvas, width / 2, top + drawHeight, drawWidth, Math.max(width, height));
  }

  const paint = options.correction ? buildCorrectionPaint(options.correction) : Skia.Paint();
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(0, 0, image.width(), image.height()),
    Skia.XYWHRect(left, top, drawWidth, drawHeight),
    paint
  );

  return surface.makeImageSnapshot();
}

/** Straight proportional resize, used for thumbnails. */
export function resize(image: SkImage, maxEdge: number): SkImage | null {
  const scale = Math.min(1, maxEdge / Math.max(image.width(), image.height()));
  const width = Math.max(1, Math.round(image.width() * scale));
  const height = Math.max(1, Math.round(image.height() * scale));

  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) return null;

  surface
    .getCanvas()
    .drawImageRectOptions(
      image,
      Skia.XYWHRect(0, 0, image.width(), image.height()),
      Skia.XYWHRect(0, 0, width, height),
      FilterMode.Linear,
      MipmapMode.Linear
    );

  return surface.makeImageSnapshot();
}

/**
 * Encodes and writes to the app's document directory.
 * PNG whenever transparency has to survive, JPEG otherwise because a 1080px
 * JPEG is roughly a tenth the size and these get uploaded over 2G.
 */
export function writeImage(image: SkImage, relativePath: string, transparent: boolean): string {
  const format = transparent ? ImageFormat.PNG : ImageFormat.JPEG;
  const base64 = image.encodeToBase64(format, 85);

  const segments = relativePath.split('/');
  const filename = segments.pop() as string;
  const directory = new Directory(Paths.document, ...segments);
  if (!directory.exists) directory.create({ intermediates: true });

  const file = new File(directory, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: 'base64' });

  return file.uri;
}
