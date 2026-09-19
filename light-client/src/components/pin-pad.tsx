import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, R, S, font } from '@/constants/theme';

import { Icon } from './icon';

export const PIN_LENGTH = 4;

/** Big number pad for a child's PIN: four digits, no keyboard, no letters to spell. */
export function PinPad({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const press = (k: string) => {
    if (k === 'del') return onChange(value.slice(0, -1));
    if (value.length < PIN_LENGTH) onChange(value + k);
  };

  return (
    <View style={{ gap: S.md }}>
      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View key={i} style={[styles.dot, i < value.length && styles.dotOn]} />
        ))}
      </View>
      <View style={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) =>
          k === '' ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={i}
              onPress={() => press(k)}
              accessibilityLabel={k === 'del' ? 'Delete' : k}
              style={({ pressed }) => [styles.key, styles.keyOn, pressed && { backgroundColor: C.primarySoft }]}>
              {k === 'del' ? <Icon name="backspace-outline" size={26} color={C.ink} /> : <Text style={styles.keyText}>{k}</Text>}
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: S.md },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.line, backgroundColor: C.card },
  dotOn: { backgroundColor: C.primary, borderColor: C.primary },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, justifyContent: 'center' },
  key: { width: '30%', height: 58, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  keyOn: { backgroundColor: C.bg, borderWidth: 2, borderColor: C.line },
  keyText: { ...font('800'), fontSize: 26, color: C.ink },
});
