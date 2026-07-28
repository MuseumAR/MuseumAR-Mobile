import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import * as WebBrowser from 'expo-web-browser';
import { C } from '../src/theme/colors';
import { OfflineBanner } from '../src/components/OfflineBanner';

// Dismiss PayOS auth session when redirected to museumar://payment-result
WebBrowser.maybeCompleteAuthSession();

const HEADER_OPTS = {
  headerStyle: { backgroundColor: C.bgSurface },
  headerTitleStyle: { color: C.textPrimary },
  headerTintColor: C.accent,
  headerBackTitle: 'Quay lại',
};

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bgPrimary }}>
      <StatusBar style="dark" />
      {Platform.OS === 'android' ? <NavigationBar hidden /> : null}
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="museum/[id]"   options={{ headerShown: true, headerTitle: 'Chi tiết bảo tàng', ...HEADER_OPTS }} />
        <Stack.Screen name="ar-packs/index" options={{ headerShown: true, headerTitle: 'Gói AR',             ...HEADER_OPTS }} />
        <Stack.Screen name="exhibit/[id]"  options={{ headerShown: true, headerTitle: 'Chi tiết hiện vật',  ...HEADER_OPTS }} />
        <Stack.Screen name="ar-view/[id]"  options={{ headerShown: true, headerTitle: 'Audio Guide',     ...HEADER_OPTS }} />
        <Stack.Screen name="ar-model/[id]" options={{ headerShown: true, headerTitle: 'Mô hình AR 2D/3D', ...HEADER_OPTS }} />
        <Stack.Screen name="unity-ar/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="visited-exhibits" options={{ headerShown: true, headerTitle: 'Lịch sử tham quan', ...HEADER_OPTS }} />
        <Stack.Screen name="bookmarks"        options={{ headerShown: true, headerTitle: 'Hiện vật đã lưu',   ...HEADER_OPTS }} />
        <Stack.Screen name="my-tickets"       options={{ headerShown: true, headerTitle: 'Vé của tôi',        ...HEADER_OPTS }} />
        <Stack.Screen name="payment-result"  options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
    </View>
  );
}
