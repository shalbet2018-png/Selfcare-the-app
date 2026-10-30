import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Back, Btn, Field, Glass, Segmented, T } from '@/components/ui';
import { CITY } from '@/lib/config';
import { useToast } from '@/lib/feedback';
import { useStore } from '@/lib/store';

type Kind = 'business' | 'freelancer';

function DocPicker({ label, name, onPick }: { label: string; name: string; onPick: (n: string) => void }) {
  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    if (!res.canceled && res.assets[0]) onPick(res.assets[0].name);
  };
  return (
    <View style={{ gap: 6 }}>
      <T v="label" muted>{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Btn small kind="outline" label={name ? 'Change file' : 'Choose file'} a11y={`Choose file: ${label}`} onPress={pick} />
        <T v="small" muted>{name || 'No file chosen'}</T>
      </View>
    </View>
  );
}

export default function Register() {
  const { state, setBusiness } = useStore();
  const toast = useToast();
  const biz = state.business;
  const [kind, setKind] = useState<Kind>(biz.kind);
  const [name, setName] = useState(biz.name);
  const [area, setArea] = useState(biz.area);
  const [radius, setRadius] = useState(String(biz.radiusKm));
  const [doc1, setDoc1] = useState('');
  const [doc2, setDoc2] = useState('');
  const first = !biz.registered;
  const missing = !name.trim() ? 'Add your business or display name.' : !area.trim() ? 'Add your area.' : '';

  const submit = () => {
    setBusiness({
      registered: true, kind, name: name.trim(), area: area.trim(),
      radiusKm: Math.max(0, Math.min(50, Number(radius) || 0)),
      verification: first ? 'submitted' : biz.verification,
    });
    toast(first ? 'Submitted. We will check your documents.' : 'Saved');
    router.replace(first ? '/biz/services' : '/biz');
  };

  return (
    <Screen theme="business">
      <Back href="/biz" label="Business" />
      <T v="h1">{first ? 'Register your business' : 'Business details'}</T>
      <Glass style={{ padding: 22, gap: 16, maxWidth: 640 }}>
        <View style={{ gap: 8 }}>
          <T v="h3">I am a</T>
          <Segmented label="Account type" value={kind} onChange={setKind}
            options={[{ id: 'business', label: 'Business with a shop' }, { id: 'freelancer', label: 'Freelancer' }]} />
        </View>
        <Field label="Business or display name" value={name} onChangeText={setName} autoComplete="organization" />
        <Field label={`Area in ${CITY}`} value={area} onChangeText={setArea} placeholder="e.g. Kilimani" />
        <Field label="How far will you travel for home calls? (km)" value={radius} onChangeText={setRadius} keyboardType="number-pad" />
        <View style={{ gap: 10 }}>
          <T v="h3">Verification documents</T>
          <T v="small" muted>
            {kind === 'business'
              ? 'Business registration and your operating permit.'
              : 'National ID or passport, and a selfie.'} In this preview, files stay on your device.
          </T>
          <DocPicker label={kind === 'business' ? 'Business registration' : 'ID or passport'} name={doc1} onPick={setDoc1} />
          <DocPicker label={kind === 'business' ? 'Operating permit' : 'Selfie'} name={doc2} onPick={setDoc2} />
        </View>
        <Btn kind="light" label={first ? 'Submit for verification' : 'Save'} disabled={!!missing} onPress={submit} />
        {missing ? <T v="small" muted>{missing}</T> : null}
      </Glass>
    </Screen>
  );
}
