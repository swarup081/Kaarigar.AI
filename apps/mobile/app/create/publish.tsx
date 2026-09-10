// ============================================
// Kaarigar — Publish Screen (Step 5)
// Saves the listing to SQLite and queues the uploads.
//
// Saving never depends on the network. The artisan's work is safe
// the moment they press the button; the connection catches up.
// ============================================

import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { CHANNELS } from '@/constants/channels';
import { saveListing } from '@/services/offline/saveListing';
import { processSyncQueue } from '@/services/offline/syncService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useActiveListingStore, useAuthStore, useSyncStore } from '@/stores';
import { usePhotoStore } from '@/stores/imageStore';
import type { LanguageCode } from '@kaarigar/shared-types';

type Phase = 'choosing' | 'saving' | 'done';

export default function PublishScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const language = (i18n.language as LanguageCode) || 'hi';
  const network = useNetworkStatus();

  const profile = useAuthStore((s) => s.artisanProfile);
  const listing = useActiveListingStore((s) => s.listing);
  const transcript = useActiveListingStore((s) => s.transcript);
  const edits = useActiveListingStore((s) => s.listingEdits);
  const pricing = useActiveListingStore((s) => s.pricing);
  const finalPrice = useActiveListingStore((s) => s.finalPrice);
  const rawMaterialCost = useActiveListingStore((s) => s.rawMaterialCost);
  const laborHours = useActiveListingStore((s) => s.laborHours);
  const voiceUri = useActiveListingStore((s) => s.voiceRecordingUri);
  const resetListing = useActiveListingStore((s) => s.reset);

  const getUris = usePhotoStore((s) => s.getPublishableUris);
  const resetPhotos = usePhotoStore((s) => s.reset);
  const setPendingCount = useSyncStore((s) => s.setPendingCount);

  const available = useMemo(() => CHANNELS.filter((c) => c.mvpReady), []);
  const [selected, setSelected] = useState<string[]>(['storefront']);
  const [phase, setPhase] = useState<Phase>('choosing');
  const [queued, setQueued] = useState(0);

  const imageUris = useMemo(() => getUris(), [getUris]);
  const heroUri = imageUris[0];

  const toggle = (channelId: string) =>
    setSelected((current) =>
      current.includes(channelId)
        ? current.filter((c) => c !== channelId)
        : [...current, channelId]
    );

  const publish = useCallback(async () => {
    if (!listing) {
      Alert.alert(t('common.error'), t('publish.errors.noListing'));
      return;
    }

    setPhase('saving');
    try {
      const result = await saveListing({
        artisanId: profile?.id ?? 'local',
        language,
        listing,
        transcript,
        edits,
        pricing,
        finalPrice,
        rawMaterialCost,
        laborHours,
        imageUris,
        voiceUri,
        channels: selected,
      });

      setQueued(result.queuedUploads + 1);
      setPhase('done');

      // Try to drain the queue immediately, but never block on it. A failure
      // here is not a failure of the publish: the rows are already safe locally.
      if (network.canSync) {
        processSyncQueue()
          .then(({ synced, failed }) => {
            setPendingCount(Math.max(0, result.queuedUploads + 1 - synced));
            if (failed > 0) console.warn(`[publish] ${failed} sync operations failed`);
          })
          .catch((error) => console.warn('[publish] sync failed', error));
      } else {
        setPendingCount(result.queuedUploads + 1);
      }
    } catch (error) {
      console.warn('[publish] save failed', error);
      setPhase('choosing');
      Alert.alert(t('common.error'), t('publish.errors.saveFailed'));
    }
  }, [
    listing, profile, language, transcript, edits, pricing, finalPrice,
    rawMaterialCost, laborHours, imageUris, voiceUri, selected,
    network.canSync, setPendingCount, t,
  ]);

  const finish = useCallback(() => {
    resetListing();
    resetPhotos();
    router.replace('/(tabs)/catalog');
  }, [resetListing, resetPhotos, router]);

  // ─── Saved ─────────────────────────────────

  if (phase === 'done') {
    return (
      <View style={styles.centred}>
        <View style={styles.successCircle}>
          <Feather name="check" size={52} color={Colors.textOnPrimary} />
        </View>
        <Text style={styles.successTitle}>{t('publish.published')}</Text>

        <Text style={styles.successBody}>
          {network.isConnected
            ? t('publish.syncing', { count: queued })
            : t('publish.savedOffline', { count: queued })}
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={finish} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>{t('publish.viewCatalog')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Choosing ──────────────────────────────

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Feather name="arrow-left" size={20} color={Colors.textOnPrimary} />
          <Text style={styles.backButton}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>5 / 5</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* A last look at what is about to be published. */}
        <View style={styles.summaryCard}>
          {heroUri && <Image source={{ uri: heroUri }} style={styles.thumb} resizeMode="cover" />}
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle} numberOfLines={2}>
              {edits.title ?? listing?.title[language] ?? listing?.title.en ?? ''}
            </Text>
            {finalPrice ? (
              <Text style={styles.summaryPrice}>₹{Math.round(finalPrice).toLocaleString('en-IN')}</Text>
            ) : null}
            <Text style={styles.summaryMeta}>
              {t('publish.photoCount', { count: imageUris.length })}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{t('publish.selectChannels')}</Text>

        {available.map((channel) => {
          const isOn = selected.includes(channel.id);
          return (
            <TouchableOpacity
              key={channel.id}
              style={[styles.channel, isOn && styles.channelSelected]}
              onPress={() => toggle(channel.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.channelDot, { backgroundColor: channel.color }]} />
              <View style={styles.channelBody}>
                <Text style={styles.channelName}>
                  {language === 'hi' ? channel.nameHi : channel.nameEn}
                </Text>
                <Text style={styles.channelDesc}>
                  {language === 'hi' ? channel.description.hi : channel.description.en}
                </Text>
              </View>
              <Feather
                name={isOn ? 'check-circle' : 'circle'}
                size={24}
                color={isOn ? Colors.secondary : Colors.border}
              />
            </TouchableOpacity>
          );
        })}

        {/* Channels that need an integration we have not built yet. Showing
            them disabled is honest; hiding them would imply they do not exist. */}
        {CHANNELS.filter((c) => !c.mvpReady).map((channel) => (
          <View key={channel.id} style={[styles.channel, styles.channelDisabled]}>
            <View style={[styles.channelDot, { backgroundColor: Colors.offline }]} />
            <View style={styles.channelBody}>
              <Text style={styles.channelName}>
                {language === 'hi' ? channel.nameHi : channel.nameEn}
              </Text>
              <Text style={styles.channelDesc}>{t('publish.comingSoon')}</Text>
            </View>
          </View>
        ))}

        {!network.isConnected && (
          <View style={styles.noticeCard}>
            <Feather name="wifi-off" size={16} color={Colors.textLight} />
            <Text style={styles.noticeText}>{t('common.offlineNote')}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.primaryButton, selected.length === 0 && styles.buttonDisabled]}
          onPress={publish}
          disabled={selected.length === 0 || phase === 'saving'}
          activeOpacity={0.8}
        >
          {phase === 'saving' ? (
            <ActivityIndicator color={Colors.textOnPrimary} />
          ) : (
            <>
              <Feather name="upload-cloud" size={20} color={Colors.textOnPrimary} />
              <Text style={styles.primaryButtonText}>{t('publish.publish')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  title: {
    fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold,
    color: Colors.text, marginBottom: Spacing.md,
  },

  summaryCard: {
    flexDirection: 'row', gap: Spacing.lg, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.lg,
    marginBottom: Spacing.xl, ...Shadows.subtle,
  },
  thumb: { width: 76, height: 76, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceElevated },
  summaryText: { flex: 1, justifyContent: 'center' },
  summaryTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.text },
  summaryPrice: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary, marginTop: 2 },
  summaryMeta: { fontSize: Typography.sizes.sm, color: Colors.textLight, marginTop: 2 },

  channel: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 2, borderColor: 'transparent', ...Shadows.subtle,
  },
  channelSelected: { borderColor: Colors.secondary },
  channelDisabled: { opacity: 0.5 },
  channelDot: { width: 12, height: 12, borderRadius: 6 },
  channelBody: { flex: 1 },
  channelName: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold, color: Colors.text },
  channelDesc: { fontSize: Typography.sizes.sm, color: Colors.textLight, marginTop: 2, lineHeight: 18 },

  noticeCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, padding: Spacing.lg,
  },
  noticeText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textLight, lineHeight: 20 },

  successCircle: {
    width: 108, height: 108, borderRadius: 54, backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center', ...Shadows.floating,
  },
  successTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.text },
  successBody: { fontSize: Typography.sizes.md, color: Colors.textLight, textAlign: 'center', lineHeight: 24 },

  bottomBar: {
    padding: Spacing.lg, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, alignSelf: 'stretch', ...Shadows.card,
  },
  primaryButtonText: { color: Colors.textOnPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  buttonDisabled: { opacity: 0.4 },
});
