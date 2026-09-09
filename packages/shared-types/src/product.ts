// ============================================
// Kaarigar — Product Types
// Shared between mobile app and backend
// ============================================

/** Supported languages in Kaarigar */
export type LanguageCode = 'hi' | 'en' | 'ta' | 'bn';

/** Multilingual text field */
export type MultilingualText = Partial<Record<LanguageCode, string>>;

/** Multilingual string array field */
export type MultilingualStringArray = Partial<Record<LanguageCode, string[]>>;

/** Product dimensions */
export interface ProductDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit: 'cm' | 'in' | 'mm';
}

/** Product status through its lifecycle */
export type ProductStatus = 'draft' | 'processing' | 'ready' | 'published' | 'archived';

/** AI processing status for each pipeline stage */
export interface AIProcessingStatus {
  image?: 'pending' | 'processing' | 'completed' | 'failed';
  voice?: 'pending' | 'processing' | 'completed' | 'failed';
  listing?: 'pending' | 'processing' | 'completed' | 'failed';
  pricing?: 'pending' | 'processing' | 'completed' | 'failed';
}

/** Publishing channel types */
export type ChannelType = 'storefront' | 'ondc' | 'gem' | 'amazon_karigar' | 'flipkart_samarth' | 'whatsapp';

/** Record of a product published to a channel */
export interface PublishedChannel {
  channel: ChannelType;
  url?: string;
  externalId?: string;
  publishedAt: string;
  status: 'pending' | 'active' | 'error';
}

/** Pricing reasoning breakdown — shown to artisan as "why this price" */
export interface PricingReasoning {
  summary: string;
  summaryRegional?: string;
  costBreakdown: {
    rawMaterial: number;
    labor: number;
    overhead: number;
    fairMargin: number;
    floorPrice: number;
  };
  marketComparables: Array<{
    title: string;
    price: number;
    source: string;
  }>;
  adjustments: Array<{
    factor: string;
    impact: string;
    reason: string;
  }>;
  confidence: number;
  sampleSize: number;
}

/** Craft categories recognized by the system */
export type CraftCategory =
  | 'textile'
  | 'pottery'
  | 'jewelry'
  | 'woodwork'
  | 'metalwork'
  | 'leather'
  | 'bamboo'
  | 'stone_carving'
  | 'painting'
  | 'embroidery'
  | 'other';

/** The core Product entity */
export interface Product {
  id: string;
  artisanId: string;

  // Multilingual content
  title: MultilingualText;
  description: MultilingualText;
  bulletFeatures: MultilingualStringArray;
  heritageStory: MultilingualText;

  // Attributes
  category: CraftCategory;
  subCategory?: string;
  material?: string;
  technique?: string;
  colors?: string[];
  dimensions?: ProductDimensions;
  weightGrams?: number;

  // Heritage
  giTag?: string;
  regionOfOrigin?: string;

  // Pricing
  rawMaterialCost?: number;
  laborCost?: number;
  laborHours?: number;
  overheadCost?: number;
  floorPrice?: number;
  suggestedPriceMin?: number;
  suggestedPriceMax?: number;
  suggestedPriceRecommended?: number;
  finalPrice?: number;
  pricingReasoning?: PricingReasoning;
  currency: string;

  // Media
  originalImages: string[];
  enhancedImages: string[];
  voiceNoteUrl?: string;
  voiceTranscript?: string;

  // Status
  status: ProductStatus;
  aiProcessingStatus: AIProcessingStatus;

  // Publishing
  publishedChannels: PublishedChannel[];
  storefrontUrl?: string;
  ondcItemId?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  deviceId?: string;
}

/** Minimal product data for list displays */
export interface ProductSummary {
  id: string;
  title: MultilingualText;
  category: CraftCategory;
  finalPrice?: number;
  currency: string;
  thumbnailUrl?: string;
  status: ProductStatus;
  publishedChannels: ChannelType[];
  createdAt: string;
}
