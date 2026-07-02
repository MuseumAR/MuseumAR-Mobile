import { useCallback, useState } from 'react';
import { apiService, VisitorProfileDto } from '../services/apiService';
import { getToken } from '../services/tokenStorage';

export function useVisitorProfile() {
  const [profile, setProfile] = useState<VisitorProfileDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getVisitorProfile();
      setProfile(response.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải hồ sơ';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, loading, error, refresh };
}
