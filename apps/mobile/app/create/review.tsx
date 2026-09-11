// ============================================
// Kaarigar — Review Screen (Step 3)
// Sends the recording and the enhanced photo to the AI service,
// then shows the generated listing for the artisan to correct.
//
// Everything here is editable. The model is a first draft, and the
// artisan is the authority on their own product.
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { voiceToListing, AIServiceError, type Multilingual, type MultilingualList } from '@/services/api/ai';
import { useActiveListingStore, useAuthStore } from '@/stores';
import { usePhotoStore } from '@/stores/imageStore';
import type { LanguageCode } from '@kaarigar/shared-types';

/** Picks the artisan's language, falling back to whatever the model returned. */
function pick(field: Multilingual | undefined, lang: LanguageCode): string {
  if (!field) return '';
  return field[lang] ?? field.en ?? field.hi ?? Object.values(field)[0] ?? '';
}

function pickList(field: MultilingualList | undefined, lang: LanguageCode): string[] {
  if (!field) return [];
  return field[lang] ?? field.en ?? field.hi ?? Object.values(field)[0] ?? [];
}

export default function ReviewScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const language = (i18n.language as LanguageCode) || 'hi';

  const profile = useAuthStore((s) => s.artisanProfile);
  const voiceUri = useActiveListingStore((s) => s.voiceRecordingUri);
  const listing = useActiveListingStore((s) => s.listing);
  const transcript = useActiveListingStore((s) => s.transcript);
  const edits = useActiveListingStore((s) => s.listingEdits);
  const setListing = useActiveListingStore((s) => s.setListing);
  const editField = useActiveListingStore((s) => s.editListingField);

  const photos = usePhotoStore((s) => s.photos);
  const publishableUris = usePhotoStore((s) => s.getPublishableUris);
  const mergedAttributes = usePhotoStore((s) => s.getMergedAttributes);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<AIServiceError | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const heroUri = useMemo(() => publishableUris()[0], [publishableUris, photos]);

  // ─── Generate ──────────────────────────────

  const generate = useCallback(async () => {
    if (!voiceUri) {
      setError(new AIServiceError('NO_RECORDING', 'No voice recording to work from'));
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const attributes = mergedAttributes();
      const result = await voiceToListing({
        audioUri: voiceUri,
        sourceLanguage: language,
        targetLanguages: language === 'en' ? ['en'] : ['en', language],
        productCategory: profile?.craftType,
        // The region is what filters the Geographical Indication shortlist.
        // Without it the model has nothing legitimate to choose from.
        region: profile?.region,
        dominantColors: attributes.dominantColors,
        imageUri: heroUri,
      });
      setListing(result.transcription, result.listing);
    } catch (caught) {
      const failure = caught instanceof AIServiceError
        ? caught
        : new AIServiceError('PROCESSING_ERROR', String(caught));
      console.warn('[review] generation failed', failure.code, failure.message);
      setError(failure);
    } finally {
      setIsGenerating(false);
    }
  }, [voiceUri, language, profile, heroUri, mergedAttributes, setListing]);

  // Generate once on arrival. Coming back from the pricing step reuses the
  // result already in the store rather than spending another model call.
  useEffect(() => {
    if (!listing && !isGenerating && !error) void generate();
  }, [listing, isGenerating, error, generate]);

  // ─── Derived display values ────────────────

  const value = useCallback(
    (field: string, fallback: string) => edits[field] ?? fallback,
    [edits]
  );

  const attributes = listing?.extractedAttributes;
  const bullets = pickList(listing?.bulletFeatures, language);

  // ─── Loading ───────────────────────────────

  if (isGenerating) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.processingText}>{t('review.processing')}</Text>
        <Text style={styles.processingHint}>{t('review.processingHint')}</Text>
      </View>
    );
  }

  // ─── Error ─────────────────────────────────

  if (error) {
    return (
      <View style={styles.centred}>
        <Feather name="alert-circle" size={48} color={Colors.warning} />
        <Text style={styles.errorTitle}>{t(`review.errors.${error.code}`, t('common.error'))}</Text>
        <View style={styles.errorActions}>
          {error.isRetryable && (
            <TouchableOpacity style={styles.primaryButton} onPress={generate}>
              <Feather name="refresh-cw" size={18} color={Colors.textOnPrimary} />
              <Text style={styles.primaryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.textButton} onPress={() => router.back()}>
            <Text style={styles.textButtonText}>{t('review.recordAgain')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!listing) return <View style={styles.container} />;

  // ─── Editable field ────────────────────────

  const Field = ({ field, label, text, multiline }: {
    field: string; label: string; text: string; multiline?: boolean;
  }) => {
    const isEditing = editing === field;
    const current = value(field, text);
    if (!current && !isEditing) return null;

    return (
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TouchableOpacity onPress={() => setEditing(isEditing ? null : field)} hitSlop={10}>
            <Feather name={isEditing ? 'check' : 'edit-2'} size={16} color={Colors.accent} />
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <TextInput
            style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
            value={current}
            onChangeText={(next) => editField(field, next)}
            multiline={multiline}
            autoFocus
            onBlur={() => setEditing(null)}
          />
        ) : (
          <Text style={styles.fieldValue}>{current}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Feather name="arrow-left" size={20} color={Colors.textOnPrimary} />
          <Text style={styles.backButton}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>3 / 5</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.aiBadge}>
          <Feather name="zap" size={14} color={Colors.primary} />
          <Text style={styles.aiBadgeText}>{t('review.aiGenerated')}</Text>
        </View>

        {heroUri && <Image source={{ uri: heroUri }} style={styles.hero} resizeMode="cover" />}

        {/* What the artisan actually said. Showing it builds trust that the
            listing came from them, and makes a bad transcription obvious. */}
        {transcript?.originalText ? (
          <View style={styles.transcriptCard}>
            <Text style={styles.fieldLabel}>{t('review.youSaid')}</Text>
            <Text style={styles.transcriptText}>{transcript.originalText}</Text>
          </View>
        ) : null}

        <Field field="title" label={t('review.productTitle')} text={pick(listing.title, language)} />
        <Field field="description" label={t('review.description')} text={pick(listing.description, language)} multiline />

        {bullets.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('review.features')}</Text>
            {bullets.map((bullet, index) => (
              <View key={index} style={styles.bulletRow}>
                <Feather name="check" size={14} color={Colors.secondary} />
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        )}

        <Field field="heritage" label={t('review.heritage')} text={pick(listing.heritageStory, language)} multiline />

        {/* Attributes the model could not extract are simply absent. That is
            correct: nothing here was invented on the artisan's behalf. */}
        {attributes && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('review.details')}</Text>
            {attributes.material ? <Detail label={t('review.material')} value={attributes.material} /> : null}
            {attributes.technique ? <Detail label={t('review.technique')} value={attributes.technique} /> : null}
            {attributes.region ? <Detail label={t('review.region')} value={attributes.region} /> : null}
            {attributes.giTag ? (
              <View style={styles.giBadge}>
                <Feather name="award" size={14} color={Colors.secondary} />
                <Text style={styles.giText}>{attributes.giTag}</Text>
              </View>
            ) : null}
          </View>
        )}

        {transcript && transcript.confidence < 0.6 && (
          <View style={styles.warningCard}>
            <Feather name="alert-triangle" size={16} color={Colors.warning} />
            <Text style={styles.warningText}>{t('review.lowConfidence')}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.textButton} onPress={generate}>
          <Feather name="refresh-cw" size={16} color={Colors.textLight} />
          <Text style={styles.textButtonText}>{t('review.regenerate')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => router.push('/create/pricing')}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>{t('review.looksGood')}</Text>
          <Feather name="arrow-right" size={20} color={Colors.textOnPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centred: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, padding: Spacing.xxxl, gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
  headerBack: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  backButton: { color: Colors.textOnPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.medium },
  stepIndicator: { color: Colors.textOnPrimary, fontSize: Typography.sizes.md, opacity: 0.8 },

  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxxl },

  processingText: { fontSize: Typography.sizes.xl, color: Colors.text, textAlign: 'center' },
  processingHint: { fontSize: Typography.sizes.md, color: Colors.textLight, textAlign: 'center' },
  errorTitle: { fontSize: Typography.sizes.lg, color: Colors.text, textAlign: 'center', lineHeight: 26 },
  errorActions: { gap: Spacing.md, alignItems: 'center', alignSelf: 'stretch' },

  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#FFF3E0', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    alignSelf: 'flex-start', marginBottom: Spacing.lg,
  },
  aiBadgeText: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.medium },

  hero: {
    width: '100%', height: 220, borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg, backgroundColor: Colors.surfaceElevated,
  },

  transcriptCard: {
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md,
  },
  transcriptText: {
    fontSize: Typography.sizes.md, color: Colors.textLight,
    fontStyle: 'italic', marginTop: Spacing.sm, lineHeight: 24,
  },

  field: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.subtle,
  },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  fieldLabel: {
    fontSize: Typography.sizes.sm, color: Colors.textLight, fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  fieldValue: { fontSize: Typography.sizes.lg, color: Colors.text, lineHeight: Typography.sizes.lg * 1.6 },
  fieldInput: {
    fontSize: Typography.sizes.lg, color: Colors.text, borderWidth: 1,
    borderColor: Colors.accent, borderRadius: BorderRadius.sm, padding: Spacing.md,
  },
  fieldInputMultiline: { minHeight: 110, textAlignVertical: 'top' },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: 4 },
  bulletText: { flex: 1, fontSize: Typography.sizes.md, color: Colors.text, lineHeight: 22 },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  detailLabel: { fontSize: Typography.sizes.md, color: Colors.textLight },
  detailValue: { fontSize: Typography.sizes.md, color: Colors.text, fontWeight: Typography.weights.medium },
  giBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm,
    backgroundColor: '#E8F5E9', borderRadius: BorderRadius.sm, padding: Spacing.md,
  },
  giText: { fontSize: Typography.sizes.sm, color: Colors.secondaryDark, fontWeight: Typography.weights.semibold, flex: 1 },

  warningCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: '#FFF8E1', borderRadius: BorderRadius.lg, padding: Spacing.lg,
  },
  warningText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.warning, lineHeight: 20 },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  textButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
  textButtonText: { fontSize: Typography.sizes.md, color: Colors.textLight },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, alignSelf: 'stretch',
  },
  primaryButtonText: { color: Colors.textOnPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  nextButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.card,
  },
  nextButtonText: { color: Colors.textOnPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
});
