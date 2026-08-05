import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import * as WebBrowser from 'expo-web-browser';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { LanguageProvider, useLanguage } from '../src/i18n/LanguageContext';
import { C } from '../src/theme/colors';

// Dismiss PayOS auth session when redirected to museumar://payment-result
WebBrowser.maybeCompleteAuthSession();

function RootStack() {
  const { t, lang } = useLanguage();

  const headerOpts = {
    headerStyle: { backgroundColor: C.bgSurface },
    headerTitleStyle: { color: C.textPrimary },
    headerTintColor: C.accent,
    headerBackTitle: t('common.back'),
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bgPrimary }}>
      <StatusBar style="dark" />
      {Platform.OS === 'android' ? <NavigationBar hidden /> : null}
      <OfflineBanner />
      <Stack key={lang} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="museum/[id]"
          options={{ headerShown: true, headerTitle: t('header.museumDetail'), ...headerOpts }}
        />
        <Stack.Screen
          name="ar-packs/index"
          options={{ headerShown: true, headerTitle: t('header.arPacks'), ...headerOpts }}
        />
        <Stack.Screen
          name="exhibit/[id]"
          options={{ headerShown: true, headerTitle: t('header.exhibitDetail'), ...headerOpts }}
        />
        <Stack.Screen
          name="ar-view/[id]"
          options={{ headerShown: true, headerTitle: t('header.audioGuide'), ...headerOpts }}
        />
        <Stack.Screen
          name="ar-model/[id]"
          options={{ headerShown: true, headerTitle: t('header.arModel'), ...headerOpts }}
        />
        <Stack.Screen
          name="unity-ar/[id]"
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="visited-exhibits"
          options={{ headerShown: true, headerTitle: t('header.visitHistory'), ...headerOpts }}
        />
        <Stack.Screen
          name="bookmarks"
          options={{ headerShown: true, headerTitle: t('header.bookmarks'), ...headerOpts }}
        />
        <Stack.Screen
          name="my-tickets"
          options={{ headerShown: true, headerTitle: t('header.myTickets'), ...headerOpts }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: true, headerTitle: t('settings.title'), ...headerOpts }}
        />
        <Stack.Screen
          name="payment-result"
          options={{ headerShown: false, presentation: 'modal' }}
        />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <RootStack />
    </LanguageProvider>
  );
}
