import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiService } from '../services/apiService';
import type { ExhibitRecord } from '../data/exhibits';
import { mapExhibitDtoToRecord } from '../utils/exhibitMapper';
import { useCategories } from './useCategories';

type UseExhibitsOptions = {
  categoryId?: number;
  tagId?: number;
  search?: string;
};

/**
 * Lấy danh sách hiện vật từ GET /Content/exhibits, bổ sung translations,
 * rồi lọc phía client theo category/tag/search.
 * Theme gắn với Exhibition.ThemeId — lọc ở màn triển lãm, không lọc hiện vật.
 */
export function useExhibits(options: UseExhibitsOptions = {}) {
  const { categoryId, tagId, search } = options;
  const { lang } = useLanguage();
  const [exhibits, setExhibits] = useState<ExhibitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { categoryNameById } = useCategories();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getContentExhibits(lang);
      const raw = response.data ?? [];
      const enriched = await Promise.all(raw.map((dto) => apiService.enrichExhibit(dto)));
      let list = enriched.map((dto) =>
        mapExhibitDtoToRecord(
          dto,
          dto.categoryId != null ? categoryNameById.get(dto.categoryId) : undefined,
          lang,
        ),
      );

      if (categoryId != null) {
        list = list.filter((e) => e.categoryId === categoryId);
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
  }, [categoryId, tagId, search, categoryNameById, lang]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const featured = useMemo(() => exhibits.slice(0, 3), [exhibits]);

  return { exhibits, featured, loading, error, refresh };
}
