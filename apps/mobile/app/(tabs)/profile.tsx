import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const network = useNetworkStatus();

  // TODO: Replace with real artisan data
  const artisan = {
    name: t('common.defaultName', 'कारीगर'),
    craft: 'बुनाई',
    region: 'वाराणसी',
    language: i18n.language,
  };

  const languages = [
    { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
    { code: 'bn', label: 'বাংলা', flag: '🇮🇳' },
  ];

  const menuItems = [
    { icon: 'edit-2', label: t('profile.editProfile', 'Edit Profile'), action: 'edit' },
    { icon: 'refresh-cw', label: t('profile.syncStatus', 'Sync Status'), action: 'sync', badge: network.isConnected ? 'check-circle' : 'wifi-off' },
    { icon: 'help-circle', label: t('profile.help', 'Help & Support'), action: 'help' },
    { icon: 'info', label: t('profile.about', 'About App'), action: 'about' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Tabs.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.iconBtnOutline}>
            <Feather name="settings" size={18} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardInner}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{artisan.name.charAt(0)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{artisan.name}</Text>
              <Text style={styles.profileCraft}>{artisan.craft} • {artisan.region}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Verified Artisan</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.language', 'Language')}</Text>
          <View style={styles.languageGrid}>
            {languages.map((lang) => {
              const isActive = i18n.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.languageButton, isActive && styles.languageButtonActive]}
                  onPress={() => i18n.changeLanguage(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[styles.languageLabel, isActive && styles.languageLabelActive]}>
                    {lang.label}
                  </Text>
                  {isActive && (
                    <View style={styles.activeCheck}>
                      <Feather name="check" size={12} color="#7C3AED" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.action}
                style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconWrapper}>
                  <Feather name={item.icon as any} size={18} color="#4B5563" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                
                {item.badge && (
                  <Feather 
                    name={item.badge as any} 
                    size={16} 
                    color={network.isConnected ? '#10B981' : '#F59E0B'} 
                    style={{ marginRight: 12 }}
                  />
                )}
                <Feather name="chevron-right" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Network Status */}
        <View style={[styles.statusCard, !network.isConnected && styles.statusCardOffline]}>
          <View style={[styles.statusDot, !network.isConnected && styles.statusDotOffline]} />
          <View>
            <Text style={styles.statusTitle}>
              {network.isConnected ? 'Online & Synced' : 'Offline Mode'}
            </Text>
            <Text style={styles.statusText}>
              {network.isConnected
                ? `Connection Quality: ${network.quality}`
                : t('common.offlineNote', 'Some features may be unavailable')}
            </Text>
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  iconBtnOutline: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    marginHorizontal: 16,
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  profileCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    borderWidth: 2,
    borderColor: '#E9D8FD',
  },
  avatarText: {
    fontFamily: 'serif',
    fontSize: 28,
    color: '#7C3AED',
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileCraft: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  languageButtonActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F9FAFB',
  },
  languageFlag: {
    fontSize: 18,
    marginRight: 10,
  },
  languageLabel: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  languageLabelActive: {
    color: '#111827',
    fontWeight: '700',
  },
  activeCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statusCardOffline: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginRight: 16,
  },
  statusDotOffline: {
    backgroundColor: '#EF4444',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 13,
    color: '#6B7280',
  },
});
