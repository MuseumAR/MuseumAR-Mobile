import { useCallback, useEffect, useState } from 'react';
import { apiService, TourRouteDto } from '../services/apiService';

/** Chuẩn hoá DTO BE (name null, estimatedDurationMinutes) thành dạng UI dùng được. */
export function normalizeTourRoute(raw: TourRouteDto, index = 0): TourRouteDto {
  const duration =
    raw.durationMinutes ??
    (typeof raw.estimatedDurationMinutes === 'number' ? raw.estimatedDurationMinutes : undefined);
  const name =
    (typeof raw.name === 'string' && raw.name.trim().length > 0
      ? raw.name.trim()
      : null) ?? `Tour #${raw.id || index + 1}`;

  return {
    ...raw,
    name,
    durationMinutes: duration,
    estimatedDurationMinutes: duration ?? raw.estimatedDurationMinutes,
  };
}

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
      const list = Array.isArray(response.data) ? response.data : [];
      setRoutes(list.map((r, i) => normalizeTourRoute(r, i)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải lộ trình tham quan');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { routes, loading, error, refresh };
}
