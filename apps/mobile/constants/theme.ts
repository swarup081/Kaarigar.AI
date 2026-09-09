// ============================================
// Kaarigar — Design System Theme Tokens
// Designed for low-literacy, vernacular-first users
// ============================================

export const Colors = {
  // Primary palette — warm, culturally appropriate
  primary: '#D84315',       // Deep saffron — cultural identity
  primaryLight: '#FF7043',  // Lighter saffron for hover/press
  primaryDark: '#BF360C',   // Darker for emphasis

  // Secondary — confirmation, success
  secondary: '#2E7D32',     // Forest green
  secondaryLight: '#43A047',
  secondaryDark: '#1B5E20',

  // Accent — interactive elements
  accent: '#1565C0',        // Deep blue
  accentLight: '#1E88E5',

  // Backgrounds
  background: '#FAFAFA',    // Near-white, clean
  surface: '#FFFFFF',       // Card surfaces
  surfaceElevated: '#F5F5F5', // Elevated surfaces

  // Text — high contrast for readability
  text: '#212121',          // Primary text
  textLight: '#757575',     // Secondary text
  textOnPrimary: '#FFFFFF', // Text on primary color
  textOnDark: '#FFFFFF',

  // Status colors — consistent meaning everywhere
  success: '#2E7D32',       // Green = done/good
  warning: '#EF6C00',       // Orange = needs attention
  error: '#C62828',         // Red = problem
  info: '#1565C0',          // Blue = information

  // Offline state
  offline: '#9E9E9E',       // Grey
  offlineLight: '#BDBDBD',

  // Channel colors
  ondc: '#0D47A1',
  whatsapp: '#25D366',
  storefront: '#D84315',

  // Borders & dividers
  border: '#E0E0E0',
  divider: '#EEEEEE',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
};

export const Typography = {
  // Font family — Noto Sans supports all Indian scripts
  fontFamily: 'System', // Will be overridden with Noto Sans when loaded

  // Sizes — larger than standard for readability
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,     // Body text (larger than usual)
    xl: 20,     // Subheadings
    xxl: 24,    // Headings
    xxxl: 32,   // Hero text
    display: 40, // Display/onboarding
  },

  // Weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  xxxxl: 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
};

// Touch targets — minimum 56dp for accessibility (exceeds 48dp standard)
export const TouchTargets = {
  minimum: 56,
  voiceButton: 80,   // The hero element — extra large
  actionButton: 56,
  tabBarIcon: 48,
};

// Animation durations
export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  pulse: 1500,  // For pulsing mic button
};
