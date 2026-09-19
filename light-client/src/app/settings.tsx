import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PIN_LENGTH, PinPad } from '@/components/pin-pad';
import { ServerField } from '@/components/server-field';
import { GlucoseUnitToggle } from '@/components/unit-toggle';
import { Body, Button, Card, H2, Row, Screen, Small } from '@/components/ui';
import { C, S, font } from '@/constants/theme';
import { api, errorText } from '@/lib/api';
import { useStore } from '@/lib/store';
import { syncNow } from '@/lib/sync';
import { fmtBg, useGlucoseUnit } from '@/lib/units';

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
          <Icon name="lock-outline" size={18} color={C.inkSoft} />
          <Small style={{ flex: 1 }}>Glucose is shown in {unit}. Only your grown-up can change this.</Small>
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
            <Button title="Save number" icon="check-bold" onPress={save} loading={busy} disabled={pin.length < PIN_LENGTH} />
          </Row>
        </>
      ) : (
        <Button title="Set a new secret number" icon="lock-reset" variant="secondary" onPress={() => setOpen(true)} />
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
