// ============================================
// Kaarigar — Pricing Screen (Step 4)
// Transparent price suggestion with "why" breakdown
// Algo + market data + AI adjustments
// ============================================

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function PricingScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // TODO: Replace with real AI pricing response
  const pricing = {
    min: 800,
    max: 1500,
    recommended: 1100,
    costBreakdown: {
      rawMaterial: 400,
      labor: 400,
      overhead: 80,
      fairMargin: 220,
      floorPrice: 800,
    },
    comparables: [
      { title: 'बनारसी रेशमी दुपट्टा', price: 1200, source: 'reference' },
      { title: 'हथकरघा रेशमी स्टोल', price: 950, source: 'reference' },
      { title: 'फूल बूटी दुपट्टा', price: 1400, source: 'reference' },
    ],
    adjustments: [
      { factor: 'GI Tag Premium', impact: '+15%', icon: '' },
      { factor: 'Photo Quality', impact: '+5%', icon: '' },
      { factor: 'Heritage Story', impact: '+3%', icon: '' },
    ],
    sampleSize: 47,
    confidence: 0.78,
  };

  const [selectedPrice, setSelectedPrice] = useState(pricing.recommended);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const pricePercentage = ((selectedPrice - pricing.min) / (pricing.max - pricing.min)) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}> {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>4 / 5</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Price Display */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>{t('pricing.title')}</Text>
          <Text style={styles.priceRange}>
            ₹{pricing.min.toLocaleString()} — ₹{pricing.max.toLocaleString()}
          </Text>

          {/* Slider */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${pricePercentage}%` }]} />
              <View style={[styles.sliderThumb, { left: `${pricePercentage}%` }]} />
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>₹{pricing.min}</Text>
              <Text style={styles.sliderLabelCenter}>
                ₹{pricing.recommended} ({t('pricing.recommended')})
              </Text>
              <Text style={styles.sliderLabel}>₹{pricing.max}</Text>
            </View>
          </View>

          {/* Selected price */}
          <View style={styles.selectedPrice}>
            <Text style={styles.selectedPriceValue}>₹{selectedPrice.toLocaleString()}</Text>
          </View>
        </View>

        {/* Why This Price — Expandable */}
        <TouchableOpacity
          style={styles.whyCard}
          onPress={() => setShowBreakdown(!showBreakdown)}
          activeOpacity={0.7}
        >
          <View style={styles.whyHeader}>
            <Text style={styles.whyTitle}> {t('pricing.whyThisPrice')}</Text>
            <Text style={styles.whyToggle}>{showBreakdown ? '▲' : '▼'}</Text>
          </View>

          {showBreakdown && (
            <View style={styles.breakdown}>
              {/* Cost Breakdown */}
              <View style={styles.breakdownSection}>
                <Text style={styles.breakdownTitle}> {t('pricing.yourCost')}</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Raw Material</Text>
                  <Text style={styles.breakdownValue}>₹{pricing.costBreakdown.rawMaterial}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Labor</Text>
                  <Text style={styles.breakdownValue}>₹{pricing.costBreakdown.labor}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Overhead (10%)</Text>
                  <Text style={styles.breakdownValue}>₹{pricing.costBreakdown.overhead}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Fair Margin</Text>
                  <Text style={styles.breakdownValue}>₹{pricing.costBreakdown.fairMargin}</Text>
                </View>
                <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                  <Text style={styles.breakdownTotalLabel}>Floor Price</Text>
                  <Text style={styles.breakdownTotalValue}>₹{pricing.costBreakdown.floorPrice}</Text>
                </View>
              </View>

              {/* Market Comparables */}
              <View style={styles.breakdownSection}>
                <Text style={styles.breakdownTitle}><Feather name="shopping-bag" size={16} /> {t('pricing.similarItems')}</Text>
                {pricing.comparables.map((item, i) => (
                  <View key={i} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{item.title}</Text>
                    <Text style={styles.breakdownValue}>₹{item.price}</Text>
                  </View>
                ))}
                <Text style={styles.sampleSize}>
                  Based on {pricing.sampleSize} similar products
                </Text>
              </View>

              {/* AI Adjustments */}
              <View style={styles.breakdownSection}>
                <Text style={styles.breakdownTitle}><Feather name="cpu" size={16} /> AI Adjustments</Text>
                {pricing.adjustments.map((adj, i) => (
                  <View key={i} style={styles.adjustmentRow}>
                    <Text style={styles.adjustmentIcon}>{adj.icon}</Text>
                    <Text style={styles.adjustmentFactor}>{adj.factor}</Text>
                    <Text style={styles.adjustmentImpact}>{adj.impact}</Text>
                  </View>
                ))}
              </View>

              {/* Confidence */}
              <View style={styles.confidenceBar}>
                <Text style={styles.confidenceText}>
                  Confidence: {Math.round(pricing.confidence * 100)}%
                </Text>
                <View style={styles.confidenceTrack}>
                  <View style={[styles.confidenceFill, { width: `${pricing.confidence * 100}%` }]} />
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* TTS Button */}
        <TouchableOpacity style={styles.listenButton}>
          <Feather name="volume-2" size={24} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.listenButtonText}>{t('review.listen')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.setOwnButton}
          activeOpacity={0.7}
        >
          <Text style={styles.setOwnText}>{t('pricing.setMyOwn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => router.push('/create/publish')}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>{t('pricing.usePrice')}</Text>
          <Feather name="arrow-right" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md, backgroundColor: Colors.primary,
  },
  backButton: { color: Colors.textOnPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.medium },
  stepIndicator: { color: Colors.textOnPrimary, fontSize: Typography.sizes.md, opacity: 0.8 },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxxl },
  priceCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.xl, marginBottom: Spacing.lg, ...Shadows.card,
  },
  priceLabel: { fontSize: Typography.sizes.md, color: Colors.textLight, marginBottom: Spacing.sm },
  priceRange: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.text, marginBottom: Spacing.xl },
  sliderContainer: { marginBottom: Spacing.xl },
  sliderTrack: { height: 8, backgroundColor: Colors.surfaceElevated, borderRadius: 4, position: 'relative' },
  sliderFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  sliderThumb: {
    position: 'absolute', top: -8, marginLeft: -12,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary, borderWidth: 3, borderColor: Colors.surface,
    ...Shadows.floating,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
  sliderLabel: { fontSize: Typography.sizes.sm, color: Colors.textLight },
  sliderLabelCenter: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.semibold },
  selectedPrice: { alignItems: 'center', marginTop: Spacing.md },
  selectedPriceValue: { fontSize: Typography.sizes.display, fontWeight: Typography.weights.bold, color: Colors.secondary },
  whyCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.subtle,
  },
  whyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  whyTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text },
  whyToggle: { fontSize: Typography.sizes.lg, color: Colors.textLight },
  breakdown: { marginTop: Spacing.lg },
  breakdownSection: { marginBottom: Spacing.xl },
  breakdownTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.text, marginBottom: Spacing.md },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  breakdownLabel: { fontSize: Typography.sizes.md, color: Colors.textLight },
  breakdownValue: { fontSize: Typography.sizes.md, color: Colors.text, fontWeight: Typography.weights.medium },
  breakdownTotal: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm, paddingTop: Spacing.md },
  breakdownTotalLabel: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.text },
  breakdownTotalValue: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.primary },
  sampleSize: { fontSize: Typography.sizes.sm, color: Colors.textLight, marginTop: Spacing.sm, fontStyle: 'italic' },
  adjustmentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
  adjustmentIcon: { fontSize: 16 },
  adjustmentFactor: { flex: 1, fontSize: Typography.sizes.md, color: Colors.text },
  adjustmentImpact: { fontSize: Typography.sizes.md, color: Colors.secondary, fontWeight: Typography.weights.bold },
  confidenceBar: { marginTop: Spacing.md },
  confidenceText: { fontSize: Typography.sizes.sm, color: Colors.textLight, marginBottom: Spacing.sm },
  confidenceTrack: { height: 6, backgroundColor: Colors.surfaceElevated, borderRadius: 3 },
  confidenceFill: { height: '100%', backgroundColor: Colors.secondary, borderRadius: 3 },
  listenButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  listenButtonIcon: { fontSize: 20 },
  listenButtonText: { fontSize: Typography.sizes.lg, color: Colors.text, fontWeight: Typography.weights.medium },
  bottomBar: {
    flexDirection: 'row', padding: Spacing.lg, gap: Spacing.md,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  setOwnButton: {
    flex: 1, borderWidth: 2, borderColor: Colors.primary,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center',
  },
  setOwnText: { color: Colors.primary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  nextButton: {
    flex: 1, backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: Spacing.sm, ...Shadows.card,
  },
  nextButtonText: { color: Colors.textOnPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  nextButtonArrow: { color: Colors.textOnPrimary, fontSize: Typography.sizes.lg },
});
