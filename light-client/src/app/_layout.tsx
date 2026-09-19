import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
// Per-weight imports so only the 4 weights we use are bundled (the package root pulls in all 18).
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { Nunito_900Black } from '@expo-google-fonts/nunito/900Black';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/toast-host';
import { C } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { startSyncLoop } from '@/lib/sync';

/** Wait for the offline cache to load so a signed-in user never flashes the login screen. */
function useHydrated() {
  const [ready, setReady] = useState(useStore.persist.hasHydrated());
  useEffect(() => {
    if (useStore.persist.hasHydrated()) setReady(true);
    return useStore.persist.onFinishHydration(() => setReady(true));
  }, []);
  return ready;
}

export default function RootLayout() {
  const hydrated = useHydrated();
  // Bundled with the app, so they load offline too. If a font fails, render anyway with the system font.
  const [fontsLoaded, fontError] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    ...MaterialCommunityIcons.font,
  });
  const ready = hydrated && (fontsLoaded || !!fontError);
  const role = useStore((s) => s.session?.user.role);
  const signedIn = role === 'child' || role === 'parent';

  useEffect(() => {
    if (!signedIn) return;
    return startSyncLoop();
  }, [signedIn]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="auth" />
          </Stack.Protected>
          <Stack.Protected guard={role === 'child'}>
            <Stack.Screen name="child" />
          </Stack.Protected>
          <Stack.Protected guard={role === 'parent'}>
            <Stack.Screen name="parent" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="settings" options={{ presentation: 'modal', headerShown: true, title: 'Settings' }} />
          </Stack.Protected>
        </Stack>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
