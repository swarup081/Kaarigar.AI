// ============================================
// Kaarigar — Pricing Screen (Step 4)
// Two questions, then a transparent price.
//
// The service cannot compute a floor without what the artisan
// spent and how long it took, so those are asked first. Nothing
// is estimated on their behalf: a floor built on guessed costs
// is not a floor.
// ============================================

import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { suggestPrice, AIServiceError } from '@/services/api/ai';
import { useActiveListingStore, useAuthStore } from '@/stores';
import { usePhotoStore } from '@/stores/imageStore';
import type { LanguageCode } from '@kaarigar/shared-types';

const rupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export default function PricingScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const language = (i18n.language as LanguageCode) || 'hi';

  const profile = useAuthStore((s) => s.artisanProfile);
  const listing = useActiveListingStore((s) => s.listing);
  const pricing = useActiveListingStore((s) => s.pricing);
  const storedCost = useActiveListingStore((s) => s.rawMaterialCost);
  const storedHours = useActiveListingStore((s) => s.laborHours);
  const finalPrice = useActiveListingStore((s) => s.finalPrice);
  const setCosts = useActiveListingStore((s) => s.setCosts);
  const setPricing = useActiveListingStore((s) => s.setPricing);
  const setFinalPrice = useActiveListingStore((s) => s.setFinalPrice);
  const mergedAttributes = usePhotoStore((s) => s.getMergedAttributes);

  const [costText, setCostText] = useState(storedCost?.toString() ?? '');
  const [hoursText, setHoursText] = useState(storedHours?.toString() ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AIServiceError | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const cost = parseFloat(costText);
  const hours = parseFloat(hoursText);
  const canSubmit = Number.isFinite(cost) && cost >= 0 && Number.isFinite(hours) && hours > 0;

  const attributes = listing?.extractedAttributes;

  // ─── Ask the service ───────────────────────

  const fetchPrice = useCallback(async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);
    setCosts(cost, hours);

    try {
      const photoAttributes = mergedAttributes();
      const result = await suggestPrice({
        category: attributes?.category ?? profile?.craftType ?? 'other',
        subCategory: attributes?.subCategory,
        material: attributes?.material,
        technique: attributes?.technique,
        region: attributes?.region ?? profile?.region,
        giTag: attributes?.giTag,
        rawMaterialCost: cost,
        laborHours: hours,
        colors: attributes?.colors,
        qualityIndicators: {
          patternComplexity: photoAttributes.hasPattern ? 'complex' : 'simple',
        },
        language,
      });
      setPricing(result);
    } catch (caught) {
      const failure = caught instanceof AIServiceError
        ? caught
        : new AIServiceError('PROCESSING_ERROR', String(caught));
      console.warn('[pricing] failed', failure.code, failure.message);
      setError(failure);
    } finally {
      setIsLoading(false);
    }
  }, [canSubmit, cost, hours, attributes, profile, language, mergedAttributes, setCosts, setPricing]);

  // ─── Price adjustment ──────────────────────

  const chosen = finalPrice ?? pricing?.suggestedPrice.recommended ?? 0;
  const minimum = useMemo(() => {
    if (!pricing) return 0;
    const { floorPrice, fairMargin } = pricing.reasoning.costBreakdown;
    return Math.round(floorPrice + fairMargin);
  }, [pricing]);
  const belowFair = pricing !== null && chosen < minimum;

  const nudge = (delta: number) => setFinalPrice(Math.max(0, chosen + delta));

  // ─── Cost entry ────────────────────────────

  if (!pricing) {
    return (
      <View style={styles.container}>
        <Header onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('pricing.costTitle')}</Text>
          <Text style={styles.subtitle}>{t('pricing.costSubtitle')}</Text>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>{t('pricing.materialCost')}</Text>
            <Text style={styles.inputHint}>{t('pricing.materialCostHint')}</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputPrefix}>₹</Text>
              <TextInput
                style={styles.input}
                value={costText}
                onChangeText={setCostText}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textLight}
              />
            </View>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>{t('pricing.laborHours')}</Text>
            <Text style={styles.inputHint}>{t('pricing.laborHoursHint')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={hoursText}
                onChangeText={setHoursText}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textLight}
              />
              <Text style={styles.inputSuffix}>{t('pricing.hours')}</Text>
            </View>
          </View>

          {error && (
            <View style={styles.errorCard}>
              <Feather name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>
                {t(`pricing.errors.${error.code}`, t('common.error'))}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
            onPress={fetchPrice}
            disabled={!canSubmit || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.textOnPrimary} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>{t('pricing.calculate')}</Text>
                <Feather name="arrow-right" size={20} color={Colors.textOnPrimary} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Result ────────────────────────────────

  const { costBreakdown, adjustments, marketComparables, summary, summaryRegional, degraded } = pricing.reasoning;

  return (
    <View style={styles.container}>
      <Header onBack={() => router.back()} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.priceLabel}>{t('pricing.recommended')}</Text>
        <Text style={styles.priceValue}>{rupees(chosen)}</Text>
        <Text style={styles.priceRange}>
          {t('pricing.range', {
            min: rupees(pricing.suggestedPrice.min),
            max: rupees(pricing.suggestedPrice.max),
          })}
        </Text>

        <View style={styles.nudgeRow}>
          <TouchableOpacity style={styles.nudgeButton} onPress={() => nudge(-50)}>
            <Feather name="minus" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.nudgeHint}>{t('pricing.adjust')}</Text>
          <TouchableOpacity style={styles.nudgeButton} onPress={() => nudge(50)}>
            <Feather name="plus" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {belowFair && (
          <View style={styles.warningCard}>
            <Feather name="alert-triangle" size={18} color={Colors.error} />
            <Text style={styles.warningText}>
              {t('pricing.belowFair', { amount: rupees(minimum) })}
            </Text>
          </View>
        )}

        {/* When the model was unreachable this is the floor price alone. Saying
            so is more useful than presenting it as market-informed. */}
        {degraded && (
          <View style={styles.noticeCard}>
            <Feather name="wifi-off" size={16} color={Colors.textLight} />
            <Text style={styles.noticeText}>{t('pricing.degraded')}</Text>
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{summaryRegional || summary}</Text>
        </View>

        <TouchableOpacity style={styles.disclosure} onPress={() => setShowBreakdown((v) => !v)}>
          <Text style={styles.disclosureText}>{t('pricing.whyThisPrice')}</Text>
          <Feather name={showBreakdown ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.accent} />
        </TouchableOpacity>

        {showBreakdown && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownHeading}>{t('pricing.yourCost')}</Text>
            <Row label={t('pricing.rawMaterial')} value={rupees(costBreakdown.rawMaterial)} />
            <Row label={t('pricing.labor')} value={rupees(costBreakdown.labor)} />
            <Row label={t('pricing.overhead')} value={rupees(costBreakdown.overhead)} />
            <Row label={t('pricing.fairMargin')} value={rupees(costBreakdown.fairMargin)} />
            <View style={styles.divider} />
            <Row label={t('pricing.floorPrice')} value={rupees(costBreakdown.floorPrice)} bold />

            {adjustments.length > 0 && (
              <>
                <Text style={[styles.breakdownHeading, styles.spacedHeading]}>{t('pricing.adjustments')}</Text>
                {adjustments.map((item, index) => (
                  <View key={index} style={styles.adjustment}>
                    <View style={styles.adjustmentHeader}>
                      <Text style={styles.adjustmentFactor}>{item.factor}</Text>
                      <Text style={styles.adjustmentImpact}>{item.impact}</Text>
                    </View>
                    <Text style={styles.adjustmentReason}>{item.reason}</Text>
                  </View>
                ))}
              </>
            )}

            {marketComparables.length > 0 && (
              <>
                <Text style={[styles.breakdownHeading, styles.spacedHeading]}>{t('pricing.similarItems')}</Text>
                {marketComparables.map((item, index) => (
                  <Row key={index} label={item.title} value={rupees(item.price)} />
                ))}
                {/* These are model estimates until price_references is seeded.
                    Labelling them keeps an estimate from reading as market data. */}
                <Text style={styles.estimateNote}>{t('pricing.estimateNote')}</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.textButton} onPress={() => setPricingReset()}>
          <Feather name="edit-2" size={16} color={Colors.textLight} />
          <Text style={styles.textButtonText}>{t('pricing.editCosts')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/create/publish')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>{t('pricing.usePrice')}</Text>
          <Feather name="arrow-right" size={20} color={Colors.textOnPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Clearing the costs drops the suggestion and returns to the input form.
  function setPricingReset() {
    setCosts(null, null);
  }
}

function Header({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.headerBack}>
        <Feather name="arrow-left" size={20} color={Colors.textOnPrimary} />
        <Text style={styles.backButton}>{t('common.back')}</Text>
      </TouchableOpacity>
      <Text style={styles.stepIndicator}>4 / 5</Text>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowBold]} numberOfLines={2}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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

  title: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.text },
  subtitle: { fontSize: Typography.sizes.md, color: Colors.textLight, marginTop: Spacing.xs, marginBottom: Spacing.xl },

  inputCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.subtle,
  },
  inputLabel: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold, color: Colors.text },
  inputHint: { fontSize: Typography.sizes.sm, color: Colors.textLight, marginTop: 2, marginBottom: Spacing.md },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 2, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
  },
  inputPrefix: { fontSize: Typography.sizes.xxl, color: Colors.textLight },
  inputSuffix: { fontSize: Typography.sizes.md, color: Colors.textLight },
  input: { flex: 1, fontSize: Typography.sizes.xxl, color: Colors.text, paddingVertical: Spacing.md },

  priceLabel: { fontSize: Typography.sizes.md, color: Colors.textLight, textAlign: 'center' },
  priceValue: {
    fontSize: Typography.sizes.display, fontWeight: Typography.weights.bold,
    color: Colors.primary, textAlign: 'center', marginVertical: Spacing.xs,
  },
  priceRange: { fontSize: Typography.sizes.sm, color: Colors.textLight, textAlign: 'center' },

  nudgeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xl, marginVertical: Spacing.xl,
  },
  nudgeButton: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  nudgeHint: { fontSize: Typography.sizes.sm, color: Colors.textLight },

  warningCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: '#FFEBEE', borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  warningText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.error, lineHeight: 20 },
  noticeCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  noticeText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textLight, lineHeight: 20 },
  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: '#FFEBEE', borderRadius: BorderRadius.lg, padding: Spacing.lg,
  },
  errorText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.error },

  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.subtle,
  },
  summaryText: { fontSize: Typography.sizes.md, color: Colors.text, lineHeight: 24 },

  disclosure: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  disclosureText: { fontSize: Typography.sizes.lg, color: Colors.accent, fontWeight: Typography.weights.semibold },

  breakdownCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.subtle },
  breakdownHeading: {
    fontSize: Typography.sizes.sm, color: Colors.textLight, fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm,
  },
  spacedHeading: { marginTop: Spacing.xl },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.sm },
  rowLabel: { flex: 1, fontSize: Typography.sizes.md, color: Colors.textLight },
  rowValue: { fontSize: Typography.sizes.md, color: Colors.text },
  rowBold: { fontWeight: Typography.weights.bold, color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.sm },

  adjustment: { paddingVertical: Spacing.sm },
  adjustmentHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  adjustmentFactor: { fontSize: Typography.sizes.md, color: Colors.text, fontWeight: Typography.weights.medium, flex: 1 },
  adjustmentImpact: { fontSize: Typography.sizes.md, color: Colors.secondary, fontWeight: Typography.weights.bold },
  adjustmentReason: { fontSize: Typography.sizes.sm, color: Colors.textLight, marginTop: 2, lineHeight: 20 },
  estimateNote: { fontSize: Typography.sizes.xs, color: Colors.textLight, marginTop: Spacing.sm, fontStyle: 'italic' },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  textButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
  textButtonText: { fontSize: Typography.sizes.md, color: Colors.textLight },
  primaryButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.card,
  },
  primaryButtonText: { color: Colors.textOnPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  buttonDisabled: { opacity: 0.4 },
});
