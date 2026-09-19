import { Switch, Text, View } from 'react-native';

import { ServerField } from '@/components/server-field';
import { Body, Button, Card, H2, Row, Screen, Small } from '@/components/ui';
import { C, FONT, S } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { syncNow } from '@/lib/sync';

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
            <Text style={{ fontFamily: FONT, fontSize: 28, fontWeight: '800', color: C.primary, letterSpacing: 4 }}>{family.code}</Text>
            <Small>
              {family.child ? `Child: ${family.child.name}` : 'No child yet'} · {family.clinician ? `Care team: ${family.clinician.name}` : 'No care team yet'}
            </Small>
          </View>
        ) : null}
      </Card>

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
