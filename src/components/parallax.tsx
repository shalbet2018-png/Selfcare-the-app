// Futuristic backdrop layers that slide at different speeds as the page scrolls (parallax):
// a star field far away, aurora ribbons in the middle, and a neon grid floor rushing forward.
import { memo, useEffect, useId, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { rng } from './holo-art';

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

/** One tile of stars, w × h pixels. Two are stacked so the field loops seamlessly. */
const StarTile = memo(function StarTile({ w, h, seed }: { w: number; h: number; seed: number }) {
  const r = rng(seed);
  const stars = Array.from({ length: Math.round((w * h) / 9000) }, () => ({
    x: r() * w, y: r() * h, s: 0.4 + r() * 1.3, o: 0.25 + r() * 0.6, c: r() > 0.85 ? '#7FE7FF' : r() > 0.8 ? '#E3C28A' : '#fff',
  }));
  return (
    <Svg width={w} height={h}>
      {stars.map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.s} fill={s.c} opacity={s.o} />)}
    </Svg>
  );
});

function Stars({ scroll, w, h }: { scroll?: SharedValue<number>; w: number; h: number }) {
  const twinkle = useLoop(9000);
  const style = useAnimatedStyle(() => {
    const off = ((scroll?.value ?? 0) * 0.12 + twinkle.value * h * 0.1) % h;
    return { transform: [{ translateY: -off }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h * 2 }, style]}>
      <StarTile w={w} h={h} seed={11} />
      <StarTile w={w} h={h} seed={11} />
    </Animated.View>
  );
}

/** Soft neon ribbons, like an aurora, drawn taller than the screen so they can slide up as you scroll. */
const AuroraArt = memo(function AuroraArt({ w, h }: { w: number; h: number }) {
  const id = `au${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const ribbon = (y: number, amp: number) =>
    `M ${-w * 0.2} ${y} C ${w * 0.25} ${y - amp}, ${w * 0.55} ${y + amp}, ${w * 1.2} ${y - amp * 0.4}`;
  return (
    <Svg width={w * 1.4} height={h}>
      <Defs>
        <LinearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#7FE7FF" stopOpacity={0} />
          <Stop offset="0.35" stopColor="#7FE7FF" stopOpacity={0.55} />
          <Stop offset="0.7" stopColor="#B69CFF" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#E8A3B4" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#E8A3B4" stopOpacity={0} />
          <Stop offset="0.4" stopColor="#E8A3B4" stopOpacity={0.4} />
          <Stop offset="0.8" stopColor="#E3C28A" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#E3C28A" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {[0.14, 0.42, 0.7].map((f, i) => (
        <Path key={`w${i}`} d={ribbon(h * f, h * 0.08)} fill="none" stroke={`url(#${id}${i % 2 ? 'b' : 'a'})`} strokeWidth={70} strokeOpacity={0.09} />
      ))}
      {[0.14, 0.42, 0.7].map((f, i) => (
        <Path key={`l${i}`} d={ribbon(h * f, h * 0.08)} fill="none" stroke={`url(#${id}${i % 2 ? 'b' : 'a'})`} strokeWidth={1.4} />
      ))}
      {[0.2, 0.5, 0.78].map((f, i) => (
        <Path key={`t${i}`} d={ribbon(h * f + 18, h * 0.06)} fill="none" stroke={`url(#${id}a)`} strokeWidth={0.6} strokeOpacity={0.6} />
      ))}
    </Svg>
  );
});

function Aurora({ scroll, w, h }: { scroll?: SharedValue<number>; w: number; h: number }) {
  const sway = useLoop(24000);
  const tall = h * 1.8;
  const style = useAnimatedStyle(() => {
    const y = Math.min((scroll?.value ?? 0) * 0.35, tall - h);
    const x = -w * 0.2 + Math.sin(sway.value * Math.PI * 2) * w * 0.08;
    return { transform: [{ translateX: x }, { translateY: -y }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <AuroraArt w={w} h={tall} />
    </Animated.View>
  );
}

const GRID_LINES = 9;

/** One horizontal line of the floor, sliding from the horizon towards the viewer. */
function FloorLine({ i, t, top, floorH }: { i: number; t: SharedValue<number>; top: number; floorH: number }) {
  const style = useAnimatedStyle(() => {
    const p = (t.value + i / GRID_LINES) % 1;
    return { opacity: p * 0.8, transform: [{ translateY: top + Math.pow(p, 2.2) * floorH }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: '#7FE7FF' }, style]} />;
}

/** A neon perspective grid along the bottom of the screen, rushing forward. */
function GridFloor({ scroll, w, h }: { scroll?: SharedValue<number>; w: number; h: number }) {
  const t = useLoop(7000);
  const id = `gf${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const floorH = h * 0.34;
  const top = h - floorH;
  const vx = w / 2;
  const rays = useMemo(() => Array.from({ length: 17 }, (_, i) => (i - 8) / 8), []);
  const fade = useAnimatedStyle(() => {
    // The floor sinks away as you scroll down, so content stays readable.
    const s = Math.min((scroll?.value ?? 0) / (h * 0.8), 1);
    return { opacity: 1 - s * 0.6, transform: [{ translateY: s * floorH * 0.5 }] };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: 0.55 }, fade]}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#B69CFF" stopOpacity={0} />
            <Stop offset="1" stopColor="#7FE7FF" stopOpacity={0.7} />
          </LinearGradient>
          <RadialGradient id={`${id}h`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#B69CFF" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#B69CFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={-w * 0.1} y={top - 60} width={w * 1.2} height={120} fill={`url(#${id}h)`} />
        <Line x1={0} y1={top} x2={w} y2={top} stroke="#B69CFF" strokeOpacity={0.8} strokeWidth={1} />
        {rays.map((k, i) => (
          <Line key={i} x1={vx + k * w * 0.08} y1={top} x2={vx + k * w * 1.1} y2={h} stroke={`url(#${id}r)`} strokeWidth={1} />
        ))}
      </Svg>
      {Array.from({ length: GRID_LINES }).map((_, i) => <FloorLine key={i} i={i} t={t} top={top} floorH={floorH} />)}
    </Animated.View>
  );
}

/** Everything that moves with scroll, layered back to front. */
export function ParallaxLayers({ scroll }: { scroll?: SharedValue<number> }) {
  const { width: w, height: h } = useWindowDimensions();
  const reduce = useReducedMotion();
  const s = reduce ? undefined : scroll;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Stars scroll={s} w={w} h={h} />
      <Aurora scroll={s} w={w} h={h} />
      <GridFloor scroll={s} w={w} h={h} />
    </View>
  );
}
