// ============================================
// Kaarigar — Catalog Screen
// Product grid with sharing options
// ============================================

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

type FilterTab = 'all' | 'draft' | 'published' | 'processing';

export default function CatalogScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // TODO: Replace with real data
  const products: unknown[] = [];
  const activeFilter: FilterTab = 'all';

  const shareOptions = [
    { icon: '🔗', label: t('catalog.shareAsLink'), action: 'link' },
    { icon: '📄', label: t('catalog.shareAsPdf'), action: 'pdf' },
    { icon: '🖼️', label: t('catalog.shareAsImage'), action: 'image' },
  ];

  return (
    <View style={styles.container}>
      {/* Share Options Bar */}
      <View style={styles.shareBar}>
        {shareOptions.map((option) => (
          <TouchableOpacity
            key={option.action}
            style={styles.shareButton}
            activeOpacity={0.7}
          >
            <Text style={styles.shareIcon}>{option.icon}</Text>
            <Text style={styles.shareLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'draft', 'published', 'processing'] as FilterTab[]).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter && styles.filterTabTextActive,
              ]}
            >
              {t(`catalog.${filter}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Product Grid or Empty State */}
      {products.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyText}>{t('catalog.emptyState')}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/create/camera')}
          >
            <Text style={styles.addButtonText}>➕ {t('home.addProduct')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.grid}
          renderItem={() => null /* TODO: ProductCard component */}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  shareBar: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  shareIcon: {
    fontSize: 16,
  },
  shareLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  filterRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    fontWeight: Typography.weights.medium,
  },
  filterTabTextActive: {
    color: Colors.textOnPrimary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.sizes.lg,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  addButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  grid: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
});
