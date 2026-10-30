// App state, saved on the device. A backend (accounts, payments,
// verification) replaces this later.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { PayMethod, Payout } from './config';
import type { Mode } from './data';

export type BookingStatus = 'requested' | 'confirmed' | 'on-the-way' | 'arrived' | 'done' | 'cancelled';
export type Booking = {
  id: string; createdAt: string; status: BookingStatus;
  providerId: string; providerName: string; serviceName: string;
  mode: Mode; when: 'now' | 'later'; day: string; time: string; staff: string; address: string;
  pay: PayMethod; price: number; travel: number; fee: number; total: number; cancelFee?: number;
};
export type BizService = { name: string; price: number; mins: number; where: 'shop' | 'home' | 'both' };
export type Job = { id: string; service: string; client: string; km: number; price: number; mins: number; travel: number; status: 'accepted' | 'done' };
export type Verification = 'not-started' | 'submitted' | 'in-review' | 'approved';
export type Business = {
  registered: boolean; kind: 'business' | 'freelancer'; name: string; area: string; radiusKm: number;
  payout: Payout; verification: Verification; online: boolean;
  services: BizService[]; jobs: Job[]; requestIndex: number;
};
export type State = { serviceMode: Mode; address: string; bookings: Booking[]; business: Business };

const KEY = 'selfcare-v1';

const DEFAULTS: State = {
  serviceMode: 'shop',
  address: '',
  bookings: [],
  business: {
    registered: false, kind: 'business', name: '', area: '', radiusKm: 10,
    payout: 'daily', verification: 'not-started', online: false,
    services: [], jobs: [], requestIndex: 0,
  },
};

type Actions = {
  set: (patch: Partial<State>) => void;
  setBusiness: (patch: Partial<Business>) => void;
  addBooking: (b: Omit<Booking, 'id' | 'createdAt'>) => Booking;
  updateBooking: (id: string, patch: Partial<Booking>) => void;
  reset: () => void;
};

const Ctx = createContext<{ state: State; ready: boolean } & Actions>(null as never);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<State>;
        setState({ ...DEFAULTS, ...saved, business: { ...DEFAULTS.business, ...(saved.business ?? {}) } });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const actions = useMemo<Actions>(() => ({
    set: (patch) => setState((s) => ({ ...s, ...patch })),
    setBusiness: (patch) => setState((s) => ({ ...s, business: { ...s.business, ...patch } })),
    addBooking: (b) => {
      const booking: Booking = { ...b, id: 'b' + Date.now().toString(36), createdAt: new Date().toISOString() };
      setState((s) => ({ ...s, bookings: [booking, ...s.bookings] }));
      return booking;
    },
    updateBooking: (id, patch) =>
      setState((s) => ({ ...s, bookings: s.bookings.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    reset: () => setState(DEFAULTS),
  }), []);

  return <Ctx.Provider value={{ state, ready, ...actions }}>{children}</Ctx.Provider>;
}

export function useStore() {
  return useContext(Ctx);
}
