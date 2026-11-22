// Where the business is and when it is open. The location gives clients real distances and lets
// the database check home visits are within the travel distance; the hours decide which times
// clients can book.
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { LoadingView } from '@/components/not-found';
import { Screen } from '@/components/screen';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { Back, Btn, Field, Glass, T } from '@/components/ui';
import { useBusiness } from '@/lib/business';
import { useToast } from '@/lib/feedback';
import { DAYS, hoursSet, hoursSummary, TIME, type DayKey, type OpenHours } from '@/lib/hours';
import { getDeviceLocation } from '@/lib/location';
import { friendly } from '@/lib/supabase';
import { C, F, R, STATUS_TONES, veil } from '@/lib/theme';

type Draft = Record<DayKey, { open: boolean; from: string; to: string }>;

const STARTER: Draft = Object.fromEntries(DAYS.map(([k]) => [k, { open: k !== 'sun', from: '09:00', to: '18:00' }])) as Draft;

function toDraft(h: OpenHours): Draft {
  if (!hoursSet(h)) return STARTER;
  return Object.fromEntries(DAYS.map(([k]) => {
    const v = h[k];
    return [k, v ? { open: true, from: v[0], to: v[1] } : { open: false, from: '09:00', to: '18:00' }];
  })) as Draft;
}

/** The draft as stored hours, or the first problem found. */
function fromDraft(d: Draft): { hours?: OpenHours; problem?: string } {
  const hours: OpenHours = {};
  for (const [k, , full] of DAYS) {
    const day = d[k];
    if (!day.open) continue;
    if (!TIME.test(day.from) || !TIME.test(day.to)) return { problem: `${full}: write times like 09:00 and 18:00.` };
    if (day.from >= day.to) return { problem: `${full}: the closing time must be after the opening time.` };
    hours[k] = [day.from, day.to];
  }
  if (!Object.keys(hours).length) return { problem: 'Open at least one day.' };
  return { hours };
}

export default function Hours() {
  const b = useBusiness();
  if (b.needsSignIn) return <SignInPrompt next="/biz/hours" title="Location and hours" body="Sign in to set where you are and when you are open." />;
  if (b.loading) return <LoadingView />;
  if (!b.biz.registered) return <Redirect href="/biz/register" />;
  return <HoursForm b={b} />;
}

function HoursForm({ b }: { b: ReturnType<typeof useBusiness> }) {
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(() => toDraft(b.openHours));
  const [busy, setBusy] = useState<'' | 'location' | 'hours'>('');
  const [error, setError] = useState('');
  const freelancer = b.biz.kind === 'freelancer';
  const checked = fromDraft(draft);

  const setDay = (k: DayKey, patch: Partial<Draft[DayKey]>) => setDraft((d) => ({ ...d, [k]: { ...d[k], ...patch } }));
  const copyMonday = () => setDraft((d) => ({ ...d, tue: { ...d.mon }, wed: { ...d.mon }, thu: { ...d.mon }, fri: { ...d.mon } }));

  const useHere = async () => {
    setBusy('location'); setError('');
    try {
      await b.setLocation(await getDeviceLocation());
      toast('Location saved');
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy('');
    }
  };

  const save = async () => {
    if (!checked.hours) return;
    setBusy('hours'); setError('');
    try {
      await b.saveHours(checked.hours);
      toast('Opening hours saved');
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy('');
    }
  };

  return (
    <Screen theme="business">
      <Back href="/biz/account" label="Account" />
      <T v="h1">Location and hours</T>

      {!b.live ? (
        <Glass style={{ padding: 22, maxWidth: 640 }}>
          <T muted>This preview runs on demo data, so location and hours are not saved. They work once the app is connected to Selfcare.</T>
        </Glass>
      ) : (
        <>
          <Glass style={{ padding: 22, gap: 12, maxWidth: 760 }}>
            <T v="h3">{freelancer ? 'Where you start from' : 'Where your shop is'}</T>
            <T v="small" muted>
              {freelancer
                ? 'Tap the button from where you usually set off for home visits. Clients see how far you are, never your exact spot.'
                : 'Tap the button while you are at your shop. Clients see how far you are, and home visits are only offered within your travel distance.'}
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Btn kind={b.location ? 'outline' : 'light'} label={busy === 'location' ? 'Finding you…' : b.location ? 'Update to where I am now' : 'Use my current location'}
                disabled={!!busy} onPress={useHere} />
              <T v="small" style={{ color: b.location ? STATUS_TONES.good[1] : STATUS_TONES.waiting[1] }}>
                {b.location ? 'Location set' : 'Not set yet: home visits stay off until you set it'}
              </T>
            </View>
            <T v="small" muted>You travel up to {b.biz.radiusKm} km for home visits. Change this in Business details.</T>
          </Glass>

          <Glass style={{ padding: 22, gap: 14, maxWidth: 760 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <T v="h3">Opening hours</T>
              <Btn small kind="ghost" label="Copy Monday to Tue–Fri" onPress={copyMonday} />
            </View>
            <T v="small" muted>
              {hoursSet(b.openHours) ? `Now: ${hoursSummary(b.openHours)}` : 'Not set yet, so clients can pick any time. Set your hours so they only book when you are open.'}
            </T>
            {DAYS.map(([k, , full]) => {
              const day = draft[k];
              return (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 }}>
                  <T v="strong" style={{ width: 100 }}>{full}</T>
                  <Pressable role="switch" aria-checked={day.open} accessibilityLabel={`${full} open`} onPress={() => setDay(k, { open: !day.open })}
                    style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: R.pill, justifyContent: 'center',
                      backgroundColor: day.open ? C.gold : veil(0.08) }}>
                    <Text style={{ fontFamily: F.body600, fontSize: 13, color: day.open ? C.onGold : C.muted }}>{day.open ? 'Open' : 'Closed'}</Text>
                  </Pressable>
                  {day.open ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Field label="From" value={day.from} onChangeText={(t) => setDay(k, { from: t })} placeholder="09:00"
                        inputMode="numeric" style={{ width: 92 }} />
                      <Field label="To" value={day.to} onChangeText={(t) => setDay(k, { to: t })} placeholder="18:00"
                        inputMode="numeric" style={{ width: 92 }} />
                    </View>
                  ) : null}
                </View>
              );
            })}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Btn kind="light" label={busy === 'hours' ? 'Saving…' : 'Save opening hours'} disabled={!!busy || !checked.hours} onPress={save} />
              <T v="small" muted>{checked.problem ?? `Clients will see: ${hoursSummary(checked.hours)}`}</T>
            </View>
          </Glass>

          {error ? <View role="alert"><T v="small" style={{ color: STATUS_TONES.bad[1] }}>{error}</T></View> : null}
        </>
      )}
    </Screen>
  );
}
