// ============================================
// Kaarigar — Channels Tab
// Manage platform listings (ONDC, WhatsApp)
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, BorderRadius, TouchTargets } from '@/constants/theme';

export default function ChannelsScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Channels</Text>
      <Text style={styles.subtext}>Manage where your products are listed</Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* WhatsApp Channel */}
        <TouchableOpacity style={styles.card} activeOpacity={0.8}>
          <Text style={styles.cardIcon}>💬</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>WhatsApp Catalog</Text>
            <Text style={styles.cardDesc}>Share products directly via WhatsApp</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: Colors.secondary }]}>
            <Text style={styles.badgeText}>Share</Text>
          </View>
        </TouchableOpacity>

        {/* ONDC Channel */}
        <View style={[styles.card, styles.cardDisabled]}>
          <Text style={styles.cardIcon}>🛒</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>ONDC Network</Text>
            <Text style={styles.cardDesc}>Sell to buyers across India</Text>
          </View>
          <View style={styles.badgeDisabled}>
            <Text style={styles.badgeTextDisabled}>Coming Soon</Text>
          </View>
        </View>

        {/* Global Export Channel */}
        <View style={[styles.card, styles.cardDisabled]}>
          <Text style={styles.cardIcon}>🌍</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Global Export</Text>
            <Text style={styles.cardDesc}>Connect with international buyers</Text>
          </View>
          <View style={styles.badgeDisabled}>
            <Text style={styles.badgeTextDisabled}>Coming Soon</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Spacing.xxl,
  },
  header: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    marginBottom: Spacing.xs,
  },
  subtext: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  scrollContent: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.surfaceElevated,
  },
  cardIcon: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  cardDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
  },
  badgeDisabled: {
    backgroundColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
  },
  badgeText: {
    color: Colors.surface,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.sm,
  },
  badgeTextDisabled: {
    color: Colors.textLight,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.sm,
  },
});
