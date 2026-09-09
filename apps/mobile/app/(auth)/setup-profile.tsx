// ============================================
// Kaarigar — Profile Setup (Onboarding)
// Name, craft type, region — minimal fields
// ============================================

import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, BorderRadius, Shadows, TouchTargets } from '@/constants/theme';
import { CRAFT_CATEGORIES } from '@/constants/craftCategories';

let Haptics: any = null;
if (Platform.OS !== 'web') { try { Haptics = require('expo-haptics'); } catch (e) {} }

export default function SetupProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'hi' | 'en' | 'ta' | 'bn';

  const [name, setName] = useState('');
  const [selectedCraft, setSelectedCraft] = useState<string | null>(null);
  const [region, setRegion] = useState('');

  const getCraftLabel = (craft: (typeof CRAFT_CATEGORIES)[0]) => {
    const labels = { hi: craft.labelHi, en: craft.labelEn, ta: craft.labelTa, bn: craft.labelBn };
    return labels[lang] || craft.labelEn;
  };

  const canProceed = name.trim().length > 0 && selectedCraft !== null;

  const handleComplete = async () => {
    if (!canProceed) return;
    if (Haptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // TODO: Save profile to SQLite + Supabase
    router.replace('/(tabs)/home');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome */}
      <Text style={styles.welcomeIcon}>🎉</Text>
      <Text style={styles.title}>{t('auth.welcome')}</Text>
      <Text style={styles.subtitle}>{t('auth.setupProfile')}</Text>

      {/* Name Input */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t('profile.name')}</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder={lang === 'hi' ? 'आपका नाम' : 'Your name'}
          placeholderTextColor={Colors.textLight}
          autoFocus
        />
      </View>

      {/* Craft Selection — visual grid */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t('profile.craft')}</Text>
        <View style={styles.craftGrid}>
          {CRAFT_CATEGORIES.map((craft) => (
            <TouchableOpacity
              key={craft.id}
              style={[
                styles.craftButton,
                selectedCraft === craft.id && styles.craftButtonSelected,
              ]}
              onPress={() => {
                setSelectedCraft(craft.id);
                if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.craftIcon}>{craft.icon}</Text>
              <Text
                style={[
                  styles.craftLabel,
                  selectedCraft === craft.id && styles.craftLabelSelected,
                ]}
              >
                {getCraftLabel(craft)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Region */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t('profile.region')}</Text>
        <TextInput
          style={styles.textInput}
          value={region}
          onChangeText={setRegion}
          placeholder={lang === 'hi' ? 'वाराणसी, उत्तर प्रदेश' : 'Varanasi, Uttar Pradesh'}
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {/* Complete Setup */}
      <TouchableOpacity
        style={[styles.completeButton, !canProceed && styles.completeButtonDisabled]}
        onPress={handleComplete}
        disabled={!canProceed}
        activeOpacity={0.8}
      >
        <Text style={styles.completeButtonText}>
          {t('common.done')} ✨
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingTop: 80, paddingBottom: Spacing.xxxxl },
  welcomeIcon: { fontSize: 56, textAlign: 'center', marginBottom: Spacing.md },
  title: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.text, textAlign: 'center' },
  subtitle: { fontSize: Typography.sizes.lg, color: Colors.textLight, textAlign: 'center', marginBottom: Spacing.xxl },
  field: { marginBottom: Spacing.xl },
  fieldLabel: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text, marginBottom: Spacing.md },
  textInput: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg,
    fontSize: Typography.sizes.lg, color: Colors.text,
    borderWidth: 2, borderColor: Colors.border,
  },
  craftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  craftButton: {
    width: '30%', alignItems: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md, backgroundColor: Colors.surface,
    borderWidth: 2, borderColor: Colors.border,
  },
  craftButtonSelected: { borderColor: Colors.primary, backgroundColor: '#FFF3E0' },
  craftIcon: { fontSize: 28, marginBottom: Spacing.xs },
  craftLabel: { fontSize: Typography.sizes.xs, color: Colors.text, textAlign: 'center', fontWeight: Typography.weights.medium },
  craftLabelSelected: { color: Colors.primary, fontWeight: Typography.weights.bold },
  completeButton: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg, alignItems: 'center',
    marginTop: Spacing.xl, ...Shadows.floating,
  },
  completeButtonDisabled: { backgroundColor: Colors.offline },
  completeButtonText: { color: Colors.textOnPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
});
