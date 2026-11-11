import type { Booking, BookingStatus } from './store';

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'Finding a provider',
  confirmed: 'Confirmed',
  'on-the-way': 'On the way',
  arrived: 'Arrived',
  done: 'Completed',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<BookingStatus, [string, string]> = {
  requested: ['rgba(227,194,138,0.16)', '#EBD3A6'],
  'on-the-way': ['rgba(227,194,138,0.16)', '#EBD3A6'],
  arrived: ['rgba(227,194,138,0.16)', '#EBD3A6'],
  confirmed: ['rgba(143,211,188,0.16)', '#A6E3CE'],
  done: ['rgba(143,211,188,0.16)', '#A6E3CE'],
  cancelled: ['rgba(240,130,150,0.16)', '#F5ABB8'],
};

export function whenText(b: Booking) {
  if (b.mode === 'home' && b.when === 'now') return 'As soon as possible';
  const [y, m, d] = b.day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · ${b.time}`;
}

export function stepsFor(b: Booking): BookingStatus[] {
  return b.mode === 'home' ? ['requested', 'confirmed', 'on-the-way', 'arrived', 'done'] : ['confirmed', 'done'];
}
