import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { NotFoundView } from '@/components/not-found';
import { Screen } from '@/components/screen';
import { Back, Btn, Field, Glass, Lines, Pill, PillRow, Segmented, T } from '@/components/ui';
import { money, PAYMENT_METHODS, SERVICE_FEE, SERVICE_FEE_LABEL, travelFee, type PayMethod } from '@/lib/config';
import { MODE_OPTIONS, providerById, type Mode } from '@/lib/data';
import { useToast } from '@/lib/feedback';
import { useLayout } from '@/lib/layout';
import { useStore } from '@/lib/store';
import { C, themeForCategory } from '@/lib/theme';

const SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

function nextDays(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    return { id, label };
  });
}

export default function Book() {
  const { providerId, serviceId } = useLocalSearchParams<{ providerId: string; serviceId: string }>();
  const { state, set, addBooking } = useStore();
  const toast = useToast();
  const { wide } = useLayout();
  const p = providerById(providerId);
  const sv = p?.services.find((s) => s.id === serviceId);
  const days = useMemo(() => nextDays(7), []);

  const [mode, setMode] = useState<Mode>(p && p.modes.includes(state.serviceMode) ? state.serviceMode : p?.modes[0] ?? 'shop');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [day, setDay] = useState(days[0].id);
  const [time, setTime] = useState('');
  const [staff, setStaff] = useState('');
  const [address, setAddress] = useState(state.address);
  const [pay, setPay] = useState<PayMethod>('mpesa');

  if (!p || !sv) return <NotFoundView />;

  const home = mode === 'home';
  const travel = home ? travelFee(p.km) : 0;
  const total = sv.price + travel + SERVICE_FEE;
  const needsTime = !home || when === 'later';
  const missing = home && !address.trim() ? 'Add your address to continue.' : needsTime && !time ? 'Pick a time to continue.' : '';
  const requestNow = home && when === 'now';

  const confirm = () => {
    const b = addBooking({
      providerId: p.id, providerName: p.name, serviceName: sv.name,
      mode, when: home ? when : 'later', day, time: needsTime ? time : '', staff, address: home ? address.trim() : '',
      pay, price: sv.price, travel, fee: SERVICE_FEE, total,
      status: requestNow ? 'requested' : 'confirmed',
    });
    if (home) set({ address: address.trim() });
    toast(requestNow ? 'Request sent to nearby providers' : 'Booking confirmed');
    router.replace({ pathname: '/booking/[id]', params: { id: b.id } });
  };

  return (
    <Screen theme={themeForCategory(p.category)}>
      <Back href={{ pathname: '/provider/[id]', params: { id: p.id } }} label={p.name} />
      <T v="h1">Book {sv.name.toLowerCase()}</T>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 22, alignItems: 'flex-start' }}>
        <View style={{ flex: wide ? 1 : undefined, alignSelf: 'stretch', gap: 22 }}>
          {p.modes.length > 1 ? (
            <View style={{ gap: 10 }}>
              <T v="h3">Where?</T>
              <Segmented label="Where the service happens" options={MODE_OPTIONS} value={mode} onChange={setMode} />
            </View>
          ) : (
            <T muted>{p.modes[0] === 'home' ? 'This provider comes to you.' : 'This service is at the shop.'}</T>
          )}

          {home && (
            <View style={{ gap: 10 }}>
              <T v="h3">Your address</T>
              <Field label="Address or landmark" value={address} onChangeText={setAddress} placeholder="e.g. apartment, street, area" autoComplete="street-address" />
              <Segmented label="When" options={[{ id: 'now', label: 'As soon as possible' }, { id: 'later', label: 'Schedule' }]} value={when} onChange={setWhen} />
            </View>
          )}

          {needsTime && (
            <View style={{ gap: 10 }}>
              <T v="h3">Day</T>
              <PillRow label="Day">{days.map((d) => <Pill key={d.id} label={d.label} selected={d.id === day} onPress={() => setDay(d.id)} />)}</PillRow>
              <T v="h3">Time</T>
              <PillRow label="Time">{SLOTS.map((t) => <Pill key={t} label={t} selected={t === time} onPress={() => setTime(t)} />)}</PillRow>
            </View>
          )}

          {!home && p.staff.length > 0 && (
            <View style={{ gap: 10 }}>
              <T v="h3">Who? <T v="small" muted>(optional)</T></T>
              <PillRow label="Staff member">
                <Pill label="Anyone" selected={!staff} onPress={() => setStaff('')} />
                {p.staff.map((m) => <Pill key={m} label={m} selected={m === staff} onPress={() => setStaff(m)} />)}
              </PillRow>
            </View>
          )}

          <View style={{ gap: 10 }}>
            <T v="h3">Pay with</T>
            <View role="radiogroup" aria-label="Payment method" style={{ flexDirection: wide ? 'row' : 'column', gap: 8 }}>
              {PAYMENT_METHODS.map((m) => {
                const on = m.id === pay;
                return (
                  <Pressable key={m.id} role="radio" aria-checked={on} onPress={() => setPay(m.id)} style={{ flex: wide ? 1 : undefined }}>
                    <Glass style={[{ borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }, on && { borderColor: C.sage, borderWidth: 2 }]}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? C.sage : '#9A93A0', alignItems: 'center', justifyContent: 'center' }}>
                        {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.sage }} />}
                      </View>
                      <View style={{ flexShrink: 1 }}>
                        <T v="strong">{m.label}</T>
                        <T v="small" muted>{m.note}</T>
                      </View>
                    </Glass>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <Glass style={{ width: wide ? 360 : undefined, alignSelf: wide ? 'flex-start' : 'stretch', padding: 22, gap: 12 }}>
          <T v="eyebrow" muted>{p.name}</T>
          <T v="h3">{sv.name}</T>
          <Lines rows={[
            { label: 'Service', value: money(sv.price) },
            ...(home ? [{ label: `Travel fee (${p.km.toFixed(1)} km)`, value: money(travel) }] : []),
            { label: SERVICE_FEE_LABEL, value: money(SERVICE_FEE) },
            { label: 'Total', value: money(total), total: true },
          ]} />
          <Btn block label={requestNow ? 'Request now' : 'Confirm booking'} disabled={!!missing} onPress={confirm} />
          <T v="small" muted>{missing || 'You are charged when the provider accepts. Payment is released to them once the service is done.'}</T>
        </Glass>
      </View>
    </Screen>
  );
}
