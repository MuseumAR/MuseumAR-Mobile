import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { C } from '../src/theme/colors';
import { OfflineBanner } from '../src/components/OfflineBanner';

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
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="museum/[id]"   options={{ headerShown: true, headerTitle: 'Chi tiết bảo tàng', ...HEADER_OPTS }} />
        <Stack.Screen name="ar-packs/index" options={{ headerShown: true, headerTitle: 'Gói AR',             ...HEADER_OPTS }} />
        <Stack.Screen name="exhibit/[id]"  options={{ headerShown: true, headerTitle: 'Chi tiết hiện vật',  ...HEADER_OPTS }} />
        <Stack.Screen name="ar-view/[id]"  options={{ headerShown: true, headerTitle: 'Thuyết minh AR',     ...HEADER_OPTS }} />
        <Stack.Screen name="visited-exhibits" options={{ headerShown: true, headerTitle: 'Lịch sử tham quan', ...HEADER_OPTS }} />
        <Stack.Screen name="bookmarks"        options={{ headerShown: true, headerTitle: 'Hiện vật đã lưu',   ...HEADER_OPTS }} />
      </Stack>
    </View>
  );
}
