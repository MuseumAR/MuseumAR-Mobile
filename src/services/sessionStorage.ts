import * as FileSystem from 'expo-file-system/legacy';

const SESSION_FILE_PATH = FileSystem.documentDirectory + 'auth_session.json';

/** Visitor id cố định dùng khi role Visitor chưa có visitor profile từ BE. */
export const DEFAULT_VISITOR_ID = 1;

export type AuthSession = {
  userId: number;
  fullName: string;
  email: string;
  roleName: string;
  /**
   * Id bản ghi Visitor dùng cho API /Visitor/*.
   * Role Visitor luôn có giá trị (mặc định 1 nếu BE chưa trả về).
   */
  visitorId: number | null;
};

function isVisitorRole(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  return roleName.trim().toLowerCase().includes('visitor');
}

/**
 * Chuẩn hoá session sau login: mọi tài khoản role Visitor
 * đều có visitorId = response.visitorId ?? 1.
 */
export function buildAuthSession(data: {
  userId: number;
  fullName: string;
  email: string;
  roleName: string;
  visitorId?: number | null;
}): AuthSession {
  const visitorRole = isVisitorRole(data.roleName);
  const resolvedVisitorId =
    data.visitorId != null && data.visitorId > 0
      ? data.visitorId
      : visitorRole
        ? DEFAULT_VISITOR_ID
        : null;

  return {
    userId: data.userId,
    fullName: data.fullName,
    email: data.email,
    roleName: data.roleName,
    visitorId: resolvedVisitorId,
  };
}

export async function saveSession(session: AuthSession): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(SESSION_FILE_PATH, JSON.stringify(session));
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const info = await FileSystem.getInfoAsync(SESSION_FILE_PATH);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(SESSION_FILE_PATH);
    return JSON.parse(raw) as AuthSession;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export async function getVisitorId(): Promise<number | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.visitorId != null && session.visitorId > 0) return session.visitorId;
  if (isVisitorRole(session.roleName)) return DEFAULT_VISITOR_ID;
  return null;
}

export async function removeSession(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(SESSION_FILE_PATH);
    if (info.exists) {
      await FileSystem.deleteAsync(SESSION_FILE_PATH);
    }
  } catch (error) {
    console.error('Error removing session:', error);
  }
}
