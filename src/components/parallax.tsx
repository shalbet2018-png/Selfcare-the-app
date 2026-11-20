// Dreamy backdrop layers that slide at different speeds as the page scrolls (parallax):
// soft glitter far away, silky ribbons in the middle, and rose petals drifting down in front.
import { memo, useEffect, useId, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { rng } from './card-art';
import { AMBIENT } from '@/lib/theme';

/** A 0→1 value that loops forever (stays at 0 when the device asks for reduced motion). */
export function useLoop(duration: number) {
  const t = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
  }, [duration, reduce, t]);
  return t;
}

const GLITTER = AMBIENT.glitter;

/** A four-point sparkle centred on (x, y). */
const sparkle = (x: number, y: number, s: number) =>
  `M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z`;

/** One tile of glitter, w × h pixels. Two are stacked so the field loops seamlessly. */
const GlitterTile = memo(function GlitterTile({ w, h, seed }: { w: number; h: number; seed: number }) {
  const r = rng(seed);
  const dots = Array.from({ length: Math.round((w * h) / 8000) }, () => ({
    x: r() * w, y: r() * h, s: 0.5 + r() * 1.2, o: 0.25 + r() * 0.55, c: GLITTER[Math.floor(r() * GLITTER.length)], star: r() > 0.86,
  }));
  return (
    <Svg width={w} height={h}>
      {dots.map((d, i) => d.star
        ? <Path key={i} d={sparkle(d.x, d.y, d.s * 4)} fill={d.c} opacity={d.o + 0.2} />
        : <Circle key={i} cx={d.x} cy={d.y} r={d.s} fill={d.c} opacity={d.o} />)}
    </Svg>
  );
});

function Glitter({ scroll, w, h }: { scroll?: SharedValue<number>; w: number; h: number }) {
  const drift = useLoop(60000);
  const style = useAnimatedStyle(() => {
    const off = ((scroll?.value ?? 0) * 0.12 + drift.value * h) % h;
    return { transform: [{ translateY: -off }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h * 2 }, style]}>
      <GlitterTile w={w} h={h} seed={11} />
      <GlitterTile w={w} h={h} seed={11} />
    </Animated.View>
  );
}

/** Soft silk ribbons in blush, champagne and lilac, drawn taller than the screen so they slide up as you scroll. */
const SilkArt = memo(function SilkArt({ w, h }: { w: number; h: number }) {
  const id = `sk${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const ribbon = (y: number, amp: number) =>
    `M ${-w * 0.2} ${y} C ${w * 0.25} ${y - amp}, ${w * 0.55} ${y + amp}, ${w * 1.2} ${y - amp * 0.4}`;
  const fills: [string, string, string][] = AMBIENT.silk.map(([c1, c2], i) => ['abc'[i], c1, c2]);
  const k = AMBIENT.silkOpacity;
  return (
    <Svg width={w * 1.4} height={h}>
      <Defs>
        {fills.map(([k, c1, c2]) => (
          <LinearGradient key={k} id={`${id}${k}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={c1} stopOpacity={0} />
            <Stop offset="0.4" stopColor={c1} stopOpacity={0.6} />
            <Stop offset="0.75" stopColor={c2} stopOpacity={0.5} />
            <Stop offset="1" stopColor={c2} stopOpacity={0} />
          </LinearGradient>
        ))}
      </Defs>
      {[0.16, 0.44, 0.72].map((f, i) => (
        <Path key={`w${i}`} d={ribbon(h * f, h * 0.07)} fill="none" stroke={`url(#${id}${fills[i][0]})`} strokeWidth={90} strokeOpacity={0.1 * k} strokeLinecap="round" />
      ))}
      {[0.16, 0.44, 0.72].map((f, i) => (
        <Path key={`s${i}`} d={ribbon(h * f - 14, h * 0.07)} fill="none" stroke={`url(#${id}${fills[i][0]})`} strokeWidth={10} strokeOpacity={0.18 * k} strokeLinecap="round" />
      ))}
      {[0.16, 0.44, 0.72].map((f, i) => (
        <Path key={`l${i}`} d={ribbon(h * f + 10, h * 0.07)} fill="none" stroke={`url(#${id}${fills[i][0]})`} strokeWidth={0.8} strokeOpacity={Math.min(0.7 * k, 1)} />
      ))}
    </Svg>
  );
});

