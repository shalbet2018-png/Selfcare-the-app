import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { LoadingView } from '@/components/not-found';
import { Screen } from '@/components/screen';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { Btn, Field, Glass, Segmented, T } from '@/components/ui';
import { useBusiness } from '@/lib/business';
import { money } from '@/lib/config';
import { useToast } from '@/lib/feedback';
import type { BizService } from '@/lib/store';
import { friendly } from '@/lib/supabase';

const WHERE: { id: BizService['where']; label: string }[] = [
  { id: 'both', label: 'Shop and home' },
  { id: 'shop', label: 'At the shop' },
  { id: 'home', label: 'Home service' },
];

export default function Services() {
  const b = useBusiness();
  const toast = useToast();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [mins, setMins] = useState('');
  const [where, setWhere] = useState<BizService['where']>('both');
  const [busy, setBusy] = useState(false);
  const biz = b.biz;
  if (b.needsSignIn) return <SignInPrompt next="/biz/services" title="Services and prices" body="Sign in to manage your services." />;
  if (b.loading) return <LoadingView />;
  if (!biz.registered) return <Redirect href="/biz/register" />;

  const valid = name.trim() && Number(price) > 0 && Number(mins) >= 5 && Number(mins) <= 720;
  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await work();
      toast(done);
      return true;
    } catch (e) {
      toast(friendly(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const add = async () => {
    const ok = await run(() => b.addService({ name: name.trim(), price: Math.round(Number(price)), mins: Math.round(Number(mins)), where }), 'Service added');
    if (ok) { setName(''); setPrice(''); setMins(''); setWhere('both'); }
  };

  return (
    <Screen theme="business">
      <T v="h1">Services and prices</T>
      <T v="lead" muted>You set your own prices. Home calls add a travel fee by distance automatically.</T>
      {b.live ? (
        <Glass style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <View style={{ flexShrink: 1 }}>
            <T v="strong">Photos</T>
            <T v="small" muted>{b.photos.length ? `${b.photos.length} on your listing` : 'Add photos of your shop and work so clients pick you'}</T>
          </View>
          <Btn small kind={b.photos.length ? 'outline' : 'light'} label={b.photos.length ? 'Manage photos' : 'Add photos'} href="/biz/photos" />
        </Glass>
      ) : null}

      {biz.services.length ? (
        <View style={{ gap: 10 }}>
          {biz.services.map((s, i) => (
            <Glass key={s.id ?? `${s.name}-${i}`} style={{ borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flexShrink: 1 }}>
                <T v="strong">{s.name}</T>
                <T v="small" muted>{s.mins} min · {WHERE.find((w) => w.id === s.where)?.label}</T>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <T v="strong">{money(s.price)}</T>
                <Btn small kind="outline" label="Remove" a11y={`Remove ${s.name}`} disabled={busy}
                  onPress={() => run(() => b.removeService(i), 'Service removed')} />
              </View>
            </Glass>
          ))}
        </View>
      ) : <T v="small" muted>No services yet. Add your first one below.</T>}

      <Glass style={{ padding: 22, gap: 14, maxWidth: 640 }}>
        <T v="h3">Add a service</T>
        <Field label="Service name" value={name} onChangeText={setName} placeholder="e.g. Knotless braids, medium" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field style={{ flex: 1 }} label="Price (KES)" value={price} onChangeText={setPrice} keyboardType="number-pad" />
          <Field style={{ flex: 1 }} label="Length (minutes)" value={mins} onChangeText={setMins} keyboardType="number-pad" />
        </View>
        <Segmented label="Where" options={WHERE} value={where} onChange={setWhere} />
        <Btn kind="light" label={busy ? 'Saving…' : 'Add service'} disabled={!valid || busy} onPress={add} />
        {b.live && biz.verification !== 'approved' ? <T v="small" muted>Clients see your services once Selfcare has approved your account.</T> : null}
      </Glass>
    </Screen>
  );
}
