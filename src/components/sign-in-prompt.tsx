import { Screen } from './screen';
import { Btn, Glass, T } from './ui';
import type { BgTheme } from '@/lib/theme';

/** Full page asking the person to sign in, then come back to `next`. */
export function SignInPrompt({ next, title, body, theme = 'business' }: { next: string; title: string; body: string; theme?: BgTheme }) {
  return (
    <Screen theme={theme}>
      <T v="h1">{title}</T>
      <Glass style={{ padding: 22, gap: 14, maxWidth: 560 }}>
        <T muted>{body}</T>
        <Btn kind="light" label="Sign in with email" href={{ pathname: '/sign-in', params: { next } }} />
      </Glass>
    </Screen>
  );
}
