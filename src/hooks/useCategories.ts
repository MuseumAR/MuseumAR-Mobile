import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiService,
  CategoryDto,
  TagDto,
  TaxonomyChip,
  ThemeDto,
} from '../services/apiService';

export const ALL_LABEL = 'Tất cả';

/** Chuẩn hoá chuỗi tên từ API. */
function toLabel(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function asId(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Lấy tên category từ categoryTranslations (ưu tiên vi). */
function pickCategoryName(raw: CategoryDto, lang = 'vi'): string | null {
  const translations = raw.categoryTranslations ?? [];
  if (translations.length > 0) {
    const preferred =
      translations.find((t) => t.languageCode?.toLowerCase() === lang.toLowerCase()) ??
      translations[0];
    return toLabel(preferred?.categoryName) ?? toLabel(raw.name);
  }
  return toLabel(raw.name);
}

function normalizeCategory(entry: unknown): CategoryDto | null {
  const c = entry as CategoryDto & { Id?: unknown; Name?: unknown };
  const id = asId(c.id) ?? asId(c.Id);
  if (id == null) return null;
  const name = pickCategoryName(c) ?? toLabel(c.Name);
  if (name == null) return null;
  return { ...c, id, name, type: 'category' };
}

function normalizeTheme(entry: unknown): TaxonomyChip | null {
  const t = entry as ThemeDto & { Id?: unknown; ThemeName?: unknown; Name?: unknown };
  const id = asId(t.id) ?? asId(t.Id);
  if (id == null) return null;
  const name = toLabel(t.themeName ?? t.ThemeName ?? t.name ?? t.Name);
  if (name == null) return null;
  return { key: `theme:${id}`, id, name, kind: 'theme' };
}

function normalizeTag(entry: unknown): TaxonomyChip | null {
  const t = entry as TagDto & { Id?: unknown; TagName?: unknown; Name?: unknown };
  const id = asId(t.id) ?? asId(t.Id);
  if (id == null) return null;
  const name = toLabel(t.tagName ?? t.TagName ?? t.name ?? t.Name);
  if (name == null) return null;
  return { key: `tag:${id}`, id, name, kind: 'tag' };
}

/**
 * Lấy categories + themes + tags từ backend để lọc màn Explore.
 */
export function useCategories() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [themes, setThemes] = useState<TaxonomyChip[]>([]);
  const [tags, setTags] = useState<TaxonomyChip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, themeRes, tagRes] = await Promise.all([
        apiService.getCategories(),
        apiService.getThemes(),
        apiService.getTags(),
      ]);

      const catList = Array.isArray(catRes.data) ? catRes.data : [];
      setCategories(catList.map(normalizeCategory).filter((c): c is CategoryDto => c != null));

      const themeList = Array.isArray(themeRes.data) ? themeRes.data : [];
      setThemes(themeList.map(normalizeTheme).filter((c): c is TaxonomyChip => c != null));

      const tagList = Array.isArray(tagRes.data) ? tagRes.data : [];
      setTags(tagList.map(normalizeTag).filter((c): c is TaxonomyChip => c != null));
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
    categories.forEach((c) => {
      if (c.name) map.set(c.id, c.name);
    });
    return map;
  }, [categories]);

  /** Chip lọc: Tất cả + category + theme + tag. */
  const filterChips = useMemo(() => {
    const chips: TaxonomyChip[] = [
      ...categories
        .filter((c) => c.name)
        .map((c) => ({
          key: `category:${c.id}`,
          id: c.id,
          name: c.name as string,
          kind: 'category' as const,
        })),
      ...themes,
      ...tags,
    ];
    return chips;
  }, [categories, themes, tags]);

  /** Nhãn chip (giữ tương thích UI cũ). */
  const categoryLabels = useMemo(
    () => [ALL_LABEL, ...filterChips.map((c) => c.name)],
    [filterChips],
  );

  return {
    categories,
    themes,
    tags,
    filterChips,
    categoryNameById,
    categoryLabels,
    loading,
    error,
    refresh,
    ALL_LABEL,
  };
}
