// ============================================
// Kaarigar — Publishing Channels Configuration
// ============================================

import type { ChannelType } from '@kaarigar/shared-types';
import { Colors } from './theme';

export interface ChannelConfig {
  id: ChannelType;
  nameEn: string;
  nameHi: string;
  icon: string;
  color: string;
  description: {
    en: string;
    hi: string;
  };
  status: 'available' | 'coming_soon' | 'setup_required';
  /** Whether this channel can be used in the MVP */
  mvpReady: boolean;
}

export const CHANNELS: ChannelConfig[] = [
  {
    id: 'storefront',
    nameEn: 'My Storefront',
    nameHi: 'मेरी दुकान',
    icon: '🏪',
    color: Colors.primary,
    description: {
      en: 'Your own product page — share the link on WhatsApp or print as QR code',
      hi: 'आपका अपना प्रोडक्ट पेज — लिंक WhatsApp पर शेयर करें या QR कोड प्रिंट करें',
    },
    status: 'available',
    mvpReady: true,
  },
  {
    id: 'whatsapp',
    nameEn: 'WhatsApp Share',
    nameHi: 'WhatsApp शेयर',
    icon: '💬',
    color: Colors.whatsapp,
    description: {
      en: 'Share product photo + details directly on WhatsApp',
      hi: 'प्रोडक्ट फोटो और जानकारी सीधे WhatsApp पर शेयर करें',
    },
    status: 'available',
    mvpReady: true,
  },
  {
    id: 'ondc',
    nameEn: 'ONDC Network',
    nameHi: 'ONDC नेटवर्क',
    icon: '🌐',
    color: Colors.ondc,
    description: {
      en: 'Sell on Paytm, PhonePe & more — through the ONDC open network',
      hi: 'Paytm, PhonePe और अन्य ऐप पर बेचें — ONDC नेटवर्क के ज़रिए',
    },
    status: 'available',
    mvpReady: true,
  },
  {
    id: 'gem',
    nameEn: 'GeM Portal',
    nameHi: 'GeM पोर्टल',
    icon: '🏛️',
    color: '#1A237E',
    description: {
      en: 'Sell to government buyers through GeM',
      hi: 'GeM के ज़रिए सरकारी खरीदारों को बेचें',
    },
    status: 'coming_soon',
    mvpReady: false,
  },
  {
    id: 'amazon_karigar',
    nameEn: 'Amazon Karigar',
    nameHi: 'Amazon कारीगर',
    icon: '📦',
    color: '#FF9900',
    description: {
      en: 'Sell on Amazon through the Karigar program',
      hi: 'Amazon कारीगर प्रोग्राम से Amazon पर बेचें',
    },
    status: 'coming_soon',
    mvpReady: false,
  },
  {
    id: 'flipkart_samarth',
    nameEn: 'Flipkart Samarth',
    nameHi: 'Flipkart समर्थ',
    icon: '🛒',
    color: '#2874F0',
    description: {
      en: 'Sell on Flipkart through the Samarth initiative',
      hi: 'Flipkart समर्थ से Flipkart पर बेचें',
    },
    status: 'coming_soon',
    mvpReady: false,
  },
];

export const getChannel = (id: ChannelType): ChannelConfig | undefined =>
  CHANNELS.find((c) => c.id === id);

export const getMVPChannels = (): ChannelConfig[] =>
  CHANNELS.filter((c) => c.mvpReady);
