import { useCallback, useState } from 'react';
import { apiService, VisitorProfileDto } from '../services/apiService';
import { getToken } from '../services/tokenStorage';

/**
 * Visitor profile — GET /Visitor/profile (JWT).
 * Requires Visitor linked via POST /Visitor/sync after login.
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
      const response = await apiService.getVisitorProfile();
      setProfile(response.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải hồ sơ');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, loading, error, refresh };
}
