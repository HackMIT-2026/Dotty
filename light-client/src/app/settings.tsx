import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { ServerField } from '@/components/server-field';
import { Body, Button, Card, Chip, H2, Row, Screen, Small } from '@/components/ui';
import { C, S, font } from '@/constants/theme';
import { api, errorText } from '@/lib/api';
import { useStore } from '@/lib/store';
import { syncNow } from '@/lib/sync';
import type { Family } from '@/lib/types';
import { type GlucoseUnit, fmtBg, useGlucoseUnit } from '@/lib/units';

/** The parent chooses how glucose is shown and typed for the whole family (the child's phone follows). */
function GlucoseUnitCard({ isParent }: { isParent: boolean }) {
  const unit = useGlucoseUnit();
  const setGlucoseUnit = useStore((s) => s.setGlucoseUnit);
  const pushToast = useStore((s) => s.pushToast);
  const [saving, setSaving] = useState<GlucoseUnit | null>(null);

  async function choose(next: GlucoseUnit) {
    if (next === unit || saving) return;
    setSaving(next);
    try {
      await api<Family>('/families/settings', { method: 'PUT', body: { glucose_unit: next } });
      setGlucoseUnit(next);
      pushToast({ kind: 'info', text: `Glucose now shown in ${next}`, sub: 'Your child’s app switches at its next sync.' });
    } catch (e) {
      pushToast({ kind: 'alert', text: 'Unit not changed', sub: errorText(e) });
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <H2>Glucose units</H2>
      {isParent ? (
        <>
          <Row>
            {(['mg/dL', 'mmol/L'] as const).map((u) => (
              <Chip key={u} label={saving === u ? `${u}…` : u} selected={unit === u} onPress={() => choose(u)} />
            ))}
          </Row>
          <Small>
            Use the unit your meter shows. Example: {fmtBg(126, 'mg/dL')} = {fmtBg(126, 'mmol/L')}. Applies to your child's app too.
          </Small>
        </>
      ) : (
        <Small>Glucose is shown in {unit}. Your grown-up can change this.</Small>
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
  const family = session?.family;

  return (
    <Screen>
      <Card>
        <H2>{session?.user.name}</H2>
        <Small>
          {session?.user.email} · {session?.user.role}
        </Small>
        {family ? (
          <View style={{ marginTop: S.sm }}>
            <Small>Family code (for your child and your care team)</Small>
            <Text style={{ ...font('900'), fontSize: 28, color: C.primary, letterSpacing: 4 }}>{family.code}</Text>
            <Small>
              {family.child ? `Child: ${family.child.name}` : 'No child yet'} · {family.clinician ? `Care team: ${family.clinician.name}` : 'No care team yet'}
            </Small>
          </View>
        ) : null}
      </Card>

      <GlucoseUnitCard isParent={session?.user.role === 'parent'} />

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
