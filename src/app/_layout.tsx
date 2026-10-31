import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Jost_300Light, Jost_400Regular, Jost_500Medium, useFonts } from '@expo-google-fonts/jost';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BloomLoader } from '@/components/bloom-loader';
import { Nav } from '@/components/nav';
import { FeedbackProvider } from '@/lib/feedback';
import { useLayout } from '@/lib/layout';
import { StoreProvider, useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import { IS_BUSINESS_APP } from '@/lib/variant';

SplashScreen.preventAutoHideAsync();

function Shell() {
  const { phone } = useLayout();
  const { ready } = useStore();
  const biz = usePathname().startsWith('/biz');
  const darkStart = IS_BUSINESS_APP || biz;
  const [fontsLoaded, fontError] = useFonts({
    Jost_300Light, Jost_400Regular, Jost_500Medium, Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  });
  const loaded = (fontsLoaded || !!fontError) && ready;

  // The bloom loader shows until the app is ready AND the bud has finished opening.
  const [bloomed, setBloomed] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const loaderOpacity = useSharedValue(1);
  const loaderStyle = useAnimatedStyle(() => ({ opacity: loaderOpacity.value }));
  const onBloomed = useCallback(() => setBloomed(true), []);

  // The phone's own startup screen shows the same closed bud, so hand over straight away.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!loaded || !bloomed || loaderGone) return;
    loaderOpacity.set(withTiming(0, { duration: 350 }));
    const t = setTimeout(() => setLoaderGone(true), 380);
    return () => clearTimeout(t);
  }, [loaded, bloomed, loaderGone, loaderOpacity]);

  return (
    <View style={{ flex: 1, backgroundColor: darkStart ? C.night : C.pearl }}>
      {loaded && (
        <FeedbackProvider>
          <StatusBar style={biz ? 'light' : 'dark'} />
          <View style={{ flex: 1, flexDirection: phone ? 'column' : 'row', backgroundColor: biz ? C.night : C.pearl }}>
            {!phone && <Nav />}
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
            </View>
            {phone && <Nav />}
          </View>
        </FeedbackProvider>
      )}
      {!loaderGone && (
        <Animated.View pointerEvents={loaded && bloomed ? 'none' : 'auto'} style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, loaderStyle]}>
          <BloomLoader dark={darkStart} onBloomed={onBloomed} />
        </Animated.View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
