// Soft blurred colour fields plus floating 3D bubbles, behind every screen.
import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ReduceMotion } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

import { BACKGROUNDS, type BgTheme } from '@/lib/theme';

export function Bubble({ size, delay = 0, duration = 9000, opacity = 1 }: { size: number; delay?: number; duration?: number; opacity?: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      y.value = withRepeat(withTiming(-14, { duration: duration / 2, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }), -1, true);
    }, delay);
    return () => clearTimeout(t);
  }, [y, delay, duration]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const id = `bub${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Animated.View style={[{ width: size, height: size, opacity }, style]}>
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
            <Stop offset="0" stopColor="#6E5082" stopOpacity={0.14} />
            <Stop offset="1" stopColor="#6E5082" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={50} r={48} fill={`url(#${id}s)`} />
        <Circle cx={50} cy={50} r={48} fill={`url(#${id})`} stroke="#fff" strokeOpacity={0.7} strokeWidth={1} />
      </Svg>
    </Animated.View>
  );
}

export function Background({ theme }: { theme: BgTheme }) {
  const bg = BACKGROUNDS[theme];
  const dark = theme === 'business';
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
      <View style={{ position: 'absolute', right: -40, top: 60 }}><Bubble size={160} opacity={dark ? 0.45 : 1} /></View>
      <View style={{ position: 'absolute', right: 120, top: 190 }}><Bubble size={54} delay={1500} opacity={dark ? 0.45 : 1} /></View>
      <View style={{ position: 'absolute', left: -24, bottom: '22%' }}><Bubble size={90} delay={800} duration={13000} opacity={dark ? 0.45 : 1} /></View>
    </View>
  );
}
