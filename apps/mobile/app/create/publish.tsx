// ============================================
// Kaarigar — Publish Screen (Step 5)
// Channel selection + one-tap publish
// ============================================

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { CHANNELS, type ChannelConfig } from '@/constants/channels';

export default function PublishScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [selectedChannels, setSelectedChannels] = useState<string[]>(['storefront']);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const toggleChannel = (channelId: string) => {
    const channel = CHANNELS.find(c => c.id === channelId);
    if (!channel?.mvpReady) return;

    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    // TODO: Implement actual publishing logic
    setTimeout(() => {
      setIsPublishing(false);
      setIsPublished(true);
    }, 2000);
  };

  if (isPublished) {
    return (
      <View style={styles.successContainer}>
        <Feather name="check-circle" size={64} color="#10B981" style={{ marginBottom: 16 }} />
        <Text style={styles.successTitle}>{t('publish.published')}</Text>
        <Text style={styles.successSubtitle}>
          Published to {selectedChannels.length} channel{selectedChannels.length > 1 ? 's' : ''}
        </Text>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => router.replace('/(tabs)/catalog')}
        >
          <Text style={styles.viewButtonText}>{t('publish.viewStorefront')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => {/* TODO: WhatsApp share */}}
        >
          <Feather name="message-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.shareButtonText}>Share on WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addAnotherButton}
          onPress={() => router.replace('/create/camera')}
        >
          <Feather name="plus" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.addAnotherText}>Add another product</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Feather name="arrow-left" size={20} color={Colors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.backButton}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>5 / 5</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('publish.title')}</Text>
        <Text style={styles.subtitle}>{t('publish.selectChannels')}</Text>

        {/* Channel Cards */}
        {CHANNELS.map((channel) => (
          <TouchableOpacity
            key={channel.id}
            style={[
              styles.channelCard,
              selectedChannels.includes(channel.id) && styles.channelCardSelected,
              !channel.mvpReady && styles.channelCardDisabled,
            ]}
            onPress={() => toggleChannel(channel.id)}
            activeOpacity={0.7}
            disabled={!channel.mvpReady}
          >
            <Text style={styles.channelIcon}>{channel.icon}</Text>
            <View style={styles.channelContent}>
              <Text style={styles.channelName}>{channel.nameHi}</Text>
              <Text style={styles.channelNameEn}>{channel.nameEn}</Text>
              <Text style={styles.channelDesc}>{channel.description.hi}</Text>
            </View>
            <View style={styles.channelStatus}>
              {channel.mvpReady ? (
                selectedChannels.includes(channel.id) ? (
                  <View style={styles.checkmark}>
                    <Feather name="check" size={12} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.unchecked} />
                )
              ) : (
                <Text style={styles.comingSoonBadge}>{t('publish.comingSoon')}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Publish Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.publishButton,
            selectedChannels.length === 0 && styles.publishButtonDisabled,
            isPublishing && styles.publishButtonLoading,
          ]}
          onPress={handlePublish}
          disabled={selectedChannels.length === 0 || isPublishing}
          activeOpacity={0.8}
        >
          <Text style={styles.publishButtonText}>
            {isPublishing
              ? t('publish.publishing')
              : `${t('publish.publish')} (${selectedChannels.length})`}
          </Text>
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
  title: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.sizes.md, color: Colors.textLight, marginBottom: Spacing.xl },
  channelCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 2, borderColor: Colors.border, ...Shadows.subtle,
  },
  channelCardSelected: { borderColor: Colors.primary, backgroundColor: '#FFF3E0' },
  channelCardDisabled: { opacity: 0.5 },
  channelIcon: { fontSize: 36, marginRight: Spacing.lg },
  channelContent: { flex: 1 },
  channelName: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text },
  channelNameEn: { fontSize: Typography.sizes.sm, color: Colors.textLight, marginTop: 2 },
  channelDesc: { fontSize: Typography.sizes.sm, color: Colors.textLight, marginTop: Spacing.xs },
  channelStatus: { marginLeft: Spacing.md },
  checkmark: {},
  checkmarkText: { fontSize: 24 },
  unchecked: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border },
  comingSoonBadge: {
    fontSize: Typography.sizes.xs, color: Colors.warning,
    fontWeight: Typography.weights.semibold, backgroundColor: '#FFF3E0',
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm,
  },
  bottomBar: { padding: Spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  publishButton: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, alignItems: 'center', ...Shadows.floating,
  },
  publishButtonDisabled: { backgroundColor: Colors.offline, ...Shadows.subtle },
  publishButtonLoading: { opacity: 0.7 },
  publishButtonText: { color: Colors.textOnPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },

  // Success state
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl, backgroundColor: Colors.background },
  successIcon: { fontSize: 96, marginBottom: Spacing.xl },
  successTitle: { fontSize: Typography.sizes.xxxl, fontWeight: Typography.weights.bold, color: Colors.secondary, marginBottom: Spacing.sm },
  successSubtitle: { fontSize: Typography.sizes.lg, color: Colors.textLight, marginBottom: Spacing.xxxl },
  viewButton: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg, width: '100%', alignItems: 'center',
  },
  viewButtonText: { color: Colors.textOnPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.whatsapp,
    borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.lg,
    width: '100%', justifyContent: 'center',
  },
  shareButtonIcon: { fontSize: 20 },
  shareButtonText: { color: Colors.textOnPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  addAnotherButton: { marginTop: Spacing.lg },
  addAnotherText: { color: Colors.accent, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold },
});
