import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

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
      // TODO: Firebase Phone Auth implementation (Phase 4)
      
      // Simulate network request for now
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push('/(auth)/otp');
    } catch (error) {
      console.error(error);
      if (Haptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
              <Feather name="smartphone" size={28} color="#7C3AED" />
            </View>
            <Text style={styles.title}>{t('auth.enterPhone', 'Enter your mobile number')}</Text>
            <Text style={styles.subtitle}>{t('auth.phoneSub', 'We will send you a 6-digit verification code.')}</Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.flag}>IN</Text>
              <Text style={styles.countryText}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="99999 99999"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleSendOTP}
            disabled={!isValid || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>{t('auth.sendOtp', 'Get OTP')}</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" />
              </>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    height: 60,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    marginRight: 16,
  },
  flag: {
    fontSize: 20,
    marginRight: 8,
  },
  countryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    height: '100%',
  },
  button: {
    backgroundColor: '#000000',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
