import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  apiService,
  type NavigationInstructionDto,
  type NavigationRouteResponseDto,
} from '../services/apiService';
import {
  graphPathFound,
  padsFromInstructions,
  primaryDirectionFromInstructions,
} from '../utils/navigationGraph';
import type { CardinalDirection } from '../utils/routeNavigation';

type Options = {
  /** Skip fetch (last itinerary stop, overlay hidden, etc.). */
  enabled?: boolean;
};

/**
 * How to walk between two rooms — GET /Navigation/route
 * Uses the CMS navigation graph (waypoints/edges), not the tour exhibit list.
 */
export function useNavigationRoute(
  fromRoomId: number | null | undefined,
  toRoomId: number | null | undefined,
  options?: Options,
) {
  const { lang } = useLanguage();
  const enabled = options?.enabled !== false;
  const from = Number(fromRoomId);
  const to = Number(toRoomId);
  const hasFrom = Number.isFinite(from) && from > 0;
  const hasTo = Number.isFinite(to) && to > 0;
  const missingRooms = enabled && (!hasFrom || !hasTo);
  const sameRoom = enabled && hasFrom && hasTo && from === to;
  const [route, setRoute] = useState<NavigationRouteResponseDto | null>(null);
  const [loading, setLoading] = useState(
    () => enabled && hasFrom && hasTo && from !== to,
  );
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || missingRooms || sameRoom) {
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
  }, [enabled, missingRooms, sameRoom, from, to, lang]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const instructions: NavigationInstructionDto[] = route?.instructions ?? [];
  const hasPath = graphPathFound(route);
  const padDirections: CardinalDirection[] = useMemo(
    () => (hasPath ? padsFromInstructions(instructions) : []),
    [hasPath, instructions],
  );
  const primaryDirection = hasPath
    ? primaryDirectionFromInstructions(instructions)
    : null;

  const instructionText =
    instructions
      .map((s) => s.instruction?.trim())
      .filter(Boolean)
      .join('\n') || null;

  return {
    route,
    instructions,
    instructionText,
    primaryDirection,
    padDirections,
    hasPath,
    sameRoom,
    missingRooms,
    loading,
    error,
    refresh,
  };
}
