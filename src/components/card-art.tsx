// Generated dreamy artwork that stands in for photos: soft blush light with a pretty motif per category.
import { memo, useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { CATEGORY_GLOW, IS_LIGHT, PHOTO_TINTS } from '@/lib/theme';

/** Small deterministic random generator so each piece of art always looks the same. */
export function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  // The first few numbers from a small seed are always tiny, so throw them away.
  for (let i = 0; i < 4; i++) next();
  return next;
}

const hash = (str: string) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

type Motif = 'silk' | 'lashes' | 'hearts' | 'pearls' | 'flower';
const MOTIF: Record<string, Motif> = {
  hair: 'silk', lashes: 'lashes', brows: 'lashes', nails: 'hearts', pedicure: 'hearts',
  massage: 'pearls', skincare: 'pearls', makeup: 'flower',
};

const heart = (x: number, y: number, s: number) =>
  `M${x} ${y + s * 0.9} C ${x - s * 1.6} ${y - s * 0.2}, ${x - s * 0.7} ${y - s * 1.3}, ${x} ${y - s * 0.45} C ${x + s * 0.7} ${y - s * 1.3}, ${x + s * 1.6} ${y - s * 0.2}, ${x} ${y + s * 0.9} Z`;

const sparkle = (x: number, y: number, s: number) =>
  `M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z`;

/** Fills its parent (100% × 100%) with soft artwork for a category. `seed` varies it between cards. */
export const CardArt = memo(function CardArt({ category, seed = '' }: { category: string; seed?: string }) {
  const [a, b] = PHOTO_TINTS[category] ?? PHOTO_TINTS.hair;
  const glow = CATEGORY_GLOW[category] ?? '#E3C28A';
  const motif = MOTIF[category] ?? 'silk';
  const id = `ca${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const r = rng(hash(category + seed));
  const cx = 35 + r() * 30;
  const cy = 34 + r() * 22;
  const line = `url(#${id}l)`;
  const fill = `url(#${id}f)`;
  // Darkens the bottom so white text on top of the art stays readable.
  const shade = IS_LIGHT ? '#6A2F55' : '#1A0E18';

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={a} />
          <Stop offset="1" stopColor={b} />
        </LinearGradient>
        <RadialGradient id={`${id}g`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFE9EF" stopOpacity={0.75} />
          <Stop offset="0.4" stopColor={glow} stopOpacity={0.35} />
          <Stop offset="1" stopColor={glow} stopOpacity={0} />
        </RadialGradient>
        {/* rose-gold line: champagne into blush */}
        <LinearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.5" stopColor={IS_LIGHT ? '#FFF1E4' : '#F2C9A8'} />
          <Stop offset="1" stopColor={IS_LIGHT ? '#FFE6EE' : '#F7C6D4'} />
        </LinearGradient>
        <RadialGradient id={`${id}f`} cx="35%" cy="30%" r="75%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
          <Stop offset="0.45" stopColor="#F7C6D4" stopOpacity={0.8} />
          <Stop offset="1" stopColor={glow} stopOpacity={0.55} />
        </RadialGradient>
        <LinearGradient id={`${id}sh`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.5" stopColor={shade} stopOpacity={0} />
          <Stop offset="1" stopColor={shade} stopOpacity={IS_LIGHT ? 0.42 : 0.55} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={100} height={100} fill={`url(#${id}bg)`} />
      {/* soft bokeh */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Circle key={`b${i}`} cx={r() * 100} cy={r() * 100} r={6 + r() * 12} fill="#fff" opacity={0.04 + r() * 0.05} />
      ))}
      <Circle cx={cx} cy={cy} r={44} fill={`url(#${id}g)`} />

      {motif === 'silk' && [0, 1, 2, 3, 4].map((i) => {
        const y = 26 + i * 10;
        const amp = 7 + r() * 5;
        return (
          <Path key={i} d={`M-5 ${y} C 22 ${y - amp}, 42 ${y + amp}, 62 ${y} S 96 ${y - amp}, 110 ${y}`}
            fill="none" stroke={line} strokeWidth={i === 2 ? 3 : 1} strokeLinecap="round" opacity={0.95 - i * 0.12} />
        );
      })}
      {motif === 'lashes' && (
        <G>
          <Path d={`M${cx - 24} ${cy} Q ${cx} ${cy + 16} ${cx + 24} ${cy}`} fill="none" stroke={line} strokeWidth={1.8} strokeLinecap="round" />
          {Array.from({ length: 9 }).map((_, i) => {
            const k = (i - 4) / 4;
            const x = cx + k * 21;
            const y = cy + (1 - k * k) * 7.5;
            const len = 9 + (1 - Math.abs(k)) * 7;
            return <Path key={i} d={`M${x} ${y} Q ${x + k * 4} ${y + len * 0.6} ${x + k * 9} ${y + len}`} fill="none" stroke={line} strokeWidth={1.1} strokeLinecap="round" />;
          })}
        </G>
      )}
      {motif === 'hearts' && (
        <G>
          <Path d={heart(cx, cy, 13)} fill={fill} />
          <Path d={heart(cx - 26, cy + 20, 6)} fill={fill} opacity={0.75} />
          <Path d={heart(cx + 24, cy - 16, 5)} fill={fill} opacity={0.65} />
        </G>
      )}
      {motif === 'pearls' && (
        <G>
          <Path d={`M-5 ${cy - 8} Q ${cx} ${cy + 34} 105 ${cy - 8}`} fill="none" stroke={line} strokeWidth={0.5} opacity={0.6} />
          {Array.from({ length: 9 }).map((_, i) => {
            const k = i / 8;
            const x = -5 + k * 110;
            const y = (1 - k) * (1 - k) * (cy - 8) + 2 * (1 - k) * k * (cy + 34) + k * k * (cy - 8);
            return <Circle key={i} cx={x} cy={y} r={i === 4 ? 6 : 4.2} fill={fill} />;
          })}
        </G>
      )}
      {motif === 'flower' && (
        <G>
          {[0, 1, 2, 3, 4].map((i) => (
            <Path key={i} d={`M${cx} ${cy} C ${cx + 14} ${cy - 10}, ${cx + 10} ${cy - 30}, ${cx} ${cy - 30} C ${cx - 10} ${cy - 30}, ${cx - 14} ${cy - 10}, ${cx} ${cy}`}
              fill={fill} opacity={0.85} transform={`rotate(${i * 72} ${cx} ${cy})`} />
          ))}
          <Circle cx={cx} cy={cy} r={4.5} fill="#F2C9A8" />
        </G>
      )}

      {/* sparkles */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Path key={`s${i}`} d={sparkle(8 + r() * 84, 8 + r() * 84, 1.2 + r() * 2.2)} fill="#fff" opacity={0.5 + r() * 0.45} />
      ))}
      <Rect x={0} y={0} width={100} height={100} fill={`url(#${id}sh)`} />
    </Svg>
  );
});
