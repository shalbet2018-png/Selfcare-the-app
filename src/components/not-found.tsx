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
