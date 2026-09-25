import type {
  NavigationInstructionDto,
  NavigationWaypointDto,
} from '../services/apiService';
import { normalizeGraphAction } from './navigationGraph';

export function isFloorChangeAction(action: string | undefined): boolean {
  const a = normalizeGraphAction(action);
  return a === 'STAIR_UP' || a === 'STAIR_DOWN' || a === 'ELEVATOR';
}

/** Index of the first stair/elevator step, or -1 if single-floor. */
export function findFloorChangeStepIndex(
  instructions: NavigationInstructionDto[],
): number {
  return instructions.findIndex((step) => isFloorChangeAction(step.action));
}

/** First path index where floor number changes vs previous waypoint. */
export function findFloorChangePathIndex(
  pathWaypoints: NavigationWaypointDto[],
): number {
  for (let i = 1; i < pathWaypoints.length; i += 1) {
    const prev = Number(pathWaypoints[i - 1]?.floorNumber) || 0;
    const next = Number(pathWaypoints[i]?.floorNumber) || 0;
    if (prev > 0 && next > 0 && prev !== next) return i;
  }
  return -1;
}

export function routeHasFloorChange(
  instructions: NavigationInstructionDto[],
  pathWaypoints?: NavigationWaypointDto[],
): boolean {
  if (findFloorChangeStepIndex(instructions) >= 0) return true;
  if (pathWaypoints && findFloorChangePathIndex(pathWaypoints) >= 0) return true;
  return false;
}

function asPositiveFloor(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Pull "Tầng 2" / "Floor 2" from BE instruction copy when floorNumber is missing/wrong. */
export function parseFloorFromInstructionText(
  text: string | null | undefined,
): number | null {
  if (!text) return null;
  const match = text.match(/(?:tầng|floor)\s*(\d+)/i);
  if (!match) return null;
  return asPositiveFloor(match[1]);
}

/** Floors in path order (FE uniquePathFloors). */
export function uniquePathFloors(
  pathWaypoints: NavigationWaypointDto[],
): number[] {
  const seen = new Set<number>();
  const floors: number[] = [];
  for (const wp of pathWaypoints) {
    const f = asPositiveFloor(wp.floorNumber);
    if (f == null || seen.has(f)) continue;
    seen.add(f);
    floors.push(f);
  }
  return floors;
}

/**
 * One segment per floor hop: walking on that floor, then the stair/elevator
 * that leaves it (except the last segment, which ends at the destination).
 */
export function splitInstructionsByFloorChange(
  instructions: NavigationInstructionDto[],
): NavigationInstructionDto[][] {
  if (instructions.length === 0) return [];
  const segments: NavigationInstructionDto[][] = [];
  let current: NavigationInstructionDto[] = [];
  for (const step of instructions) {
    current.push(step);
    if (isFloorChangeAction(step.action)) {
      segments.push(current);
      current = [];
    }
  }
  if (current.length > 0) segments.push(current);
  return segments.length > 0 ? segments : [instructions];
}

/**
 * Ordered floors for Continue / map switching.
 * Prefer path waypoints; fall back to instruction segments when path lacks variety.
 */
export function floorsAlongRoute(
  pathWaypoints: NavigationWaypointDto[],
  instructions: NavigationInstructionDto[],
): number[] {
  const fromPath = uniquePathFloors(pathWaypoints);
  const segments = splitInstructionsByFloorChange(instructions);

  if (fromPath.length >= 2) {
    // Path is authoritative when it spans multiple floors.
    if (segments.length <= 1 || fromPath.length === segments.length) {
      return fromPath;
    }
    // Prefer path order but ensure we have a label per segment.
    if (fromPath.length >= segments.length) {
      return fromPath.slice(0, segments.length);
    }
  }

  if (segments.length <= 1) {
    return fromPath.length > 0 ? fromPath : [];
  }

  const floors: number[] = [];
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    let floor: number | null = null;

    for (const step of seg) {
      if (isFloorChangeAction(step.action)) continue;
      floor = asPositiveFloor(step.floorNumber);
      if (floor != null) break;
    }

    if (floor == null && i > 0) {
      const prevStair = segments[i - 1].find((s) =>
        isFloorChangeAction(s.action),
      );
      floor =
        parseFloorFromInstructionText(prevStair?.instruction) ??
        asPositiveFloor(prevStair?.floorNumber);
    }

    if (floor == null && fromPath[i] != null) floor = fromPath[i];
    if (floor == null && floors.length > 0) floor = floors[floors.length - 1] + 1;
    floors.push(floor ?? i + 1);
  }
  return floors;
}

