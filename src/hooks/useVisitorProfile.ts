import { useCallback, useState } from 'react';
import { VisitorProfileDto } from '../services/apiService';
import { DEFAULT_VISITOR_ID, getSession } from '../services/sessionStorage';
import { getToken } from '../services/tokenStorage';

/**
 * Visitor profile — session/local only.
 * Không gọi GET /Visitor/profile (BE dùng JWT userId làm Visitors.id → 404/500).
 */
export function useVisitorProfile() {
  const [profile, setProfile] = useState<VisitorProfileDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setProfile(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await getSession();
      if (!session) {
        setProfile(null);
        return;
      }
      setProfile({
        id: session.visitorId ?? DEFAULT_VISITOR_ID,
        deviceId: '',
        displayName: session.fullName || 'Visitor',
        email: session.email || '',
        preferredLang: 'vi',
        deviceType: '',
        deviceModel: '',
        appVersion: '',
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        analyticsLogs: [],
        bookmarks: [],
        packageDownloads: [],
        tickets: [],
        transactions: [],
        visitedExhibits: [],
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải hồ sơ');
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, loading, error, refresh };
}
