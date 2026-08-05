import { useCallback, useMemo, useRef, useState } from 'react';
import { apiService, BookmarkDto } from '../services/apiService';
import { getToken } from '../services/tokenStorage';
import { uniqueBookmarks } from '../utils/visitorLists';

/**
 * Bookmarks — GET/POST/DELETE /Visitor/bookmarks (JWT).
 * Requires Visitor linked via POST /Visitor/sync after login.
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
    const token = await getToken();
    if (!token) {
      setBookmarks([]);
      setHasLoaded(true);
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.getBookmarks();
      setBookmarks(response.data ?? []);
    } catch (error) {
      console.warn('getBookmarks failed:', error);
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
    const token = await getToken();
    if (!token) return false;

    setTogglingId(exhibitId);
    try {
      await apiService.addBookmark(exhibitId);
      setBookmarks((prev) => [
        ...prev,
        {
          id: Date.now(),
          visitorId: 0,
          exhibitId,
          createdAt: new Date().toISOString(),
        },
      ]);
      return true;
    } catch (error) {
      console.warn('addBookmark failed:', error);
      return false;
    } finally {
      setTogglingId(null);
    }
  }, []);

  const removeBookmark = useCallback(async (exhibitId: number): Promise<boolean> => {
    const token = await getToken();
    if (!token) return false;

    setTogglingId(exhibitId);
    try {
      await apiService.removeBookmark(exhibitId);
      setBookmarks((prev) => prev.filter((b) => b.exhibitId !== exhibitId));
      return true;
    } catch (error) {
      console.warn('removeBookmark failed:', error);
      return false;
    } finally {
      setTogglingId(null);
    }
  }, []);

  const toggleBookmark = useCallback(async (exhibitId: number): Promise<'added' | 'removed' | 'auth_required' | 'failed'> => {
    const token = await getToken();
    if (!token) return 'auth_required';

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
