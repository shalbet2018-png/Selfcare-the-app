import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'home' | 'search' | 'calendar' | 'user' | 'pin' | 'back' | 'star'
  | 'check' | 'grid' | 'list' | 'shield' | 'wallet' | 'swap';

export function Icon({ name, size = 22, color = '#24212B' }: { name: IconName; size?: number; color?: string }) {
  const p = { stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    // Decorative: hidden from screen readers. aria-hidden on a View works on Android, iOS and web,
    // unlike importantForAccessibility, which web browsers don't understand.
    <View aria-hidden style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && <Path {...p} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />}
      {name === 'search' && <><Circle {...p} cx={11} cy={11} r={7} /><Path {...p} d="M20 20l-4-4" /></>}
      {name === 'calendar' && <><Rect {...p} x={3} y={5} width={18} height={16} rx={3} /><Path {...p} d="M3 10h18M8 3v4M16 3v4" /></>}
      {name === 'user' && <><Circle {...p} cx={12} cy={8} r={4} /><Path {...p} d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>}
      {name === 'pin' && <><Path {...p} d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" /><Circle {...p} cx={12} cy={9} r={2.5} /></>}
      {name === 'back' && <Path {...p} d="M15 5l-7 7 7 7" />}
      {name === 'star' && <Path {...p} d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />}
      {name === 'check' && <Path {...p} d="M5 12l5 5 9-10" />}
      {name === 'grid' && <><Rect {...p} x={3} y={3} width={7} height={7} rx={2} /><Rect {...p} x={14} y={3} width={7} height={7} rx={2} /><Rect {...p} x={3} y={14} width={7} height={7} rx={2} /><Rect {...p} x={14} y={14} width={7} height={7} rx={2} /></>}
      {name === 'list' && <Path {...p} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />}
      {name === 'shield' && <><Path {...p} d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><Path {...p} d="M9 12l2 2 4-4" /></>}
      {name === 'wallet' && <><Rect {...p} x={3} y={6} width={18} height={14} rx={3} /><Path {...p} d="M16 13h2M3 10h18" /></>}
      {name === 'swap' && <Path {...p} d="M7 7h13l-3-3M17 17H4l3 3" />}
    </Svg>
    </View>
  );
}
