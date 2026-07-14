import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/apiService';
import type { ExhibitRecord } from '../data/exhibits';
import { mapExhibitDtoToRecord } from '../utils/exhibitMapper';
import { useCategories } from './useCategories';

type UseExhibitsOptions = {
  categoryId?: number;
  themeId?: number;
  tagId?: number;
  search?: string;
};

/**
 * Lấy danh sách hiện vật từ GET /Content/exhibits, bổ sung translations,
 * rồi lọc phía client theo category/theme/tag/search.
 */
export function useExhibits(options: UseExhibitsOptions = {}) {
  const { categoryId, themeId, tagId, search } = options;
  const [exhibits, setExhibits] = useState<ExhibitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { categoryNameById } = useCategories();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getContentExhibits();
      const raw = response.data ?? [];
      const enriched = await Promise.all(raw.map((dto) => apiService.enrichExhibit(dto)));
      let list = enriched.map((dto) =>
        mapExhibitDtoToRecord(
          dto,
          dto.categoryId != null ? categoryNameById.get(dto.categoryId) : undefined,
        ),
      );

      if (categoryId != null) {
        list = list.filter((e) => e.categoryId === categoryId);
      }
      if (themeId != null) {
        list = list.filter((e) => e.themeId === themeId);
      }
      if (tagId != null) {
        list = list.filter((e) => (e.tagIds ?? []).includes(tagId));
      }
      if (search?.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q),
        );
      }

      setExhibits(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách hiện vật');
    } finally {
      setLoading(false);
    }
  }, [categoryId, themeId, tagId, search, categoryNameById]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const featured = useMemo(() => exhibits.slice(0, 3), [exhibits]);

  return { exhibits, featured, loading, error, refresh };
}
