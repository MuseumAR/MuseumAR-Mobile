import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiService, type ExhibitionDto } from '../services/apiService';
import { localizeExhibition } from '../utils/localizeExhibition';

function filterByMuseum(
  list: ExhibitionDto[],
  museumId?: number | null,
): ExhibitionDto[] {
  const id = Number(museumId);
  if (!Number.isFinite(id) || id <= 0) return list;
  return list.filter((item) => !item.museumId || item.museumId === id);
}

/** Triển lãm của bảo tàng — GET /Content/exhibitions?lang= */
export function useExhibitions(museumId?: number | null) {
  const { lang } = useLanguage();
  const [exhibitions, setExhibitions] = useState<ExhibitionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getExhibitions(lang);
      const list = Array.isArray(response.data) ? response.data : [];
      setExhibitions(filterByMuseum(list, museumId));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải danh sách triển lãm',
      );
      setExhibitions([]);
    } finally {
      setLoading(false);
    }
  }, [lang, museumId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const featured = useMemo(() => exhibitions.slice(0, 3), [exhibitions]);

  return { exhibitions, featured, loading, error, refresh };
}
