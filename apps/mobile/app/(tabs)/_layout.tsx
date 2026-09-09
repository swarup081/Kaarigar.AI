import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

function TabBarIcon({ icon, focused }: { icon: any; focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      <Feather 
        name={icon} 
        size={24} 
        color={focused ? '#7C3AED' : '#9CA3AF'}
      />
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
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="home" focused={focused} />,
        }}
      />
      
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Products',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="grid" focused={focused} />,
        }}
      />
      
      <Tabs.Screen
        name="create"
        options={{
          title: 'Add',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="plus-circle" focused={focused} />,
        }}
      />
      
      <Tabs.Screen
        name="history"
        options={{
          title: 'Channels',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="share-2" focused={focused} />,
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="user" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
