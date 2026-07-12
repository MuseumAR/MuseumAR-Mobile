import { useCallback, useEffect, useState } from 'react';
import { apiService, TourRouteDto } from '../services/apiService';

/** Lấy tour / lộ trình tham quan (GET /Content/routes). */
export function useRoutes() {
  const [routes, setRoutes] = useState<TourRouteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getRoutes();
      setRoutes(response.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải lộ trình tham quan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { routes, loading, error, refresh };
}
