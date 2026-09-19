import { Text } from 'react-native';

export function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

export const tabScreenOptions = (active: string) => ({
  headerShown: false,
  tabBarActiveTintColor: active,
  tabBarLabelStyle: { fontWeight: '700' as const, fontSize: 12 },
  tabBarStyle: { height: 64, paddingTop: 6 },
});
