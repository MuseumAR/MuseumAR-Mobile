import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 5149;

/**
 * Optional override (e.g. when Metro hostUri is wrong).
 * Set expo.extra.apiHost in app.json, e.g. "192.168.1.42".
 * Leave empty to auto-detect from Expo's Metro host (works for emulator + physical).
 */
const FORCE_DEV_HOST: string | null =
  (Constants.expoConfig?.extra as { apiHost?: string } | undefined)?.apiHost?.trim() ||
  null;

/**
 * Dev API host — one path for emulator and physical device.
 *
 * Uses Metro's LAN IP from hostUri (e.g. "192.168.1.42:8081" → "192.168.1.42").
 * Backend must listen on 0.0.0.0:5149 (not localhost-only).
 *
 * Fallbacks: Android emulator → 10.0.2.2, else localhost.
 */
function getDevHost(): string {
  if (FORCE_DEV_HOST) return FORCE_DEV_HOST;

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
      .manifest2?.extra?.expoClient?.hostUri ??
    (Constants as { manifest?: { debuggerHost?: string; hostUri?: string } }).manifest
      ?.debuggerHost ??
    (Constants as { manifest?: { debuggerHost?: string; hostUri?: string } }).manifest
      ?.hostUri;

  const lanIp = hostUri?.split(':')[0]?.trim();
  if (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
    return lanIp;
  }

  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
}

export const API_BASE_URL = `http://${getDevHost()}:${API_PORT}/api`;

if (__DEV__) {
  console.log(`[MuseumAR] API_BASE_URL = ${API_BASE_URL}`);
}
