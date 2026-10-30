// Tiny persistent store. Everything lives on this device for now; a backend
// (accounts, payments, verification) replaces this later.

const KEY = 'selfcare-v1';

const defaults = {
  mode: 'client',            // 'client' | 'business'
  serviceMode: 'shop',       // 'shop' | 'home'
  bookings: [],
  address: '',
  business: {
    registered: false,
    kind: 'business',        // 'business' | 'freelancer'
    name: '',
    area: '',
    radiusKm: 10,
    payout: 'daily',
    verification: 'not-started', // not-started | submitted | in-review | approved
    online: false,
    services: []
  }
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    const saved = JSON.parse(raw);
    return { ...structuredClone(defaults), ...saved, business: { ...defaults.business, ...(saved.business || {}) } };
  } catch {
    return structuredClone(defaults);
  }
}

let state = load();
const listeners = new Set();

export function get() {
  return state;
}

export function set(patch) {
  state = { ...state, ...patch };
  save();
}

export function setBusiness(patch) {
  state = { ...state, business: { ...state.business, ...patch } };
  save();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: keep in memory */ }
  listeners.forEach((fn) => fn(state));
}

export function addBooking(b) {
  const booking = { id: 'b' + Date.now().toString(36), createdAt: new Date().toISOString(), status: 'confirmed', ...b };
  set({ bookings: [booking, ...state.bookings] });
  return booking;
}

export function updateBooking(id, patch) {
  set({ bookings: state.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
}

export function reset() {
  state = structuredClone(defaults);
  save();
}
