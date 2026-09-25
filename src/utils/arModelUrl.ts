import NetInfo from '@react-native-community/netinfo';
import { modelLogicalKey, resolveOfflineUri } from '../services/offlineMedia';
import { toAbsoluteMediaUrl } from './mobileImageUrl';

export async function isDeviceOffline(): Promise<boolean> {
  const net = await NetInfo.fetch();
  return net.isConnected === false || net.isInternetReachable === false;
}

/**
 * AR 3D model URL for Unity (GLB/GLTF).
 * Online → live URL from CMS, absolute because Unity rejects relative paths.
 * Offline → file:// from downloaded pack when available.
 */
export async function resolveArModelUrl(
  exhibitId: number,
  remote?: string | null,
): Promise<string | undefined> {
  const key = modelLogicalKey(exhibitId);
  const trimmed = remote?.trim();

  if (await isDeviceOffline()) {
    const local = resolveOfflineUri(trimmed, key);
    if (local) return local;
  }

  const live = toAbsoluteMediaUrl(trimmed);
  if (live) return live;

  return resolveOfflineUri(trimmed, key);
}