export function sliceInstructionsForFloorIndex(
  instructions: NavigationInstructionDto[],
  floorIndex: number,
): NavigationInstructionDto[] {
  const segments = splitInstructionsByFloorChange(instructions);
  if (segments.length === 0) return instructions;
  const idx = Math.max(0, Math.min(floorIndex, segments.length - 1));
  return segments[idx] ?? [];
}

/**
 * Path slice for the active floor map (include stair connectors when possible).
 */
export function slicePathWaypointsForFloor(
  pathWaypoints: NavigationWaypointDto[],
  floor: number | null,
): NavigationWaypointDto[] {
  if (floor == null || floor <= 0) return pathWaypoints;
  const floors = uniquePathFloors(pathWaypoints);
  if (floors.length <= 1) return pathWaypoints;

  const onFloor: number[] = [];
  for (let i = 0; i < pathWaypoints.length; i += 1) {
    if (asPositiveFloor(pathWaypoints[i]?.floorNumber) === floor) {
      onFloor.push(i);
    }
  }
  if (onFloor.length === 0) return pathWaypoints;

  let start = onFloor[0];
  let end = onFloor[onFloor.length - 1];
  // Include one neighbor so the overlay can draw the stair hop edge.
  if (start > 0) start -= 1;
  if (end < pathWaypoints.length - 1) end += 1;
  return pathWaypoints.slice(start, end + 1);
}

export function slicePathWaypointsForFloorIndex(
  pathWaypoints: NavigationWaypointDto[],
  floorIndex: number,
): NavigationWaypointDto[] {
  const floors = uniquePathFloors(pathWaypoints);
  if (floors.length <= 1) return pathWaypoints;
  const idx = Math.max(0, Math.min(floorIndex, floors.length - 1));
  return slicePathWaypointsForFloor(pathWaypoints, floors[idx] ?? null);
}

export function originFloorFromRoute(
  pathWaypoints: NavigationWaypointDto[],
  instructions: NavigationInstructionDto[],
  fallback?: number | null,
): number | null {
  const floors = floorsAlongRoute(pathWaypoints, instructions);
  if (floors.length > 0) return floors[0];
  const firstWp = asPositiveFloor(pathWaypoints[0]?.floorNumber);
  if (firstWp != null) return firstWp;
  const firstStep = asPositiveFloor(instructions[0]?.floorNumber);
  if (firstStep != null) return firstStep;
  return asPositiveFloor(fallback);
}

/** @deprecated Prefer floorsAlongRoute[floorIndex + 1] */
export function continuationFloorFromRoute(
  pathWaypoints: NavigationWaypointDto[],
  instructions: NavigationInstructionDto[],
  fallback?: number | null,
  _originFallback?: number | null,
): number | null {
  const floors = floorsAlongRoute(pathWaypoints, instructions);
  if (floors.length >= 2) return floors[floors.length - 1];
  return asPositiveFloor(fallback) ?? floors[0] ?? null;
}

/** Legacy 2-phase API — maps to first / last floor segment. */
export type FloorNavPhase = 'origin' | 'continuation';

export function sliceInstructionsForPhase(
  instructions: NavigationInstructionDto[],
  phase: FloorNavPhase,
): NavigationInstructionDto[] {
  const segments = splitInstructionsByFloorChange(instructions);
  if (segments.length <= 1) return instructions;
  if (phase === 'origin') return segments[0];
  return segments[segments.length - 1] ?? instructions;
}

export function slicePathWaypointsForPhase(
  pathWaypoints: NavigationWaypointDto[],
  phase: FloorNavPhase,
): NavigationWaypointDto[] {
  const floors = uniquePathFloors(pathWaypoints);
  if (floors.length <= 1) return pathWaypoints;
  return slicePathWaypointsForFloorIndex(
    pathWaypoints,
    phase === 'origin' ? 0 : floors.length - 1,
  );
}

export function viewFloorForPhase(
  phase: FloorNavPhase,
  pathWaypoints: NavigationWaypointDto[],
  instructions: NavigationInstructionDto[],
  originFallback?: number | null,
  destFallback?: number | null,
): number | null {
  const floors = floorsAlongRoute(pathWaypoints, instructions);
  if (floors.length === 0) {
    return phase === 'continuation'
      ? asPositiveFloor(destFallback)
      : asPositiveFloor(originFallback);
  }
  if (phase === 'continuation') return floors[floors.length - 1];
  return floors[0];
}