function Silk({ scroll, w, h }: { scroll?: SharedValue<number>; w: number; h: number }) {
  const sway = useLoop(26000);
  const tall = h * 1.8;
  const style = useAnimatedStyle(() => {
    const y = Math.min((scroll?.value ?? 0) * 0.3, tall - h);
    const x = -w * 0.2 + Math.sin(sway.value * Math.PI * 2) * w * 0.07;
    return { transform: [{ translateX: x }, { translateY: -y }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <SilkArt w={w} h={tall} />
    </Animated.View>
  );
}

/** One rose petal, drawn once. */
const Petal = memo(function Petal({ size, color }: { size: number; color: string }) {
  const id = `pt${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <RadialGradient id={id} cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.9} />
          <Stop offset="0.35" stopColor={color} stopOpacity={0.95} />
          <Stop offset="1" stopColor={color} stopOpacity={0.55} />
        </RadialGradient>
      </Defs>
      <Path d="M20 3 C 31 9, 36 22, 20 37 C 4 22, 9 9, 20 3 Z" fill={`url(#${id})`} />
      <Path d="M20 8 C 22 18, 21 27, 20 33" stroke="#fff" strokeOpacity={0.35} strokeWidth={0.8} fill="none" />
    </Svg>
  );
});

const PETAL_COLOURS = AMBIENT.petals;

/** A petal falling from above the screen to below it, swaying and turning, then starting again. */
function FallingPetal({ i, t, scroll, w, h }: { i: number; t: SharedValue<number>; scroll?: SharedValue<number>; w: number; h: number }) {
  const seed = useMemo(() => {
    const r = rng(101 + i * 17);
    // Keep the whole sway on screen: start between 10% and 90% of the width.
    return { x: w * (0.1 + r() * 0.8), phase: r(), speed: 0.6 + r() * 0.8, sway: 18 + r() * 34, size: 16 + r() * 14, spin: r() > 0.5 ? 1 : -1, colour: PETAL_COLOURS[i % PETAL_COLOURS.length], opacity: 0.45 + r() * 0.35 };
  }, [i, w]);
  const style = useAnimatedStyle(() => {
    const travel = h + seed.size * 2;
    // Falls on its own, and scrolling pushes it along a bit faster than the page (it's the closest layer).
    const p = ((t.value * seed.speed + seed.phase) * travel + (scroll?.value ?? 0) * 0.5) % travel;
    const k = p / travel;
    return {
      transform: [
        { translateX: seed.x + Math.sin(k * Math.PI * 4 + seed.phase * 6) * seed.sway },
        { translateY: p - seed.size * 2 },
        { rotate: `${seed.spin * (k * 540 + seed.phase * 360)}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, opacity: seed.opacity }, style]}>
      <Petal size={seed.size} color={seed.colour} />
    </Animated.View>
  );
}

function Petals({ scroll, w, h }: { scroll?: SharedValue<number>; w: number; h: number }) {
  const t = useLoop(22000);
  const count = Math.min(14, Math.max(7, Math.round(w / 60)));
  return (
    <View style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }).map((_, i) => <FallingPetal key={i} i={i} t={t} scroll={scroll} w={w} h={h} />)}
    </View>
  );
}

/** Everything that moves with scroll, layered back to front. */
export function ParallaxLayers({ scroll }: { scroll?: SharedValue<number> }) {
  const { width: w, height: h } = useWindowDimensions();
  const reduce = useReducedMotion();
  const s = reduce ? undefined : scroll;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Glitter scroll={s} w={w} h={h} />
      <Silk scroll={s} w={w} h={h} />
      <Petals scroll={s} w={w} h={h} />
    </View>
  );
}
