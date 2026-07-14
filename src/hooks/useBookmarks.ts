import { useCallback, useMemo, useRef, useState } from 'react';
import { BookmarkDto } from '../services/apiService';
import {
  addLocalBookmark,
  loadLocalBookmarks,
  removeLocalBookmark,
} from '../services/localVisitorStore';
import { uniqueBookmarks } from '../utils/visitorLists';

/**
 * Bookmarks — local mock (visitorId = 1).
 * Không gọi API: BE gán visitorId = JWT userId → FK lỗi.
 */
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const uniqueList = useMemo(() => uniqueBookmarks(bookmarks), [bookmarks]);
  const bookmarkIds = useMemo(
    () => new Set(uniqueList.map((b) => b.exhibitId)),
    [uniqueList],
  );
  const bookmarkIdsRef = useRef(bookmarkIds);
  bookmarkIdsRef.current = bookmarkIds;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadLocalBookmarks();
      setBookmarks(list);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  const isBookmarked = useCallback(
    (exhibitId: number) => bookmarkIds.has(exhibitId),
    [bookmarkIds],
  );

  const addBookmark = useCallback(async (exhibitId: number): Promise<boolean> => {
    setTogglingId(exhibitId);
    try {
      const next = await addLocalBookmark(exhibitId);
      setBookmarks(next);
      return true;
    } catch (error) {
      console.warn('addBookmark (local) failed:', error);
      return false;
    } finally {
      setTogglingId(null);
    }
  }, []);

  const removeBookmark = useCallback(async (exhibitId: number): Promise<boolean> => {
    setTogglingId(exhibitId);
    try {
      const next = await removeLocalBookmark(exhibitId);
      setBookmarks(next);
      return true;
    } catch (error) {
      console.warn('removeBookmark (local) failed:', error);
      return false;
    } finally {
      setTogglingId(null);
    }
  }, []);

  const toggleBookmark = useCallback(async (exhibitId: number): Promise<'added' | 'removed' | 'auth_required' | 'failed'> => {
    const wasBookmarked = bookmarkIdsRef.current.has(exhibitId);
    if (wasBookmarked) {
      const ok = await removeBookmark(exhibitId);
      return ok ? 'removed' : 'failed';
    }
    const ok = await addBookmark(exhibitId);
    return ok ? 'added' : 'failed';
  }, [addBookmark, removeBookmark]);

  return {
    bookmarks: uniqueList,
    bookmarkIds,
    bookmarkCount: uniqueList.length,
    loading,
    hasLoaded,
    togglingId,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    refresh,
  };
}
