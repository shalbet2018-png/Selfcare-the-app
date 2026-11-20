import { View } from 'react-native';

import { Screen } from './screen';
import { Btn, T } from './ui';

export function NotFoundView() {
  return (
    <Screen theme="hair">
      <T v="h1">Page not found</T>
      <T muted>That link doesn’t lead anywhere.</T>
      <Btn label="Go home" href="/" />
    </Screen>
  );
}

/** Shown while a page waits for its data from the backend. */
export function LoadingView({ label = 'Loading…' }: { label?: string }) {
  return (
    <Screen theme="hair">
      <View role="progressbar" aria-label={label}><T muted>{label}</T></View>
    </Screen>
  );
}
