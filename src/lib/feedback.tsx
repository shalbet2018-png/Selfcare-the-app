// Toast messages and a cross-platform "are you sure?" prompt.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLayout } from './layout';
import { C, F } from './theme';

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { phone } = useLayout();
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <View pointerEvents="none" aria-live="polite" style={{ position: 'absolute', left: 16, right: 16, bottom: (phone ? 96 : 28) + insets.bottom, alignItems: 'center' }}>
        {msg ? (
          <View style={{ backgroundColor: C.ink, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, maxWidth: 480 }}>
            <Text style={{ color: C.white, fontFamily: F.body, fontSize: 14 }}>{msg}</Text>
          </View>
        ) : null}
      </View>
    </ToastCtx.Provider>
  );
}

export function confirmAsync(title: string, message: string, ok = 'Yes'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'No', style: 'cancel', onPress: () => resolve(false) },
      { text: ok, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
