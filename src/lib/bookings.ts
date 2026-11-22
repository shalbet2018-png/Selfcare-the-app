// Bookings: labels and helpers, plus the hooks screens use to read and change them.
// Connected: the database (see supabase/bookings.sql), updated live. Not connected: the device store.
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './auth';
import type { PayMethod } from './config';
import type { Mode } from './data';
import { useStore, type Booking, type BookingStatus } from './store';
import { supabase } from './supabase';
import { STATUS_TONES } from './theme';

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'Waiting to be accepted',
  confirmed: 'Confirmed',
  'on-the-way': 'On the way',
  arrived: 'Arrived',
  done: 'Completed',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<BookingStatus, readonly [string, string]> = {
  requested: STATUS_TONES.waiting,
  'on-the-way': STATUS_TONES.waiting,
  arrived: STATUS_TONES.waiting,
  confirmed: STATUS_TONES.good,
  done: STATUS_TONES.good,
  cancelled: STATUS_TONES.bad,
};

export function whenText(b: Pick<Booking, 'mode' | 'when' | 'day' | 'time'>) {
  if (b.mode === 'home' && b.when === 'now') return 'As soon as possible';
  const [y, m, d] = b.day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · ${b.time}`;
}

export function stepsFor(b: Booking): BookingStatus[] {
  return b.mode === 'home' ? ['requested', 'confirmed', 'on-the-way', 'arrived', 'done'] : ['requested', 'confirmed', 'done'];
}

/** True while a booking still needs something to happen. */
export const isActive = (s: BookingStatus) => s !== 'done' && s !== 'cancelled';

// ---------------------------------------------------------------------------------------
// Rows from the database
// ---------------------------------------------------------------------------------------
type Contact = { address: string; client_phone: string };
type Row = {
  id: string; created_at: string; status: BookingStatus; provider_id: string; provider_name: string; service_name: string;
  mins: number; mode: Mode; asap: boolean; starts_at: string | null; staff: string;
  client_name: string; pay_method: PayMethod;
  price: number; travel_fee: number; service_fee: number; total: number; cancel_fee: number;
  cancelled_by: 'client' | 'provider' | null;
  distance_km: number | null;
  // Empty unless this person may see it: the client always; the business only while the job is on.
  booking_contacts: Contact | Contact[] | null;
};
const COLUMNS = 'id, created_at, status, provider_id, provider_name, service_name, mins, mode, asap, starts_at, staff, '
  + 'client_name, pay_method, price, travel_fee, service_fee, total, cancel_fee, cancelled_by, distance_km, booking_contacts(address, client_phone)';

const pad = (n: number) => String(n).padStart(2, '0');

function toBooking(r: Row): Booking {
  const at = r.starts_at ? new Date(r.starts_at) : null;
  const contact = Array.isArray(r.booking_contacts) ? r.booking_contacts[0] : r.booking_contacts;
  return {
    id: r.id, createdAt: r.created_at, status: r.status,
    providerId: r.provider_id, providerName: r.provider_name, serviceName: r.service_name,
    mode: r.mode, when: r.asap ? 'now' : 'later',
    day: at ? `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` : '',
    time: at ? `${pad(at.getHours())}:${pad(at.getMinutes())}` : '',
    staff: r.staff, address: contact?.address ?? '', pay: r.pay_method,
    price: r.price, travel: r.travel_fee, fee: r.service_fee, total: r.total, cancelFee: r.cancel_fee || undefined,
    cancelledBy: r.cancelled_by ?? undefined, clientName: r.client_name, clientPhone: contact?.client_phone ?? '', mins: r.mins,
    km: r.distance_km != null ? Number(r.distance_km) : undefined,
  };
}

let channelSeq = 0;

/** Loads bookings matching one column, and reloads whenever one of them changes. */
function useLiveBookings(column: 'client_id' | 'provider_id', value: string | null) {
  const [loaded, setLoaded] = useState<{ key: string; list: Booking[] } | null>(null);
  const [error, setError] = useState('');
  const key = value ? `${column}:${value}` : '';

  const load = useCallback(async (): Promise<Booking[] | string> => {
    const { data, error: e } = await supabase!.from('bookings').select(COLUMNS)
      .eq(column, value!).order('created_at', { ascending: false }).limit(200);
    return e ? e.message : (data as unknown as Row[]).map(toBooking);
  }, [column, value]);

  const apply = useCallback((r: Booking[] | string) => {
    if (typeof r === 'string') setError(r);
    else { setError(''); setLoaded({ key, list: r }); }
  }, [key]);

  useEffect(() => {
    if (!supabase || !value) return;
    const db = supabase;
    let stale = false;
    const refresh = () => load().then((r) => { if (!stale) apply(r); });
    refresh();
    // A fresh name per subscription: removeChannel() finishes asynchronously, and supabase-js hands back an
    // existing channel with the same name, so reusing one throws "cannot add postgres_changes callbacks
    // after subscribe()" when this effect runs again (leaving and returning to the screen, React dev mode).
    const channel = db.channel(`bookings-${key}-${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `${column}=eq.${value}` }, refresh)
      .subscribe();
    return () => { stale = true; db.removeChannel(channel); };
  }, [column, value, key, load, apply]);

  const reload = useCallback(async () => { if (supabase && value) apply(await load()); }, [value, load, apply]);
  const list = loaded && loaded.key === key ? loaded.list : null;
  return { list, error, reload };
}

async function setStatus(id: string, status: BookingStatus) {
  const { error } = await supabase!.rpc('set_booking_status', { p_booking: id, p_status: status });
  if (error) throw error;
}

