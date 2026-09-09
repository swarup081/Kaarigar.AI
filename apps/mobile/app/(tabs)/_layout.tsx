// ============================================
// Kaarigar — Tab Bar Layout
// Icon-heavy, minimal text, 4 tabs
// Designed for low-literacy users
// ============================================

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, TouchTargets } from '@/constants/theme';

function TabBarIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>{icon}</Text>
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hidden from tab bar
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          headerTitle: 'Kaarigar',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t('tabs.create'),
          headerTitle: t('create.newListing'),
          tabBarIcon: ({ focused }) => (
            <View style={styles.createButtonContainer}>
              <View style={styles.createButton}>
                <Text style={styles.createButtonIcon}>➕</Text>
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Channels',
          headerTitle: 'Channels',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="📢" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: t('tabs.catalog'),
          headerTitle: t('catalog.title'),
          tabBarIcon: ({ focused }) => <TabBarIcon icon="📦" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          headerTitle: t('profile.title'),
          tabBarIcon: ({ focused }) => <TabBarIcon icon="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    marginTop: 2,
  },
  tabIcon: {
    marginBottom: 0,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: TouchTargets.tabBarIcon,
    height: TouchTargets.tabBarIcon,
  },
  icon: {
    fontSize: 24,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
    fontSize: 28,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  createButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  createButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createButtonIcon: {
    fontSize: 28,
  },
});
