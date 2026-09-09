// ============================================
// Kaarigar — Global App Store (Zustand)
// Manages auth state, active listing, sync
// ============================================

import { create } from 'zustand';
import type { LocalProduct } from '@/services/offline/database';
import type { LanguageCode } from '@kaarigar/shared-types';

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
  isProcessing: boolean;
  processingMessage: string;

  // Actions
  setStep: (step: number) => void;
  addPhoto: (uri: string) => void;
  removePhoto: (index: number) => void;
  setVoiceRecording: (uri: string) => void;
  updateProduct: (updates: Partial<LocalProduct>) => void;
  setProcessing: (isProcessing: boolean, message?: string) => void;
  reset: () => void;
}

const initialListingState = {
  currentStep: 1,
  product: {},
  capturedPhotos: [],
  voiceRecordingUri: null,
  isProcessing: false,
  processingMessage: '',
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
  setVoiceRecording: (uri) => set({ voiceRecordingUri: uri }),
  updateProduct: (updates) =>
    set((state) => ({
      product: { ...state.product, ...updates },
    })),
  setProcessing: (isProcessing, message = '') =>
    set({ isProcessing, processingMessage: message }),
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
