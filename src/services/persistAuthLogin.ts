import type { LoginResponse } from './apiService';
import { buildAuthSession, saveSession, type AuthSession } from './sessionStorage';
import { saveTokens } from './tokenStorage';

/** Lưu JWT + session (visitorId=1 cho role Visitor nếu BE thiếu). */
export async function persistAuthLogin(data: LoginResponse): Promise<AuthSession> {
  await saveTokens(data.accessToken, data.refreshToken);
  const session = buildAuthSession({
    userId: data.userId,
    fullName: data.fullName,
    email: data.email,
    roleName: data.roleName,
    visitorId: data.visitorId,
  });
  await saveSession(session);
  return session;
}
