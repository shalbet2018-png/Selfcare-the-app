import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { LoadingView, NotFoundView } from '@/components/not-found';
import { Screen } from '@/components/screen';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { Back, Btn, Field, Glass, Lines, Pill, PillRow, Segmented, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { slotTaken, useBusyTimes, useMyBookings, useMyContact, type BusyTime } from '@/lib/bookings';
import { money, PAYMENT_METHODS, SERVICE_FEE, SERVICE_FEE_LABEL, travelFee, type PayMethod } from '@/lib/config';
import { MODE_OPTIONS, type Mode, type Provider, type Service } from '@/lib/data';
import { closedOn, fitsHours, hoursSet, hoursSummary } from '@/lib/hours';
import { getDeviceLocation, kmBetween, roundKm } from '@/lib/location';
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
  if (userId && p.ownerId === userId) {
    return (
      <Screen theme={themeForCategory(p.category)}>
        <Back href={{ pathname: '/provider/[id]', params: { id: p.id } }} label={p.name} />
        <T v="h1">This is your listing</T>
        <Glass style={{ padding: 22, gap: 12, maxWidth: 560 }}>
          <T muted>You cannot book your own services. To test a booking, sign in with a different email on another device.</T>
          <Btn label="Go to your dashboard" href="/biz" />
        </Glass>
      </Screen>
    );
  }
  return <BookForm p={p} sv={sv} />;
}

/** Slot start as a time on this device's clock. */
const slotStart = (dayId: string, t: string) => new Date(`${dayId}T${t}:00`).getTime();

/** Slots that have not started yet, fit the opening hours, and still have room. */
function slotsFor(dayId: string, p: Provider, busy: BusyTime[], mins: number, staff: string) {
  const now = Date.now();
  return SLOTS.filter((t) => {
    const start = slotStart(dayId, t);
    // Same rules as the database: opening hours, and as many bookings at once as there are staff (at least one).
    return start > now && fitsHours(p.openHours, dayId, t, mins) && !slotTaken(busy, start, mins, p.staff.length, staff);
  });
}

function BookForm({ p, sv }: { p: Provider; sv: Service }) {
  const { state, set } = useStore();
  const bookings = useMyBookings();
  const contact = useMyContact();
  const busyTimes = useBusyTimes(p.id);
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
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const name = nameEdit ?? contact?.name ?? '';
  const phone = phoneEdit ?? contact?.phone ?? '';

  const live = bookings.live;
  const home = mode === 'home';
  // "As soon as possible" needs the business online; demo listings always are.
  const asapOk = !live || p.online !== false;
  const when = asapOk ? whenPicked : 'later';

  // Home visits: the distance from the client's shared location decides the travel fee and whether it is in reach.
  const here = state.location;
  const shopKnown = p.lat != null && p.lng != null;
  const km = live
    ? (here && shopKnown ? roundKm(kmBetween(here, { lat: p.lat!, lng: p.lng! })) : undefined)
    : p.km;
  const radius = p.radiusKm ?? 50;
  const outOfReach = live && home && km != null && km > radius;
  const travel = home ? travelFee(km ?? 0) : 0;
  const total = sv.price + travel + SERVICE_FEE;
  const needsTime = !home || when === 'later';
  const slots = slotsFor(day, p, busyTimes, sv.mins, home ? '' : staff);
  const timeOk = !needsTime || slots.includes(time);
  const missing = live && home && !shopKnown ? `${p.name} has not set their location yet, so home visits are not available. Book at the shop instead.`
    : home && !address.trim() ? 'Add your address to continue.'
    : live && home && !phone.trim() ? 'Add a phone number so they can reach you.'
    : live && home && km == null ? 'Share your location so we can check they can reach you.'
    : outOfReach ? `${p.name} travels up to ${radius} km, and you are ${km} km away. Book at the shop or pick someone closer.`
    : !timeOk ? 'Pick a time to continue.' : '';

  const shareLocation = async () => {
    setLocating(true); setError('');
    try {
      const pt = await getDeviceLocation();
      set({ location: { ...pt, at: new Date().toISOString() } });
    } catch (e) {
      setError(friendly(e));
    } finally {
      setLocating(false);
    }
  };
  const requestNow = home && when === 'now';

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      const id = await bookings.create({
        providerId: p.id, providerName: p.name, serviceId: sv.id, serviceName: sv.name,
        mode, when: home ? when : 'later', day, time: needsTime ? time : '', staff, address: home ? address.trim() : '',
        pay, name: name.trim(), phone: phone.trim(), price: sv.price, travel, fee: SERVICE_FEE, total,
        ...(home && here ? { lat: here.lat, lng: here.lng } : {}),
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
              {live && shopKnown ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Btn small kind={km == null ? 'light' : 'outline'} label={locating ? 'Finding you…' : km == null ? 'Use my location' : 'Update my location'}
                    disabled={locating} onPress={shareLocation} />
                  <T v="small" style={{ color: outOfReach ? STATUS_TONES.bad[1] : C.muted, flexShrink: 1 }}>
                    {km == null ? `So we can check ${p.name} can reach you and work out the travel fee. Only shared with them if they accept.`
                      : outOfReach ? `You are ${km} km away; ${p.name} travels up to ${radius} km.`
                      : `You are ${km} km away. ${p.name} travels up to ${radius} km.`}
                  </T>
                </View>
              ) : null}
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
              ) : <T v="small" muted>{closedOn(p.openHours, day) ? `${p.name} is closed on this day. Pick another day.` : 'No free times on this day. Pick another day.'}</T>}
              {hoursSet(p.openHours) ? <T v="small" muted>Open: {hoursSummary(p.openHours)}</T> : null}
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
            ...(home ? [{ label: km != null ? `Travel fee (${km.toFixed(1)} km)` : 'Travel fee (from)', value: money(travel) }] : []),
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
