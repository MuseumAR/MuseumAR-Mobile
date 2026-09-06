import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type LaunchUnityModelParams = {
  exhibitId: number;
  modelUrl: string;
};

/** GameObject name in SampleScene (3dAR). */
export const UNITY_AR_GAME_OBJECT = 'ArExhibitLoader';

/** Method on ArExhibitLoader that accepts JSON payload. */
export const UNITY_AR_METHOD = 'ReceiveArPayload';

/** Method on ArExhibitLoader that clears placement and reloads the same GLB. */
export const UNITY_AR_RESET_METHOD = 'ResetPlacement';

/**
 * JSON for UnitySendMessage / UnityView.postMessage:
 * { "exhibitId": 42, "assetType": "Model3D", "modelUrl": "https://.../model.glb" }
 */
export function buildUnityModelPayload({
  exhibitId,
  modelUrl,
}: LaunchUnityModelParams): string {
  return JSON.stringify({
    exhibitId,
    assetType: 'Model3D',
    modelUrl,
  });
}

/** True when running inside Expo Go (no native Unity module). */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Unity UaaL requires a custom dev client / release build with
 * unity/builds/{android|ios} exported from the 3dAR project.
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
