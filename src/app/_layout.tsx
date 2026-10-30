import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Jost_300Light, Jost_400Regular, Jost_500Medium, useFonts } from '@expo-google-fonts/jost';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Nav } from '@/components/nav';
import { FeedbackProvider } from '@/lib/feedback';
import { useLayout } from '@/lib/layout';
import { StoreProvider, useStore } from '@/lib/store';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

function Shell() {
  const { phone } = useLayout();
  const { ready } = useStore();
  const biz = usePathname().startsWith('/biz');
  const [fontsLoaded, fontError] = useFonts({
    Jost_300Light, Jost_400Regular, Jost_500Medium, Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  });
  const loaded = (fontsLoaded || !!fontError) && ready;

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
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
