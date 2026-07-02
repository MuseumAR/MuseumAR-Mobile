import { useCallback, useState } from 'react';
import { apiService, SyncCheckDto } from '../services/apiService';
import { getToken } from '../services/tokenStorage';

export function useMuseumSyncCheck() {
  const [syncInfo, setSyncInfo] = useState<SyncCheckDto | null>(null);
  const [loading, setLoading] = useState(false);

  const checkSync = useCallback(async (museumId: number) => {
    const token = await getToken();
    if (!token) return null;
    setLoading(true);
    try {
      const response = await apiService.syncCheck(museumId);
      setSyncInfo(response.data);
      return response.data;
    } catch (error) {
      console.warn('sync-check failed:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { syncInfo, loading, checkSync };
}
