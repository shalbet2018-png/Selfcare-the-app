// Sign in or sign up with an emailed 6-digit code. ?next=/path says where to go afterwards.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Back, Btn, Field, Glass, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/feedback';
import { BACKEND_ON, friendly } from '@/lib/supabase';
import { STATUS_TONES } from '@/lib/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { sendCode, verifyCode, email: signedInAs } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Only follow in-app paths, never a full address handed in through a link.
  const goTo = next && next.startsWith('/') && !next.startsWith('//') ? next : '/profile';

  const send = async () => {
    setBusy(true); setError('');
    try {
      await sendCode(email);
      setSentTo(email.trim().toLowerCase());
      setCode('');
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true); setError('');
    try {
      await verifyCode(sentTo, code);
      toast('Signed in');
      router.replace(goTo as never);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen theme="makeup">
      <Back href="/profile" label="Profile" />
      <T v="h1">Sign in</T>
      <Glass style={{ padding: 22, gap: 16, maxWidth: 520 }}>
        {!BACKEND_ON ? (
          <>
            <T v="h3">Not connected yet</T>
            <T muted>This preview is running on demo data, so there are no accounts yet. Everything still works on this device.</T>
          </>
        ) : signedInAs ? (
          <>
            <T v="h3">You are signed in</T>
            <T muted>As {signedInAs}.</T>
            <Btn kind="light" label="Continue" onPress={() => router.replace(goTo as never)} />
          </>
        ) : !sentTo ? (
          <>
            <T muted>Enter your email and we will send you a 6-digit code. New here? This creates your account.</T>
            <Field label="Email" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address"
              autoCapitalize="none" autoCorrect={false} inputMode="email" returnKeyType="send"
              onSubmitEditing={() => EMAIL.test(email.trim()) && !busy && send()} />
            <Btn kind="light" label={busy ? 'Sending…' : 'Send my code'} disabled={busy || !EMAIL.test(email.trim())} onPress={send} />
          </>
        ) : (
          <>
            <T muted>We sent a 6-digit code to {sentTo}. It can take a minute; check spam too.</T>
            <Field label="Code" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" inputMode="numeric"
              returnKeyType="done" onSubmitEditing={() => code.length === 6 && !busy && verify()} />
            <Btn kind="light" label={busy ? 'Checking…' : 'Sign in'} disabled={busy || code.length !== 6} onPress={verify} />
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <Btn small kind="ghost" label="Send a new code" disabled={busy} onPress={send} />
              <Btn small kind="ghost" label="Use another email" disabled={busy} onPress={() => { setSentTo(''); setError(''); }} />
            </View>
          </>
        )}
        {error ? <View role="alert"><T v="small" style={{ color: STATUS_TONES.bad[1] }}>{error}</T></View> : null}
      </Glass>
    </Screen>
  );
}
