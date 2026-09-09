// ============================================
// Kaarigar — Auth Layout
// Language selection → Phone OTP → Profile setup
// ============================================

import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="language" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="setup-profile" />
    </Stack>
  );
}
