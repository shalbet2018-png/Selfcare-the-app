import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { LoadingView, NotFoundView } from '@/components/not-found';
import { Screen } from '@/components/screen';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { Back, Btn, Field, Glass, Lines, Pill, PillRow, Segmented, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useMyBookings, useMyContact } from '@/lib/bookings';
import { money, PAYMENT_METHODS, SERVICE_FEE, SERVICE_FEE_LABEL, travelFee, type PayMethod } from '@/lib/config';
import { MODE_OPTIONS, type Mode, type Provider, type Service } from '@/lib/data';
import { useToast } from '@/lib/feedback';
import { useLayout } from '@/lib/layout';
import { useProvider } from '@/lib/providers';
import { useStore } from '@/lib/store';
import { BACKEND_ON, friendly } from '@/lib/supabase';
import { C, STATUS_TONES, themeForCategory, veil } from '@/lib/theme';

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
  const { provider: p, loading } = useProvider(providerId);
  const { userId, ready } = useAuth();
  const sv = p?.services.find((s) => s.id === serviceId);
  if (BACKEND_ON && ready && !userId) {
    return <SignInPrompt next={`/book/${providerId}/${serviceId}`} title="Sign in to book" theme="spa"
      body="Sign in with your email first, so the business can confirm your booking and you can follow it from any device." />;
  }
  if (!p || !sv) return loading || !ready ? <LoadingView /> : <NotFoundView />;
  return <BookForm p={p} sv={sv} />;
}

/** Today's slots that have already started are left out. */
function slotsFor(dayId: string, todayId: string) {
  if (dayId !== todayId) return SLOTS;
  const now = new Date();
  return SLOTS.filter((t) => Number(t.slice(0, 2)) > now.getHours());
}

function BookForm({ p, sv }: { p: Provider; sv: Service }) {
  const { state, set } = useStore();
  const bookings = useMyBookings();
  const contact = useMyContact();
  const toast = useToast();
  const { wide } = useLayout();
  const days = useMemo(() => nextDays(7), []);

  const [mode, setMode] = useState<Mode>(p.modes.includes(state.serviceMode) ? state.serviceMode : p.modes[0] ?? 'shop');
  const [whenPicked, setWhen] = useState<'now' | 'later'>('now');
  const [day, setDay] = useState(days[0].id);
  const [time, setTime] = useState('');
  const [staff, setStaff] = useState('');
  const [address, setAddress] = useState(state.address);
  const [pay, setPay] = useState<PayMethod>('mpesa');
  // null until edited, so the saved name and phone show once they load.
  const [nameEdit, setName] = useState<string | null>(null);
  const [phoneEdit, setPhone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const name = nameEdit ?? contact?.name ?? '';
  const phone = phoneEdit ?? contact?.phone ?? '';

  const live = bookings.live;
  const home = mode === 'home';
  // "As soon as possible" needs the business online; demo listings always are.
  const asapOk = !live || p.online !== false;
  const when = asapOk ? whenPicked : 'later';
  // Until client locations exist, live listings have no distance, so the base travel fee applies.
  const travel = home ? travelFee(p.km ?? 0) : 0;
  const total = sv.price + travel + SERVICE_FEE;
  const needsTime = !home || when === 'later';
  const slots = slotsFor(day, days[0].id);
  const timeOk = !needsTime || slots.includes(time);
  const missing = home && !address.trim() ? 'Add your address to continue.'
    : live && home && !phone.trim() ? 'Add a phone number so they can reach you.'
    : !timeOk ? 'Pick a time to continue.' : '';
  const requestNow = home && when === 'now';

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      const id = await bookings.create({
        providerId: p.id, providerName: p.name, serviceId: sv.id, serviceName: sv.name,
        mode, when: home ? when : 'later', day, time: needsTime ? time : '', staff, address: home ? address.trim() : '',
        pay, name: name.trim(), phone: phone.trim(), price: sv.price, travel, fee: SERVICE_FEE, total,
      });
      if (home) set({ address: address.trim() });
      toast(live ? `Request sent to ${p.name}` : requestNow ? 'Request sent to nearby providers' : 'Booking confirmed');
      router.replace({ pathname: '/booking/[id]', params: { id } });
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
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
              {asapOk ? (
                <Segmented label="When" options={[{ id: 'now', label: 'As soon as possible' }, { id: 'later', label: 'Schedule' }]} value={when} onChange={setWhen} />
              ) : (
                <T v="small" muted>{p.name} is offline right now, so pick a time below.</T>
              )}
            </View>
          )}

          {needsTime && (
            <View style={{ gap: 10 }}>
              <T v="h3">Day</T>
              <PillRow label="Day">{days.map((d) => <Pill key={d.id} label={d.label} selected={d.id === day} onPress={() => setDay(d.id)} />)}</PillRow>
              <T v="h3">Time</T>
              {slots.length ? (
                <PillRow label="Time">{slots.map((t) => <Pill key={t} label={t} selected={t === time} onPress={() => setTime(t)} />)}</PillRow>
              ) : <T v="small" muted>No times left today. Pick another day.</T>}
            </View>
          )}

          {live && (
            <View style={{ gap: 10 }}>
              <T v="h3">Your details</T>
              <Field label="Your name (optional)" value={name} onChangeText={setName} autoComplete="name" />
              <Field label={home ? 'Phone number' : 'Phone number (optional)'} value={phone} onChangeText={setPhone}
                autoComplete="tel" keyboardType="phone-pad" inputMode="tel" placeholder="e.g. 0712 345 678" />
              <T v="small" muted>{p.name} sees these to confirm your booking{home ? ' and find you' : ''}.</T>
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
                    <Glass style={[{ borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }, on && { borderColor: C.gold, borderWidth: 2 }]}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? C.gold : veil(0.4), alignItems: 'center', justifyContent: 'center' }}>
                        {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.gold }} />}
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
            ...(home ? [{ label: p.km != null ? `Travel fee (${p.km.toFixed(1)} km)` : 'Travel fee (from)', value: money(travel) }] : []),
            { label: SERVICE_FEE_LABEL, value: money(SERVICE_FEE) },
            { label: 'Total', value: money(total), total: true },
          ]} />
          <Btn block label={busy ? 'Sending…' : live ? 'Send booking request' : requestNow ? 'Request now' : 'Confirm booking'}
            disabled={!!missing || busy} onPress={confirm} />
          {error ? <View role="alert"><T v="small" style={{ color: STATUS_TONES.bad[1] }}>{error}</T></View> : null}
          <T v="small" muted>{missing || (live
            ? `${p.name} confirms your booking. No payment is taken in the app yet.`
            : 'You are charged when the provider accepts. Payment is released to them once the service is done.')}</T>
        </Glass>
      </View>
    </Screen>
  );
}
