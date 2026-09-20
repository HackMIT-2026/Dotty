import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { PIN_LENGTH, PinPad } from '@/components/pin-pad';
import { ServerField } from '@/components/server-field';
import { GlucoseUnitToggle } from '@/components/unit-toggle';
import { Body, Button, Card, H2, Row, Screen, Small } from '@/components/ui';
import { Icon } from '@/components/icon';
import { BORDER, C, R, S, font } from '@/constants/theme';
import { api, errorText } from '@/lib/api';
import { EFFECT_STYLES, SONGS, playSfx } from '@/lib/sounds';
import { useStore } from '@/lib/store';
import { syncNow } from '@/lib/sync';
import { fmtBg, useGlucoseUnit } from '@/lib/units';
import { ParentIcon } from '@/components/parent-icon';

/** Parents change the unit here or on the Today page; children only see which unit is used. */
function GlucoseUnitCard({ isParent }: { isParent: boolean }) {
  const unit = useGlucoseUnit();
  return (
    <Card>
      <H2>Glucose units</H2>
      {isParent ? (
        <>
          <GlucoseUnitToggle />
          <Small>
            Use the unit your meter shows. Example: {fmtBg(126, 'mg/dL')} = {fmtBg(126, 'mmol/L')}. Your child's app switches
            automatically.
          </Small>
        </>
      ) : (
        <Row>
          <ParentIcon name="lock" size={24} />
          <Small style={{ flex: 1 }}>Glucose is shown in {unit}. Only your parent can change this.</Small>
        </Row>
      )}
    </Card>
  );
}

/** Children sign in with the family code and a 4-digit PIN; parents set or reset it here. */
function ChildPinCard({ childName }: { childName: string }) {
  const pushToast = useStore((s) => s.pushToast);
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api('/families/child-pin', { method: 'PUT', body: { pin } });
      pushToast({ kind: 'info', text: `${childName}'s secret number updated`, sub: `They sign in with the family code and ${pin}.` });
      setPin('');
      setOpen(false);
    } catch (e) {
      pushToast({ kind: 'alert', text: 'Not changed', sub: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <H2>{childName}'s sign-in</H2>
      <Small>{childName} signs in with the family code and a 4-digit secret number — no email, no password.</Small>
      {open ? (
        <>
          <PinPad value={pin} onChange={setPin} />
          <Row>
            <Button title="Cancel" variant="ghost" onPress={() => { setOpen(false); setPin(''); }} />
            <Button title="Save number" leading={<ParentIcon name="check" size={26} />} onPress={save} loading={busy} disabled={pin.length < PIN_LENGTH} />
          </Row>
        </>
      ) : (
        <Button title="Set a new secret number" leading={<ParentIcon name="lock" size={26} />} variant="secondary" onPress={() => setOpen(true)} />
      )}
    </Card>
  );
}

export default function Settings() {
  const session = useStore((s) => s.session);
  const forceOffline = useStore((s) => s.forceOffline);
  const setForceOffline = useStore((s) => s.setForceOffline);
  const pending = useStore((s) => s.outbox.length);
  const signOut = useStore((s) => s.signOut);
  const musicOn = useStore((s) => s.musicOn);
  const soundOn = useStore((s) => s.soundOn);
  const setMusicOn = useStore((s) => s.setMusicOn);
  const setSoundOn = useStore((s) => s.setSoundOn);
  const song = useStore((s) => s.song);
  const setSong = useStore((s) => s.setSong);
  const sfxStyle = useStore((s) => s.sfxStyle);
  const setSfxStyle = useStore((s) => s.setSfxStyle);
  const family = session?.family;

  return (
    <Screen>
      <Card>
        <H2>{session?.user.name}</H2>
        <Small>{session?.user.role === 'child' ? 'Kid account · signs in with the family code and a secret number' : `${session?.user.email} · ${session?.user.role}`}</Small>
        {family && session?.user.role === 'parent' ? (
          <View style={{ marginTop: S.sm }}>
            <Small>Family code (for your child and your care team)</Small>
            <Text style={{ ...font('900'), fontSize: 28, color: C.primary, letterSpacing: 4 }}>{family.code}</Text>
            <Small>
              {family.child ? `Child: ${family.child.name}` : 'No child yet'} · {family.clinician ? `Care team: ${family.clinician.name}` : 'No care team yet'}
            </Small>
          </View>
        ) : null}
      </Card>

      {session?.user.role === 'parent' && family?.child ? <ChildPinCard childName={family.child.name} /> : null}

      <GlucoseUnitCard isParent={session?.user.role === 'parent'} />

      {session?.user.role === 'child' ? (
        <Card>
          <H2>Sounds and music</H2>
          <Row>
            <Body style={{ flex: 1 }}>Background music</Body>
            <Switch value={musicOn} onValueChange={setMusicOn} />
          </Row>
          <Small color={C.ink}>Pick a song</Small>
          <View style={{ gap: S.sm }}>
            {SONGS.map((s) => {
              const on = s.id === song;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setSong(s.id);
                    setMusicOn(true);
                  }}
                  style={({ pressed }) => [songStyles.row, on && songStyles.rowOn, pressed && { opacity: 0.85 }]}>
                  <View style={[songStyles.dot, on && songStyles.dotOn]}>{on ? <Icon name="music" size={16} color={C.ink} /> : null}</View>
                  <View style={{ flex: 1 }}>
                    <Body style={font('800')}>{s.label}</Body>
                    <Small>{s.mood}</Small>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Row>
            <Body style={{ flex: 1 }}>Button sounds</Body>
            <Switch value={soundOn} onValueChange={setSoundOn} />
          </Row>
          <Small color={C.ink}>Button sound style</Small>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {EFFECT_STYLES.map((e) => {
              const on = e.id === sfxStyle;
              return (
                <Pressable
                  key={e.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setSfxStyle(e.id);
                    setSoundOn(true);
                    setTimeout(() => playSfx('success'), 60);
                  }}
                  style={({ pressed }) => [songStyles.chip, on && songStyles.chipOn, pressed && { opacity: 0.85 }]}>
                  <Text style={[songStyles.chipText, on && { color: C.ink }]}>{e.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      <Card>
        <H2>Offline mode</H2>
        <Row>
          <Body style={{ flex: 1 }}>Pretend there is no internet (for demos). Logs wait in the outbox.</Body>
          <Switch
            value={forceOffline}
            onValueChange={(v) => {
              setForceOffline(v);
              if (!v) void syncNow();
            }}
          />
        </Row>
        <Small>{pending ? `${pending} waiting to upload` : 'Everything is uploaded'}</Small>
      </Card>

      <Card>
        <H2>Server</H2>
        <ServerField />
      </Card>

      <Button title="Log out" variant="secondary" onPress={signOut} />
      {pending > 0 ? <Small color={C.danger}>Logging out now drops {pending} log(s) that have not uploaded yet.</Small> : null}
    </Screen>
  );
}

const songStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.md, backgroundColor: C.bg, borderWidth: BORDER, borderColor: C.line },
  rowOn: { backgroundColor: C.sunSoft, borderColor: C.sun },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: BORDER, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.pill, backgroundColor: C.bg, borderWidth: BORDER, borderColor: C.line },
  chipOn: { backgroundColor: C.sun, borderColor: C.sun },
  chipText: { ...font('800'), fontSize: 15, color: C.inkSoft },
  dotOn: { backgroundColor: C.sun, borderColor: C.sun },
});
