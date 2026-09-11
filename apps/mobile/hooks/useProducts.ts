// ============================================
// Kaarigar — Read saved products from the local database
//
// Reloads whenever the screen regains focus, because the usual way to reach
// the catalog is by finishing the create flow. Loading only on mount would
// show a list that is always one product behind.
// ============================================

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getLocalProducts, type LocalProduct } from '@/services/offline/database';
import { currentArtisanId } from '@/services/offline/artisan';
import { useAuthStore } from '@/stores';

export interface UseProductsResult {
  products: LocalProduct[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useProducts(): UseProductsResult {
  const profile = useAuthStore((s) => s.artisanProfile);
  const artisanId = currentArtisanId(profile?.id);

  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const rows = await getLocalProducts(artisanId);
      setProducts(rows);
    } catch (caught) {
      // A database failure must not blank the screen. Keep whatever is already
      // shown and surface the problem instead.
      const message = caught instanceof Error ? caught.message : String(caught);
      console.warn('[products] load failed', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [artisanId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  return { products, isLoading, error, reload };
}

/** Best title for a product row, in the artisan's language where available. */
export function productTitle(product: LocalProduct, language: string): string {
  const byLanguage: Record<string, string | undefined> = {
    hi: product.titleHindi,
    en: product.titleEnglish,
  };
  return (
    byLanguage[language] ??
    product.titleRegional ??
    product.titleEnglish ??
    product.titleHindi ??
    'Untitled'
  );
}

/** First usable image for a product row, enhanced preferred over original. */
export function productThumbnail(product: LocalProduct): string | undefined {
  return product.serverImageUrls?.[0] ?? product.localImagePaths?.[0];
}
