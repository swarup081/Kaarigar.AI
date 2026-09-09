// ============================================
// Kaarigar — OTP Verification Screen
// 6-digit OTP input with auto-fill
// ============================================

import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, BorderRadius, Shadows, TouchTargets } from '@/constants/theme';

let Haptics: any = null;
if (Platform.OS !== 'web') { try { Haptics = require('expo-haptics'); } catch (e) {} }

const OTP_LENGTH = 6;

export default function OTPScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) return;
    if (Haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsVerifying(true);

    try {
      // TODO: Verify OTP with Firebase
      // await confirmation.confirm(otp);

      if (Haptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(auth)/setup-profile');
    } catch (error) {
      console.error('OTP verification failed:', error);
      if (Haptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>{t('auth.enterOtp')}</Text>

        {/* OTP Input — visual boxes */}
        <TouchableOpacity
          style={styles.otpContainer}
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
        >
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.otpBox,
                i < otp.length && styles.otpBoxFilled,
                i === otp.length && styles.otpBoxActive,
              ]}
            >
              <Text style={styles.otpDigit}>
                {otp[i] ?? ''}
              </Text>
            </View>
          ))}
          {/* Hidden input for keyboard */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, OTP_LENGTH))}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoFocus
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
          />
        </TouchableOpacity>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, otp.length !== OTP_LENGTH && styles.verifyButtonDisabled]}
          onPress={handleVerify}
          disabled={otp.length !== OTP_LENGTH || isVerifying}
          activeOpacity={0.8}
        >
          <Text style={styles.verifyButtonText}>
            {isVerifying ? '...' : t('auth.verifyOtp')}
          </Text>
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity style={styles.resendButton}>
          <Text style={styles.resendText}>Didn't get OTP? Resend</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.xl, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 60, left: Spacing.xl },
  backButtonText: { fontSize: Typography.sizes.lg, color: Colors.primary, fontWeight: Typography.weights.medium },
  icon: { fontSize: 64, textAlign: 'center', marginBottom: Spacing.xl },
  title: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.text, textAlign: 'center', marginBottom: Spacing.xxl },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
    position: 'relative',
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: '#FFF3E0' },
  otpBoxActive: { borderColor: Colors.primary, borderWidth: 3 },
  otpDigit: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.text },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  verifyButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    minHeight: TouchTargets.minimum,
    justifyContent: 'center',
    ...Shadows.card,
  },
  verifyButtonDisabled: { backgroundColor: Colors.offline },
  verifyButtonText: { color: Colors.textOnPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  resendButton: { alignItems: 'center', marginTop: Spacing.xl },
  resendText: { fontSize: Typography.sizes.md, color: Colors.accent },
});
