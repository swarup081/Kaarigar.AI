// ============================================
// Kaarigar — Language Selection (First Screen)
// Large buttons with native script labels
// This is the FIRST thing the artisan sees
// ============================================

import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, BorderRadius, Shadows, TouchTargets } from '@/constants/theme';

let Haptics: any = null;
if (Platform.OS !== 'web') { try { Haptics = require('expo-haptics'); } catch (e) {} }

const LANGUAGES = [
  { code: 'hi', label: 'हिंदी', subLabel: 'Hindi', flag: '🇮🇳' },
  { code: 'en', label: 'English', subLabel: 'English', flag: '🇬🇧' },
  { code: 'ta', label: 'தமிழ்', subLabel: 'Tamil', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা', subLabel: 'Bengali', flag: '🇮🇳' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();

  const selectLanguage = async (code: string) => {
    if (Haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    i18n.changeLanguage(code);
    router.push('/(auth)/phone');
  };

  return (
    <View style={styles.container}>
      {/* App branding */}
      <View style={styles.brandContainer}>
        <Text style={styles.logo}>🧶</Text>
        <Text style={styles.appName}>Kaarigar</Text>
        <Text style={styles.tagline}>कारीगर</Text>
      </View>

      {/* Language prompt */}
      <Text style={styles.prompt}>अपनी भाषा चुनें</Text>
      <Text style={styles.promptEn}>Choose your language</Text>

      {/* Language buttons — big, accessible */}
      <View style={styles.languageGrid}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={styles.languageButton}
            onPress={() => selectLanguage(lang.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.languageFlag}>{lang.flag}</Text>
            <Text style={styles.languageLabel}>{lang.label}</Text>
            <Text style={styles.languageSubLabel}>{lang.subLabel}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logo: {
    fontSize: 72,
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  tagline: {
    fontSize: Typography.sizes.xl,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  prompt: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  promptEn: {
    fontSize: Typography.sizes.lg,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  languageButton: {
    width: '44%',
    minHeight: TouchTargets.minimum * 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  languageFlag: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  languageLabel: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  languageSubLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
});
