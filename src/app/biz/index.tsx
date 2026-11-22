import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { CardGrid } from '@/components/provider-card';
import { Screen } from '@/components/screen';
import { Btn, DarkCtx, Glass, Lines, Segmented, T } from '@/components/ui';
import { CITY, money, PAYOUT_OPTIONS, travelFee } from '@/lib/config';
import { useConfirm, useToast } from '@/lib/feedback';
import { hoursSet } from '@/lib/hours';
import { useLayout } from '@/lib/layout';
import { LoadingView } from '@/components/not-found';
import { isActive, useProviderBookings, whenText } from '@/lib/bookings';
import { useBusiness, VERIFY_LABEL } from '@/lib/business';
import { useStore, type Booking, type BookingStatus } from '@/lib/store';
import { friendly } from '@/lib/supabase';
import { C, F, veil } from '@/lib/theme';
import { IS_BUSINESS_APP } from '@/lib/variant';

// Demo incoming requests, shown one at a time while the business is online.
const DEMO_REQUESTS = [
  { service: 'Lash fill', client: 'Demo client A', km: 3.2, price: 1500, mins: 60 },
  { service: 'Gel manicure', client: 'Demo client B', km: 1.8, price: 1500, mins: 45 },
  { service: 'Cornrows', client: 'Demo client C', km: 5.0, price: 1200, mins: 90 },
];

