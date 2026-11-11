// Glowing colour fields plus drifting, bouncing glass bubbles, behind every screen.
import { memo, useId, useRef } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

import { BACKGROUNDS, type BgTheme } from '@/lib/theme';

/** One glass orb, drawn once; the Bubbles layer moves it around. */
const Orb = memo(function Orb({ size }: { size: number }) {
  const id = `bub${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="32%" cy="28%" r="72%">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.95} />
          <Stop offset="0.1" stopColor="#fff" stopOpacity={0.9} />
          <Stop offset="0.3" stopColor="#fff" stopOpacity={0.35} />
          <Stop offset="0.7" stopColor="#fff" stopOpacity={0.05} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0.3} />
        </RadialGradient>
        <RadialGradient id={`${id}s`} cx="70%" cy="75%" r="50%">
          <Stop offset="0" stopColor="#E3C28A" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#E3C28A" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={48} fill={`url(#${id}s)`} />
      <Circle cx={50} cy={50} r={48} fill={`url(#${id})`} stroke="#fff" strokeOpacity={0.7} strokeWidth={1} />
    </Svg>
  );
});

// Where each bubble starts (as a fraction of the screen), which way it heads and how fast (px per second).
const SEEDS = [
  { size: 150, fx: 0.82, fy: 0.16, angle: 2.3, speed: 20, opacity: 0.3 },
  { size: 92, fx: 0.16, fy: 0.7, angle: -0.6, speed: 26, opacity: 0.3 },
  { size: 60, fx: 0.55, fy: 0.34, angle: 1.0, speed: 32, opacity: 0.38 },
  { size: 44, fx: 0.28, fy: 0.4, angle: 4.0, speed: 38, opacity: 0.4 },
  { size: 30, fx: 0.72, fy: 0.82, angle: 5.2, speed: 44, opacity: 0.45 },
];

type Body = { x: number; y: number; vx: number; vy: number; r: number };

/** Moves every bubble one step, bouncing off the screen edges and off each other (heavier = bigger). */
function step(bodies: Body[], w: number, h: number, dt: number) {
  'worklet';
  for (const b of bodies) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } else if (b.x > w - b.r) { b.x = w - b.r; b.vx = -Math.abs(b.vx); }
    if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); } else if (b.y > h - b.r) { b.y = h - b.r; b.vy = -Math.abs(b.vy); }
  }
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const overlap = a.r + b.r - dist;
      if (overlap <= 0 || dist === 0) continue;
      const nx = dx / dist;
      const ny = dy / dist;
      const ma = a.r * a.r;
      const mb = b.r * b.r;
      // Push the pair apart so they never stick together.
      a.x -= nx * overlap * (mb / (ma + mb));
      a.y -= ny * overlap * (mb / (ma + mb));
      b.x += nx * overlap * (ma / (ma + mb));
      b.y += ny * overlap * (ma / (ma + mb));
      // Swap momentum along the line between their centres, if they are closing in.
      const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (closing <= 0) continue;
      const impulse = (2 * closing) / (ma + mb);
      a.vx -= impulse * mb * nx;
      a.vy -= impulse * mb * ny;
      b.vx += impulse * ma * nx;
      b.vy += impulse * ma * ny;
    }
  }
}

function MovingBubble({ index, bodies }: { index: number; bodies: SharedValue<Body[]> }) {
  const { size, opacity } = SEEDS[index];
  const style = useAnimatedStyle(() => {
    const b = bodies.value[index];
    if (!b) return { opacity: 0 };
    return { opacity, transform: [{ translateX: b.x - b.r }, { translateY: b.y - b.r }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, style]}>
      <Orb size={size} />
    </Animated.View>
  );
}

/** Glass bubbles that drift around the whole screen and bounce off each other. Still when the device asks for reduced motion. */
function Bubbles() {
  const bodies = useSharedValue<Body[]>([]);
  const box = useSharedValue({ w: 0, h: 0 });
  const seeded = useRef(false);
  const reduceMotion = useReducedMotion();

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (!w || !h) return;
    box.value = { w, h };
    if (seeded.current) return; // after a resize the edges simply bounce them back into view
    seeded.current = true;
    bodies.value = SEEDS.map((s) => ({
      r: s.size / 2,
      x: Math.min(Math.max(s.fx * w, s.size / 2), w - s.size / 2),
      y: Math.min(Math.max(s.fy * h, s.size / 2), h - s.size / 2),
      vx: Math.cos(s.angle) * s.speed,
      vy: Math.sin(s.angle) * s.speed,
    }));
  };

  useFrameCallback((frame) => {
    const { w, h } = box.value;
    if (!w || !h) return;
    // Cap the step so bubbles don't jump after the app was in the background.
    const dt = Math.min(frame.timeSincePreviousFrame ?? 16, 34) / 1000;
    bodies.modify((bs) => {
      'worklet';
      step(bs, w, h, dt);
      return bs;
    });
  }, !reduceMotion);

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {SEEDS.map((_, i) => <MovingBubble key={i} index={i} bodies={bodies} />)}
    </View>
  );
}

/** A soft glowing dot of colour, used as an accent inside cards. */
export function Glow({ color, size }: { color: string; size: number }) {
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.85} />
          <Stop offset="0.45" stopColor={color} stopOpacity={0.3} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={50} fill={`url(#${id})`} />
    </Svg>
  );
}

export function Background({ theme }: { theme: BgTheme }) {
  const bg = BACKGROUNDS[theme];
  const uid = `bg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bg.base, overflow: 'hidden' }]} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Defs>
          {bg.spots.map(([, , color], i) => (
            <RadialGradient key={i} id={`${uid}${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={color} stopOpacity={1} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill={bg.base} />
        {bg.spots.map(([x, y], i) => (
          <Ellipse key={i} cx={x} cy={y} rx={60} ry={45} fill={`url(#${uid}${i})`} />
        ))}
      </Svg>
      <Bubbles />
    </View>
  );
}
