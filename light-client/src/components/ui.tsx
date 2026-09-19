import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, FONT, MAX_WIDTH, R, S, shadow } from '@/constants/theme';

// ---------- text ----------

type TextProps = { children: ReactNode; style?: StyleProp<TextStyle>; color?: string; numberOfLines?: number };

export const H1 = ({ children, style, color = C.ink }: TextProps) => (
  <Text style={[t.h1, { color }, style]}>{children}</Text>
);
export const H2 = ({ children, style, color = C.ink }: TextProps) => (
  <Text style={[t.h2, { color }, style]}>{children}</Text>
);
export const Body = ({ children, style, color = C.ink, numberOfLines }: TextProps) => (
  <Text numberOfLines={numberOfLines} style={[t.body, { color }, style]}>{children}</Text>
);
export const Small = ({ children, style, color = C.inkSoft, numberOfLines }: TextProps) => (
  <Text numberOfLines={numberOfLines} style={[t.small, { color }, style]}>{children}</Text>
);

const t = StyleSheet.create({
  h1: { fontFamily: FONT, fontSize: 28, fontWeight: '800', letterSpacing: -0.3 },
  h2: { fontFamily: FONT, fontSize: 19, fontWeight: '700' },
  body: { fontFamily: FONT, fontSize: 16, fontWeight: '500', lineHeight: 22 },
  small: { fontFamily: FONT, fontSize: 13, fontWeight: '600', lineHeight: 18 },
});

// ---------- layout ----------

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Fill the screen edge to edge (the child's Dotty scene). */
  bleed?: boolean;
  background?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll = true, bleed, background = C.bg, refreshing, onRefresh, contentStyle }: ScreenProps) {
  const inner = [styles.content, bleed && { padding: 0, maxWidth: undefined }, contentStyle];
  return (
    <SafeAreaView edges={bleed ? [] : ['top']} style={[styles.screen, { backgroundColor: background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={inner}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.primary} /> : undefined}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, tint }: { children: ReactNode; style?: StyleProp<ViewStyle>; tint?: string }) {
  return <View style={[styles.card, tint ? { backgroundColor: tint } : null, style]}>{children}</View>;
}

export const Row = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: S.sm }, style]}>{children}</View>
);

// ---------- controls ----------

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'sun' | 'mint' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  emoji?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANTS = {
  primary: { bg: C.primary, fg: '#fff' },
  sun: { bg: C.sun, fg: C.ink },
  mint: { bg: C.mint, fg: '#fff' },
  secondary: { bg: C.primarySoft, fg: C.primaryDark },
  ghost: { bg: 'transparent', fg: C.primaryDark },
} as const;

export function Button({ title, onPress, variant = 'primary', size = 'md', disabled, loading, emoji, style }: ButtonProps) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        size === 'lg' && styles.buttonLg,
        { backgroundColor: v.bg },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[t.body, { color: v.fg, fontWeight: '800', fontSize: size === 'lg' ? 19 : 16 }]}>
          {emoji ? `${emoji}  ` : ''}
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, emoji }: { label: string; selected?: boolean; onPress: () => void; emoji?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && { opacity: 0.8 }]}>
      <Text style={[t.small, { color: selected ? '#fff' : C.ink, fontSize: 14 }]}>
        {emoji ? `${emoji} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({ label, style, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Small>{label}</Small>
      <TextInput
        placeholderTextColor="#A9A5C4"
        autoCapitalize="none"
        {...props}
        style={[styles.input, style]}
      />
    </View>
  );
}

export function ProgressBar({ value, color = C.mint, height = 10 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: C.line, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

export function Pill({ children, bg = C.primarySoft, fg = C.primaryDark }: { children: ReactNode; bg?: string; fg?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[t.small, { color: fg, fontWeight: '800' }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: S.md, gap: S.md, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingBottom: S.xl },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: S.md, gap: S.sm, ...shadow },
  button: { minHeight: 48, borderRadius: R.pill, paddingHorizontal: S.lg, alignItems: 'center', justifyContent: 'center' },
  buttonLg: { minHeight: 60 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 2, borderColor: C.line },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  input: {
    fontFamily: FONT,
    fontSize: 17,
    fontWeight: '600',
    color: C.ink,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.line,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: 12,
  },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
});
