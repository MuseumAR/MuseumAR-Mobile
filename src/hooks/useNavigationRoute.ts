import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  apiService,
  type NavigationRouteResponseDto,
} from '../services/apiService';

/**
 * Room-to-room navigation from BE —
 * GET /Navigation/route?fromRoomId=&toRoomId=&lang=
 */
export function useNavigationRoute(
  fromRoomId: number | null | undefined,
  toRoomId: number | null | undefined,
) {
  const { lang } = useLanguage();
  const [route, setRoute] = useState<NavigationRouteResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const from = Number(fromRoomId);
    const to = Number(toRoomId);
    if (
      !Number.isFinite(from) ||
      from <= 0 ||
      !Number.isFinite(to) ||
      to <= 0 ||
      from === to
    ) {
      setRoute(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getNavigationRoute(from, to, lang);
      setRoute(response.data ?? null);
    } catch (err: unknown) {
      setRoute(null);
      setError(
        err instanceof Error ? err.message : 'Không thể tải hướng dẫn đường đi',
      );
    } finally {
      setLoading(false);
    }
  }, [fromRoomId, toRoomId, lang]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const instructionText =
    route?.instructions
      ?.map((s) => s.instruction?.trim())
      .filter(Boolean)
      .join('\n') || null;

  return { route, instructionText, loading, error, refresh };
}
