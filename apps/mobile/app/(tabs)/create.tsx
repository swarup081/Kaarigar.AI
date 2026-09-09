// ============================================
// Kaarigar — Create Tab (entry point)
// Shows the 5-step overview as a read-only guide
// Only "Start" button launches the sequential flow
// Users CANNOT skip steps
// ============================================

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const STEPS = [
  { icon: '📸', step: 1, key: 'create.step1', desc: 'Take 3 photos: front, back, detail' },
  { icon: '🎤', step: 2, key: 'create.step2', desc: 'Describe your product in your language' },
  { icon: '📝', step: 3, key: 'create.step3', desc: 'AI creates your listing — you review' },
  { icon: '💰', step: 4, key: 'create.step4', desc: 'See fair price with full breakdown' },
  { icon: '🚀', step: 5, key: 'create.step5', desc: 'Publish to your chosen channels' },
];

export default function CreateScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.title}>{t('create.newListing')}</Text>
      <Text style={styles.subtitle}>
        Follow these 5 simple steps to list your product
      </Text>

      {/* Steps — informational only, NOT tappable */}
      <View style={styles.stepsContainer}>
        {STEPS.map((step, index) => (
          <View key={step.step} style={styles.stepRow}>
            {/* Connector line */}
            {index < STEPS.length - 1 && <View style={styles.connector} />}

            {/* Step circle */}
            <View style={styles.stepCircle}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
            </View>

            {/* Step info */}
            <View style={styles.stepInfo}>
              <Text style={styles.stepLabel}>
                {step.step}. {t(step.key)}
              </Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Time estimate */}
      <View style={styles.timeCard}>
        <Text style={styles.timeIcon}>⏱️</Text>
        <View>
          <Text style={styles.timeText}>Takes about 3-5 minutes</Text>
          <Text style={styles.timeSubtext}>Works offline too!</Text>
        </View>
      </View>

      {/* Start Button — the ONLY way to enter the flow */}
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.push('/create/camera')}
        activeOpacity={0.8}
      >
        <Text style={styles.startButtonIcon}>📸</Text>
        <Text style={styles.startButtonText}>{t('create.step1')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginBottom: Spacing.xxl,
  },
  stepsContainer: {
    marginBottom: Spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    left: 24,
    top: 50,
    width: 2,
    height: 40,
    backgroundColor: Colors.border,
  },
  stepCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  stepIcon: {
    fontSize: 24,
  },
  stepInfo: {
    flex: 1,
    paddingTop: Spacing.sm,
  },
  stepLabel: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  stepDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  timeIcon: {
    fontSize: 32,
  },
  timeText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  timeSubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    ...Shadows.floating,
  },
  startButtonIcon: {
    fontSize: 32,
  },
  startButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
});
