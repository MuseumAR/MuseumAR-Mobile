import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { OfflineBanner } from '../src/components/OfflineBanner';

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="museum/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Chi tiết bảo tàng',
            headerBackTitle: 'Quay lại',
            headerTintColor: '#1A6FA8',
          }}
        />
        <Stack.Screen
          name="ar-packs/index"
          options={{
            headerShown: true,
            headerTitle: 'Gói AR',
            headerBackTitle: 'Quay lại',
            headerTintColor: '#1A6FA8',
          }}
        />
        <Stack.Screen
          name="exhibit/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Chi tiết hiện vật',
            headerBackTitle: 'Quay lại',
            headerTintColor: '#1A6FA8',
          }}
        />
      </Stack>
    </View>
  );
}
