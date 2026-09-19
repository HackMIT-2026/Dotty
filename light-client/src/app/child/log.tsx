import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Chip, H1, H2, Row, Screen, Small } from '@/components/ui';
import { C, FONT, R, S } from '@/constants/theme';
import { ACTIVITIES, FOODS } from '@/data/foods';
import { saveLog } from '@/lib/log-action';
import type { Intensity } from '@/lib/types';

type Mode = 'checkup' | 'eat' | 'play' | 'medicine';

const MODES: { id: Mode; emoji: string; label: string; tint: string }[] = [
  { id: 'checkup', emoji: '🩺', label: 'Check-up', tint: C.pinkSoft },
  { id: 'eat', emoji: '🍎', label: 'Eat', tint: C.sunSoft },
  { id: 'play', emoji: '⚽', label: 'Play', tint: C.mintSoft },
  { id: 'medicine', emoji: '💧', label: 'Medicine', tint: C.skySoft },
];

function goHome() {
  router.navigate('/child');
}

// ---------- check-up: big number pad ----------

function CheckUp() {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const n = Number(value);
  const valid = value !== '' && n >= 20 && n <= 600;

  const press = (k: string) => {
    if (k === '⌫') setValue((v) => v.slice(0, -1));
    else setValue((v) => (v.length >= 3 ? v : (v + k).replace(/^0+/, '')));
  };

  async function save() {
    setBusy(true);
    await saveLog('reading', { bg_mgdl: n, context: 'fingerstick' });
    setBusy(false);
    setValue('');
    goHome();
  }

  return (
    <Card>
      <H2>What does your meter say?</H2>
      <View style={styles.display}>
        <Text style={styles.displayText}>{value || '---'}</Text>
        <Small>mg/dL</Small>
      </View>
      <View style={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
          k === '' ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable key={i} onPress={() => press(k)} style={({ pressed }) => [styles.key, styles.keyOn, pressed && { backgroundColor: C.primarySoft }]}>
              <Text style={styles.keyText}>{k}</Text>
            </Pressable>
          ),
        )}
      </View>
      <Button title="Save check-up" emoji="✅" size="lg" onPress={save} disabled={!valid} loading={busy} />
    </Card>
  );
}

// ---------- eat: food cards ----------

