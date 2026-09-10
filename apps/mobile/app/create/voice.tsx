// ============================================
// Kaarigar — Voice Recording Screen (Step 2)
// Big pulsing mic button, live duration, playback preview.
// The recording is the raw material for the whole listing, so
// this screen is deliberately forgiving: re-record as often as
// you like, nothing is sent until you press continue.
// ============================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { Colors, Typography, Spacing, BorderRadius, Shadows, TouchTargets, Animation } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { useActiveListingStore } from '@/stores';

let Haptics: any = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch { }
}

/** The service rejects anything under three seconds, so stop the artisan here. */
const MIN_SECONDS = 3;
/** Five minutes is the service ceiling. Warn well before it. */
const MAX_SECONDS = 300;

export default function VoiceScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const storedUri = useActiveListingStore((s) => s.voiceRecordingUri);
  const storedDuration = useActiveListingStore((s) => s.voiceDurationSeconds);
  const setVoiceRecording = useActiveListingStore((s) => s.setVoiceRecording);
  const clearVoiceRecording = useActiveListingStore((s) => s.clearVoiceRecording);

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  const player = useAudioPlayer(storedUri ? { uri: storedUri } : null);
  const playerStatus = useAudioPlayerStatus(player);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const isRecording = recorderState.isRecording;
  const liveSeconds = Math.floor((recorderState.durationMillis ?? 0) / 1000);
  const seconds = isRecording ? liveSeconds : storedDuration;

  // ─── Permission and audio mode ─────────────

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        setPermissionGranted(false);
        return;
      }
      const { granted } = await requestRecordingPermissionsAsync();
      setPermissionGranted(granted);
      if (granted) {
        // playsInSilentMode matters: without it, playback of the artisan's own
        // recording is silent on an iPhone with the ringer switch flipped.
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      }
    })();
  }, []);

  // ─── Pulse while recording ─────────────────

  useEffect(() => {
    if (isRecording) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: Animation.pulse / 2, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: Animation.pulse / 2, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => loopRef.current?.stop();
  }, [isRecording, pulseAnim]);

  // ─── Recording ─────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      if (player.playing) player.pause();
      await recorder.prepareToRecordAsync();
      recorder.record();
      Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('[voice] start failed', error);
      Alert.alert(t('voice.title'), t('voice.errors.startFailed'));
    }
  }, [recorder, player, t]);

  const stopRecording = useCallback(async () => {
    setIsStopping(true);
    const captured = liveSeconds;
    try {
      await recorder.stop();
      Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const uri = recorder.uri;
      if (!uri) throw new Error('recorder returned no file');

      if (captured < MIN_SECONDS) {
        // Rejecting here is far kinder than letting the server reject it
        // after a slow upload on a weak connection.
        Alert.alert(t('voice.errors.tooShortTitle'), t('voice.errors.tooShort'));
        clearVoiceRecording();
        return;
      }

      setVoiceRecording(uri, captured);
    } catch (error) {
      console.warn('[voice] stop failed', error);
      Alert.alert(t('voice.title'), t('voice.errors.stopFailed'));
    } finally {
      setIsStopping(false);
    }
  }, [recorder, liveSeconds, setVoiceRecording, clearVoiceRecording, t]);

  // Hard stop at the service ceiling rather than uploading a doomed file.
  useEffect(() => {
    if (isRecording && liveSeconds >= MAX_SECONDS) void stopRecording();
  }, [isRecording, liveSeconds, stopRecording]);

  const togglePlayback = useCallback(() => {
    if (playerStatus.playing) {
      player.pause();
    } else {
      player.seekTo(0);
      player.play();
    }
  }, [player, playerStatus.playing]);

  const reRecord = useCallback(() => {
    if (player.playing) player.pause();
    clearVoiceRecording();
  }, [player, clearVoiceRecording]);

  const formatDuration = (value: number) => {
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── States ────────────────────────────────

  const hasRecording = Boolean(storedUri) && !isRecording;

  if (permissionGranted === false) {
    return (
      <View style={styles.permissionContainer}>
        <Feather name="mic-off" size={56} color={Colors.textLight} />
        <Text style={styles.permissionText}>
          {Platform.OS === 'web' ? t('voice.errors.webUnsupported') : t('voice.errors.noPermission')}
        </Text>
        <TouchableOpacity style={styles.secondaryAction} onPress={() => router.back()}>
          <Text style={styles.secondaryActionText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Feather name="arrow-left" size={20} color={Colors.textOnPrimary} />
          <Text style={styles.backButton}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>2 / 5</Text>
      </View>

      <View style={styles.instructionContainer}>
        <Text style={styles.title}>{t('voice.title')}</Text>
        <Text style={styles.instruction}>{t('voice.instruction')}</Text>
      </View>

      {/* Prompts, so the artisan knows what is worth saying. The listing is
          only as good as what gets spoken, and most people need a nudge. */}
      {!isRecording && !hasRecording && (
        <View style={styles.promptCard}>
          <Text style={styles.promptTitle}>{t('voice.promptTitle')}</Text>
          {['material', 'technique', 'size', 'occasion'].map((key) => (
            <View key={key} style={styles.promptRow}>
              <Feather name="check" size={14} color={Colors.secondary} />
              <Text style={styles.promptText}>{t(`voice.prompts.${key}`)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.statusArea}>
        {isRecording && (
          <>
            <View style={styles.recordingDot} />
            <Text style={styles.durationText}>{formatDuration(seconds)}</Text>
            <Text style={styles.statusLabel}>{t('voice.recording')}</Text>
            {seconds < MIN_SECONDS && (
              <Text style={styles.hintText}>{t('voice.keepGoing')}</Text>
            )}
          </>
        )}

        {hasRecording && (
          <>
            <Feather name="check-circle" size={40} color={Colors.secondary} />
            <Text style={styles.durationText}>{formatDuration(seconds)}</Text>
            <Text style={styles.statusLabel}>{t('voice.saved')}</Text>
          </>
        )}
      </View>

      {/* Mic button */}
      <View style={styles.micArea}>
        {!hasRecording && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.micButton, isRecording && styles.micButtonRecording]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isStopping || permissionGranted === null}
              activeOpacity={0.8}
            >
              <Feather name={isRecording ? 'square' : 'mic'} size={44} color={Colors.textOnPrimary} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {hasRecording && (
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback} activeOpacity={0.8}>
            <Feather name={playerStatus.playing ? 'pause' : 'play'} size={36} color={Colors.primary} />
            <Text style={styles.playButtonText}>{t('voice.playback')}</Text>
          </TouchableOpacity>
        )}

        {!hasRecording && (
          <Text style={styles.micHint}>
            {isRecording ? t('voice.tapToStop') : t('voice.tapToRecord')}
          </Text>
        )}
      </View>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        {hasRecording ? (
          <>
            <TouchableOpacity style={styles.secondaryAction} onPress={reRecord}>
              <Feather name="rotate-ccw" size={18} color={Colors.textLight} />
              <Text style={styles.secondaryActionText}>{t('voice.reRecord')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={() => router.push('/create/review')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionText}>{t('voice.useRecording')}</Text>
              <Feather name="arrow-right" size={20} color={Colors.textOnPrimary} />
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.bottomHint}>{t('voice.bottomHint')}</Text>
        )}
      </View>
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

  instructionContainer: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  title: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.text },
  instruction: { fontSize: Typography.sizes.md, color: Colors.textLight, marginTop: Spacing.xs },

  promptCard: {
    margin: Spacing.xl, marginTop: Spacing.lg, padding: Spacing.lg,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, ...Shadows.subtle,
  },
  promptTitle: {
    fontSize: Typography.sizes.sm, color: Colors.textLight, marginBottom: Spacing.sm,
    fontWeight: Typography.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 3 },
  promptText: { fontSize: Typography.sizes.md, color: Colors.text, flex: 1 },

  statusArea: { alignItems: 'center', justifyContent: 'center', minHeight: 130, gap: Spacing.xs },
  recordingDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.error },
  durationText: {
    fontSize: Typography.sizes.xxxl, fontWeight: Typography.weights.bold,
    color: Colors.text, fontVariant: ['tabular-nums'],
  },
  statusLabel: { fontSize: Typography.sizes.md, color: Colors.textLight },
  hintText: { fontSize: Typography.sizes.sm, color: Colors.warning, marginTop: Spacing.xs },

  micArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  micButton: {
    width: TouchTargets.voiceButton + 40, height: TouchTargets.voiceButton + 40,
    borderRadius: (TouchTargets.voiceButton + 40) / 2, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', ...Shadows.floating,
  },
  micButtonRecording: { backgroundColor: Colors.error },
  micHint: { fontSize: Typography.sizes.lg, color: Colors.textLight },
  playButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full, borderWidth: 2, borderColor: Colors.primary,
  },
  playButtonText: { fontSize: Typography.sizes.lg, color: Colors.primary, fontWeight: Typography.weights.semibold },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  bottomHint: { flex: 1, textAlign: 'center', fontSize: Typography.sizes.sm, color: Colors.textLight },
  secondaryAction: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg,
  },
  secondaryActionText: { fontSize: Typography.sizes.md, color: Colors.textLight },
  primaryAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.card,
  },
  primaryActionText: { color: Colors.textOnPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },

  permissionContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, padding: Spacing.xxxl, gap: Spacing.lg,
  },
  permissionText: { fontSize: Typography.sizes.lg, color: Colors.text, textAlign: 'center', lineHeight: 28 },
});
