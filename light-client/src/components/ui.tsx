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

import { BORDER, C, MAX_WIDTH, R, S, font, shadow } from '@/constants/theme';

import { Icon, type IconName } from './icon';

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
  h1: { ...font('900'), fontSize: 28, letterSpacing: -0.3 },
  h2: { ...font('800'), fontSize: 19 },
  body: { ...font('600'), fontSize: 16, lineHeight: 22 },
  small: { ...font('700'), fontSize: 13, lineHeight: 18 },
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
  /** Docked below the scrolling content (e.g. the shop's buy bar). */
  footer?: ReactNode;
}

export function Screen({ children, scroll = true, bleed, background = C.bg, refreshing, onRefresh, contentStyle, footer }: ScreenProps) {
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
      {footer}
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
  icon?: IconName;
  /** Custom leading element instead of an icon (e.g. the Dot coin). */
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const VARIANTS = {
  primary: { bg: C.primary, fg: C.ink, edge: C.primaryEdge },
  sun: { bg: C.sun, fg: C.ink, edge: C.sunEdge },
  mint: { bg: C.mint, fg: C.ink, edge: C.mintEdge },
  secondary: { bg: C.lavender, fg: C.ink, edge: C.lavenderEdge },
  ghost: { bg: 'transparent', fg: C.primaryDark, edge: null },
} as const;

/** Buttons sit on a thicker, darker bottom edge, like a little block, and press down into it. */
const EDGE = 4;

export function Button({ title, onPress, variant = 'primary', size = 'md', disabled, loading, icon, leading, style }: ButtonProps) {
  const v = VARIANTS[variant];
  const fontSize = size === 'lg' ? 19 : 16;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        size === 'lg' && styles.buttonLg,
        { backgroundColor: v.bg },
        v.edge && { borderBottomWidth: EDGE, borderBottomColor: v.edge },
        (disabled || loading) && { opacity: 0.5 },
        pressed && (v.edge ? { transform: [{ translateY: EDGE / 2 }], borderBottomWidth: EDGE / 2 } : { transform: [{ scale: 0.97 }] }),
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.buttonInner}>
          {leading ?? (icon ? <Icon name={icon} size={fontSize + 4} color={v.fg} /> : null)}
          <Text style={[t.body, font('800'), { color: v.fg, fontSize }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress: () => void; icon?: IconName }) {
  const fg = selected ? '#fff' : C.ink;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && { opacity: 0.8 }]}>
      {icon ? <Icon name={icon} size={17} color={selected ? '#fff' : C.primary} /> : null}
      <Text style={[t.small, { color: fg, fontSize: 14 }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Small>{label}</Small>
      <TextInput placeholderTextColor="#A9A5C4" autoCapitalize="none" {...props} style={[styles.input, style]} />
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

export function Pill({ children, bg = C.primarySoft, fg = C.primaryDark, icon }: { children: ReactNode; bg?: string; fg?: string; icon?: IconName }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={15} color={fg} /> : null}
      <Text style={[t.small, font('800'), { color: fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: S.md, gap: S.md, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingBottom: S.xl },
  card: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: BORDER, borderColor: C.line, padding: 20, gap: S.sm, ...shadow },
  button: { minHeight: 48, borderRadius: R.md, paddingHorizontal: S.lg, alignItems: 'center', justifyContent: 'center' },
  buttonLg: { minHeight: 64 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: R.pill,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.line,
  },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  input: {
    ...font('700'),
    fontSize: 17,
    color: C.ink,
    backgroundColor: C.card,
    borderWidth: BORDER,
    borderColor: C.line,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: 12,
  },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
});
