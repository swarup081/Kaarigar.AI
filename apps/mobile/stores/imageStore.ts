// ============================================
// Kaarigar — Captured Photo Store
// Tracks each photo through on-device enhancement.
// Kept separate from stores/index.ts so the create flow and the
// image pipeline can evolve without fighting over one file.
// ============================================

import { create } from 'zustand';
import type { EnhanceResult, LocalImageAttributes } from '@/services/image/types';

export type PhotoStatus = 'captured' | 'enhancing' | 'ready' | 'failed';

export interface CapturedPhoto {
  /** Stable id, assigned at capture. */
  id: string;
  /** file:// URI of the frame as shot. Always present, always kept. */
  sourceUri: string;
  /** Which of the guided angles this was: front, back or detail. */
  angle: string;
  status: PhotoStatus;
  /** Populated once enhancement finishes, whether it succeeded or not. */
  result?: EnhanceResult;
}

interface PhotoState {
  photos: CapturedPhoto[];

  addPhoto: (photo: Pick<CapturedPhoto, 'id' | 'sourceUri' | 'angle'>) => void;
  markEnhancing: (id: string) => void;
  setResult: (id: string, result: EnhanceResult) => void;
  removePhoto: (id: string) => void;
  reset: () => void;

  /** The images to publish, falling back to the original where enhancement failed. */
  getPublishableUris: () => string[];
  /** Colours and pattern hints merged across every photo, for the Gemini prompt. */
  getMergedAttributes: () => LocalImageAttributes;
  /** True when any photo would benefit from a server-side matte. */
  needsServerFallback: () => boolean;
}

export const usePhotoStore = create<PhotoState>((set, get) => ({
  photos: [],

  addPhoto: (photo) =>
    set((state) => ({ photos: [...state.photos, { ...photo, status: 'captured' }] })),

  markEnhancing: (id) =>
    set((state) => ({
      photos: state.photos.map((p) => (p.id === id ? { ...p, status: 'enhancing' } : p)),
    })),

  setResult: (id, result) =>
    set((state) => ({
      photos: state.photos.map((p) =>
        p.id === id
          ? { ...p, result, status: result.status === 'completed' ? 'ready' : 'failed' }
          : p
      ),
    })),

  removePhoto: (id) =>
    set((state) => ({ photos: state.photos.filter((p) => p.id !== id) })),

  reset: () => set({ photos: [] }),

  getPublishableUris: () =>
    get().photos.map((p) =>
      p.result?.status === 'completed' ? p.result.enhanced.uri : p.sourceUri
    ),

  getMergedAttributes: () => {
    const colors: string[] = [];
    let patternStrength = 0;
    let counted = 0;

    for (const photo of get().photos) {
      if (photo.result?.status !== 'completed') continue;
      for (const hex of photo.result.attributes.dominantColors) {
        if (!colors.includes(hex)) colors.push(hex);
      }
      patternStrength += photo.result.attributes.patternStrength;
      counted++;
    }

    const average = counted === 0 ? 0 : patternStrength / counted;
    return {
      // The front shot dominates, so keep the first few rather than every shade.
      dominantColors: colors.slice(0, 5),
      hasPattern: get().photos.some(
        (p) => p.result?.status === 'completed' && p.result.attributes.hasPattern
      ),
      patternStrength: average,
    };
  },

  needsServerFallback: () =>
    get().photos.some((p) => p.result?.status === 'completed' && p.result.serverFallbackSuggested),
}));
