import NetInfo from '@react-native-community/netinfo';
import { overlayLogicalKey, resolveOfflineUri } from '../services/offlineMedia';
import { rewriteRemoteImageUrl } from './mobileImageUrl';

export async function isDeviceOffline(): Promise<boolean> {
  const net = await NetInfo.fetch();
  return net.isConnected === false || net.isInternetReachable === false;
}

/**
 * AR overlay URL for Unity.
 * Online → live https (CMS can change Cloudinary URL).
 * Offline → file:// from downloaded pack when available.
 */
export async function resolveArOverlayUrl(
  exhibitId: number,
  remote?: string | null,
): Promise<string | undefined> {
  const key = overlayLogicalKey(exhibitId);
  const trimmed = remote?.trim();

  if (await isDeviceOffline()) {
    const local = resolveOfflineUri(trimmed, key);
    if (local) return local;
  }

  const live = rewriteRemoteImageUrl(trimmed, { preserveAlpha: true }) ?? trimmed;
  if (live) return live;

  return resolveOfflineUri(trimmed, key);
}
