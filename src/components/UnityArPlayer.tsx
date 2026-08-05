import { useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import {
  buildUnityOverlayPayload,
  UNITY_AR_GAME_OBJECT,
  UNITY_AR_METHOD,
} from '../services/unityAr';

export type UnityOverlayStatus =
  | { state: 'loading' }
  | { state: 'loaded' }
  | { state: 'error'; message: string };

type UnityLoaderEvent = {
  type?: string;
  exhibitId?: number;
  message?: string;
};

type Props = {
  exhibitId: number;
  overlayUrl: string;
  style?: ViewStyle;
  onUnityMessage?: (message: string) => void;
  onOverlayStatus?: (status: UnityOverlayStatus) => void;
};

const RETRY_INTERVAL_MS = 1500;
const MAX_RETRY_MS = 30000;

/**
 * Embedded Unity player (UaaL via @azesmway/react-native-unity).
 * Retries the overlay payload until ArExhibitLoader acknowledges it
 * (Unity boot / Vuforia init can take several seconds).
 */
export function UnityArPlayer({
  exhibitId,
  overlayUrl,
  style,
  onUnityMessage,
  onOverlayStatus,
}: Props) {
  // Require at runtime so Expo Go / web metro still bundles without native module crash at import time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const UnityView = require('@azesmway/react-native-unity').default;
  const unityRef = useRef<{
    postMessage: (go: string, method: string, message: string) => void;
    pauseUnity?: (pause?: boolean) => void;
    windowFocusChanged?: (hasFocus?: boolean) => void;
  } | null>(null);

  const ackedRef = useRef(false);
  const statusRef = useRef(onOverlayStatus);
  statusRef.current = onOverlayStatus;

  useEffect(() => {
    ackedRef.current = false;
    statusRef.current?.({ state: 'loading' });

    const payload = buildUnityOverlayPayload({ exhibitId, overlayUrl });

    const send = () => {
      if (ackedRef.current) return;
      try {
        unityRef.current?.postMessage(
          UNITY_AR_GAME_OBJECT,
          UNITY_AR_METHOD,
          payload,
        );
      } catch {
        // Player may not be ready yet — next retry will land.
      }
    };

    const first = setTimeout(send, 500);
    const interval = setInterval(send, RETRY_INTERVAL_MS);
    const stop = setTimeout(() => clearInterval(interval), MAX_RETRY_MS);

    return () => {
      clearTimeout(first);
      clearTimeout(stop);
      clearInterval(interval);
      // Pause only — do not unloadUnity here. Unload is async and races with
      // view drop (library NPE in onUnload). androidKeepPlayerMounted keeps the
      // player alive across screen closes.
      try {
        unityRef.current?.pauseUnity?.(true);
      } catch {
        // ignore
      }
    };
  }, [exhibitId, overlayUrl]);

  const handleUnityMessage = (message: string) => {
    let event: UnityLoaderEvent | null = null;
    try {
      event = JSON.parse(message) as UnityLoaderEvent;
    } catch {
      // Not a loader event — forward as-is below.
    }

    if (event?.type === 'overlayLoaded') {
      ackedRef.current = true;
      statusRef.current?.({ state: 'loaded' });
    } else if (event?.type === 'error') {
      statusRef.current?.({
        state: 'error',
        message: event.message || 'Unity không tải được ảnh overlay.',
      });
    }
    // 'ready' → keep retrying; the next interval tick delivers the payload.

    onUnityMessage?.(message);
  };

  return (
    <View style={[styles.wrap, style]}>
      <UnityView
        ref={unityRef}
        style={styles.unity}
        fullScreen={false}
        androidKeepPlayerMounted
        onUnityMessage={(event: { nativeEvent?: { message?: string } }) => {
          const message = event?.nativeEvent?.message;
          if (message) handleUnityMessage(message);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  unity: { flex: 1 },
});