export default function Dashboard() {
  // Connected: listing, verification, online status, payouts and bookings all come from the backend.
  // Demo: the sample requests and jobs below live on this device.
  const b = useBusiness();
  const bookings = useProviderBookings(b.providerId);
  const { setBusiness } = useStore();
  const toast = useToast();
  const confirmAsync = useConfirm();
  const { wide } = useLayout();
  const biz = b.biz;
  const attempt = (work: Promise<unknown>, done?: string) => work.then(() => done && toast(done), (e) => toast(friendly(e)));

  if (b.loading) return <LoadingView />;
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
  const earned = b.live
    ? bookings.list.filter((x) => x.status === 'done').reduce((s, x) => s + x.price + x.travel, 0)
    : biz.jobs.filter((j) => j.status === 'done').reduce((s, j) => s + j.price + j.travel, 0);
  const upcoming = biz.jobs.filter((j) => j.status === 'accepted');
  // Oldest request first, so nobody waits longest.
  const requests = bookings.list.filter((x) => x.status === 'requested').reverse();
  const jobs = bookings.list.filter((x) => isActive(x.status) && x.status !== 'requested').reverse();

  // What is still missing from the listing, most important first.
  type Step = [title: string, why: string, label: string, href: '/biz/hours' | '/biz/photos'];
  const setup: Step[] = [];
  if (!b.location) setup.push(['Set your location', 'Needed for home visits, and so clients see how far you are.', 'Set location', '/biz/hours']);
  if (!hoursSet(b.openHours)) setup.push(['Set your opening hours', 'So clients only book times when you are open.', 'Set hours', '/biz/hours']);
  if (!b.photos.length) setup.push(['Add photos', 'Clients choose with their eyes. Show your shop and your best work.', 'Add photos', '/biz/photos']);

  const move = (x: Booking, status: BookingStatus, done: string) => attempt(bookings.setStatus(x.id, status), done);
  const decline = async (x: Booking) => {
    if (await confirmAsync('Decline this request?', `${x.clientName || 'The client'} is told you cannot take it. They are not charged.`, 'Decline')) {
      move(x, 'cancelled', 'Request declined');
    }
  };
  const cancelJob = async (x: Booking) => {
    if (await confirmAsync('Cancel this booking?', `${x.clientName || 'The client'} is told you cancelled. They are not charged.`, 'Cancel booking')) {
      move(x, 'cancelled', 'Booking cancelled');
    }
  };

  const liveRequestCard = (
    <DarkCtx.Provider value={false}>
      <Glass light style={{ padding: 22, gap: 12, flex: wide ? 1.2 : undefined }}>
        {requests.length ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <T v="eyebrow" accent>{requests.length === 1 ? 'New booking request' : `${requests.length} booking requests`}</T>
              <T v="small" muted>Respond soon</T>
            </View>
            {requests.map((x) => (
              <View key={x.id} style={{ gap: 10, paddingTop: 4 }}>
                <T v="h2">{x.serviceName}</T>
                <T muted>
                  {x.clientName || 'Client'}{x.clientPhone ? ` · ${x.clientPhone}` : ''} · {x.mode === 'home' ? `Home visit${x.km != null ? `, ${x.km.toFixed(1)} km away` : ''}` : 'At the shop'} · {whenText(x)}
                </T>
                {x.mode === 'home' ? (
                  <T v="small" muted>{x.address ? `Address: ${x.address}` : 'You get the address and phone number once you accept.'}</T>
                ) : null}
                {x.staff ? <T v="small" muted>Asked for: {x.staff}</T> : null}
                <View style={{ backgroundColor: veil(0.06), borderRadius: 16, padding: 14 }}>
                  <Lines rows={[
                    { label: 'Your price', value: money(x.price) },
                    ...(x.travel ? [{ label: 'Travel fee', value: money(x.travel) }] : []),
                    { label: 'You receive', value: money(x.price + x.travel), total: true },
                  ]} />
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Btn kind="outline" label="Decline" style={{ flex: 1, alignSelf: 'auto' }} onPress={() => decline(x)} />
                  <Btn label="Accept" style={{ flex: 2, alignSelf: 'auto' }} onPress={() => move(x, 'confirmed', 'Accepted. The client has been told.')} />
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            <T v="h3">{approved ? 'No new requests' : 'Requests appear here'}</T>
            <T muted>
              {!approved ? 'After approval, clients can book you and their requests show here.'
                : biz.online ? 'New booking requests show here as soon as they arrive.'
                : 'Shop bookings still come in. Go online to also take “as soon as possible” home requests.'}
            </T>
          </>
        )}
      </Glass>
    </DarkCtx.Provider>
  );

  const nextStep = (x: Booking): [BookingStatus, string, string] | null =>
    x.status === 'confirmed' ? (x.mode === 'home' ? ['on-the-way', 'On my way', 'The client knows you are on the way.'] : ['done', 'Mark done', 'Marked done.'])
      : x.status === 'on-the-way' ? ['arrived', 'I have arrived', 'The client knows you have arrived.']
      : x.status === 'arrived' ? ['done', 'Mark done', 'Marked done.']
      : null;

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
            <View style={{ backgroundColor: veil(0.06), borderRadius: 16, padding: 14 }}>
              <Lines rows={[
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
          onPress={() => attempt(b.setOnline(!biz.online), biz.online ? 'You are offline' : 'You are online')}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 20, borderRadius: 999,
            borderWidth: 1, borderColor: biz.online ? C.sage : veil(0.25),
            backgroundColor: biz.online ? 'rgba(143,211,188,0.16)' : veil(0.07), opacity: approved ? 1 : 0.5,
          }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: biz.online ? C.sage : '#9A93A0' }} />
          <Text style={{ fontFamily: F.body500, fontSize: 16, color: biz.online ? C.sage : C.onNight }}>{biz.online ? 'Online' : 'Offline'}</Text>
        </Pressable>
      </View>

      {!approved && (
        <Glass style={{ padding: 22, flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <Icon name="shield" size={24} color={C.onNight} />
          <View style={{ flex: 1, gap: 8, alignItems: 'flex-start' }}>
            <T v="h3">Verification: {VERIFY_LABEL[biz.verification]}</T>
            {biz.verification === 'rejected' ? (
              <>
                <T v="small" muted>{b.reviewNote || 'Selfcare could not approve your documents yet.'}</T>
                <Btn small kind="light" label="Fix and resubmit" href="/biz/register" />
              </>
            ) : biz.verification === 'not-started' ? (
              <>
                <T v="small" muted>Upload your documents so Selfcare can check them.</T>
                <Btn small kind="light" label="Upload documents" href="/biz/register" />
              </>
            ) : (
              <T v="small" muted>You can take bookings once Selfcare has checked your documents{b.live ? '. This usually takes 1 to 2 working days.' : '.'}</T>
            )}
            {b.demoApprove ? <Btn small kind="outline" label="Demo: approve my account" onPress={() => { b.demoApprove?.(); toast('Account approved (demo)'); }} /> : null}
          </View>
        </Glass>
      )}

      {b.live && setup.length ? (
        <Glass style={{ padding: 18, gap: 12 }}>
          <T v="strong">Finish setting up your listing</T>
          {setup.map(([title, why, label, href]) => (
            <View key={title} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flexShrink: 1, gap: 2 }}>
                <T>{title}</T>
                <T v="small" muted>{why}</T>
              </View>
              <Btn small kind="light" label={label} href={href} />
            </View>
          ))}
        </Glass>
      ) : null}

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14, alignItems: wide ? 'flex-start' : 'stretch' }}>
        {b.live ? liveRequestCard : requestCard}
        <Glass style={{ padding: 22, gap: 10, flex: wide ? 1 : undefined }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="wallet" size={20} color={C.onNight} />
            <T v="h3">Earnings</T>
          </View>
          <T v="big">{money(earned)}</T>
          <T v="small" muted>
            {b.live ? 'From completed bookings.' : 'From completed services on this device.'} Clients pay the service fee, so you keep your full price.
          </T>
          <T v="label" muted style={{ marginTop: 6 }}>Get paid</T>
          <Segmented label="Payout schedule" options={PAYOUT_OPTIONS} value={biz.payout}
            onChange={(v) => attempt(b.setPayout(v), `Payouts: ${PAYOUT_OPTIONS.find((o) => o.id === v)!.label.toLowerCase()}`)} />
        </Glass>
      </View>

      <Glass style={{ padding: 22, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="calendar" size={20} color={C.onNight} />
          <T v="h3">Upcoming jobs</T>
        </View>
        {b.live ? (
          jobs.length ? jobs.map((x) => {
            const step = nextStep(x);
            return (
              <View key={x.id} style={{ gap: 10, padding: 14, borderRadius: 16, backgroundColor: veil(0.06) }}>
                <View style={{ flexShrink: 1, gap: 2 }}>
                  <T v="strong">{x.serviceName} · {whenText(x)}</T>
                  <T v="small" muted>
                    {x.clientName || 'Client'}{x.clientPhone ? ` · ${x.clientPhone}` : ''} · {x.mode === 'home' ? x.address || 'Home visit' : 'At the shop'} · {money(x.price + x.travel)}
                  </T>
                  {x.status !== 'confirmed' ? <T v="small" accent>{x.status === 'on-the-way' ? 'On the way' : 'Arrived'}</T> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  {step ? <Btn small kind="light" label={step[1]} onPress={() => move(x, step[0], step[2])} /> : null}
                  {x.status === 'confirmed' ? <Btn small kind="ghost" label="Cancel" onPress={() => cancelJob(x)} /> : null}
                </View>
              </View>
            );
          }) : <T v="small" muted>{bookings.error ? 'Could not load bookings. Check your connection.' : 'No upcoming jobs. Accepted bookings show here.'}</T>
        ) : upcoming.length ? upcoming.map((j) => (
          <View key={j.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, borderRadius: 16, backgroundColor: veil(0.06) }}>
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
