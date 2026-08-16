import { useCallback, useEffect, useState } from 'react';
import {
  apiService,
  type NavigationGraphDto,
} from '../services/apiService';

/**
 * Indoor navigation graph — GET /Navigation/museum/{museumId}/graph
 * Waypoints + edges only. Not a tour itinerary.
 */
export function useNavigationGraph(museumId: number | null | undefined) {
  const [graph, setGraph] = useState<NavigationGraphDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const id = Number(museumId);
    if (!Number.isFinite(id) || id <= 0) {
      setGraph(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getNavigationGraph(id);
      setGraph(response.data ?? null);
    } catch (err: unknown) {
      setGraph(null);
      setError(
        err instanceof Error ? err.message : 'Không thể tải đồ thị chỉ đường',
      );
    } finally {
      setLoading(false);
    }
  }, [museumId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const waypointCount = graph?.waypoints.length ?? 0;
  const edgeCount = graph?.edges.length ?? 0;

  return {
    graph,
    waypointCount,
    edgeCount,
    hasGraph: waypointCount > 0,
    loading,
    error,
    refresh,
  };
}
