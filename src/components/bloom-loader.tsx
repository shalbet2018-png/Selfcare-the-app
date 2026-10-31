// Loading screen: the bud from the app icon opens petal by petal, then pulses gently
// until the app is ready. Light for Selfcare, dark for Selfcare for Business.
import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

// Same drawing as assets/brand/*.svg, on a 140 × 140 grid: petals hinge at (70, 86).
const PETAL = 'M70 86C53 66 57 41 70 26C83 41 87 66 70 86Z';
const ANGLES = [-64, -32, 0, 32, 64];
const DRAW_ORDER = [0, 4, 1, 3, 2]; // outer petals behind, centre petal in front
const BLOOM_MS = 1100;

const THEMES = {
  light: {
    bg: '#F4EEF0',
    outer: ['#F8F0FF', '#CDB6E4'],
    centre: ['#FFFFFF', '#EDBFCF'],
    heart: ['#FFFFFF', '#F6EEF3', '#D9C6D3'],
    glow: '#E9C9D8',
  },
  dark: {
    bg: '#221E27',
    outer: ['#D9C6FF', '#A88BD9'],
    centre: ['#EADCFF', '#C3A8F2'],
    heart: ['#FFF4DC', '#FFD28A', '#E9A95A'],
    glow: '#CDB4FF',
  },
} as const;

function Petal({ index, open, k, colors, opacity }: {
  index: number; open: SharedValue<number>; k: number; colors: readonly [string, string]; opacity: number;
}) {
  const gid = `p${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const angle = ANGLES[index];
  // Petals start one after another, outer pair last.
  const delay = [0.16, 0.08, 0, 0.08, 0.16][index];
  const style = useAnimatedStyle(() => {
    const o = Math.min(1, Math.max(0, (open.value - delay) / (1 - 0.16)));
    return {
      transform: [
        { rotate: `${angle * (0.12 + 0.88 * o)}deg` },
        { scale: 0.72 + 0.28 * o },
      ],
    };
  });
  // The petal's box is x 53–87, y 26–86 on the 140 grid; it hinges at its bottom centre.
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 53 * k, top: 26 * k, width: 34 * k, height: 60 * k, transformOrigin: '50% 100%' },
        style,
      ]}>
      <Svg width="100%" height="100%" viewBox="53 26 34 60">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Path d={PETAL} fill={`url(#${gid})`} fillOpacity={opacity} />
      </Svg>
    </Animated.View>
  );
}

export function BloomLoader({ dark = false, size = 200, onBloomed }: { dark?: boolean; size?: number; onBloomed?: () => void }) {
  const t = dark ? THEMES.dark : THEMES.light;
  const reduceMotion = useReducedMotion();
  const open = useSharedValue(reduceMotion ? 1 : 0);
  const pulse = useSharedValue(0);
  const k = size / 140;
  const hid = `h${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    if (reduceMotion) {
      onBloomed?.();
      return;
    }
    open.set(withTiming(1, { duration: BLOOM_MS, easing: Easing.out(Easing.cubic) }));
    pulse.set(withDelay(BLOOM_MS, withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true)));
    const done = setTimeout(() => onBloomed?.(), BLOOM_MS + 300);
    return () => clearTimeout(done);
  }, [open, pulse, reduceMotion, onBloomed]);

  const flowerStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.05]) }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0, 1], [0, 0.7]) + interpolate(pulse.value, [0, 1], [0, 0.3]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.9, 1.08]) }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }]} role="progressbar" aria-label="Loading Selfcare">
      <Animated.View style={[{ width: size, height: size }, flowerStyle]}>
        <Animated.View style={[{ position: 'absolute', left: 14 * k, top: 8 * k, width: 112 * k, height: 112 * k }, glowStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id={`${hid}g`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={t.glow} stopOpacity={0.9} />
                <Stop offset="1" stopColor={t.glow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={50} cy={50} r={50} fill={`url(#${hid}g)`} />
          </Svg>
        </Animated.View>
        {DRAW_ORDER.map((i) => (
          <Petal key={i} index={i} open={open} k={k} colors={i === 2 ? t.centre : t.outer} opacity={[0.95, 0.97, 1, 0.97, 0.95][i]} />
        ))}
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 140 140">
          <Defs>
            <RadialGradient id={hid} cx="35%" cy="30%" r="70%">
              <Stop offset="0" stopColor={t.heart[0]} />
              <Stop offset="0.45" stopColor={t.heart[1]} />
              <Stop offset="1" stopColor={t.heart[2]} />
            </RadialGradient>
          </Defs>
          <Circle cx={70} cy={86} r={7.5} fill={`url(#${hid})`} stroke={dark ? 'none' : '#FFFFFF'} strokeWidth={1} />
          {!dark && <Circle cx={67.6} cy={83.6} r={2} fill="#FFFFFF" />}
        </Svg>
      </Animated.View>
    </View>
  );
}
