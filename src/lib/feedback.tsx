// Toast messages and an in-app "are you sure?" sheet (same on every platform).
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLayout } from './layout';
import { C, F } from './theme';

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

type Ask = { title: string; message: string; ok: string; resolve: (v: boolean) => void };
const ConfirmCtx = createContext<(title: string, message: string, ok?: string) => Promise<boolean>>(() => Promise.resolve(false));
/** Returns ask(title, message, okLabel) → Promise<boolean>. */
export const useConfirm = () => useContext(ConfirmCtx);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const [ask, setAsk] = useState<Ask | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { phone } = useLayout();

  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2800);
  }, []);

  const confirm = useCallback((title: string, message: string, ok = 'Yes') =>
    new Promise<boolean>((resolve) => setAsk({ title, message, ok, resolve })), []);

  const answer = (v: boolean) => { ask?.resolve(v); setAsk(null); };

  return (
    <ToastCtx.Provider value={show}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <View pointerEvents="none" aria-live="polite" style={{ position: 'absolute', left: 16, right: 16, bottom: (phone ? 96 : 28) + insets.bottom, alignItems: 'center' }}>
          {msg ? (
            <View style={{ backgroundColor: C.ink, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, maxWidth: 480 }}>
              <Text style={{ color: C.white, fontFamily: F.body, fontSize: 14 }}>{msg}</Text>
            </View>
          ) : null}
        </View>
        {ask ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,16,24,0.45)', justifyContent: phone ? 'flex-end' : 'center', alignItems: 'center', padding: phone ? 0 : 24 }}>
            <Pressable accessibilityLabel="Dismiss" onPress={() => answer(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            <View role="alertdialog" aria-label={ask.title} style={{
              width: '100%', maxWidth: 440, backgroundColor: C.pearl, padding: 24, gap: 10,
              paddingBottom: 24 + (phone ? insets.bottom : 0),
              borderRadius: 24, borderBottomLeftRadius: phone ? 0 : 24, borderBottomRightRadius: phone ? 0 : 24,
            }}>
              <Text style={{ fontFamily: F.display500, fontSize: 21, color: C.ink }}>{ask.title}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.muted }}>{ask.message}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <Pressable role="button" onPress={() => answer(false)} style={{ flex: 1, minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: '#BDB4C4', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.body500, fontSize: 16, color: C.ink }}>Keep it</Text>
                </Pressable>
                <Pressable role="button" onPress={() => answer(true)} style={{ flex: 1, minHeight: 48, borderRadius: 999, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.body500, fontSize: 16, color: C.white }}>{ask.ok}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}
