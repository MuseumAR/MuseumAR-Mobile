import Constants from 'expo-constants';
import { apiService } from './apiService';
import { getOrCreateDeviceId } from './deviceId';
import { getStoredLanguage } from './languagePrefs';
import { getSession } from './sessionStorage';
import { getToken } from './tokenStorage';
import { getDeviceModel, getDeviceType } from '../utils/deviceInfo';

/**
 * POST /Visitor/sync with JWT (if present) so create-order can resolve
 * Visitor by UserId. Recommended by BE before Ticketing/create-order.
 */
export async function ensureVisitorSynced(): Promise<void> {
  const token = await getToken();
  if (!token) {
    throw new Error('Vui lòng đăng nhập để đặt vé.');
  }

  const session = await getSession();
  const deviceId = await getOrCreateDeviceId();
  const preferredLang = await getStoredLanguage();

  await apiService.syncVisitor({
    deviceId,
    displayName: session?.fullName,
    email: session?.email,
    preferredLang,
    deviceType: getDeviceType(),
    deviceModel: getDeviceModel(),
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
  });
}
