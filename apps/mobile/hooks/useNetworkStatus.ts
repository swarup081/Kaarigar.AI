// ============================================
// Kaarigar — Network Status Hook
// Monitors connectivity for offline-first behavior
// ============================================

import { useEffect, useState, useCallback } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export type NetworkQuality = 'offline' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';

interface NetworkStatus {
  isConnected: boolean;
  quality: NetworkQuality;
  /** Whether we should attempt heavy operations (image upload etc.) */
  canUploadMedia: boolean;
  /** Whether we should attempt any sync at all */
  canSync: boolean;
}

function getQuality(state: NetInfoState): NetworkQuality {
  if (!state.isConnected) return 'offline';
  if (state.type === 'wifi') return 'wifi';
  if (state.type === 'cellular') {
    const gen = state.details?.cellularGeneration;
    if (gen === '2g') return '2g';
    if (gen === '3g') return '3g';
    if (gen === '4g' || gen === '5g') return '4g';
  }
  return state.isConnected ? 'unknown' : 'offline';
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    quality: 'unknown',
    canUploadMedia: true,
    canSync: true,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const quality = getQuality(state);
      const isConnected = state.isConnected ?? false;

      setStatus({
        isConnected,
        quality,
        // Only upload media on 3G+ or WiFi
        canUploadMedia: isConnected && quality !== '2g',
        // Sync text data even on 2G
        canSync: isConnected,
      });
    });

    return () => unsubscribe();
  }, []);

  return status;
}
