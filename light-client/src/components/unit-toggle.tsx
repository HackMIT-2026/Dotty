import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { C, R, font } from '@/constants/theme';
import { api, errorText } from '@/lib/api';
import { useStore } from '@/lib/store';
import type { Family } from '@/lib/types';
import { type GlucoseUnit, useGlucoseUnit } from '@/lib/units';

const UNITS: GlucoseUnit[] = ['mg/dL', 'mmol/L'];

/**
 * mg/dL | mmol/L switch for the whole family. Only parents see it: the server also rejects the change from a
 * child's account. The child's app picks the new unit up on its next sync (every 15 seconds).
 */
export function GlucoseUnitToggle() {
  const unit = useGlucoseUnit();
  const isParent = useStore((s) => s.session?.user.role === 'parent');
  const setGlucoseUnit = useStore((s) => s.setGlucoseUnit);
  const pushToast = useStore((s) => s.pushToast);
  const [saving, setSaving] = useState<GlucoseUnit | null>(null);

  if (!isParent) return null;

  async function choose(next: GlucoseUnit) {
    if (next === unit || saving) return;
    setSaving(next);
    try {
      await api<Family>('/families/settings', { method: 'PUT', body: { glucose_unit: next } });
      setGlucoseUnit(next);
      pushToast({ kind: 'info', text: `Glucose now shown in ${next}`, sub: 'Your child’s app switches automatically within 15 seconds.' });
    } catch (e) {
      pushToast({ kind: 'alert', text: 'Unit not changed', sub: errorText(e) });
    } finally {
      setSaving(null);
    }
  }

  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel="Glucose units">
      {UNITS.map((u) => {
        const on = u === unit;
        return (
          <Pressable
            key={u}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => choose(u)}
            style={[styles.option, on && styles.optionOn]}>
            {saving === u ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Text style={[styles.label, on && styles.labelOn]}>{u}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: C.line, borderRadius: R.pill, padding: 3 },
  option: { minWidth: 78, paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill, alignItems: 'center' },
  optionOn: { backgroundColor: C.card },
  label: { ...font('800'), fontSize: 14, color: C.inkSoft },
  labelOn: { color: C.primary },
});
