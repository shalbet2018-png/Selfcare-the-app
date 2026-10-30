import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Btn, Field, Glass, Segmented, T } from '@/components/ui';
import { money } from '@/lib/config';
import { useToast } from '@/lib/feedback';
import { useStore, type BizService } from '@/lib/store';

const WHERE: { id: BizService['where']; label: string }[] = [
  { id: 'both', label: 'Shop and home' },
  { id: 'shop', label: 'At the shop' },
  { id: 'home', label: 'Home service' },
];

export default function Services() {
  const { state, setBusiness } = useStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [mins, setMins] = useState('');
  const [where, setWhere] = useState<BizService['where']>('both');
  const biz = state.business;
  if (!biz.registered) return <Redirect href="/biz/register" />;

  const valid = name.trim() && Number(price) > 0 && Number(mins) > 0;
  const add = () => {
    setBusiness({ services: [...biz.services, { name: name.trim(), price: Number(price), mins: Number(mins), where }] });
    setName(''); setPrice(''); setMins(''); setWhere('both');
    toast('Service added');
  };

  return (
    <Screen theme="business">
      <T v="h1">Services and prices</T>
      <T v="lead" muted>You set your own prices. Home calls add a travel fee by distance automatically.</T>

      {biz.services.length ? (
        <View style={{ gap: 10 }}>
          {biz.services.map((s, i) => (
            <Glass key={`${s.name}-${i}`} style={{ borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flexShrink: 1 }}>
                <T v="strong">{s.name}</T>
                <T v="small" muted>{s.mins} min · {WHERE.find((w) => w.id === s.where)?.label}</T>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <T v="strong">{money(s.price)}</T>
                <Btn small kind="outline" label="Remove" a11y={`Remove ${s.name}`}
                  onPress={() => setBusiness({ services: biz.services.filter((_, j) => j !== i) })} />
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
        <Btn kind="light" label="Add service" disabled={!valid} onPress={add} />
      </Glass>
    </Screen>
  );
}
