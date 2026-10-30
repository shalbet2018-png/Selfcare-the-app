// Modern Soft Spa: colours, type and spacing shared by every screen.

export const C = {
  ink: '#24212B',
  muted: '#4E4A55',
  pearl: '#F4EEF0',
  sage: '#4E7A6E',
  night: '#221E27',
  onNight: '#F6F2F7',
  onNightMuted: '#D3CADA',
  line: 'rgba(36,33,43,0.12)',
  glass: 'rgba(255,255,255,0.62)',
  glassBorder: 'rgba(255,255,255,0.8)',
  glassDark: 'rgba(255,255,255,0.07)',
  glassDarkBorder: 'rgba(255,255,255,0.16)',
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

// Soft colour fields behind each screen: [x%, y%, colour] spots on a base.
export const BACKGROUNDS: Record<BgTheme, { base: string; spots: [number, number, string][] }> = {
  hair: { base: '#F4EEF0', spots: [[15, 10, '#E7C3B4'], [95, 45, '#CBB5D6'], [30, 100, '#C7D8CF']] },
  lashes: { base: '#F1EEF6', spots: [[85, 10, '#D8CBE8'], [10, 70, '#EAD3DA']] },
  nails: { base: '#F7EFEC', spots: [[20, 15, '#F0C9C0'], [90, 80, '#F3DCC8']] },
  spa: { base: '#EFF2EE', spots: [[85, 15, '#C7D8CF'], [10, 85, '#E8DCC9']] },
  makeup: { base: '#F6EEF2', spots: [[15, 20, '#EBC6CF'], [90, 75, '#D9C9E6']] },
  business: { base: '#221E27', spots: [[15, 15, '#5B4766'], [90, 80, '#3F5A55']] },
};

export function themeForCategory(cat: string): BgTheme {
  if (cat === 'lashes' || cat === 'brows') return 'lashes';
  if (cat === 'nails' || cat === 'pedicure') return 'nails';
  if (cat === 'massage' || cat === 'skincare') return 'spa';
  if (cat === 'makeup') return 'makeup';
  return 'hair';
}

export const PHOTO_TINTS: Record<string, [string, string]> = {
  hair: ['#D9C3B6', '#BFA9C9'],
  lashes: ['#E6C9CF', '#CDBBE0'],
  brows: ['#E6C9CF', '#CDBBE0'],
  nails: ['#F0CFC5', '#E9D6C4'],
  pedicure: ['#F0CFC5', '#E9D6C4'],
  massage: ['#C9D9CF', '#E3D5C2'],
  skincare: ['#C9D9CF', '#E3D5C2'],
  makeup: ['#EBC6CF', '#D9C9E6'],
};
