import type { Booking, BookingStatus } from './store';
import { STATUS_TONES } from './theme';

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'Finding a provider',
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

export function whenText(b: Booking) {
  if (b.mode === 'home' && b.when === 'now') return 'As soon as possible';
  const [y, m, d] = b.day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · ${b.time}`;
}

export function stepsFor(b: Booking): BookingStatus[] {
  return b.mode === 'home' ? ['requested', 'confirmed', 'on-the-way', 'arrived', 'done'] : ['confirmed', 'done'];
}
