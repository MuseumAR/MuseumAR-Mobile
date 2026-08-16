import { useCallback, useEffect, useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { hasDownloadedPacks, isGuestSession } from '../services/offlineMode';
import { subscribeAuthChange } from '../services/tokenStorage';

export function useOfflineCapability() {
  const { isOffline, isConnected, isInternetReachable } = useNetworkStatus();
  const [isGuest, setIsGuest] = useState<boolean | null>(null);
  const [hasPacks, setHasPacks] = useState(false);

  const refresh = useCallback(async () => {
    const [guest, packs] = await Promise.all([isGuestSession(), hasDownloadedPacks()]);
    setIsGuest(guest);
    setHasPacks(packs);
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeAuthChange(() => {
      void refresh();
    });
  }, [refresh, isOffline]);

  const guestOfflineReady = isOffline === true && isGuest === true && hasPacks;
  const signedInOffline = isOffline === true && isGuest === false;
  const guestOfflineNoPack = isOffline === true && isGuest === true && !hasPacks;

  return {
    isOffline,
    isConnected,
    isInternetReachable,
    isGuest,
    hasPacks,
    guestOfflineReady,
    signedInOffline,
    guestOfflineNoPack,
    refresh,
  };
}
