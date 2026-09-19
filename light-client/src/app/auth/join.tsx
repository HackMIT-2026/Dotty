import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Card, Chip, Field, H1, Row, Screen, Small } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { api, authErrorText } from '@/lib/api';
import { localTz, startSession } from '@/lib/session';
import type { User } from '@/lib/types';

type Role = 'parent' | 'child';

export default function Join() {
  const [role, setRole] = useState<Role>('parent');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsCode = role === 'child';
  const ready = name && email && password.length >= 6 && (!needsCode || code.length === 6);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          family_code: code.trim().toUpperCase() || undefined,
          tz: localTz(),
        },
      });
      await startSession(res);
    } catch (e) {
      setError(authErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <H1 style={{ marginTop: S.lg }}>Create an account</H1>
      <Row>
        <Chip label="I'm a parent" icon="account-heart" selected={role === 'parent'} onPress={() => setRole('parent')} />
        <Chip label="I'm a kid" icon="human-child" selected={role === 'child'} onPress={() => setRole('child')} />
      </Row>
      <Card>
        <Field label={role === 'child' ? 'Your first name' : 'Your name'} value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Password (6+ characters)" value={password} onChangeText={setPassword} secureTextEntry />
        <Field
          label={needsCode ? 'Family code (ask your parent)' : 'Family code (only to join an existing family)'}
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
          placeholder="ABC123"
        />
        {role === 'parent' && !code ? (
          <Small>A new family is created for you. Share its code with your child and your care team.</Small>
        ) : null}
        {error ? <Small color={C.danger}>{error}</Small> : null}
        <Button title="Create account" onPress={submit} loading={busy} disabled={!ready} />
      </Card>
      <View style={{ alignItems: 'center' }}>
        <Button title="Back to log in" variant="ghost" onPress={() => router.back()} />
      </View>
      <Body color={C.inkSoft} style={{ fontSize: 13, textAlign: 'center' }}>
        Clinicians sign up in the Dotty clinician portal.
      </Body>
    </Screen>
  );
}
