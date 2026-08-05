import { useCallback, useState } from 'react';
import { ApiError, apiService, SyncCheckDto } from '../services/apiService';

/**
 * GET /Visitor/sync-check — Public.
 * 404 = chưa có offline package Available → coi như không có update (không warn).
 */
export function useMuseumSyncCheck() {
  const [syncInfo, setSyncInfo] = useState<SyncCheckDto | null>(null);
  const [loading, setLoading] = useState(false);

  const checkSync = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.syncCheck();
      setSyncInfo(response.data);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        setSyncInfo(null);
        return null;
      }
      console.warn('sync-check failed:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { syncInfo, loading, checkSync };
}
