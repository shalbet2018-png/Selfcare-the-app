// Colours, type and spacing shared by every screen.
// Two looks share the same token names: 'light' (blush & cream) and 'dark' (plum-black luxe).

/** Which look the app uses. Change this one line to switch between them. */
export const LOOK: 'light' | 'dark' = 'light';
export const IS_LIGHT = LOOK === 'light';

const DARK = {
  // Text
  ink: '#F5EFF4',
  muted: '#B9AEC2',
  placeholder: '#8E8499',
  // Surfaces
  night: '#120E17', // page base
  pearl: '#1E1726', // raised surface (sheets, highlighted cards)
  glass: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.12)',
  glassDark: 'rgba(255,255,255,0.06)',
  glassDarkBorder: 'rgba(255,255,255,0.12)',
  line: 'rgba(255,255,255,0.12)',
  navBg: 'rgba(16,12,24,0.8)',
  railBg: 'rgba(20,15,26,0.92)',
  scrim: 'rgba(6,4,9,0.68)',
  shadow: 'rgba(0,0,0,0.35)',
  h1Glow: 'rgba(247,198,212,0.45)',
  // Accents
  gold: '#E3C28A', // primary accent: buttons, prices, eyebrows
  goldSoft: 'rgba(227,194,138,0.14)',
  goldEdge: 'rgba(227,194,138,0.5)',
  onGold: '#1A1320',
  rose: '#E8A3B4',
  sage: '#8FD3BC',
  blush: '#F7C6D4', // highlight dots, tags, active nav bar
  lilac: '#D8C3F2',
  softEdge: 'rgba(247,198,212,0.38)',
  // Kept for older call sites.
  onNight: '#F5EFF4',
  onNightMuted: '#B9AEC2',
  white: '#FFFFFF',
};

const LIGHT: typeof DARK = {
  ink: '#3B2434',
  muted: '#86687A',
  placeholder: '#B49AAA',
  night: '#FFF6F8',
  pearl: '#FFFFFF',
  glass: 'rgba(255,255,255,0.68)',
  glassBorder: 'rgba(214,140,166,0.28)',
  glassDark: 'rgba(255,255,255,0.68)',
  glassDarkBorder: 'rgba(214,140,166,0.28)',
  line: 'rgba(120,60,90,0.14)',
  navBg: 'rgba(255,255,255,0.86)',
  railBg: 'rgba(255,250,252,0.92)',
  scrim: 'rgba(80,40,62,0.35)',
  shadow: 'rgba(170,90,125,0.16)',
  h1Glow: 'rgba(240,160,190,0.35)',
  gold: '#C96B8A', // rose: buttons, prices, eyebrows
  goldSoft: 'rgba(201,107,138,0.12)',
  goldEdge: 'rgba(201,107,138,0.45)',
  onGold: '#FFFFFF',
  rose: '#E58FA9',
  sage: '#3F9E7F',
  blush: '#D9729A',
  lilac: '#A98BDD',
  softEdge: 'rgba(230,150,180,0.55)',
  onNight: '#3B2434',
  onNightMuted: '#86687A',
  white: '#FFFFFF',
};

export const C = IS_LIGHT ? LIGHT : DARK;

/** A see-through wash for chips, inputs and hover states: white on the dark look, plum on the light one. */
export const veil = (alpha: number) => (IS_LIGHT ? `rgba(120,60,90,${alpha * 0.8})` : `rgba(255,255,255,${alpha})`);

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
type Bg = { base: string; spots: [number, number, string][] };

// Glowing colour fields behind each screen: [x%, y%, colour] spots on a base.
export const BACKGROUNDS: Record<BgTheme, Bg> = IS_LIGHT ? {
  hair: { base: '#FFF5F8', spots: [[10, 5, '#FAD0DE'], [100, 40, '#E8DCFB'], [25, 100, '#FCE3CF']] },
  lashes: { base: '#FBF5FF', spots: [[90, 5, '#E3D3FA'], [5, 70, '#FAD0DE']] },
  nails: { base: '#FFF4F6', spots: [[15, 10, '#F9C9D7'], [95, 85, '#FCE3CF']] },
  spa: { base: '#F5FBF8', spots: [[90, 10, '#CFEDE3'], [5, 90, '#FCE8D2']] },
  makeup: { base: '#FFF4FA', spots: [[10, 15, '#F8C8E2'], [95, 75, '#E4D6FA']] },
  business: { base: '#FAF6FF', spots: [[10, 10, '#E3D6FA'], [95, 85, '#FCE6D2']] },
} : {
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

// Gradients behind the generated card art, and the glow colour of each category.
export const PHOTO_TINTS: Record<string, [string, string]> = IS_LIGHT ? {
  hair: ['#F7B9CD', '#C9A3E6'],
  lashes: ['#CDB4F2', '#9C86D8'],
  brows: ['#DDBDEB', '#B392D6'],
  nails: ['#F8AFC2', '#E07A9C'],
  pedicure: ['#F9C2A8', '#E58FA0'],
  massage: ['#A9DDCF', '#79B9B0'],
  skincare: ['#BFE3C4', '#86C2A4'],
  makeup: ['#F4A9CF', '#C88BD8'],
} : {
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

/** Colours for the drifting backdrop: glitter, silk ribbons, petals and the glass bubbles. */
export const AMBIENT = IS_LIGHT ? {
  glitter: ['#E7A7BE', '#E3B77F', '#B9A0E6', '#F3C1D2'],
  silk: [['#F4A6C0', '#E9BE8E'], ['#C7B0F0', '#F4A6C0'], ['#E9BE8E', '#E58FA9']] as [string, string][],
  silkOpacity: 1.4,
  petals: ['#F4A6C0', '#EC8FAE', '#F7B8CB', '#E9BE8E', '#CDB4F2'],
  bubbleRim: '#D98BA3',
  bubbleTint: '#F3B6C8',
  bubbleRimOpacity: 0.5,
} : {
  glitter: ['#FFFFFF', '#F7C6D4', '#E3C28A', '#D8C3F2'],
  silk: [['#F7C6D4', '#E3C28A'], ['#D8C3F2', '#F7C6D4'], ['#E3C28A', '#E8A3B4']] as [string, string][],
  silkOpacity: 1,
  petals: ['#F7C6D4', '#E8A3B4', '#F2B8C6', '#E3C28A', '#D8C3F2'],
  bubbleRim: '#FFFFFF',
  bubbleTint: '#E3C28A',
  bubbleRimOpacity: 0.7,
};

/** Booking status tags: [background, text]. */
export const STATUS_TONES = IS_LIGHT ? {
  waiting: ['rgba(201,107,138,0.12)', '#A9506F'],
  good: ['rgba(63,158,127,0.13)', '#2F7D63'],
  bad: ['rgba(200,70,90,0.12)', '#B23A52'],
} as const : {
  waiting: ['rgba(227,194,138,0.16)', '#EBD3A6'],
  good: ['rgba(143,211,188,0.16)', '#A6E3CE'],
  bad: ['rgba(240,130,150,0.16)', '#F5ABB8'],
} as const;
