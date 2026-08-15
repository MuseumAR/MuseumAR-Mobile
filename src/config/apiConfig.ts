import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = {
  apiHost?: string;
  apiPort?: string | number;
  apiBaseUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function fromEnvOrExtra(envName: string, extraVal?: string): string {
  return process.env[envName]?.trim() || extraVal?.trim() || '';
}

const EXPLICIT_BASE = fromEnvOrExtra(
  'EXPO_PUBLIC_API_BASE_URL',
  extra.apiBaseUrl,
);

const API_PORT =
  Number(
    process.env.EXPO_PUBLIC_API_PORT?.trim() || extra.apiPort || 5149,
  ) || 5149;

/**
 * Optional override (e.g. when Metro hostUri is wrong).
 * Set EXPO_PUBLIC_API_HOST in .env, e.g. "192.168.1.42".
 * Leave empty to auto-detect from Expo's Metro host (works for emulator + physical).
 */
const FORCE_DEV_HOST: string | null =
  fromEnvOrExtra('EXPO_PUBLIC_API_HOST', extra.apiHost) || null;

/**
 * Dev API host — one path for emulator and physical device.
 *
 * Uses Metro's LAN IP from hostUri (e.g. "192.168.1.42:8081" → "192.168.1.42").
 * Backend must listen on 0.0.0.0:{API_PORT} (not localhost-only).
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

function buildApiBaseUrl(): string {
  if (EXPLICIT_BASE) {
    return EXPLICIT_BASE.replace(/\/+$/, '');
  }
  return `http://${getDevHost()}:${API_PORT}/api`;
}

export const API_BASE_URL = buildApiBaseUrl();

/** Origin without `/api` — used for static files like `/uploads/packages/*.zip`. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

if (__DEV__) {
  console.log(`[MuseumAR] API_BASE_URL = ${API_BASE_URL}`);
}
