import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 5149;

/**
 * Host máy chạy backend khi đang phát triển.
 *
 * - Emulator Android: 10.0.2.2 → localhost của PC
 * - Simulator iOS: localhost
 * - Điện thoại thật (Expo Go): lấy IP từ Metro (cùng Wi‑Fi với PC)
 *
 * Nếu tự đổi IP, ghi đè bằng FORCE_DEV_HOST bên dưới.
 * Ví dụ: '192.168.1.20'
 */
const FORCE_DEV_HOST: string | null = null;

function getDevHost(): string {
  if (FORCE_DEV_HOST) return FORCE_DEV_HOST;

  // Expo Go / dev client trên máy thật: hostUri dạng "192.168.1.20:8081"
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } }).manifest2
      ?.extra?.expoGo?.debuggerHost ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;

  if (hostUri) {
    const host = String(hostUri).split(':')[0]?.trim();
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }

  // Android emulator ánh xạ loopback của máy host qua 10.0.2.2
  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
}

export const API_BASE_URL = `http://${getDevHost()}:${API_PORT}/api`;
