import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

let Haptics: any = null;
if (Platform.OS !== 'web') { try { Haptics = require('expo-haptics'); } catch (e) {} }

const OTP_LENGTH = 6;

export default function OTPScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isValid = otp.length === OTP_LENGTH && /^\d+$/.test(otp);

  useEffect(() => {
    // Auto-verify when OTP is complete
    if (isValid) {
      handleVerify();
    }
  }, [otp]);

  const handleVerify = async () => {
    if (!isValid) return;
    if (Haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      // TODO: Firebase Phone Auth confirm (Phase 4)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (Haptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Determine if new user -> setup profile, else -> home
      const isNewUser = true; 
      if (isNewUser) {
        router.push('/(auth)/setup-profile');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error(error);
      if (Haptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setOtp('');
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <Feather name="message-square" size={28} color="#7C3AED" />
            </View>
            <Text style={styles.title}>{t('auth.enterOtp', 'Verify your number')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.otpSub', 'We sent a 6-digit code to your phone.')}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              autoFocus
            />
            
            <View style={styles.otpGrid}>
              {[...Array(OTP_LENGTH)].map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.otpBox,
                    otp.length === i && styles.otpBoxActive,
                    otp.length > i && styles.otpBoxFilled,
                  ]}
                >
                  <Text style={styles.otpText}>
                    {otp[i] || ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={!isValid || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>{t('auth.verify', 'Verify & Continue')}</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resendButton}>
            <Text style={styles.resendText}>Didn't receive code? <Text style={styles.resendHighlight}>Resend</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  backButton: {
    padding: 16,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 40,
    position: 'relative',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 0.8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
  },
  otpBoxFilled: {
    borderColor: '#111827',
    backgroundColor: '#FFFFFF',
  },
  otpText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  button: {
    backgroundColor: '#000000',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    padding: 8,
  },
  resendText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendHighlight: {
    color: '#7C3AED',
    fontWeight: '600',
  },
});
