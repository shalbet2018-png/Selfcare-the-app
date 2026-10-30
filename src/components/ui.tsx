import { Link, type Href } from 'expo-router';
import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './icon';
import { C, F, R } from '@/lib/theme';

/** True inside business (dark) screens; components pick light-on-dark colours. */
export const DarkCtx = createContext(false);
export const useDark = () => useContext(DarkCtx);

/* ---------------- Text ---------------- */
type Variant = 'h1' | 'h2' | 'h3' | 'big' | 'body' | 'strong' | 'small' | 'eyebrow' | 'lead' | 'label';
export function T({ v = 'body', muted, style, children, numberOfLines, accent }: {
  v?: Variant; muted?: boolean; accent?: boolean; style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number;
}) {
  const dark = useDark();
  const color = accent ? C.sage : muted ? (dark ? C.onNightMuted : C.muted) : dark ? C.onNight : C.ink;
  return (
    <Text
      numberOfLines={numberOfLines}
      role={v === 'h1' ? 'heading' : undefined}
      aria-level={v === 'h1' ? 1 : undefined}
      style={[ts[v], { color }, style]}>
      {children}
    </Text>
  );
}
const ts = StyleSheet.create({
  h1: { fontFamily: F.display300, fontSize: 38, lineHeight: 42, letterSpacing: -0.5 },
  h2: { fontFamily: F.display400, fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: F.display500, fontSize: 19, lineHeight: 24 },
  big: { fontFamily: F.display300, fontSize: 40, lineHeight: 46 },
  body: { fontFamily: F.body, fontSize: 16, lineHeight: 23 },
  strong: { fontFamily: F.body600, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  eyebrow: { fontFamily: F.body500, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase' },
  lead: { fontFamily: F.body, fontSize: 17, lineHeight: 26, maxWidth: 560 },
  label: { fontFamily: F.body500, fontSize: 13 },
});

/* ---------------- Surfaces ---------------- */
export function Glass({ style, children, light }: { style?: StyleProp<ViewStyle>; children: ReactNode; light?: boolean }) {
  const dark = useDark() && !light;
  return (
    <View style={[{
      backgroundColor: light ? C.pearl : dark ? C.glassDark : C.glass,
      borderColor: light ? C.pearl : dark ? C.glassDarkBorder : C.glassBorder,
      borderWidth: 1, borderRadius: R.lg,
    }, style]}>
      {children}
    </View>
  );
}

/* ---------------- Buttons ---------------- */
type BtnKind = 'dark' | 'light' | 'outline' | 'ghost';
export function Btn({ label, onPress, href, kind = 'dark', small, block, disabled, icon, style, a11y }: {
  label: string; onPress?: () => void; href?: Href; kind?: BtnKind; small?: boolean; block?: boolean;
  disabled?: boolean; icon?: IconName; style?: StyleProp<ViewStyle>; a11y?: string;
}) {
  const dark = useDark();
  const bg = { dark: C.ink, light: C.onNight, outline: 'transparent', ghost: dark ? 'rgba(255,255,255,0.1)' : 'rgba(36,33,43,0.07)' }[kind];
  const fg = { dark: C.white, light: C.night, outline: dark ? C.onNight : C.ink, ghost: dark ? C.onNight : C.ink }[kind];
  const content = (
    <Pressable
      role="button"
      accessibilityLabel={a11y}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      // One flat style object: Link asChild on web drops function styles and can't take arrays.
      style={StyleSheet.flatten([
        bs.btn, small && bs.small, block && bs.block,
        { backgroundColor: bg },
        kind === 'outline' && { borderWidth: 1, borderColor: dark ? 'rgba(246,242,247,0.45)' : '#BDB4C4' },
        disabled && { opacity: 0.45 },
        style,
      ])}>
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={[bs.label, small && { fontSize: 14 }, { color: fg }]}>{label}</Text>
    </Pressable>
  );
  return href && !disabled ? <Link href={href} asChild>{content}</Link> : content;
}
const bs = StyleSheet.create({
  btn: { minHeight: 48, paddingHorizontal: 22, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'flex-start' },
  small: { minHeight: 40, paddingHorizontal: 16 },
  block: { alignSelf: 'stretch' },
  label: { fontFamily: F.body500, fontSize: 16 },
});

/* ---------------- Choice controls ---------------- */
export function Segmented<V extends string>({ options, value, onChange, label }: {
  options: { id: V; label: string }[]; value: V; onChange: (v: V) => void; label: string;
}) {
  const dark = useDark();
  return (
    <View role="radiogroup" aria-label={label} style={[ss.wrap, { backgroundColor: dark ? C.glassDark : C.glass, borderColor: dark ? C.glassDarkBorder : C.glassBorder }]}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} role="radio" aria-checked={on} onPress={() => onChange(o.id)}
            style={[ss.btn, on && { backgroundColor: C.sage }]}>
            <Text style={[ss.label, { color: on ? C.white : dark ? C.onNight : C.ink }, on && { fontFamily: F.body500 }]} numberOfLines={2}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const ss = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: R.md, borderWidth: 1, maxWidth: 480, alignSelf: 'stretch' },
  btn: { flex: 1, minHeight: 44, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  label: { fontFamily: F.body, fontSize: 15, textAlign: 'center' },
});

export function Pill({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable role="radio" aria-checked={!!selected} onPress={onPress}
      style={[ps.pill, selected && { backgroundColor: C.ink, borderColor: C.ink }]}>
      <Text style={[ps.label, { color: selected ? C.white : C.ink }]}>{label}</Text>
    </Pressable>
  );
}
export function PillRow({ children, label }: { children: ReactNode; label: string }) {
  return <View role="radiogroup" aria-label={label} style={ps.row}>{children}</View>;
}
const ps = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 44, paddingHorizontal: 16, borderRadius: R.pill, borderWidth: 1, borderColor: 'rgba(36,33,43,0.14)', backgroundColor: 'rgba(255,255,255,0.72)', justifyContent: 'center' },
  label: { fontFamily: F.body, fontSize: 14 },
});

