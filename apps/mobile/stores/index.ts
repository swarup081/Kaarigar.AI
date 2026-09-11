// ============================================
// Kaarigar — Global App Store (Zustand)
// Manages auth state, active listing, sync
// ============================================

import { create } from 'zustand';
import type { LocalProduct } from '@/services/offline/database';
import type { LanguageCode } from '@kaarigar/shared-types';
import type { GeneratedListing, PricingResult, Transcription } from '@/services/api/ai';

// ─── Auth Store ──────────────────────────────

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  firebaseUid: string | null;
  phone: string | null;
  artisanProfile: ArtisanProfile | null;
  setAuthenticated: (uid: string, phone: string) => void;
  setProfile: (profile: ArtisanProfile) => void;
  logout: () => void;
}

export interface ArtisanProfile {
  id: string;
  firebaseUid: string;
  phone: string;
  name: string;
  displayName?: string;
  languageCode: LanguageCode;
  avatarUrl?: string;
  craftType: string;
  region?: string;
  state?: string;
  storefrontSlug?: string;
  profileCompleteness: number;
  onboardingCompleted: boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  firebaseUid: null,
  phone: null,
  artisanProfile: null,
  setAuthenticated: (uid, phone) =>
    set({ isAuthenticated: true, isLoading: false, firebaseUid: uid, phone }),
  setProfile: (profile) => set({ artisanProfile: profile }),
  logout: () =>
    set({
      isAuthenticated: false,
      firebaseUid: null,
      phone: null,
      artisanProfile: null,
    }),
}));

// ─── Active Listing Store ────────────────────
// Tracks the product being created through the 5-step flow

interface ActiveListingState {
  currentStep: number;
  product: Partial<LocalProduct>;
  capturedPhotos: string[];
  voiceRecordingUri: string | null;
  voiceDurationSeconds: number;
  isProcessing: boolean;
  processingMessage: string;

  // Results from the AI services, kept so going back a step does not
  // re-spend a model call on data we already have.
  transcript: Transcription | null;
  listing: GeneratedListing | null;
  /** Artisan edits, keyed by field. Overrides the generated text on publish. */
  listingEdits: Record<string, string>;
  pricing: PricingResult | null;
  /** What the artisan actually spent. Required before a price can be suggested. */
  rawMaterialCost: number | null;
  laborHours: number | null;
  /** The price the artisan settled on, which may differ from the suggestion. */
  finalPrice: number | null;

  // Actions
  setStep: (step: number) => void;
  addPhoto: (uri: string) => void;
  removePhoto: (index: number) => void;
  setVoiceRecording: (uri: string, durationSeconds: number) => void;
  clearVoiceRecording: () => void;
  updateProduct: (updates: Partial<LocalProduct>) => void;
  setProcessing: (isProcessing: boolean, message?: string) => void;
  setListing: (transcript: Transcription, listing: GeneratedListing) => void;
  editListingField: (field: string, value: string) => void;
  setCosts: (rawMaterialCost: number | null, laborHours: number | null) => void;
  setPricing: (pricing: PricingResult) => void;
  setFinalPrice: (price: number) => void;
  reset: () => void;
}

const initialListingState = {
  currentStep: 1,
  product: {},
  capturedPhotos: [],
  voiceRecordingUri: null,
  voiceDurationSeconds: 0,
  isProcessing: false,
  processingMessage: '',
  transcript: null,
  listing: null,
  listingEdits: {},
  pricing: null,
  rawMaterialCost: null,
  laborHours: null,
  finalPrice: null,
};

export const useActiveListingStore = create<ActiveListingState>((set) => ({
  ...initialListingState,

  setStep: (step) => set({ currentStep: step }),
  addPhoto: (uri) =>
    set((state) => ({ capturedPhotos: [...state.capturedPhotos, uri] })),
  removePhoto: (index) =>
    set((state) => ({
      capturedPhotos: state.capturedPhotos.filter((_, i) => i !== index),
    })),
  setVoiceRecording: (uri, durationSeconds) =>
    // A new recording invalidates everything derived from the old one.
    set({
      voiceRecordingUri: uri,
      voiceDurationSeconds: durationSeconds,
      transcript: null,
      listing: null,
      listingEdits: {},
      pricing: null,
    }),
  clearVoiceRecording: () =>
    set({ voiceRecordingUri: null, voiceDurationSeconds: 0, transcript: null, listing: null }),
  updateProduct: (updates) =>
    set((state) => ({
      product: { ...state.product, ...updates },
    })),
  setProcessing: (isProcessing, message = '') =>
    set({ isProcessing, processingMessage: message }),
  setListing: (transcript, listing) => set({ transcript, listing, listingEdits: {} }),
  editListingField: (field, value) =>
    set((state) => ({ listingEdits: { ...state.listingEdits, [field]: value } })),
  setCosts: (rawMaterialCost, laborHours) =>
    // Costs drive the floor price, so a change makes the old suggestion stale.
    set({ rawMaterialCost, laborHours, pricing: null }),
  setPricing: (pricing) =>
    set({ pricing, finalPrice: pricing.suggestedPrice.recommended }),
  setFinalPrice: (price) => set({ finalPrice: price }),
  reset: () => set(initialListingState),
}));

// ─── Sync Store ──────────────────────────────

interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  errorCount: number;
  setSyncing: (isSyncing: boolean) => void;
  setLastSynced: (at: string) => void;
  setPendingCount: (count: number) => void;
  setErrorCount: (count: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastSyncedAt: null,
  pendingCount: 0,
  errorCount: 0,
  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSynced: (at) => set({ lastSyncedAt: at }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setErrorCount: (count) => set({ errorCount: count }),
}));
