import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

let Haptics: any = null;
if (Platform.OS !== 'web') { try { Haptics = require('expo-haptics'); } catch (e) {} }

const LANGUAGES = [
  { code: 'hi', label: 'हिंदी', subLabel: 'Hindi', icon: 'globe' },
  { code: 'en', label: 'English', subLabel: 'English', icon: 'globe' },
  { code: 'ta', label: 'தமிழ்', subLabel: 'Tamil', icon: 'globe' },
  { code: 'bn', label: 'বাংলা', subLabel: 'Bengali', icon: 'globe' },
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* App branding */}
        <View style={styles.brandContainer}>
          <View style={styles.logoWrapper}>
            <Text style={styles.logoText}>B</Text>
          </View>
          <Text style={styles.appName}>Kaarigar</Text>
          <Text style={styles.tagline}>Empowering Artisans</Text>
        </View>

        {/* Language prompt */}
        <View style={styles.promptContainer}>
          <Text style={styles.prompt}>अपनी भाषा चुनें</Text>
          <Text style={styles.promptEn}>Choose your language</Text>
        </View>

        {/* Language buttons */}
        <View style={styles.languageGrid}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={styles.languageButton}
              onPress={() => selectLanguage(lang.code)}
              activeOpacity={0.7}
            >
              <View style={styles.langIconWrapper}>
                <Feather name={lang.icon as any} size={20} color="#7C3AED" />
              </View>
              <View style={styles.langTextContainer}>
                <Text style={styles.languageLabel}>{lang.label}</Text>
                <Text style={styles.languageSubLabel}>{lang.subLabel}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D8FD',
  },
  logoText: {
    fontFamily: 'serif',
    fontSize: 32,
    fontWeight: '800',
    color: '#7C3AED',
  },
  appName: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  promptContainer: {
    marginBottom: 32,
  },
  prompt: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  promptEn: {
    fontSize: 14,
    color: '#6B7280',
  },
  languageGrid: {
    gap: 16,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  langIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  langTextContainer: {
    flex: 1,
  },
  languageLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  languageSubLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
});