function Eat() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const total = FOODS.reduce((sum, f) => sum + (counts[f.id] ?? 0) * f.carbs, 0);
  const picked = FOODS.filter((f) => counts[f.id]);

  async function save() {
    setBusy(true);
    await saveLog('meal', { carbs_g: total, items: picked.map((f) => ({ id: f.id, name: f.name, n: counts[f.id], carbs: f.carbs })) });
    setBusy(false);
    setCounts({});
    goHome();
  }

  return (
    <Card>
      <H2>What are you eating?</H2>
      <Small>Tap a food to add it. Tap again for more.</Small>
      <View style={styles.foods}>
        {FOODS.map((f) => {
          const c = counts[f.id] ?? 0;
          return (
            <Pressable
              key={f.id}
              onPress={() => setCounts((s) => ({ ...s, [f.id]: c + 1 }))}
              onLongPress={() => setCounts((s) => ({ ...s, [f.id]: Math.max(0, c - 1) }))}
              style={({ pressed }) => [styles.food, c > 0 && styles.foodOn, pressed && { transform: [{ scale: 0.95 }] }]}>
              <Text style={{ fontSize: 30 }}>{f.emoji}</Text>
              <Text style={styles.foodName} numberOfLines={1}>
                {f.name}
              </Text>
              <Text style={styles.foodCarbs}>{f.carbs} g</Text>
              {c > 0 && (
                <View style={styles.count}>
                  <Text style={styles.countText}>{c}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Body>
          Total: <Text style={{ fontWeight: '800' }}>{total} g carbs</Text>
        </Body>
        {picked.length > 0 && <Button title="Clear" variant="ghost" onPress={() => setCounts({})} />}
      </Row>
      <Button title="Eat with Dotty" emoji="😋" size="lg" onPress={save} disabled={total === 0} loading={busy} />
    </Card>
  );
}

// ---------- play ----------

const INTENSITY: { id: Intensity; label: string; emoji: string }[] = [
  { id: 'light', label: 'Easy', emoji: '🐢' },
  { id: 'moderate', label: 'Medium', emoji: '🐇' },
  { id: 'vigorous', label: 'Super fast', emoji: '🚀' },
];

function Play() {
  const [kind, setKind] = useState('soccer');
  const [minutes, setMinutes] = useState(30);
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await saveLog('activity', { kind, minutes, intensity });
    setBusy(false);
    goHome();
  }

  return (
    <Card>
      <H2>What did you play?</H2>
      <Row style={{ flexWrap: 'wrap' }}>
        {ACTIVITIES.map((a) => (
          <Chip key={a.id} label={a.name} emoji={a.emoji} selected={kind === a.id} onPress={() => setKind(a.id)} />
        ))}
      </Row>
      <Small>For how long?</Small>
      <Row style={{ flexWrap: 'wrap' }}>
        {[15, 30, 45, 60, 90].map((m) => (
          <Chip key={m} label={`${m} min`} selected={minutes === m} onPress={() => setMinutes(m)} />
        ))}
      </Row>
      <Small>How hard?</Small>
      <Row style={{ flexWrap: 'wrap' }}>
        {INTENSITY.map((i) => (
          <Chip key={i.id} label={i.label} emoji={i.emoji} selected={intensity === i.id} onPress={() => setIntensity(i.id)} />
        ))}
      </Row>
      <Button title="Play with Dotty" emoji="🎉" size="lg" onPress={save} loading={busy} />
    </Card>
  );
}

// ---------- medicine ----------

function Medicine() {
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    await saveLog('bolus', { reason: 'child_confirmed' });
    setBusy(false);
    goHome();
  }
  return (
    <Card>
      <H2>Medicine time</H2>
      <Body color={C.inkSoft}>Did you and your grown-up do your insulin? Tell Dotty!</Body>
      <Button title="I did my medicine" emoji="💧" size="lg" variant="mint" onPress={save} loading={busy} />
    </Card>
  );
}

export default function Log() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>('checkup');

  useEffect(() => {
    if (params.mode && MODES.some((m) => m.id === params.mode)) setMode(params.mode as Mode);
  }, [params.mode]);

  return (
    <Screen>
      <H1>Take care of Dotty</H1>
      <View style={styles.modes}>
        {MODES.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => setMode(m.id)}
            style={[styles.mode, { backgroundColor: m.tint }, mode === m.id && styles.modeOn]}>
            <Text style={{ fontSize: 26 }}>{m.emoji}</Text>
            <Text style={styles.modeText}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
      {mode === 'checkup' && <CheckUp />}
      {mode === 'eat' && <Eat />}
      {mode === 'play' && <Play />}
      {mode === 'medicine' && <Medicine />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', gap: S.sm },
  mode: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: R.md, borderWidth: 3, borderColor: 'transparent' },
  modeOn: { borderColor: C.primary },
  modeText: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: C.ink },
  display: { alignItems: 'center', paddingVertical: S.sm },
  displayText: { fontFamily: FONT, fontSize: 56, fontWeight: '800', color: C.ink, letterSpacing: 2 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, justifyContent: 'center' },
  key: { width: '30%', height: 58, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  keyOn: { backgroundColor: C.bg, borderWidth: 2, borderColor: C.line },
  keyText: { fontFamily: FONT, fontSize: 26, fontWeight: '800', color: C.ink },
  foods: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  food: {
    width: '23%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: R.md,
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.line,
  },
  foodOn: { borderColor: C.sun, backgroundColor: C.sunSoft },
  foodName: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: C.ink, marginTop: 2 },
  foodCarbs: { fontFamily: FONT, fontSize: 11, fontWeight: '600', color: C.inkSoft },
  count: { position: 'absolute', top: -6, right: -6, backgroundColor: C.primary, borderRadius: R.pill, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
