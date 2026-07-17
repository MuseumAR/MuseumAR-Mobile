import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 5149;

/**
 * Ghi đè host khi cần (máy thật / Wi‑Fi).
 * Ví dụ: '192.168.1.20'
 * Để null = tự chọn theo nền tảng (khuyến nghị cho emulator).
 */
const FORCE_DEV_HOST: string | null =
  (Constants.expoConfig?.extra as { apiHost?: string } | undefined)?.apiHost?.trim() ||
  null;

/**
 * Host máy chạy backend khi đang phát triển.
 *
 * - Android emulator: luôn dùng 10.0.2.2 (map tới localhost của PC)
 * - iOS simulator: localhost
 * - Máy thật: đặt FORCE_DEV_HOST / expo.extra.apiHost = IP LAN của PC
 *   và chạy backend listen 0.0.0.0:5149
 *
 * Lưu ý: KHÔNG dùng Expo hostUri (IP LAN Metro) làm API host trên emulator —
 * vì Kestrel thường chỉ bind localhost → app không kết nối được.
 */
function getDevHost(): string {
  if (FORCE_DEV_HOST) return FORCE_DEV_HOST;

  if (Platform.OS === 'android') {
    // Emulator: 10.0.2.2 → localhost của máy host
    return '10.0.2.2';
  }

  // iOS simulator / web
  return 'localhost';
}

export const API_BASE_URL = `http://${getDevHost()}:${API_PORT}/api`;

if (__DEV__) {
  // Giúp debug khi virtual device không gọi được API
  console.log(`[MuseumAR] API_BASE_URL = ${API_BASE_URL}`);
}
