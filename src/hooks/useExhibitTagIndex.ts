import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ExhibitRecord } from '../data/exhibits';
import { apiService } from '../services/apiService';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Tag ids from GET /Content/exhibits/{id}/tags.
 * That endpoint reads the ExhibitTags join table (not Exhibit.TagIds).
 * Accepts TagDto ({ id }) or join-row ({ exhibitId, tagId }).
 */
export function readTagIdsFromExhibitTags(raw: unknown): number[] {
  const list = Array.isArray(raw) ? raw : [];
  const ids = new Set<number>();
  for (const item of list) {
    if (item == null || typeof item !== 'object') {
      const n = Number(item);
      if (Number.isFinite(n) && n > 0) ids.add(n);
      continue;
    }
    const row = item as Record<string, unknown>;
    const id = Number(row.tagId ?? row.TagId ?? row.id ?? row.Id);
    if (Number.isFinite(id) && id > 0) ids.add(id);
  }
  return [...ids];
}

/**
 * Map exhibitId → tag ids using ExhibitTags via GET Content/exhibits/{id}/tags.
 */
export function useExhibitTagIndex(exhibits: ExhibitRecord[]) {
  const { lang } = useLanguage();
  const exhibitIdsKey = useMemo(
    () =>
      exhibits
        .map((e) => Number(e.id))
        .filter((id) => id > 0)
        .sort((a, b) => a - b)
        .join(','),
    [exhibits],
  );
  const [tagIdsByExhibit, setTagIdsByExhibit] = useState<Map<number, number[]>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const exhibitIds = exhibitIdsKey
      .split(',')
      .map((value) => Number(value))
      .filter((id) => id > 0);

    if (exhibitIds.length === 0) {
      setTagIdsByExhibit(new Map());
      return;
    }

    setLoading(true);
    try {
      const rows = await Promise.all(
        exhibitIds.map(async (exhibitId) => {
          try {
            const res = await apiService.getExhibitTags(exhibitId, lang);
            return {
              exhibitId,
              ids: readTagIdsFromExhibitTags(res.data),
            };
          } catch {
            return { exhibitId, ids: [] as number[] };
          }
        }),
      );
      const next = new Map<number, number[]>();
      for (const row of rows) {
        next.set(row.exhibitId, row.ids);
      }
      setTagIdsByExhibit(next);
    } finally {
      setLoading(false);
    }
  }, [exhibitIdsKey, lang]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { tagIdsByExhibit, loading, refresh };
}
