import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  apiService,
  CategoryDto,
  TagDto,
  TagGroupDto,
  TaxonomyChip,
  ThemeDto,
} from '../services/apiService';
import type { AppLanguage } from '../services/languagePrefs';
import { pickLocalizedField } from '../utils/pickLocalized';

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
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

/** Matches FE categoryDisplayName. */
function pickCategoryName(
  raw: CategoryDto,
  lang: AppLanguage | string = 'vi',
): string | null {
  const fromTr = pickLocalizedField(
    raw.categoryTranslations,
    lang,
    'categoryName',
    raw.name,
  );
  return toLabel(fromTr) ?? toLabel(raw.name);
}

function normalizeCategory(
  entry: unknown,
  lang: AppLanguage,
): CategoryDto | null {
  const c = entry as CategoryDto & { Id?: unknown; Name?: unknown };
  const id = asId(c.id) ?? asId(c.Id);
  if (id == null) return null;
  const name = pickCategoryName(c, lang) ?? toLabel(c.Name);
  if (name == null) return null;
  return { ...c, id, name, type: 'category' };
}

/** Matches FE themeDisplayName. */
function normalizeTheme(entry: unknown, lang: AppLanguage): TaxonomyChip | null {
  const t = entry as ThemeDto & { Id?: unknown; ThemeName?: unknown; Name?: unknown };
  const id = asId(t.id) ?? asId(t.Id);
  if (id == null) return null;
  const name =
    pickLocalizedField(t.translations, lang, 'themeName', t.themeName ?? t.name) ??
    toLabel(t.themeName ?? t.ThemeName ?? t.name ?? t.Name);
  if (name == null) return null;
  return { key: `theme:${id}`, id, name, kind: 'theme' };
}

/** Matches FE tagGroupDisplayName — works with or without translations[]. */
function normalizeTagGroup(
  entry: unknown,
  lang: AppLanguage,
): TaxonomyChip | null {
  const g = entry as TagGroupDto & {
    Id?: unknown;
    GroupName?: unknown;
    Name?: unknown;
    Translations?: Array<Record<string, unknown>>;
  };
  const id = asId(g.id) ?? asId(g.Id);
  if (id == null) return null;

  const rawTranslations = Array.isArray(g.translations)
    ? g.translations
    : Array.isArray(g.Translations)
      ? g.Translations
      : [];
  const translations = rawTranslations.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      tagGroupId: asId(r.tagGroupId) ?? asId(r.TagGroupId) ?? undefined,
      languageCode: String(r.languageCode ?? r.LanguageCode ?? '').trim(),
      groupName: String(r.groupName ?? r.GroupName ?? '').trim(),
    };
  });

  const fallback = toLabel(g.groupName ?? g.GroupName ?? g.name ?? g.Name);
  const name =
    pickLocalizedField(translations, lang, 'groupName', fallback) ?? fallback;
  if (name == null) return null;
  return { key: `tagGroup:${id}`, id, name, kind: 'tagGroup' };
}

/** Matches FE tagDisplayName. */
function normalizeTag(entry: unknown, lang: AppLanguage): TaxonomyChip | null {
  const t = entry as TagDto & {
    Id?: unknown;
    TagName?: unknown;
    Name?: unknown;
    TagGroupId?: unknown;
  };
  const id = asId(t.id) ?? asId(t.Id);
  if (id == null) return null;
  const name =
    pickLocalizedField(t.translations, lang, 'tagName', t.tagName ?? t.name) ??
    toLabel(t.tagName ?? t.TagName ?? t.name ?? t.Name);
  if (name == null) return null;
  const tagGroupId = asId(t.tagGroupId) ?? asId(t.TagGroupId) ?? undefined;
  return { key: `tag:${id}`, id, name, kind: 'tag', tagGroupId };
}

/**
 * Categories + themes + tags always (FE/BE public Content APIs).
 * Tag-groups loaded separately: FE/BE include them when DB is migrated;
 * Azure without TagGroupTranslations must not break home.
 */
export function useCategories() {
  const { lang, t } = useLanguage();
  const ALL_LABEL = t('common.all');
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [themes, setThemes] = useState<TaxonomyChip[]>([]);
  const [tagGroups, setTagGroups] = useState<TaxonomyChip[]>([]);
  const [tags, setTags] = useState<TaxonomyChip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, themeRes, tagRes] = await Promise.all([
        apiService.getCategories(),
        apiService.getThemes(lang),
        apiService.getTags(lang),
      ]);

      const catList = Array.isArray(catRes.data) ? catRes.data : [];
      setCategories(
        catList
          .map((c) => normalizeCategory(c, lang))
          .filter((c): c is CategoryDto => c != null),
      );

      const themeList = Array.isArray(themeRes.data) ? themeRes.data : [];
      setThemes(
        themeList
          .map((item) => normalizeTheme(item, lang))
          .filter((c): c is TaxonomyChip => c != null),
      );

      const tagList = Array.isArray(tagRes.data) ? tagRes.data : [];
      let nextTags = tagList
        .map((item) => normalizeTag(item, lang))
        .filter((c): c is TaxonomyChip => c != null);

      let groups: TaxonomyChip[] = [];
      try {
        const groupRes = await apiService.getTagGroups();
        const groupList = Array.isArray(groupRes.data) ? groupRes.data : [];
        groups = groupList
          .map((item) => normalizeTagGroup(item, lang))
          .filter((c): c is TaxonomyChip => c != null);

        const missingGroup =
          nextTags.length > 0 && nextTags.every((tag) => tag.tagGroupId == null);
        if (missingGroup && groups.length > 0) {
          const grouped = await Promise.all(
            groups.map(async (group) => {
              try {
                const res = await apiService.getTagsByGroup(group.id, lang);
                return (res.data ?? [])
                  .map((item) => normalizeTag(item, lang))
                  .filter((c): c is TaxonomyChip => c != null)
                  .map((tag) => ({
                    ...tag,
                    tagGroupId: tag.tagGroupId ?? group.id,
                  }));
              } catch {
                return [] as TaxonomyChip[];
              }
            }),
          );
          nextTags = grouped.flat();
        }
      } catch {
        // Azure without TagGroupTranslations table — keep categories/themes/tags.
        groups = [];
      }

      setTagGroups(groups);
      setTags(nextTags);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh mục');
    } finally {
      setLoading(false);
    }
  }, [lang]);

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

  /**
   * Explore row 1: categories + tag groups (FE/BE).
   * If tag-groups unavailable, fall back to categories + tags so filters still work.
   */
  const filterChips = useMemo(() => {
    const categoryChips: TaxonomyChip[] = categories
      .filter((c) => c.name)
      .map((c) => ({
        key: `category:${c.id}`,
        id: c.id,
        name: c.name as string,
        kind: 'category' as const,
      }));

    if (tagGroups.length > 0) {
      return [...categoryChips, ...tagGroups];
    }
    return [...categoryChips, ...tags];
  }, [categories, tagGroups, tags]);

  const categoryLabels = useMemo(
    () => [ALL_LABEL, ...filterChips.map((c) => c.name)],
    [filterChips, ALL_LABEL],
  );

  return {
    categories,
    themes,
    tagGroups,
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

/** Re-export for callers that imported ALL_LABEL as a constant. */
export const ALL_LABEL = 'Tất cả';
