// Business rules in one place. Values marked TODO are placeholders to confirm
// (see "Still open" in the product spec).

export const CITY = 'Nairobi';
export const CURRENCY = 'KES';

// Flat $1 service fee, added to the client's bill on every booking.
// TODO: confirm the fixed KES figure (or convert at the day's rate).
export const SERVICE_FEE = 130;
export const SERVICE_FEE_LABEL = '$1 service fee';

// Home-service travel fee, set by distance.
// TODO: replace with real rates (e.g. matched to standard ride prices).
export const TRAVEL_FEE_BASE = 150;
export const TRAVEL_FEE_PER_KM = 50;

// Clients can cancel any time; once a home-service provider has arrived,
// an inconvenience fee applies. TODO: confirm the amount.
export const ARRIVED_CANCEL_FEE = 300;

export const PAYMENT_METHODS = [
  { id: 'mpesa', label: 'M-Pesa', note: 'Pay with an STK push to your phone' },
  { id: 'card', label: 'Card', note: 'Visa or Mastercard' },
  { id: 'paypal', label: 'PayPal', note: 'Pay with your PayPal account' }
];

export const PAYOUT_OPTIONS = [
  { id: 'after', label: 'After each service' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' }
];

export function travelFee(km) {
  return Math.round(TRAVEL_FEE_BASE + TRAVEL_FEE_PER_KM * km);
}

export function money(n) {
  return `${CURRENCY} ${Math.round(n).toLocaleString('en-KE')}`;
}
