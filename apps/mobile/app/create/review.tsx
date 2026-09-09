// ============================================
// Kaarigar — Review Screen (Step 3)
// Shows AI-generated listing for artisan review
// with TTS readback and edit capabilities
// ============================================

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function ReviewScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);

  // TODO: Replace with real AI-generated data from Zustand store
  const listing = {
    title: 'हथकरघा रेशमी दुपट्टा',
    titleEn: 'Handwoven Silk Dupatta with Floral Motifs',
    description: 'यह बनारसी रेशमी दुपट्टा हाथ से बुना गया है...',
    descriptionEn: 'This Banarasi silk dupatta is handwoven on a traditional loom...',
    material: 'रेशम (Silk)',
    technique: 'हथकरघा (Handloom)',
    heritage: 'यह दुपट्टा वाराणसी की सदियों पुरानी बुनाई परंपरा से...',
    images: [] as string[],
  };

  const ListingField = ({
    label,
    value,
    valueEn,
  }: {
    label: string;
    value: string;
    valueEn?: string;
  }) => (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TouchableOpacity style={styles.ttsButton}>
          <Text style={styles.ttsIcon}>🔊</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.fieldValue}>{value}</Text>
      {valueEn && <Text style={styles.fieldValueEn}>{valueEn}</Text>}
      <TouchableOpacity style={styles.editHint}>
        <Text style={styles.editHintText}>️ {t('review.editField')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (isProcessing) {
    return (
      <View style={styles.processingContainer}>
        <Text style={styles.processingIcon}>️</Text>
        <Text style={styles.processingText}>{t('review.processing')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}> {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>3 / 5</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* AI Generated Badge */}
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeIcon}></Text>
          <Text style={styles.aiBadgeText}>{t('review.aiGenerated')}</Text>
        </View>

        {/* Photo Preview */}
        <View style={styles.photoContainer}>
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderIcon}></Text>
            <Text style={styles.photoPlaceholderText}>Before / After</Text>
          </View>
        </View>

        {/* Listing Fields */}
        <ListingField
          label={t('review.productTitle')}
          value={listing.title}
          valueEn={listing.titleEn}
        />
        <ListingField
          label={t('review.description')}
          value={listing.description}
          valueEn={listing.descriptionEn}
        />
        <ListingField label={t('review.material')} value={listing.material} />
        <ListingField label={t('review.technique')} value={listing.technique} />
        <ListingField label={t('review.heritage')} value={listing.heritage} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => router.push('/create/pricing')}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>{t('review.looksGood')}</Text>
          <Text style={styles.nextButtonArrow}></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
  backButton: { color: Colors.textOnPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.medium },
  stepIndicator: { color: Colors.textOnPrimary, fontSize: Typography.sizes.md, opacity: 0.8 },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxxl },
  processingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  processingIcon: { fontSize: 72, marginBottom: Spacing.xl },
  processingText: { fontSize: Typography.sizes.xl, color: Colors.textLight },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#FFF3E0', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    alignSelf: 'flex-start', marginBottom: Spacing.lg,
  },
  aiBadgeIcon: { fontSize: 16 },
  aiBadgeText: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.medium },
  photoContainer: { marginBottom: Spacing.xl },
  photoPlaceholder: {
    height: 200, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  photoPlaceholderIcon: { fontSize: 48, marginBottom: Spacing.sm },
  photoPlaceholderText: { fontSize: Typography.sizes.md, color: Colors.textLight },
  field: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.subtle,
  },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  fieldLabel: { fontSize: Typography.sizes.sm, color: Colors.textLight, fontWeight: Typography.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  ttsButton: { padding: Spacing.xs },
  ttsIcon: { fontSize: 20 },
  fieldValue: { fontSize: Typography.sizes.lg, color: Colors.text, lineHeight: Typography.sizes.lg * Typography.lineHeights.relaxed },
  fieldValueEn: { fontSize: Typography.sizes.md, color: Colors.textLight, marginTop: Spacing.sm, fontStyle: 'italic' },
  editHint: { marginTop: Spacing.md },
  editHintText: { fontSize: Typography.sizes.sm, color: Colors.accent },
  bottomBar: { padding: Spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  nextButton: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: Spacing.md, ...Shadows.card,
  },
  nextButtonText: { color: Colors.textOnPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  nextButtonArrow: { color: Colors.textOnPrimary, fontSize: Typography.sizes.xl },
});
