// ============================================
// Kaarigar — Phone Number Entry
// Firebase Phone Auth — OTP-based login
// ============================================

import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, BorderRadius, Shadows, TouchTargets } from '@/constants/theme';

let Haptics: any = null;
if (Platform.OS !== 'web') { try { Haptics = require('expo-haptics'); } catch (e) {} }

export default function PhoneScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isValid = phone.length === 10 && /^\d+$/.test(phone);

  const handleSendOTP = async () => {
    if (!isValid) return;
    if (Haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      // TODO: Implement Firebase Phone Auth
      // const confirmation = await auth().signInWithPhoneNumber(`+91${phone}`);
      // Store confirmation in context/zustand

      // For now, navigate to OTP screen
      router.push('/(auth)/otp');
    } catch (error) {
      console.error('Failed to send OTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </TouchableOpacity>

        {/* Icon */}
        <Text style={styles.icon}>📱</Text>

        {/* Title */}
        <Text style={styles.title}>{t('auth.enterPhone')}</Text>

        {/* Phone Input */}
        <View style={styles.phoneInputContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.countryFlag}>🇮🇳</Text>
            <Text style={styles.countryCodeText}>+91</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210"
            placeholderTextColor={Colors.textLight}
            keyboardType="phone-pad"
            maxLength={10}
            autoFocus
          />
        </View>

        {/* Send OTP Button */}
        <TouchableOpacity
          style={[styles.sendButton, !isValid && styles.sendButtonDisabled]}
          onPress={handleSendOTP}
          disabled={!isValid || isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.sendButtonText}>
            {isLoading ? '...' : t('auth.sendOtp')}
          </Text>
        </TouchableOpacity>

        {/* Subtle note */}
        <Text style={styles.note}>
          We'll send a one-time code to verify your number
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: Spacing.xl,
  },
  backButtonText: {
    fontSize: Typography.sizes.lg,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  icon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryCodeText: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.border,
    letterSpacing: 2,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    minHeight: TouchTargets.minimum,
    justifyContent: 'center',
    ...Shadows.card,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.offline,
  },
  sendButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  note: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