export function Chip({ label }: { label: string }) {
  return <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.85)' }}><Text style={{ fontFamily: F.body, fontSize: 12, color: C.ink }}>{label}</Text></View>;
}

export function Badge({ label = 'Verified' }: { label?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: R.pill, backgroundColor: C.sage }}>
      <Icon name="check" size={12} color={C.white} />
      <Text style={{ fontFamily: F.body600, fontSize: 12, color: C.white }}>{label}</Text>
    </View>
  );
}

/* ---------------- Inputs ---------------- */
export function Field({ label, style, ...input }: TextInputProps & { label: string; style?: StyleProp<ViewStyle> }) {
  const dark = useDark();
  return (
    <View style={[{ gap: 4 }, style]}>
      <Text style={{ fontFamily: F.body, fontSize: 13, color: dark ? C.onNightMuted : C.muted }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={dark ? '#A9A0B0' : '#6E6875'}
        style={{
          minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, fontFamily: F.body, fontSize: 16,
          borderColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(36,33,43,0.14)',
          backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
          color: dark ? C.onNight : C.ink,
        }}
        {...input}
      />
    </View>
  );
}

/* ---------------- Money lines ---------------- */
export function Lines({ rows, onCard }: { rows: { label: string; value: string; total?: boolean }[]; onCard?: boolean }) {
  const dark = useDark() && !onCard;
  return (
    <View style={{ gap: 8 }}>
      {rows.map((r) => (
        <View key={r.label} style={[{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, r.total && { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }]}>
          <Text style={{ flexShrink: 1, fontFamily: r.total ? F.body600 : F.body, fontSize: r.total ? 17 : 15, color: r.total ? (dark ? C.onNight : C.ink) : dark ? C.onNightMuted : C.muted }}>{r.label}</Text>
          <Text style={{ fontFamily: r.total ? F.body600 : F.body, fontSize: r.total ? 17 : 15, color: dark ? C.onNight : C.ink }}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function Back({ href, label }: { href: Href; label: string }) {
  const dark = useDark();
  return (
    <Link href={href} asChild>
      <Pressable role="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' }}>
        <Icon name="back" size={18} color={dark ? C.onNightMuted : C.muted} />
        <Text style={{ fontFamily: F.body, fontSize: 15, color: dark ? C.onNightMuted : C.muted }}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export function Row({ children, style, wrap }: { children: ReactNode; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>;
}
