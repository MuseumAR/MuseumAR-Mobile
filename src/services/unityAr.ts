import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type LaunchUnityOverlayParams = {
  exhibitId: number;
  overlayUrl: string;
};

/** GameObject name in SampleScene (2d_Ar). */
export const UNITY_AR_GAME_OBJECT = 'ArExhibitLoader';

/** Method on ArExhibitLoader that accepts JSON payload. */
export const UNITY_AR_METHOD = 'ReceiveArPayload';

/**
 * JSON for UnitySendMessage / UnityView.postMessage:
 * { "exhibitId": 42, "overlayUrl": "https://..." }
 */
export function buildUnityOverlayPayload({
  exhibitId,
  overlayUrl,
}: LaunchUnityOverlayParams): string {
  return JSON.stringify({ exhibitId, overlayUrl });
}

/** True when running inside Expo Go (no native Unity module). */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Unity UaaL requires a custom dev client / release build with
 * unity/builds/{android|ios} exported from the 2d_Ar project.
 */
export function isUnityNativeAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  if (isExpoGo()) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@azesmway/react-native-unity');
    return true;
  } catch {
    return false;
  }
}