// ---------------------------------------------------------------------------------------
// The client's own bookings
// ---------------------------------------------------------------------------------------
export type NewBooking = {
  providerId: string; providerName: string; serviceId: string; serviceName: string; mode: Mode;
  when: 'now' | 'later'; day: string; time: string; staff: string; address: string; pay: PayMethod;
  name: string; phone: string;
  /** Home visits: where the client is, so the database can check the distance. */
  lat?: number; lng?: number;
  // Shown to the client before booking; the database works out its own figures when connected.
  price: number; travel: number; fee: number; total: number;
};

export function useMyBookings() {
  const store = useStore();
  const { userId, ready } = useAuth();
  const live = useLiveBookings('client_id', supabase ? userId : null);

  if (!supabase) {
    return {
      live: false, loading: false, needsSignIn: false, error: '', list: store.state.bookings,
      reload: async () => {},
      create: async (n: NewBooking) => {
        const b = store.addBooking({
          providerId: n.providerId, providerName: n.providerName, serviceName: n.serviceName,
          mode: n.mode, when: n.when, day: n.day, time: n.time, staff: n.staff, address: n.address,
          pay: n.pay, price: n.price, travel: n.travel, fee: n.fee, total: n.total,
          status: n.mode === 'home' && n.when === 'now' ? 'requested' : 'confirmed',
        });
        return b.id;
      },
      cancel: async (b: Booking, fee: number) => store.updateBooking(b.id, { status: 'cancelled', cancelFee: fee }),
      /** Demo only: moves a booking along as the provider would. */
      demoAdvance: ((b: Booking) => {
        const steps = stepsFor(b);
        store.updateBooking(b.id, { status: steps[Math.min(steps.indexOf(b.status) + 1, steps.length - 1)] });
      }) as ((b: Booking) => void) | null,
    };
  }

  const db = supabase;
  return {
    live: true,
    loading: !ready || (!!userId && !live.list && !live.error),
    needsSignIn: ready && !userId,
    error: live.error,
    list: live.list ?? [],
    reload: live.reload,
    create: async (n: NewBooking) => {
      const startsAt = n.when === 'now' && n.mode === 'home' ? null : new Date(`${n.day}T${n.time}:00`).toISOString();
      const { data, error } = await db.rpc('create_booking', {
        p_service: n.serviceId, p_mode: n.mode, p_asap: n.mode === 'home' && n.when === 'now', p_starts_at: startsAt,
        p_staff: n.staff, p_address: n.address, p_pay: n.pay, p_name: n.name, p_phone: n.phone,
        p_lat: n.mode === 'home' ? n.lat ?? null : null, p_lng: n.mode === 'home' ? n.lng ?? null : null,
      });
      if (error) throw error;
      await live.reload();
      return data as string;
    },
    cancel: async (b: Booking) => { await setStatus(b.id, 'cancelled'); await live.reload(); },
    demoAdvance: null as ((b: Booking) => void) | null,
  };
}

// ---------------------------------------------------------------------------------------
// Bookings for the signed-in business (connected only)
// ---------------------------------------------------------------------------------------
export function useProviderBookings(providerId: string | null) {
  const live = useLiveBookings('provider_id', supabase ? providerId : null);
  return {
    list: live.list ?? [],
    loading: !!supabase && !!providerId && !live.list && !live.error,
    error: live.error,
    reload: live.reload,
    setStatus: async (id: string, status: BookingStatus) => { await setStatus(id, status); await live.reload(); },
  };
}

export type BusyTime = { start: number; end: number; staff: string };

/** Times a business is already booked over the next week, so the booking form can hide them. */
export function useBusyTimes(providerId: string) {
  const [busy, setBusy] = useState<{ id: string; list: BusyTime[] } | null>(null);
  useEffect(() => {
    if (!supabase) return;
    let stale = false;
    const from = new Date();
    const to = new Date(from.getTime() + 8 * 24 * 3600 * 1000);
    supabase.rpc('busy_times', { p_provider: providerId, p_from: from.toISOString(), p_to: to.toISOString() })
      .then(({ data }) => {
        if (stale) return;
        const rows = (data ?? []) as { starts_at: string; mins: number; staff: string }[];
        setBusy({
          id: providerId,
          list: rows.map((r) => {
            const start = new Date(r.starts_at).getTime();
            return { start, end: start + r.mins * 60_000, staff: r.staff };
          }),
        });
      });
    return () => { stale = true; };
  }, [providerId]);
  return busy && busy.id === providerId ? busy.list : [];
}

/** True when a slot is already full: that staff member is booked, or every chair is. */
export function slotTaken(busy: BusyTime[], start: number, mins: number, capacity: number, staff: string) {
  const end = start + mins * 60_000;
  const overlapping = busy.filter((b) => b.start < end && b.end > start);
  if (staff && overlapping.some((b) => b.staff === staff)) return true;
  return overlapping.length >= Math.max(1, capacity);
}

/** The signed-in person's saved name and phone, to fill in the booking form. */
export function useMyContact() {
  const { userId } = useAuth();
  const [contact, setContact] = useState<{ uid: string; name: string; phone: string } | null>(null);
  useEffect(() => {
    if (!supabase || !userId) return;
    let stale = false;
    supabase.from('profiles').select('full_name, phone').eq('id', userId).maybeSingle()
      .then(({ data }) => { if (!stale) setContact({ uid: userId, name: data?.full_name ?? '', phone: data?.phone ?? '' }); });
    return () => { stale = true; };
  }, [userId]);
  return contact && contact.uid === userId ? contact : null;
}
