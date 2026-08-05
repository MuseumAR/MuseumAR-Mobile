import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_PATH = FileSystem.documentDirectory + 'device_id.txt';

/** Stable device id for POST /Visitor/sync (persists across app launches). */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const info = await FileSystem.getInfoAsync(DEVICE_ID_PATH);
    if (info.exists) {
      const existing = await FileSystem.readAsStringAsync(DEVICE_ID_PATH);
      if (existing.trim()) return existing.trim();
    }
  } catch {
    // fall through to create
  }

  const deviceId = Crypto.randomUUID();
  try {
    await FileSystem.writeAsStringAsync(DEVICE_ID_PATH, deviceId);
  } catch (error) {
    console.warn('Could not persist deviceId:', error);
  }
  return deviceId;
}
