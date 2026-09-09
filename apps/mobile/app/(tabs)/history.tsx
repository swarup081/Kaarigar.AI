import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Feather, FontAwesome } from '@expo/vector-icons';

export default function ChannelsScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Channels</Text>
        <Text style={styles.subtitle}>Manage where your products are listed</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* WhatsApp Channel */}
        <TouchableOpacity style={styles.channelCard} activeOpacity={0.7}>
          <View style={[styles.iconWrapper, { backgroundColor: '#ECFDF5' }]}>
            <FontAwesome name="whatsapp" size={28} color="#10B981" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>WhatsApp Catalog</Text>
            <Text style={styles.cardDesc}>Share your products directly with customers via WhatsApp.</Text>
          </View>
          <View style={styles.actionPill}>
            <Text style={styles.actionPillText}>Share</Text>
          </View>
        </TouchableOpacity>

        {/* ONDC Channel */}
        <View style={[styles.channelCard, styles.channelCardDisabled]}>
          <View style={[styles.iconWrapper, { backgroundColor: '#EFF6FF' }]}>
            <Feather name="shopping-cart" size={24} color="#3B82F6" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>ONDC Network</Text>
            <Text style={styles.cardDesc}>Sell to millions of buyers across India on the open network.</Text>
          </View>
          <View style={[styles.actionPill, styles.actionPillDisabled]}>
            <Text style={styles.actionPillTextDisabled}>Coming Soon</Text>
          </View>
        </View>

        {/* Export Channel */}
        <View style={[styles.channelCard, styles.channelCardDisabled]}>
          <View style={[styles.iconWrapper, { backgroundColor: '#FFF7ED' }]}>
            <Feather name="globe" size={24} color="#F97316" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Global Export</Text>
            <Text style={styles.cardDesc}>Connect with international buyers and manage bulk orders.</Text>
          </View>
          <View style={[styles.actionPill, styles.actionPillDisabled]}>
            <Text style={styles.actionPillTextDisabled}>Coming Soon</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  scrollContent: {
    padding: 24,
    gap: 16,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  channelCardDisabled: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  actionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#10B981',
    borderRadius: 20,
  },
  actionPillDisabled: {
    backgroundColor: '#E5E7EB',
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionPillTextDisabled: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
});
