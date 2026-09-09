// ============================================
// Kaarigar — Pricing Types
// ============================================

/** Price reference data for market comparables */
export interface PriceReference {
  id: string;
  category: string;
  subCategory?: string;
  material?: string;
  technique?: string;
  region?: string;
  priceMin: number;
  priceMax: number;
  priceMedian: number;
  source: 'manual_survey' | 'scraped' | 'transaction';
  sampleSize: number;
  lastUpdated: string;
}

/** Local pricing algorithm config — the deterministic cost-plus part */
export interface PricingAlgorithmConfig {
  /** Default hourly rate by craft type (in INR) */
  laborRatePerHour: Record<string, number>;
  /** Default overhead percentage */
  overheadPercentage: number;
  /** Default fair margin range by craft rarity */
  marginRange: {
    common: { min: number; max: number };
    traditional: { min: number; max: number };
    rare: { min: number; max: number };
    giTagged: { min: number; max: number };
  };
}

/** The default pricing algorithm configuration */
export const DEFAULT_PRICING_CONFIG: PricingAlgorithmConfig = {
  laborRatePerHour: {
    textile: 50,
    pottery: 40,
    jewelry: 60,
    woodwork: 45,
    metalwork: 55,
    leather: 45,
    bamboo: 35,
    stone_carving: 50,
    painting: 60,
    embroidery: 50,
    other: 40,
  },
  overheadPercentage: 10,
  marginRange: {
    common: { min: 20, max: 30 },
    traditional: { min: 25, max: 40 },
    rare: { min: 30, max: 50 },
    giTagged: { min: 35, max: 60 },
  },
};
