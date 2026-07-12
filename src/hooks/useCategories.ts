import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, CategoryDto } from '../services/apiService';

const ALL_LABEL = 'Tất cả';

/**
 * Lấy danh mục / chủ đề / tag từ backend để lọc màn Explore.
 * Trả về cả map id -> tên để hiển thị tên danh mục cho hiện vật.
 */
export function useCategories() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getCategories();
      setCategories(response.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh mục');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const categoryLabels = useMemo(
    () => [ALL_LABEL, ...categories.map((c) => c.name)],
    [categories],
  );

  return { categories, categoryNameById, categoryLabels, loading, error, refresh, ALL_LABEL };
}
