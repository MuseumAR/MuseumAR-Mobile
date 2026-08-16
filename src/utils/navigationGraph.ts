import type {
  NavigationInstructionDto,
  NavigationRouteResponseDto,
} from '../services/apiService';
import type { CardinalDirection } from './routeNavigation';

export type GraphActionIcon =
  | 'arrow-left'
  | 'arrow-right'
  | 'stairs-up'
  | 'stairs-down'
  | 'elevator'
  | 'flag-checkered'
  | 'arrow-up';

export type GraphAction =
  | 'STRAIGHT'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'STAIR_UP'
  | 'STAIR_DOWN'
  | 'ELEVATOR'
  | 'ARRIVE';

export function normalizeGraphAction(action: string | undefined): GraphAction {
  const raw = String(action ?? 'STRAIGHT').trim().toUpperCase();
  switch (raw) {
    case 'TURN_LEFT':
    case 'TURN_RIGHT':
    case 'STAIR_UP':
    case 'STAIR_DOWN':
    case 'ELEVATOR':
    case 'ARRIVE':
    case 'STRAIGHT':
      return raw;
    default:
      return 'STRAIGHT';
  }
}

/** Map a graph action onto the compact arrow pad (stairs/elevator → up/down). */
export function actionToCardinal(action: string | undefined): CardinalDirection | null {
  switch (normalizeGraphAction(action)) {
    case 'TURN_LEFT':
      return 'left';
    case 'TURN_RIGHT':
      return 'right';
    case 'STAIR_UP':
    case 'ELEVATOR':
    case 'STRAIGHT':
      return 'up';
    case 'STAIR_DOWN':
      return 'down';
    case 'ARRIVE':
      return null;
    default:
      return null;
  }
}

export function padsFromInstructions(
  instructions: NavigationInstructionDto[],
): CardinalDirection[] {
  const seen = new Set<CardinalDirection>();
  for (const step of instructions) {
    const dir = actionToCardinal(step.action);
    if (dir) seen.add(dir);
  }
  return [...seen];
}

/** First turn / stair / straight step — skip the “start from” line when possible. */
export function primaryDirectionFromInstructions(
  instructions: NavigationInstructionDto[],
): CardinalDirection | null {
  const ranked = [...instructions].sort((a, b) => a.stepIndex - b.stepIndex);
  const prefer = ranked.find((s) => {
    const a = normalizeGraphAction(s.action);
    return (
      a === 'TURN_LEFT' ||
      a === 'TURN_RIGHT' ||
      a === 'STAIR_UP' ||
      a === 'STAIR_DOWN' ||
      a === 'ELEVATOR'
    );
  });
  if (prefer) return actionToCardinal(prefer.action);
  const straight = ranked.find((s) => normalizeGraphAction(s.action) === 'STRAIGHT');
  return straight ? actionToCardinal(straight.action) : null;
}

/**
 * BE still returns a single ARRIVE message when waypoints or a path are missing.
 * A real walk has 2+ waypoints or a turn/stair/straight besides that lone ARRIVE.
 */
export function graphPathFound(route: NavigationRouteResponseDto | null): boolean {
  if (!route) return false;
  if ((route.pathWaypoints?.length ?? 0) >= 2) return true;
  if (route.totalDistance > 0) return true;
  const actions = route.instructions.map((s) => normalizeGraphAction(s.action));
  return actions.some(
    (a) =>
      a === 'TURN_LEFT' ||
      a === 'TURN_RIGHT' ||
      a === 'STAIR_UP' ||
      a === 'STAIR_DOWN' ||
      a === 'ELEVATOR' ||
      a === 'STRAIGHT',
  );
}

export function actionIconName(action: string | undefined): GraphActionIcon {
  switch (normalizeGraphAction(action)) {
    case 'TURN_LEFT':
      return 'arrow-left';
    case 'TURN_RIGHT':
      return 'arrow-right';
    case 'STAIR_UP':
      return 'stairs-up';
    case 'STAIR_DOWN':
      return 'stairs-down';
    case 'ELEVATOR':
      return 'elevator';
    case 'ARRIVE':
      return 'flag-checkered';
    default:
      return 'arrow-up';
  }
}
