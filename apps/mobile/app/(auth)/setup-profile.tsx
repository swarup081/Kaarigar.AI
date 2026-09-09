import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { CRAFT_CATEGORIES } from '@/constants/craftCategories';

let Haptics: any = null;
if (Platform.OS !== 'web') { try { Haptics = require('expo-haptics'); } catch (e) {} }

export default function SetupProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [selectedCraft, setSelectedCraft] = useState<string | null>(null);

  const isValid = name.trim().length > 0 && selectedCraft !== null;

  const handleComplete = async () => {
    if (!isValid) return;
    if (Haptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // TODO: Save to Supabase (Phase 4)
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <Feather name="user" size={28} color="#7C3AED" />
            </View>
            <Text style={styles.title}>{t('auth.setupProfile', 'Complete Profile')}</Text>
            <Text style={styles.subtitle}>Tell us a bit about yourself and your craft to get started.</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('auth.nameLabel', 'Your Full Name')}</Text>
            <View style={styles.inputContainer}>
              <Feather name="user" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('auth.namePlaceholder', 'e.g. Ramesh Kumar')}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('auth.regionLabel', 'City / Village')}</Text>
            <View style={styles.inputContainer}>
              <Feather name="map-pin" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={region}
                onChangeText={setRegion}
                placeholder={t('auth.regionPlaceholder', 'e.g. Varanasi')}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('auth.craftLabel', 'Primary Craft')}</Text>
            <View style={styles.craftGrid}>
              {CRAFT_CATEGORIES.map((craft) => (
                <TouchableOpacity
                  key={craft.id}
                  style={[
                    styles.craftCard,
                    selectedCraft === craft.id && styles.craftCardActive
                  ]}
                  onPress={() => {
                    setSelectedCraft(craft.id);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.craftIcon}>{craft.icon}</Text>
                  <Text style={[
                    styles.craftLabel,
                    selectedCraft === craft.id && styles.craftLabelActive
                  ]}>
                    {craft.labelEn}
                  </Text>
                  {selectedCraft === craft.id && (
                    <View style={styles.activeCheck}>
                      <Feather name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={!isValid}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{t('auth.completeProfile', 'Go to Store')}</Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" />
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
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
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    height: '100%',
  },
  craftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  craftCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  craftCardActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F9FAFB',
  },
  craftIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  craftLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
  },
  craftLabelActive: {
    color: '#111827',
    fontWeight: '700',
  },
  activeCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
