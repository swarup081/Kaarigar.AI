// ============================================
// Kaarigar — Home Dashboard
// "Your Shop" overview — progress, recent products, quick CTA
// ============================================

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const network = useNetworkStatus();

  // TODO: Replace with real data from Zustand store / SQLite
  const artisan = {
    name: 'कारीगर',
    shopProgress: 30,
    productCount: 0,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Offline Banner */}
      {!network.isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📴 {t('common.offline')}</Text>
          <Text style={styles.offlineSubtext}>{t('common.offlineNote')}</Text>
        </View>
      )}

      {/* Greeting Card */}
      <View style={styles.greetingCard}>
        <Text style={styles.greeting}>
          {artisan.name && artisan.name.trim() !== '' && artisan.name !== 'कारीगर'
            ? t('home.greeting', { name: artisan.name })
            : t('home.greetingFallback', 'Namaste!')}
        </Text>

        {/* Shop Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {t('home.shopProgress', { percent: artisan.shopProgress })}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${artisan.shopProgress}%` }]}
            />
          </View>
        </View>
      </View>

      {/* Add Product CTA — the hero button */}
      <TouchableOpacity
        style={styles.addProductButton}
        onPress={() => router.push('/create/camera')}
        activeOpacity={0.8}
      >
        <Text style={styles.addProductIcon}>📸</Text>
        <View style={styles.addProductTextContainer}>
          <Text style={styles.addProductTitle}>{t('home.addProduct')}</Text>
          <Text style={styles.addProductSubtitle}>{t('create.step1')}</Text>
        </View>
        <Text style={styles.addProductArrow}>→</Text>
      </TouchableOpacity>

      {/* Recent Products or Empty State */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('home.recentProducts')}</Text>

        {artisan.productCount === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧶</Text>
            <Text style={styles.emptyText}>{t('home.noProducts')}</Text>
            <Text style={styles.emptySubtext}>{t('home.startAdding')}</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {/* Product cards will go here */}
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>{t('catalog.published')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>{t('catalog.draft')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>👁️</Text>
        </View>
      </View>
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
  offlineBanner: {
    backgroundColor: Colors.warning,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  offlineText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  offlineSubtext: {
    color: Colors.textOnPrimary,
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.xs,
    opacity: 0.9,
  },
  greetingCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  greeting: {
    color: Colors.textOnPrimary,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.lg,
  },
  progressContainer: {
    gap: Spacing.sm,
  },
  progressText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.sizes.md,
    opacity: 0.9,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.textOnPrimary,
    borderRadius: 4,
  },
  addProductButton: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    ...Shadows.card,
  },
  addProductIcon: {
    fontSize: 40,
    marginRight: Spacing.lg,
  },
  addProductTextContainer: {
    flex: 1,
  },
  addProductTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  addProductSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  addProductArrow: {
    fontSize: Typography.sizes.xxl,
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.subtle,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontSize: Typography.sizes.lg,
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.subtle,
  },
  statNumber: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
});
