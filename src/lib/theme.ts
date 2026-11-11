// Dark Luxe: plum-black surfaces, champagne-gold accents, glowing colour fields.
// Colours, type and spacing shared by every screen.

export const C = {
  // Text
  ink: '#F5EFF4',
  muted: '#B9AEC2',
  // Surfaces
  night: '#120E17',
  pearl: '#1E1726', // raised surface (sheets, highlighted cards)
  glass: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.12)',
  glassDark: 'rgba(255,255,255,0.06)',
  glassDarkBorder: 'rgba(255,255,255,0.12)',
  line: 'rgba(255,255,255,0.12)',
  // Accents
  gold: '#E3C28A',
  goldSoft: 'rgba(227,194,138,0.14)',
  onGold: '#1A1320',
  rose: '#E8A3B4',
  sage: '#8FD3BC',
  // Kept for older call sites: same as ink / muted now the whole app is dark.
  onNight: '#F5EFF4',
  onNightMuted: '#B9AEC2',
  white: '#FFFFFF',
};

export const F = {
  display300: 'Jost_300Light',
  display400: 'Jost_400Regular',
  display500: 'Jost_500Medium',
  body: 'Inter_400Regular',
  body500: 'Inter_500Medium',
  body600: 'Inter_600SemiBold',
};

export const R = { sm: 14, md: 18, lg: 22, xl: 28, pill: 999 };

// Breakpoints: phone < 700 ≤ tablet < 1100 ≤ desktop
export const BP = { tablet: 700, desktop: 1100 };

export type BgTheme = 'hair' | 'lashes' | 'nails' | 'spa' | 'makeup' | 'business';

// Glowing colour fields behind each screen: [x%, y%, colour] spots on a dark base.
export const BACKGROUNDS: Record<BgTheme, { base: string; spots: [number, number, string][] }> = {
  hair: { base: '#120E17', spots: [[10, 5, '#5A2A4A'], [100, 40, '#3A2A66'], [25, 100, '#4A3520']] },
  lashes: { base: '#110E19', spots: [[90, 5, '#3F2E73'], [5, 70, '#5A2A4A']] },
  nails: { base: '#150E14', spots: [[15, 10, '#6A2D45'], [95, 85, '#4F3A1E']] },
  spa: { base: '#0E1315', spots: [[90, 10, '#1F4A45'], [5, 90, '#4A3A20']] },
  makeup: { base: '#150D16', spots: [[10, 15, '#6B2A52'], [95, 75, '#3C2B6B']] },
  business: { base: '#0F0D15', spots: [[10, 10, '#3A2A66'], [95, 85, '#4F3A1E']] },
};

export function themeForCategory(cat: string): BgTheme {
  if (cat === 'lashes' || cat === 'brows') return 'lashes';
  if (cat === 'nails' || cat === 'pedicure') return 'nails';
  if (cat === 'massage' || cat === 'skincare') return 'spa';
  if (cat === 'makeup') return 'makeup';
  return 'hair';
}

// Jewel-tone gradients standing in for photos, and the glow colour of each category.
export const PHOTO_TINTS: Record<string, [string, string]> = {
  hair: ['#8A4A6B', '#3A2550'],
  lashes: ['#6B4FA8', '#2E2350'],
  brows: ['#7A5A9A', '#33264A'],
  nails: ['#B0566F', '#4A2238'],
  pedicure: ['#B5704F', '#4A2A2E'],
  massage: ['#3F8478', '#1E3338'],
  skincare: ['#5E8F6A', '#22362F'],
  makeup: ['#B04F86', '#44224F'],
};

export const CATEGORY_GLOW: Record<string, string> = {
  hair: '#E08BB0', lashes: '#A58BF0', brows: '#C29BE8', nails: '#F08FA6',
  pedicure: '#F0A77E', massage: '#6FD3C0', skincare: '#9AD9A4', makeup: '#F07FC0',
};
