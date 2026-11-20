import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { LoadingView } from '@/components/not-found';
import { Screen } from '@/components/screen';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { Back, Btn, Field, Glass, Pill, PillRow, Segmented, T } from '@/components/ui';
import { DOCS_FOR, useBusiness, type DocKind } from '@/lib/business';
import { CITY } from '@/lib/config';
import { CATEGORIES } from '@/lib/data';
import { useToast } from '@/lib/feedback';
import { friendly } from '@/lib/supabase';
import { STATUS_TONES } from '@/lib/theme';

type Kind = 'business' | 'freelancer';
type Picked = Partial<Record<DocKind, DocumentPicker.DocumentPickerAsset>>;

function DocPicker({ label, file, onPick }: { label: string; file?: DocumentPicker.DocumentPickerAsset; onPick: (f: DocumentPicker.DocumentPickerAsset) => void }) {
  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    if (!res.canceled && res.assets[0]) onPick(res.assets[0]);
  };
  return (
    <View style={{ gap: 6 }}>
      <T v="label" muted>{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Btn small kind="outline" label={file ? 'Change file' : 'Choose file'} a11y={`Choose file: ${label}`} onPress={pick} />
        <T v="small" muted>{file?.name || 'No file chosen'}</T>
      </View>
    </View>
  );
}

export default function Register() {
  const b = useBusiness();
  if (b.needsSignIn) {
    return <SignInPrompt next="/biz/register" title="Register your business"
      body="Sign in with your email first. Your listing, services and documents are saved to your account." />;
  }
  if (b.loading) return <LoadingView />;
  return <RegisterForm b={b} />;
}

function RegisterForm({ b }: { b: ReturnType<typeof useBusiness> }) {
  const toast = useToast();
  const biz = b.biz;
  const [kind, setKind] = useState<Kind>(biz.kind);
  const [name, setName] = useState(biz.name);
  const [category, setCategory] = useState(biz.category || 'hair');
  const [area, setArea] = useState(biz.area);
  const [radius, setRadius] = useState(String(biz.radiusKm));
  const [files, setFiles] = useState<Picked>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const first = !biz.registered;
  // Documents are needed to (re)apply: on first registration and after a rejection.
  const applying = first || biz.verification === 'rejected' || biz.verification === 'not-started';
  const docs = DOCS_FOR[kind];
  const docsMissing = b.live && applying && docs.some(([k]) => !files[k]);
  const missing = !name.trim() ? 'Add your business or display name.'
    : !area.trim() ? 'Add your area.'
    : docsMissing ? 'Add both documents so we can verify you.' : '';

  const submit = async () => {
    setBusy(true); setError('');
    try {
      await b.saveDetails({ kind, name: name.trim(), category, area: area.trim(), radiusKm: Math.max(0, Math.min(50, Number(radius) || 0)) });
      for (const [k] of docs) {
        const f = files[k];
        if (f) await b.uploadDocument(k, f);
      }
      if (applying) await b.submitForVerification();
      toast(applying ? 'Submitted. We will check your documents.' : 'Saved');
      router.replace(first ? '/biz/services' : '/biz');
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen theme="business">
      <Back href="/biz" label="Business" />
      <T v="h1">{first ? 'Register your business' : 'Business details'}</T>
      {biz.verification === 'rejected' && b.reviewNote ? (
        <Glass style={{ padding: 18, gap: 6, maxWidth: 640 }}>
          <T v="h3">What to fix</T>
          <T muted>{b.reviewNote}</T>
        </Glass>
      ) : null}
      <Glass style={{ padding: 22, gap: 16, maxWidth: 640 }}>
        <View style={{ gap: 8 }}>
          <T v="h3">I am a</T>
          <Segmented label="Account type" value={kind} onChange={setKind}
            options={[{ id: 'business', label: 'Business with a shop' }, { id: 'freelancer', label: 'Freelancer' }]} />
        </View>
        <Field label="Business or display name" value={name} onChangeText={setName} autoComplete="organization" />
        <View style={{ gap: 6 }}>
          <T v="label" muted>Main service</T>
          <PillRow label="Main service">
            {CATEGORIES.map((c) => <Pill key={c.id} label={c.label} selected={category === c.id} onPress={() => setCategory(c.id)} />)}
          </PillRow>
        </View>
        <Field label={`Area in ${CITY}`} value={area} onChangeText={setArea} placeholder="e.g. Kilimani" />
        <Field label="How far will you travel for home calls? (km)" value={radius} onChangeText={setRadius} keyboardType="number-pad" />
        <View style={{ gap: 10 }}>
          <T v="h3">Verification documents</T>
          <T v="small" muted>
            {kind === 'business' ? 'Business registration and your operating permit.' : 'National ID or passport, and a selfie.'}
            {b.live ? ' Only you and the Selfcare team can see them.' : ' In this preview, files stay on your device.'}
            {!applying ? ' Already submitted; choose a file only to replace it.' : ''}
          </T>
          {docs.map(([k, label]) => (
            <DocPicker key={k} label={label} file={files[k]} onPick={(f) => setFiles((s) => ({ ...s, [k]: f }))} />
          ))}
        </View>
        <Btn kind="light" label={busy ? 'Saving…' : applying ? 'Submit for verification' : 'Save'} disabled={!!missing || busy} onPress={submit} />
        {missing ? <T v="small" muted>{missing}</T> : null}
        {error ? <View role="alert"><T v="small" style={{ color: STATUS_TONES.bad[1] }}>{error}</T></View> : null}
      </Glass>
    </Screen>
  );
}
