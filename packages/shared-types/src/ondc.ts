// ============================================
// Kaarigar — ONDC Integration Types
// Maps Kaarigar product schema to ONDC/Beckn protocol
// ============================================

/** ONDC Retail category taxonomy (subset relevant to handicrafts) */
export type ONDCCategory =
  | 'Fashion'
  | 'Home & Decor'
  | 'Handicrafts'
  | 'Handloom'
  | 'Art & Collectibles';

/** ONDC fulfillment type */
export type ONDCFulfillmentType = 'Delivery' | 'Self-Pickup';

/** ONDC catalog item — mapped from Kaarigar Product */
export interface ONDCCatalogItem {
  /** Beckn protocol descriptor */
  descriptor: {
    name: string;
    short_desc: string;
    long_desc: string;
    images: Array<{ url: string }>;
  };
  /** Price info */
  price: {
    listed_value: string;
    currency: 'INR';
    maximum_value?: string;
  };
  /** Category ID in ONDC taxonomy */
  category_id: ONDCCategory;
  /** Product tags (material, technique, heritage, GI) */
  tags: Array<{
    descriptor: { code: string; name: string };
    list: Array<{ descriptor: { code: string; name: string }; value: string }>;
  }>;
  /** Quantity available */
  quantity: {
    available: { count: number };
    maximum: { count: number };
  };
}

/** ONDC Seller registration data — auto-filled from Kaarigar artisan profile */
export interface ONDCSellerProfile {
  name: string;
  phone: string;
  email?: string;
  location: {
    city: string;
    state: string;
    country: 'IND';
    area_code?: string;
  };
  categories: ONDCCategory[];
}

/** Mapping from Kaarigar craft categories to ONDC categories */
export const CRAFT_TO_ONDC_CATEGORY: Record<string, ONDCCategory> = {
  textile: 'Handloom',
  pottery: 'Home & Decor',
  jewelry: 'Fashion',
  woodwork: 'Handicrafts',
  metalwork: 'Handicrafts',
  leather: 'Fashion',
  bamboo: 'Handicrafts',
  stone_carving: 'Art & Collectibles',
  painting: 'Art & Collectibles',
  embroidery: 'Fashion',
  other: 'Handicrafts',
};
