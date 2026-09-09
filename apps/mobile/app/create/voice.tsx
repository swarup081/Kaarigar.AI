// ============================================
// Kaarigar — Voice Recording Screen
// Big pulsing mic button, waveform display
// "Describe your product in your language"
// ============================================

import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system';
import { Colors, Typography, Spacing, BorderRadius, Shadows, TouchTargets, Animation } from '@/constants/theme';

// Safe import for native-only modules
let Haptics: any = null;
if (Platform.OS !== 'web') {
  try { Haptics = require('expo-haptics'); } catch (e) {}
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'playing';

export default function VoiceScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation for recording state
  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: Animation.pulse / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: Animation.pulse / 2,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // TODO: Replace with actual expo-audio recording implementation
      // For now, simulate recording state
      if (Haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setState('recording');
      setDuration(0);
      startPulse();

      // Timer for duration display
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [startPulse]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      if (Haptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      stopPulse();

      // TODO: Replace with actual expo-audio stop + save
      const mockUri = `${FileSystem.documentDirectory}recordings/voice_${Date.now()}.m4a`;
      setRecordingUri(mockUri);
      setState('recorded');

    } catch (error) {
      console.error('Failed to stop recording:', error);
      setState('idle');
    }
  }, [stopPulse]);

  // Re-record
  const reRecord = useCallback(() => {
    setRecordingUri(null);
    setDuration(0);
    setState('idle');
  }, []);

  // Use this recording and proceed
  const useRecording = useCallback(() => {
    // TODO: Store recording URI in Zustand/context
    router.push('/create/review');
  }, [router]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>2 / 5</Text>
      </View>

      {/* Instruction */}
      <View style={styles.instructionContainer}>
        <Text style={styles.title}>{t('voice.title')}</Text>
        <Text style={styles.instruction}>{t('voice.instruction')}</Text>
      </View>

      {/* Waveform / Status Area */}
      <View style={styles.waveformContainer}>
        {state === 'recording' && (
          <View style={styles.waveform}>
            {/* Simulated waveform bars */}
            {Array.from({ length: 20 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: Math.random() * 40 + 10,
                    backgroundColor: Colors.primary,
                    opacity: 0.5 + Math.random() * 0.5,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {state === 'recorded' && (
          <View style={styles.recordedInfo}>
            <Text style={styles.recordedIcon}>✅</Text>
            <Text style={styles.recordedText}>
              {formatDuration(duration)} recorded
            </Text>
          </View>
        )}

        {/* Duration Display */}
        {(state === 'recording' || state === 'recorded') && (
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
        )}
      </View>

      {/* Mic Button */}
      <View style={styles.micContainer}>
        {state === 'idle' && (
          <>
            <Animated.View style={[styles.micButtonWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <TouchableOpacity
                style={styles.micButton}
                onPress={startRecording}
                activeOpacity={0.7}
              >
                <Text style={styles.micIcon}>🎤</Text>
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.micHint}>{t('voice.holdToRecord')}</Text>
          </>
        )}

        {state === 'recording' && (
          <>
            <Animated.View style={[styles.micButtonWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <TouchableOpacity
                style={[styles.micButton, styles.micButtonRecording]}
                onPress={stopRecording}
                activeOpacity={0.7}
              >
                <Text style={styles.micIcon}>⏹️</Text>
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.micHintRecording}>{t('voice.tapToStop')}</Text>
          </>
        )}

        {state === 'recorded' && (
          <View style={styles.actionButtons}>
            {/* Play button */}
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
              <Text style={styles.actionButtonIcon}>▶️</Text>
              <Text style={styles.actionButtonText}>{t('voice.playback')}</Text>
            </TouchableOpacity>

            {/* Re-record */}
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonOutline]}
              onPress={reRecord}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonIcon}>🔄</Text>
              <Text style={[styles.actionButtonText, styles.actionButtonTextOutline]}>
                {t('voice.reRecord')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom: Use Recording / Next */}
      {state === 'recorded' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={useRecording}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>{t('voice.useRecording')}</Text>
            <Text style={styles.nextButtonArrow}>→</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
  backButton: {
    color: Colors.textOnPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
  stepIndicator: {
    color: Colors.textOnPrimary,
    fontSize: Typography.sizes.md,
    opacity: 0.8,
  },
  instructionContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  instruction: {
    fontSize: Typography.sizes.lg,
    color: Colors.textLight,
    textAlign: 'center',
  },
  waveformContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 60,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  recordedInfo: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  recordedIcon: {
    fontSize: 48,
  },
  recordedText: {
    fontSize: Typography.sizes.lg,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  duration: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  micContainer: {
    alignItems: 'center',
    paddingBottom: Spacing.xxxl,
  },
  micButtonWrapper: {
    marginBottom: Spacing.lg,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.floating,
  },
  micButtonRecording: {
    backgroundColor: Colors.error,
  },
  micIcon: {
    fontSize: 44,
  },
  micHint: {
    fontSize: Typography.sizes.lg,
    color: Colors.textLight,
    textAlign: 'center',
  },
  micHintRecording: {
    fontSize: Typography.sizes.lg,
    color: Colors.error,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  actionButtonIcon: {
    fontSize: 20,
  },
  actionButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  actionButtonTextOutline: {
    color: Colors.primary,
  },
  bottomBar: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextButton: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    ...Shadows.card,
  },
  nextButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  nextButtonArrow: {
    color: Colors.textOnPrimary,
    fontSize: Typography.sizes.xl,
  },
});
