import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiService } from '../services/apiService';
import { getExhibitById, type ExhibitRecord } from '../data/exhibits';
import { mapExhibitDtoToRecord } from '../utils/exhibitMapper';

/**
 * Lấy chi tiết hiện vật + translations
 * (GET /Content/exhibits/{id} rồi /translations vì BE thường trả translations rỗng).
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
      const response = await apiService.getExhibitDetail(numericId);
      if (response.data) {
        const enriched = await apiService.enrichExhibit(response.data);
        setExhibit(mapExhibitDtoToRecord(enriched, undefined, lang));
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
