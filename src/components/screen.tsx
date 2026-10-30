import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Background } from './background';
import { DarkCtx } from './ui';
import { useLayout } from '@/lib/layout';
import type { BgTheme } from '@/lib/theme';

/** Every page: themed background, safe areas, scrolling, centred content column. */
export function Screen({ theme = 'hair', children }: { theme?: BgTheme; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { size } = useLayout();
  const dark = theme === 'business';
  const padX = size === 'desktop' ? 48 : size === 'tablet' ? 32 : 20;
  const padTop = (size === 'phone' ? 24 : 40) + insets.top;
  const padBottom = size === 'phone' ? 110 + insets.bottom : 60 + insets.bottom;
  return (
    <DarkCtx.Provider value={dark}>
      <View style={{ flex: 1 }}>
        <Background theme={theme} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: padTop, paddingBottom: padBottom, paddingHorizontal: padX }}
          keyboardShouldPersistTaps="handled">
          <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center', gap: 22 }}>{children}</View>
        </ScrollView>
      </View>
    </DarkCtx.Provider>
  );
}
