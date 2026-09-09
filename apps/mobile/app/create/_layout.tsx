// ============================================
// Kaarigar — Create Flow Layout
// Wraps the 5-step listing creation flow
// ============================================

import { Stack } from 'expo-router';
import { Colors, Typography } from '@/constants/theme';

export default function CreateLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
        headerTitleStyle: { fontWeight: '600', fontSize: Typography.sizes.xl },
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="camera" />
      <Stack.Screen name="voice" />
      <Stack.Screen name="review" />
      <Stack.Screen name="pricing" />
      <Stack.Screen name="publish" />
    </Stack>
  );
}
