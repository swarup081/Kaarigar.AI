// ============================================
// Kaarigar — Profile Screen
// ============================================

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const network = useNetworkStatus();

  // TODO: Replace with real artisan data
  const artisan = {
    name: 'कारीगर',
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
    { icon: '✏️', label: t('profile.editProfile'), action: 'edit' },
    { icon: '🔄', label: t('profile.syncStatus'), action: 'sync', badge: network.isConnected ? '✅' : '📴' },
    { icon: '❓', label: t('profile.help'), action: 'help' },
    { icon: 'ℹ️', label: t('profile.about'), action: 'about' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {artisan.name.charAt(0)}
          </Text>
        </View>
        <Text style={styles.profileName}>{artisan.name}</Text>
        <Text style={styles.profileCraft}>{artisan.craft} • {artisan.region}</Text>
      </View>

      {/* Language Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
        <View style={styles.languageGrid}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageButton,
                i18n.language === lang.code && styles.languageButtonActive,
              ]}
              onPress={() => i18n.changeLanguage(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.languageFlag}>{lang.flag}</Text>
              <Text
                style={[
                  styles.languageLabel,
                  i18n.language === lang.code && styles.languageLabelActive,
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.action}
            style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            {item.badge && <Text style={styles.menuBadge}>{item.badge}</Text>}
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Network Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusIcon}>
          {network.isConnected ? '🟢' : '🔴'}
        </Text>
        <Text style={styles.statusText}>
          {network.isConnected
            ? `${t('common.synced')} (${network.quality})`
            : t('common.offline')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
  },
  profileCard: {
    alignItems: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  avatarText: {
    fontSize: Typography.sizes.xxxl,
    color: Colors.textOnPrimary,
    fontWeight: Typography.weights.bold,
  },
  profileName: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  profileCraft: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadows.subtle,
  },
  languageButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF3E0',
  },
  languageFlag: {
    fontSize: 20,
  },
  languageLabel: {
    fontSize: Typography.sizes.lg,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  languageLabelActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderRadius: 0,
  },
  menuIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    color: Colors.text,
  },
  menuBadge: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  menuArrow: {
    fontSize: Typography.sizes.lg,
    color: Colors.textLight,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  statusIcon: {
    fontSize: 16,
  },
  statusText: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },
});
