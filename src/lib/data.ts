// DEMO DATA ONLY. Names, prices and ratings below are made up so the screens
// can be tried out. Replace with real providers from the backend once
// onboarding starts.

export type Mode = 'shop' | 'home';
export type Service = { id: string; name: string; price: number; mins: number };
export type Provider = {
  id: string; name: string; type: 'business' | 'freelancer'; category: string;
  area: string; km: number; rating: number; reviews: number; modes: Mode[];
  hours: string; staff: string[]; services: Service[];
};
export type Category = { id: string; label: string; blurb: string };

export const CATEGORIES: Category[] = [
  { id: 'hair', label: 'Hair', blurb: 'Braids, cuts, colour, locs' },
  { id: 'lashes', label: 'Lashes', blurb: 'Extensions, fills, lifts' },
  { id: 'nails', label: 'Nails', blurb: 'Manicure, gel, acrylics' },
  { id: 'pedicure', label: 'Pedicure', blurb: 'Classic, spa, gel toes' },
  { id: 'massage', label: 'Massage', blurb: 'Swedish, deep tissue, hot stone' },
  { id: 'brows', label: 'Brows', blurb: 'Shaping, tint, lamination' },
  { id: 'makeup', label: 'Makeup', blurb: 'Events, bridal, everyday' },
  { id: 'skincare', label: 'Skincare', blurb: 'Facials, peels, treatments' }
];

export const PROVIDERS: Provider[] = [
  {
    id: 'p1', name: 'Demo Braids Studio', type: 'business', category: 'hair',
    area: 'Kilimani', km: 2.1, rating: 4.8, reviews: 0, modes: ['shop', 'home'],
    hours: 'Mon–Sat, 8:00–19:00', staff: ['Staff member A', 'Staff member B'],
    services: [
      { id: 's1', name: 'Knotless braids, medium', price: 3500, mins: 300 },
      { id: 's2', name: 'Cornrows', price: 1200, mins: 90 },
      { id: 's3', name: 'Wash and blow-dry', price: 800, mins: 60 }
    ]
  },
  {
    id: 'p2', name: 'Demo Lash Artist', type: 'freelancer', category: 'lashes',
    area: 'Westlands', km: 3.4, rating: 4.9, reviews: 0, modes: ['home'],
    hours: 'Daily, 9:00–20:00', staff: [],
    services: [
      { id: 's1', name: 'Classic lash set', price: 2500, mins: 120 },
      { id: 's2', name: 'Lash fill', price: 1500, mins: 60 },
      { id: 's3', name: 'Lash lift and tint', price: 2000, mins: 60 }
    ]
  },
  {
    id: 'p3', name: 'Demo Nail Bar', type: 'business', category: 'nails',
    area: 'Lavington', km: 4.0, rating: 4.6, reviews: 0, modes: ['shop', 'home'],
    hours: 'Mon–Sun, 9:00–18:00', staff: ['Staff member A'],
    services: [
      { id: 's1', name: 'Gel manicure', price: 1500, mins: 45 },
      { id: 's2', name: 'Acrylic full set', price: 2800, mins: 90 },
      { id: 's3', name: 'Spa pedicure', price: 1800, mins: 60 }
    ]
  },
  {
    id: 'p4', name: 'Demo Day Spa', type: 'business', category: 'massage',
    area: 'Karen', km: 9.5, rating: 4.7, reviews: 0, modes: ['shop'],
    hours: 'Tue–Sun, 10:00–20:00', staff: ['Therapist A', 'Therapist B'],
    services: [
      { id: 's1', name: 'Swedish massage, 60 min', price: 4000, mins: 60 },
      { id: 's2', name: 'Deep tissue, 90 min', price: 5500, mins: 90 },
      { id: 's3', name: 'Signature facial', price: 3500, mins: 60 }
    ]
  },
  {
    id: 'p5', name: 'Demo Brow and Makeup', type: 'freelancer', category: 'makeup',
    area: 'Kileleshwa', km: 2.8, rating: 4.8, reviews: 0, modes: ['home', 'shop'],
    hours: 'By appointment', staff: [],
    services: [
      { id: 's1', name: 'Event makeup', price: 3000, mins: 75 },
      { id: 's2', name: 'Brow shape and tint', price: 900, mins: 30 }
    ]
  },
  {
    id: 'p6', name: 'Demo Skin Clinic', type: 'business', category: 'skincare',
    area: 'Nairobi CBD', km: 5.2, rating: 4.5, reviews: 0, modes: ['shop'],
    hours: 'Mon–Fri, 8:00–17:00', staff: ['Therapist A'],
    services: [
      { id: 's1', name: 'Deep-cleanse facial', price: 2500, mins: 60 },
      { id: 's2', name: 'Chemical peel', price: 4500, mins: 45 }
    ]
  }
];

export function providerById(id: string | undefined) {
  return PROVIDERS.find((p) => p.id === id);
}

export function fromPrice(p: Provider) {
  return Math.min(...p.services.map((s) => s.price));
}

export const MODE_OPTIONS: { id: Mode; label: string }[] = [
  { id: 'shop', label: 'At the shop' },
  { id: 'home', label: 'Come to me' },
];

export const modeLabel = (m: Mode) => (m === 'shop' ? 'At the shop' : 'Comes to you');
