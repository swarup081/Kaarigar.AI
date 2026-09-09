// ============================================
// Kaarigar — Craft Categories
// Used for product classification throughout the app
// ============================================

import type { CraftCategory } from '@kaarigar/shared-types';

export interface CraftCategoryInfo {
  id: CraftCategory;
  labelEn: string;
  labelHi: string;
  labelTa: string;
  labelBn: string;
  icon: string; // Emoji for quick recognition
  subCategories: string[];
}

export const CRAFT_CATEGORIES: CraftCategoryInfo[] = [
  {
    id: 'textile',
    labelEn: 'Textile & Weaving',
    labelHi: 'कपड़ा और बुनाई',
    labelTa: 'நெசவு',
    labelBn: 'বস্ত্র ও বয়ন',
    icon: '🧶',
    subCategories: ['saree', 'dupatta', 'stole', 'shawl', 'fabric', 'bedsheet', 'curtain', 'other'],
  },
  {
    id: 'pottery',
    labelEn: 'Pottery & Ceramics',
    labelHi: 'मिट्टी के बर्तन',
    labelTa: 'மட்பாண்டம்',
    labelBn: 'মৃৎশিল্প',
    icon: '🏺',
    subCategories: ['vase', 'pot', 'plate', 'cup', 'decorative', 'terracotta', 'other'],
  },
  {
    id: 'jewelry',
    labelEn: 'Jewelry',
    labelHi: 'आभूषण',
    labelTa: 'நகை',
    labelBn: 'গহনা',
    icon: '💍',
    subCategories: ['necklace', 'earring', 'bangle', 'ring', 'anklet', 'set', 'other'],
  },
  {
    id: 'woodwork',
    labelEn: 'Woodwork',
    labelHi: 'लकड़ी का काम',
    labelTa: 'மரவேலை',
    labelBn: 'কাঠের কাজ',
    icon: '🪵',
    subCategories: ['furniture', 'carving', 'toy', 'utensil', 'decorative', 'other'],
  },
  {
    id: 'metalwork',
    labelEn: 'Metalwork',
    labelHi: 'धातु का काम',
    labelTa: 'உலோகவேலை',
    labelBn: 'ধাতুর কাজ',
    icon: '⚒️',
    subCategories: ['brass', 'copper', 'iron', 'silver', 'bell_metal', 'decorative', 'utensil', 'other'],
  },
  {
    id: 'leather',
    labelEn: 'Leather',
    labelHi: 'चमड़ा',
    labelTa: 'தோல்',
    labelBn: 'চামড়া',
    icon: '👜',
    subCategories: ['bag', 'footwear', 'belt', 'wallet', 'decorative', 'other'],
  },
  {
    id: 'bamboo',
    labelEn: 'Bamboo & Cane',
    labelHi: 'बाँस और बेंत',
    labelTa: 'மூங்கில்',
    labelBn: 'বাঁশ ও বেত',
    icon: '🎋',
    subCategories: ['basket', 'furniture', 'mat', 'decorative', 'other'],
  },
  {
    id: 'stone_carving',
    labelEn: 'Stone Carving',
    labelHi: 'पत्थर की नक्काशी',
    labelTa: 'கல் செதுக்குதல்',
    labelBn: 'পাথর খোদাই',
    icon: '🗿',
    subCategories: ['sculpture', 'decorative', 'utility', 'temple_art', 'other'],
  },
  {
    id: 'painting',
    labelEn: 'Painting & Art',
    labelHi: 'चित्रकला',
    labelTa: 'ஓவியம்',
    labelBn: 'চিত্রকলা',
    icon: '🎨',
    subCategories: ['madhubani', 'warli', 'pattachitra', 'miniature', 'kalamkari', 'tanjore', 'other'],
  },
  {
    id: 'embroidery',
    labelEn: 'Embroidery',
    labelHi: 'कढ़ाई',
    labelTa: 'சீலை',
    labelBn: 'সূচিকর্ম',
    icon: '🪡',
    subCategories: ['chikankari', 'zardozi', 'phulkari', 'kantha', 'kashida', 'aari', 'other'],
  },
  {
    id: 'other',
    labelEn: 'Other Craft',
    labelHi: 'अन्य शिल्प',
    labelTa: 'பிற கைவினை',
    labelBn: 'অন্যান্য শিল্প',
    icon: '✨',
    subCategories: ['other'],
  },
];

export const getCraftCategory = (id: CraftCategory): CraftCategoryInfo | undefined =>
  CRAFT_CATEGORIES.find((c) => c.id === id);
