import Constants from 'expo-constants';
import { apiService, type LoginResponse, type VisitorProfileDto } from './apiService';
import { getOrCreateDeviceId } from './deviceId';
import { buildAuthSession, saveSession, type AuthSession } from './sessionStorage';
import { saveTokens } from './tokenStorage';
import { getDeviceModel, getDeviceType } from '../utils/deviceInfo';

/**
 * After login/register/google: store JWT, then POST /Visitor/sync so
 * bookmarks / visited / tickets JWT endpoints can resolve the visitor row.
 */
export async function persistAuthLogin(data: LoginResponse): Promise<AuthSession> {
  await saveTokens(data.accessToken, data.refreshToken);

  let visitor: VisitorProfileDto | null = null;
  try {
    const deviceId = await getOrCreateDeviceId();
    const syncRes = await apiService.syncVisitor({
      deviceId,
      displayName: data.fullName,
      email: data.email,
      preferredLang: 'vi',
      deviceType: getDeviceType(),
      deviceModel: getDeviceModel(),
      appVersion: Constants.expoConfig?.version ?? '1.0.0',
    });
    visitor = syncRes.data ?? null;
  } catch (error) {
    console.warn('Visitor sync after login failed:', error);
  }

  const session = buildAuthSession({
    userId: data.userId,
    fullName: data.fullName,
    email: data.email,
    roleName: data.roleName,
    visitorId: visitor?.id ?? data.visitorId,
  });
  await saveSession(session);
  return session;
}
