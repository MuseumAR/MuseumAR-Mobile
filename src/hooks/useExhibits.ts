import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/apiService';
import type { ExhibitRecord } from '../data/exhibits';
import { mapExhibitDtoToRecord } from '../utils/exhibitMapper';
import { useCategories } from './useCategories';

type UseExhibitsOptions = {
  categoryId?: number;
  search?: string;
};

/**
 * Lấy danh sách hiện vật từ backend (GET /Content/exhibits) và chuyển sang
 * định dạng UI đang dùng. Tự động ghép tên danh mục từ /Content/categories.
 */
export function useExhibits(options: UseExhibitsOptions = {}) {
  const { categoryId, search } = options;
  const [exhibits, setExhibits] = useState<ExhibitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { categoryNameById } = useCategories();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getContentExhibits({ categoryId, search });
      const list = (response.data ?? []).map((dto) =>
        mapExhibitDtoToRecord(dto, dto.categoryId != null ? categoryNameById.get(dto.categoryId) : undefined),
      );
      setExhibits(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách hiện vật');
    } finally {
      setLoading(false);
    }
  }, [categoryId, search, categoryNameById]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const featured = useMemo(() => exhibits.slice(0, 3), [exhibits]);

  return { exhibits, featured, loading, error, refresh };
}
