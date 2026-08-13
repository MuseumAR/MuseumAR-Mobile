import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { ExhibitRecord } from '../data/exhibits';
import { apiService, type ExhibitionDto } from '../services/apiService';
import { mapExhibitDtoToRecord } from '../utils/exhibitMapper';
import { parseNumericId } from '../utils/parseId';

/** Chi tiết triển lãm + hiện vật bên trong (giống exhibit detail). */
export function useExhibitionDetail(id: string | number | undefined) {
  const { lang } = useLanguage();
  const exhibitionId = parseNumericId(id);
  const [exhibition, setExhibition] = useState<ExhibitionDto | null>(null);
  const [exhibits, setExhibits] = useState<ExhibitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (exhibitionId == null) {
      setExhibition(null);
      setExhibits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [listRes, exhibitsRes] = await Promise.all([
        apiService.getExhibitions(lang),
        apiService.getExhibitsByExhibition(exhibitionId, lang),
      ]);
      const found =
        (listRes.data ?? []).find((item) => item.id === exhibitionId) ?? null;
      setExhibition(found);

      const raw = exhibitsRes.data ?? [];
      const enriched = await Promise.all(raw.map((dto) => apiService.enrichExhibit(dto)));
      setExhibits(enriched.map((dto) => mapExhibitDtoToRecord(dto, undefined, lang)));
    } catch (err: unknown) {
      setExhibition(null);
      setExhibits([]);
      setError(
        err instanceof Error ? err.message : 'Không thể tải chi tiết triển lãm',
      );
    } finally {
      setLoading(false);
    }
  }, [exhibitionId, lang]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { exhibition, exhibits, loading, error, refresh };
}
