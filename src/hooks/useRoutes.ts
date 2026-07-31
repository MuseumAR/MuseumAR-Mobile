import { useCallback, useEffect, useState } from 'react';
import {
  apiService,
  normalizeTourRouteStop,
  TourRouteDto,
  TourRouteStopDto,
} from '../services/apiService';

function pickStops(raw: TourRouteDto & Record<string, unknown>): TourRouteStopDto[] {
  const stopsRaw = (raw.stops ?? raw.Stops) as unknown;
  if (Array.isArray(stopsRaw) && stopsRaw.length > 0) {
    return stopsRaw.map((s) =>
      normalizeTourRouteStop(s as Partial<TourRouteStopDto> & Record<string, unknown>),
    );
  }
  // Legacy points → thin stops
  if (Array.isArray(raw.points) && raw.points.length > 0) {
    return raw.points.map((p, i) =>
      normalizeTourRouteStop({
        exhibitId: p.exhibitId ?? p.id ?? i + 1,
        exhibitName: p.title,
        stopOrder: p.order ?? i + 1,
      }),
    );
  }
  return [];
}

/** Chuẩn hoá DTO BE (name null, estimatedDurationMinutes, stops) thành dạng UI. */
export function normalizeTourRoute(raw: TourRouteDto, index = 0): TourRouteDto {
  const duration =
    raw.durationMinutes ??
    (typeof raw.estimatedDurationMinutes === 'number'
      ? raw.estimatedDurationMinutes
      : undefined);
  const name =
    (typeof raw.name === 'string' && raw.name.trim().length > 0
      ? raw.name.trim()
      : null) ?? `Tour #${raw.id || index + 1}`;
  const stops = pickStops(raw as TourRouteDto & Record<string, unknown>);

  return {
    ...raw,
    name,
    durationMinutes: duration,
    estimatedDurationMinutes: duration ?? raw.estimatedDurationMinutes,
    stops,
    stopCount: stops.length > 0 ? stops.length : raw.stopCount,
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
      setError(
        err instanceof Error ? err.message : 'Không thể tải lộ trình tham quan',
      );
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Fetch full route detail (ensures stops) when starting navigation. */
  const loadRouteDetail = useCallback(async (routeId: number): Promise<TourRouteDto | null> => {
    try {
      const response = await apiService.getRouteById(routeId);
      if (!response.data) return null;
      return normalizeTourRoute(response.data);
    } catch {
      return null;
    }
  }, []);

  return { routes, loading, error, refresh, loadRouteDetail };
}
