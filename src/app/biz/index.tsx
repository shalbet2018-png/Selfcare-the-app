import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { CardGrid } from '@/components/provider-card';
import { Screen } from '@/components/screen';
import { Btn, DarkCtx, Glass, Lines, Segmented, T } from '@/components/ui';
import { CITY, money, PAYOUT_OPTIONS, travelFee } from '@/lib/config';
import { useToast } from '@/lib/feedback';
import { useLayout } from '@/lib/layout';
import { useStore, type Verification } from '@/lib/store';
import { C, F } from '@/lib/theme';
import { IS_BUSINESS_APP } from '@/lib/variant';

const VERIFY_LABEL: Record<Verification, string> = {
  'not-started': 'Not started', submitted: 'Submitted', 'in-review': 'In review', approved: 'Approved',
};

// Demo incoming requests, shown one at a time while the business is online.
const DEMO_REQUESTS = [
  { service: 'Lash fill', client: 'Demo client A', km: 3.2, price: 1500, mins: 60 },
  { service: 'Gel manicure', client: 'Demo client B', km: 1.8, price: 1500, mins: 45 },
  { service: 'Cornrows', client: 'Demo client C', km: 5.0, price: 1200, mins: 90 },
];

export default function Dashboard() {
  const { state, setBusiness } = useStore();
  const toast = useToast();
  const { wide } = useLayout();
  const biz = state.business;

  if (!biz.registered) {
    return (
      <Screen theme="business">
        <View style={{ gap: 16 }}>
          <T v="eyebrow" muted>Selfcare for Business · {CITY}</T>
          <T v="h1">Get found. Get booked. Get paid.</T>
          <T v="lead" muted>List your services, set your own prices, and take shop bookings and home calls from one app.</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Btn kind="light" label="Register your business" href="/biz/register" />
            {!IS_BUSINESS_APP && <Btn kind="outline" icon="swap" label="Back to Selfcare" onPress={() => router.navigate('/')} />}
          </View>
        </View>
        <CardGrid min={220} maxCols={3}>
          {[
            ['Your prices, your hours', 'Go online or offline whenever you like.'],
            ['Paid your way', 'After every service, daily or weekly.'],
            ['Verified badge', 'Upload your permit once; clients see you are checked.'],
          ].map(([h, b]) => (
            <Glass key={h} style={{ padding: 22, gap: 8, flex: 1 }}>
              <T v="h3">{h}</T>
              <T v="small" muted>{b}</T>
            </Glass>
          ))}
        </CardGrid>
      </Screen>
    );
  }

  const approved = biz.verification === 'approved';
  const req = DEMO_REQUESTS[biz.requestIndex % DEMO_REQUESTS.length];
  const earned = biz.jobs.filter((j) => j.status === 'done').reduce((s, j) => s + j.price + j.travel, 0);
  const upcoming = biz.jobs.filter((j) => j.status === 'accepted');

  const accept = () => {
    const job = { id: 'j' + Date.now().toString(36), ...req, travel: travelFee(req.km), status: 'accepted' as const };
    setBusiness({ jobs: [...biz.jobs, job], requestIndex: biz.requestIndex + 1 });
    toast('Accepted. Head to the client when ready.');
  };

  const requestCard = (
    <DarkCtx.Provider value={false}>
      <Glass light style={{ padding: 22, gap: 12, flex: wide ? 1.2 : undefined }}>
        {approved && biz.online ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <T v="eyebrow" accent>New home-service request</T>
              <T v="small" muted>Respond soon</T>
            </View>
            <T v="h2">{req.service}</T>
            <T muted>{req.client} · {req.km.toFixed(1)} km away · {req.mins} min</T>
            <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 14 }}>
              <Lines onCard rows={[
                { label: 'Your price', value: money(req.price) },
                { label: 'Travel fee (by distance)', value: money(travelFee(req.km)) },
                { label: 'You receive', value: money(req.price + travelFee(req.km)), total: true },
              ]} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn kind="outline" label="Decline" style={{ flex: 1, alignSelf: 'auto' }} onPress={() => setBusiness({ requestIndex: biz.requestIndex + 1 })} />
              <Btn label="Accept" style={{ flex: 2, alignSelf: 'auto' }} onPress={accept} />
            </View>
          </>
        ) : (
          <>
            <T v="h3">{approved ? 'You are offline' : 'Requests appear here'}</T>
            <T muted>{approved ? 'Go online to receive home-service requests near you.' : 'After approval, go online to start receiving requests.'}</T>
          </>
        )}
      </Glass>
    </DarkCtx.Provider>
  );

  return (
    <Screen theme="business">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
        <View style={{ flexShrink: 1 }}>
          <T v="eyebrow" muted>Selfcare for Business</T>
          <T v="h1">{biz.name || 'Your business'}</T>
        </View>
        <Pressable
          role="switch" aria-checked={biz.online} aria-disabled={!approved} disabled={!approved}
          accessibilityLabel="Receive requests"
          onPress={() => setBusiness({ online: !biz.online })}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 20, borderRadius: 999,
            borderWidth: 1, borderColor: biz.online ? '#DCEBE4' : 'rgba(255,255,255,0.25)',
            backgroundColor: biz.online ? '#DCEBE4' : 'rgba(255,255,255,0.07)', opacity: approved ? 1 : 0.5,
          }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: biz.online ? '#2F8A6B' : '#9A93A0' }} />
          <Text style={{ fontFamily: F.body500, fontSize: 16, color: biz.online ? '#234A40' : C.onNight }}>{biz.online ? 'Online' : 'Offline'}</Text>
        </Pressable>
      </View>

      {!approved && (
        <Glass style={{ padding: 22, flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <Icon name="shield" size={24} color={C.onNight} />
          <View style={{ flex: 1, gap: 8, alignItems: 'flex-start' }}>
            <T v="h3">Verification: {VERIFY_LABEL[biz.verification]}</T>
            <T v="small" muted>You can take bookings once Selfcare has checked your documents.</T>
            <Btn small kind="light" label="Demo: approve my account" onPress={() => { setBusiness({ verification: 'approved' }); toast('Account approved (demo)'); }} />
          </View>
        </Glass>
      )}

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14, alignItems: wide ? 'flex-start' : 'stretch' }}>
        {requestCard}
        <Glass style={{ padding: 22, gap: 10, flex: wide ? 1 : undefined }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="wallet" size={20} color={C.onNight} />
            <T v="h3">Earnings</T>
          </View>
          <T v="big">{money(earned)}</T>
          <T v="small" muted>From completed services on this device. Clients pay the service fee, so you keep your full price.</T>
          <T v="label" muted style={{ marginTop: 6 }}>Get paid</T>
          <Segmented label="Payout schedule" options={PAYOUT_OPTIONS} value={biz.payout}
            onChange={(v) => { setBusiness({ payout: v }); toast(`Payouts: ${PAYOUT_OPTIONS.find((o) => o.id === v)!.label.toLowerCase()}`); }} />
        </Glass>
      </View>

      <Glass style={{ padding: 22, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="calendar" size={20} color={C.onNight} />
          <T v="h3">Upcoming jobs</T>
        </View>
        {upcoming.length ? upcoming.map((j) => (
          <View key={j.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <View style={{ flexShrink: 1 }}>
              <T v="strong">{j.service}</T>
              <T v="small" muted>{j.client} · {j.km.toFixed(1)} km · {money(j.price + j.travel)}</T>
            </View>
            <Btn small kind="light" label="Mark done" onPress={() => {
              setBusiness({ jobs: biz.jobs.map((x) => (x.id === j.id ? { ...x, status: 'done' } : x)) });
              toast('Marked done. Payment released.');
            }} />
          </View>
        )) : <T v="small" muted>No upcoming jobs. Accepted requests and shop bookings show here.</T>}
      </Glass>
    </Screen>
  );
}
