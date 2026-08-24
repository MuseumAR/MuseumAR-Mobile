import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = {
  apiHost?: string;
  apiPort?: string | number;
  apiBaseUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Literal env names so Expo release inlines EXPO_PUBLIC_* (process.env[var] does not). */
const EXPLICIT_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  extra.apiBaseUrl ||
  ''
).trim();

const API_PORT =
  Number(
    process.env.EXPO_PUBLIC_API_PORT?.trim() || extra.apiPort || 5149,
  ) || 5149;

const FORCE_DEV_HOST: string | null =
  (process.env.EXPO_PUBLIC_API_HOST || extra.apiHost || '').trim() || null;

/**
 * Dev API host when EXPO_PUBLIC_API_BASE_URL is empty.
 * Metro LAN IP, else emulator 10.0.2.2 / localhost.
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
