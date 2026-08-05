import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  apiService,
  normalizeTourRouteStop,
  TourRouteDto,
  TourRouteStopDto,
  TourRouteTranslationDto,
} from '../services/apiService';
import type { AppLanguage } from '../services/languagePrefs';
import { pickLocalizedField, pickLocalizedRow } from '../utils/pickLocalized';

function pickStops(raw: TourRouteDto & Record<string, unknown>): TourRouteStopDto[] {
  const stopsRaw = (raw.stops ?? raw.Stops) as unknown;
  if (Array.isArray(stopsRaw) && stopsRaw.length > 0) {
    return stopsRaw.map((s) =>
      normalizeTourRouteStop(s as Partial<TourRouteStopDto> & Record<string, unknown>),
    );
  }
  if (Array.isArray(raw.points) && raw.points.length > 0) {
    return raw.points.map((p, i) =>
      normalizeTourRouteStop({
        exhibitId: p.exhibitId ?? p.id ?? i + 1,
        exhibitName: p.title,
        stopOrder: p.order ?? i + 1,
      }),
    );
  }
  return [];
}

function pickTranslations(
  raw: TourRouteDto & Record<string, unknown>,
): TourRouteTranslationDto[] {
  const list = (raw.translations ?? raw.Translations) as unknown;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      const t = item as TourRouteTranslationDto & Record<string, unknown>;
      const languageCode = String(t.languageCode ?? t.LanguageCode ?? '').trim();
      const routeName = String(t.routeName ?? t.RouteName ?? '').trim();
      if (!languageCode || !routeName) return null;
      return {
        languageCode,
        routeName,
        description: (t.description ?? t.Description ?? null) as string | null,
      };
    })
    .filter((t): t is TourRouteTranslationDto => t != null);
}

/** Chuẩn hoá DTO BE theo ngôn ngữ UI. */
export function normalizeTourRoute(
  raw: TourRouteDto,
  index = 0,
  lang: AppLanguage | string = 'vi',
): TourRouteDto {
  const duration =
    raw.durationMinutes ??
    (typeof raw.estimatedDurationMinutes === 'number'
      ? raw.estimatedDurationMinutes
      : undefined);
  const translations = pickTranslations(raw as TourRouteDto & Record<string, unknown>);
  const localizedName = pickLocalizedField(
    translations,
    lang,
    'routeName',
    raw.name,
  );
  const localizedDesc = pickLocalizedField(
    translations,
    lang,
    'description',
    raw.description,
  );
  const name =
    localizedName ??
    (typeof raw.name === 'string' && raw.name.trim().length > 0
      ? raw.name.trim()
      : null) ??
    `Tour #${raw.id || index + 1}`;

  const stops = pickStops(raw as TourRouteDto & Record<string, unknown>);

  return {
    ...raw,
    name,
    description: localizedDesc ?? raw.description,
    durationMinutes: duration,
    estimatedDurationMinutes: duration ?? raw.estimatedDurationMinutes,
    translations,
    stops,
    stopCount: stops.length > 0 ? stops.length : raw.stopCount,
  };
}

/** Lấy tour / lộ trình tham quan (GET /Content/routes). */
export function useRoutes() {
  const { lang } = useLanguage();
  const [routes, setRoutes] = useState<TourRouteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getRoutes();
      const list = Array.isArray(response.data) ? response.data : [];
      setRoutes(list.map((r, i) => normalizeTourRoute(r, i, lang)));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải lộ trình tham quan',
      );
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Fetch full route detail (ensures stops) when starting navigation. */
  const loadRouteDetail = useCallback(
    async (routeId: number): Promise<TourRouteDto | null> => {
      try {
        const response = await apiService.getRouteById(routeId);
        if (!response.data) return null;
        return normalizeTourRoute(response.data, 0, lang);
      } catch {
        return null;
      }
    },
    [lang],
  );

  return { routes, loading, error, refresh, loadRouteDetail };
}

/** Expose helper for one-off picks without remapping whole route. */
export function pickRouteTranslation(
  route: TourRouteDto,
  lang: AppLanguage | string,
) {
  return pickLocalizedRow(route.translations, lang);
}
