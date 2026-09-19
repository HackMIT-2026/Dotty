import { Stack } from 'expo-router';

import { C } from '@/constants/theme';

// Without this the stack opens its alphabetically-first screen (join) after logging out.
export const unstable_settings = { initialRouteName: 'login' };

export default function AuthLayout() {
  return (
    <Stack initialRouteName="login" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="join" />
    </Stack>
  );
}
