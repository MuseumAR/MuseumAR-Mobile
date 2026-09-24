import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiService, CategoryDto } from '../services/apiService';
import { getExhibitById, type ExhibitRecord } from '../data/exhibits';
import { mapExhibitDtoToRecord } from '../utils/exhibitMapper';
import { pickLocalizedField } from '../utils/pickLocalized';
import type { AppLanguage } from '../services/languagePrefs';

function pickCategoryName(
  raw: CategoryDto,
  lang: AppLanguage | string,
): string | null {
  const fromTr = pickLocalizedField(
    raw.categoryTranslations,
    lang,
    'categoryName',
    raw.name,
  );
  const text = (fromTr ?? raw.name)?.trim();
  return text ? text : null;
}

/**
 * Lấy chi tiết hiện vật + translations
 * (GET /Content/exhibits/{id} rồi /translations vì BE thường trả translations rỗng).
 * Category + room labels are localized client-side (exhibit DTO roomName is VI-only).
 */
export function useExhibitDetail(routeId: string | undefined) {
  const { lang } = useLanguage();
  const numericId = routeId ? parseInt(routeId.replace(/^m/i, ''), 10) : NaN;
  const [exhibit, setExhibit] = useState<ExhibitRecord | null>(
    routeId ? getExhibitById(routeId) ?? null : null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!Number.isFinite(numericId)) {
      setExhibit(routeId ? getExhibitById(routeId) ?? null : null);
      setLoading(false);
      return;
    }
    try {
      const response = await apiService.getExhibitDetail(numericId, lang);
      if (response.data) {
        const enriched = await apiService.enrichExhibit(response.data);

        const [categoryName, roomName] = await Promise.all([
          (async (): Promise<string | undefined> => {
            if (enriched.categoryId == null) return undefined;
            try {
              const cats = await apiService.getCategories();
              const match = (cats.data ?? []).find(
                (c) => Number(c.id) === Number(enriched.categoryId),
              );
              return match ? pickCategoryName(match, lang) ?? undefined : undefined;
            } catch {
              return undefined;
            }
          })(),
          (async (): Promise<string | null> => {
            if (enriched.roomId == null || !enriched.museumId) {
              return enriched.roomName ?? null;
            }
            try {
              const rooms = await apiService.getRoomsByMuseum(
                enriched.museumId,
                lang,
              );
              const room = (rooms.data ?? []).find(
                (r) => Number(r.id) === Number(enriched.roomId),
              );
              return room?.roomName?.trim() || enriched.roomName || null;
            } catch {
              return enriched.roomName ?? null;
            }
          })(),
        ]);

        setExhibit(
          mapExhibitDtoToRecord(
            { ...enriched, roomName },
            categoryName,
            lang,
          ),
        );
      } else {
        setExhibit(getExhibitById(String(numericId)) ?? null);
      }
    } catch (err: unknown) {
      const fallback = getExhibitById(String(numericId));
      if (fallback) {
        setExhibit(fallback);
      } else {
        setError(err instanceof Error ? err.message : 'Không thể tải hiện vật');
      }
    } finally {
      setLoading(false);
    }
  }, [numericId, routeId, lang]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { exhibit, loading, error, refresh };
}
