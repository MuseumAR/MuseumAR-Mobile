import { useCallback, useMemo, useState } from 'react';
import { VisitedExhibitDto } from '../services/apiService';
import { loadLocalVisited, recordLocalVisit } from '../services/localVisitorStore';
import { uniqueVisitedExhibits } from '../utils/visitorLists';

/**
 * Visited exhibits — local mock (visitorId = 1).
 * Không gọi API: BE gán visitorId = JWT userId → FK lỗi.
 */
export function useVisitedExhibits() {
  const [visited, setVisited] = useState<VisitedExhibitDto[]>([]);
  const [loading, setLoading] = useState(false);

  const uniqueList = useMemo(() => uniqueVisitedExhibits(visited), [visited]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadLocalVisited();
      setVisited(list);
    } finally {
      setLoading(false);
    }
  }, []);

  const recordVisit = useCallback(async (exhibitId: number, timeSpentSeconds: number) => {
    if (timeSpentSeconds < 1) return;
    try {
      const next = await recordLocalVisit(exhibitId, timeSpentSeconds);
      setVisited(next);
    } catch (error) {
      console.warn('recordVisit (local) failed:', error);
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
