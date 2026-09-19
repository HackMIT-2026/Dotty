import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Body, Button, Card, Chip, Field, H1, H2, Row, Screen, Small } from '@/components/ui';
import { C, FONT, S } from '@/constants/theme';
import { FOODS } from '@/data/foods';
import { bgOf, lastReading, recentActivity } from '@/lib/derive';
import { hhmmOf, suggestDose } from '@/lib/dosing';
import { saveLog } from '@/lib/log-action';
import { useStore } from '@/lib/store';
import { timeAgo, useNow } from '@/lib/time';
import type { ActivityChoice } from '@/lib/types';

const FRESH_READING_MIN = 30;
const ACTIVITY_CHOICES: { id: 'auto' | ActivityChoice; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'none', label: 'None' },
  { id: 'light', label: 'Light' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'vigorous', label: 'Vigorous' },
];

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Body color={strong ? C.ink : C.inkSoft} style={{ flex: 1 }}>
        {label}
      </Body>
      <Body style={strong ? { fontWeight: '800' } : undefined}>{value}</Body>
    </Row>
  );
}

export default function DoseHelper() {
  const now = useNow();
  const plan = useStore((s) => s.plan);
  const events = useStore((s) => s.events);
  const clinician = useStore((s) => s.session?.family?.clinician?.name);
  const pushToast = useStore((s) => s.pushToast);

  const last = lastReading(events);
  const fresh = last && now - new Date(last.ts).getTime() <= FRESH_READING_MIN * 60_000 ? last : null;
  const [carbs, setCarbs] = useState('');
  const [bg, setBg] = useState('');
  const [activityChoice, setActivityChoice] = useState<'auto' | ActivityChoice>('auto');
  const [logMeal, setLogMeal] = useState(true);
  const [busy, setBusy] = useState(false);

  const bgValue = bg !== '' ? Number(bg) : fresh ? bgOf(fresh) : NaN;
  const carbsValue = carbs === '' ? 0 : Number(carbs);
  const detected = recentActivity(events, now);
  const activity: ActivityChoice = activityChoice === 'auto' ? (detected ?? 'none') : activityChoice;
  const inputsOk = !Number.isNaN(bgValue) && bgValue >= 20 && bgValue <= 600 && carbsValue >= 0 && carbsValue <= 300;
  const result = plan && inputsOk ? suggestDose(plan, carbsValue, bgValue, hhmmOf(new Date(now)), activity) : null;

  if (!plan) {
    return (
      <Screen>
        <H1>Dose helper</H1>
        <Card>
          <Body>The dose helper turns on once your care team sets up a treatment plan in the clinician portal.</Body>
        </Card>
      </Screen>
    );
  }

  async function confirm() {
    if (!result || result.blocked) return;
    setBusy(true);
    await saveLog('bolus', {
      units: result.suggested_units,
      reason: carbsValue > 0 ? 'meal' : 'correction',
      carbs_g: carbsValue,
      bg_mgdl: bgValue,
      plan_version: plan!.version,
    });
    if (logMeal && carbsValue > 0) await saveLog('meal', { carbs_g: carbsValue, items: [] });
    if (bg !== '') await saveLog('reading', { bg_mgdl: bgValue, context: 'dose_helper' });
    pushToast({ kind: 'info', text: `Logged ${result.suggested_units} u`, sub: 'Saved to the logbook' });
    setCarbs('');
    setBg('');
    setBusy(false);
  }

  return (
    <Screen>
      <H1>Dose helper</H1>
      <Card tint={C.sunSoft}>
        <Small color={C.ink}>
          ⚠️ Not medical advice. This follows the plan from {clinician ?? 'your care team'} (v{plan.version}). Always check with your care team if unsure.
        </Small>
      </Card>

      <Card>
        <Field label="Carbs (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" placeholder="0" />
        <Row style={{ flexWrap: 'wrap' }}>
          {FOODS.slice(0, 8).map((f) => (
            <Chip key={f.id} label={`${f.carbs}g`} emoji={f.emoji} onPress={() => setCarbs(String(carbsValue + f.carbs))} />
          ))}
        </Row>
        <Field
          label={fresh && bg === '' ? `Glucose (mg/dL) · using check-up from ${timeAgo(fresh.ts, now)}` : 'Glucose (mg/dL)'}
          value={bg}
          onChangeText={setBg}
          keyboardType="decimal-pad"
          placeholder={fresh ? String(bgOf(fresh)) : 'Take a reading first'}
        />
        <Small>Activity in the last 2 hours or coming up</Small>
        <Row style={{ flexWrap: 'wrap' }}>
          {ACTIVITY_CHOICES.map((a) => (
            <Chip
              key={a.id}
              label={a.id === 'auto' ? `Auto${detected ? ` (${detected})` : ''}` : a.label}
              selected={activityChoice === a.id}
              onPress={() => setActivityChoice(a.id)}
            />
          ))}
        </Row>
      </Card>

      {!result ? (
        <Card>
          <Small>Enter a glucose reading to see a suggestion.</Small>
        </Card>
      ) : result.blocked ? (
        <Card tint={C.dangerSoft}>
          <H2 color={C.danger}>No insulin now</H2>
          <Body>{result.message}</Body>
        </Card>
      ) : (
        <Card>
          <Small>Suggested dose</Small>
          <Text style={styles.units}>{result.suggested_units} u</Text>
          <Line label={`Carbs: ${carbsValue} g ÷ ${result.icr_g_per_unit} g/u`} value={`${result.carb_units} u`} />
          <Line
            label={`Correction: (${bgValue} − ${result.correction_target}) ÷ ${result.isf_mgdl_per_unit}`}
            value={`${result.correction_units} u`}
          />
          {result.activity_reduce_pct ? (
            <Line label={`Activity (${result.activity}): −${result.activity_reduce_pct}%`} value={`× ${result.activity_factor}`} />
          ) : null}
          <Line label="Rounded to the nearest 0.5 u" value={`${result.suggested_units} u`} strong />
          {result.warnings.map((w) => (
            <Small key={w} color={w.includes('Capped') || w.includes('high') ? C.danger : C.inkSoft}>
              • {w}
            </Small>
          ))}
          <View style={styles.toggle}>
            <Body style={{ flex: 1 }}>Also log this meal ({carbsValue} g)</Body>
            <Switch value={logMeal} onValueChange={setLogMeal} disabled={carbsValue === 0} />
          </View>
          <Button title={`Confirm & log ${result.suggested_units} u`} onPress={confirm} loading={busy} disabled={result.suggested_units <= 0} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  units: { fontFamily: FONT, fontSize: 48, fontWeight: '800', color: C.primary, marginBottom: S.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: S.sm },
});
