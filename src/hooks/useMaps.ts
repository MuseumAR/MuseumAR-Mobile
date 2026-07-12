import { useCallback, useEffect, useState } from 'react';
import { apiService, MuseumMapDto } from '../services/apiService';

/** Lấy bản đồ bảo tàng (GET /Content/maps). */
export function useMaps() {
  const [maps, setMaps] = useState<MuseumMapDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getMaps();
      setMaps(response.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải bản đồ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { maps, loading, error, refresh };
}
