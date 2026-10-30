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
  requested: ['#F4E3C9', '#5C3D0E'],
  'on-the-way': ['#F4E3C9', '#5C3D0E'],
  arrived: ['#F4E3C9', '#5C3D0E'],
  confirmed: ['#DCEBE4', '#234A40'],
  done: ['#DCEBE4', '#234A40'],
  cancelled: ['#EFD9DC', '#6B2430'],
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
