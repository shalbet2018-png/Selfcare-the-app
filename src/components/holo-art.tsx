// Generated "holographic" artwork: stands in for photos with a distinct neon motif per category.
import { memo, useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { CATEGORY_GLOW, PHOTO_TINTS } from '@/lib/theme';

/** Small deterministic random generator so each piece of art always looks the same. */
export function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const hash = (str: string) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

type Motif = 'rings' | 'waves' | 'prism' | 'orbit' | 'petals';
const MOTIF: Record<string, Motif> = {
  hair: 'waves', lashes: 'orbit', brows: 'orbit', nails: 'prism', pedicure: 'prism',
  massage: 'rings', skincare: 'rings', makeup: 'petals',
};

/** Fills its parent (100% × 100%) with neon artwork for a category. `seed` varies it between cards. */
export const HoloArt = memo(function HoloArt({ category, seed = '' }: { category: string; seed?: string }) {
  const [a, b] = PHOTO_TINTS[category] ?? PHOTO_TINTS.hair;
  const glow = CATEGORY_GLOW[category] ?? '#E3C28A';
  const motif = MOTIF[category] ?? 'waves';
  const id = `ha${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const r = rng(hash(category + seed));
  const cx = 30 + r() * 40;
  const cy = 30 + r() * 30;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={a} />
          <Stop offset="1" stopColor={b} />
        </LinearGradient>
        <RadialGradient id={`${id}g`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={glow} stopOpacity={0.9} />
          <Stop offset="0.5" stopColor={glow} stopOpacity={0.25} />
          <Stop offset="1" stopColor={glow} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}n`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#7FE7FF" />
          <Stop offset="0.5" stopColor="#B69CFF" />
          <Stop offset="1" stopColor={glow} />
        </LinearGradient>
        <LinearGradient id={`${id}sh`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.45" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.55} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={100} height={100} fill={`url(#${id}bg)`} />
      {/* faint tech grid */}
      <G opacity={0.14}>
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => (
          <G key={v}>
            <Line x1={v} y1={0} x2={v} y2={100} stroke="#fff" strokeWidth={0.2} />
            <Line x1={0} y1={v} x2={100} y2={v} stroke="#fff" strokeWidth={0.2} />
          </G>
        ))}
      </G>
      <Circle cx={cx} cy={cy} r={42} fill={`url(#${id}g)`} />

      {motif === 'rings' && [10, 18, 26, 34, 42].map((rad, i) => (
        <Circle key={rad} cx={cx} cy={cy} r={rad} fill="none" stroke={`url(#${id}n)`} strokeWidth={i === 2 ? 1.2 : 0.5} opacity={0.9 - i * 0.14} />
      ))}
      {motif === 'waves' && [0, 1, 2, 3, 4, 5].map((i) => {
        const y = 22 + i * 11;
        const amp = 6 + r() * 6;
        return (
          <Path key={i} d={`M-5 ${y} C 20 ${y - amp}, 40 ${y + amp}, 60 ${y} S 95 ${y - amp}, 110 ${y}`}
            fill="none" stroke={`url(#${id}n)`} strokeWidth={i === 2 ? 1.3 : 0.6} opacity={0.95 - i * 0.12} />
        );
      })}
      {motif === 'prism' && [0, 1, 2, 3].map((i) => {
        const s = 14 + i * 9;
        return (
          <Path key={i} d={`M${cx} ${cy - s} L${cx + s} ${cy} L${cx} ${cy + s} L${cx - s} ${cy} Z`}
            fill="none" stroke={`url(#${id}n)`} strokeWidth={i === 1 ? 1.2 : 0.5} opacity={0.95 - i * 0.18}
            transform={`rotate(${i * 12} ${cx} ${cy})`} />
        );
      })}
      {motif === 'orbit' && [0, 1, 2].map((i) => (
        <G key={i} transform={`rotate(${i * 60 + r() * 20} ${cx} ${cy})`}>
          <Path d={`M${cx - 38} ${cy} A 38 13 0 1 0 ${cx + 38} ${cy} A 38 13 0 1 0 ${cx - 38} ${cy}`}
            fill="none" stroke={`url(#${id}n)`} strokeWidth={0.7} opacity={0.85} />
          <Circle cx={cx + 38 * Math.cos(i * 2)} cy={cy + 13 * Math.sin(i * 2)} r={1.6} fill="#fff" />
        </G>
      ))}
      {motif === 'petals' && [0, 1, 2, 3, 4, 5].map((i) => (
        <Path key={i} d={`M${cx} ${cy} C ${cx + 10} ${cy - 18}, ${cx + 4} ${cy - 34}, ${cx} ${cy - 36} C ${cx - 4} ${cy - 34}, ${cx - 10} ${cy - 18}, ${cx} ${cy}`}
          fill="none" stroke={`url(#${id}n)`} strokeWidth={0.8} opacity={0.9} transform={`rotate(${i * 60} ${cx} ${cy})`} />
      ))}
      <Circle cx={cx} cy={cy} r={2.2} fill="#fff" opacity={0.95} />

      {/* sparkles */}
      {Array.from({ length: 10 }).map((_, i) => (
        <Circle key={i} cx={r() * 100} cy={r() * 100} r={0.3 + r() * 0.6} fill="#fff" opacity={0.4 + r() * 0.5} />
      ))}
      {/* scanlines */}
      <G opacity={0.08}>
        {Array.from({ length: 25 }).map((_, i) => <Rect key={i} x={0} y={i * 4} width={100} height={1.2} fill="#fff" />)}
      </G>
      <Rect x={0} y={0} width={100} height={100} fill={`url(#${id}sh)`} />
    </Svg>
  );
});
