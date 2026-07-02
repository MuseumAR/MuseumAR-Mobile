import { useCallback, useMemo, useState } from 'react';
import { apiService, VisitedExhibitDto } from '../services/apiService';
import { getToken } from '../services/tokenStorage';
import { isIgnorableVisitorError } from '../utils/visitorErrors';
import { uniqueVisitedExhibits } from '../utils/visitorLists';

export function useVisitedExhibits() {
  const [visited, setVisited] = useState<VisitedExhibitDto[]>([]);
  const [loading, setLoading] = useState(false);

  const uniqueList = useMemo(() => uniqueVisitedExhibits(visited), [visited]);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setVisited([]);
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.getVisitedExhibits();
      setVisited(response.data ?? []);
    } catch (error) {
      if (!isIgnorableVisitorError(error)) {
        console.warn('getVisitedExhibits failed:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const recordVisit = useCallback(async (exhibitId: number, timeSpentSeconds: number) => {
    const token = await getToken();
    if (!token || timeSpentSeconds < 1) return;
    try {
      await apiService.recordVisitedExhibit(exhibitId, timeSpentSeconds);
    } catch (error) {
      if (!isIgnorableVisitorError(error)) {
        console.warn('recordVisitedExhibit failed:', error);
      }
    }
  }, []);

  return {
    visited: uniqueList,
    visitedCount: uniqueList.length,
    loading,
    refresh,
    recordVisit,
  };
}
