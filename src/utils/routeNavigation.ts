import type { RoomDto, TourRouteStopDto } from '../services/apiService';

export type CardinalDirection = 'up' | 'down' | 'left' | 'right';

/** Sort rooms for a stable schematic layout (code numeric when possible). */
export function sortRoomsForLayout(rooms: RoomDto[]): RoomDto[] {
  return [...rooms].sort((a, b) => {
    if (a.floorNumber !== b.floorNumber) return a.floorNumber - b.floorNumber;
    const na = parseInt(a.roomCode.replace(/\D/g, ''), 10);
    const nb = parseInt(b.roomCode.replace(/\D/g, ''), 10);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return a.roomCode.localeCompare(b.roomCode, 'vi');
  });
}

export function formatRoomRef(
  room: { roomCode?: string | null; roomName?: string | null } | null | undefined,
  lang: 'vi' | 'en' = 'vi',
): string {
  if (!room) return lang === 'en' ? 'Unknown room' : 'Chưa rõ phòng';
  if (room.roomCode) {
    return lang === 'en' ? `Room ${room.roomCode}` : `Phòng ${room.roomCode}`;
  }
  if (room.roomName) return room.roomName;
  return lang === 'en' ? 'Unknown room' : 'Chưa rõ phòng';
}

export function roomLabel(
  stop: TourRouteStopDto,
  lang: 'vi' | 'en' = 'vi',
): string {
  if (stop.roomCode) {
    return lang === 'en' ? `Room ${stop.roomCode}` : `Phòng ${stop.roomCode}`;
  }
  if (stop.roomName) return stop.roomName;
  if (stop.exhibitName) return stop.exhibitName;
  return lang === 'en' ? `Stop ${stop.stopOrder}` : `Điểm ${stop.stopOrder}`;
}

export function sortStops(stops: TourRouteStopDto[]): TourRouteStopDto[] {
  return [...stops].sort((a, b) => a.stopOrder - b.stopOrder);
}

export function arrowIconName(
  direction: CardinalDirection,
): 'arrow-up' | 'arrow-down' | 'arrow-left' | 'arrow-right' {
  switch (direction) {
    case 'up':
      return 'arrow-up';
    case 'down':
      return 'arrow-down';
    case 'left':
      return 'arrow-left';
    default:
      return 'arrow-right';
  }
}

/** Room id for pathfinding — stop.roomId, else match rooms by code/name. */
export function resolveStopRoomId(
  stop: TourRouteStopDto | null | undefined,
  rooms: RoomDto[],
): number | null {
  if (!stop) return null;
  if (stop.roomId != null && stop.roomId > 0) return stop.roomId;
  const code = stop.roomCode?.trim().toLowerCase();
  if (code) {
    const byCode = rooms.find((r) => r.roomCode.trim().toLowerCase() === code);
    if (byCode?.id) return byCode.id;
  }
  const name = stop.roomName?.trim().toLowerCase();
  if (name) {
    const byName = rooms.find((r) => r.roomName.trim().toLowerCase() === name);
    if (byName?.id) return byName.id;
  }
  return null;
}

/** Fill missing room fields on itinerary stops from the rooms catalog. */
export function hydrateTourStops(
  stops: TourRouteStopDto[],
  rooms: RoomDto[],
): TourRouteStopDto[] {
  return stops.map((s) => {
    const roomId = resolveStopRoomId(s, rooms);
    const room = roomId != null ? rooms.find((r) => r.id === roomId) : undefined;
    if (!room) return s;
    return {
      ...s,
      roomId,
      roomCode: s.roomCode ?? room.roomCode ?? null,
      roomName: s.roomName ?? room.roomName ?? null,
      floorNumber: s.floorNumber ?? room.floorNumber ?? null,
      mapId: s.mapId ?? room.mapId ?? null,
    };
  });
}

/** Same gallery — compare room id, then code, then name. */
export function stopsShareRoom(
  a: TourRouteStopDto | null | undefined,
  b: TourRouteStopDto | null | undefined,
): boolean {
  if (!a || !b) return false;
  if (a.roomId != null && a.roomId > 0 && b.roomId != null && b.roomId > 0) {
    return a.roomId === b.roomId;
  }
  const codeA = a.roomCode?.trim().toLowerCase();
  const codeB = b.roomCode?.trim().toLowerCase();
  if (codeA && codeB) return codeA === codeB;
  const nameA = a.roomName?.trim().toLowerCase();
  const nameB = b.roomName?.trim().toLowerCase();
  if (nameA && nameB) return nameA === nameB;
  return false;
}

export type TourHop = {
  fromStop: TourRouteStopDto;
  toStop: TourRouteStopDto;
  /** Same room → exhibit names. Different rooms → room names. */
  kind: 'exhibit' | 'room';
  fromLabel: string;
  toLabel: string;
};

function exhibitLabel(
  stop: TourRouteStopDto,
  lang: 'vi' | 'en',
): string {
  return (
    stop.exhibitName?.trim() ||
    (lang === 'en' ? `Exhibit ${stop.exhibitId}` : `Hiện vật ${stop.exhibitId}`)
  );
}

/**
 * One hop per consecutive tour stops.
 * Same room: exhibit → exhibit. Different rooms: room → room.
 */
export function buildTourHops(
  stops: TourRouteStopDto[],
  lang: 'vi' | 'en' = 'vi',
): TourHop[] {
  const sorted = sortStops(stops);
  const hops: TourHop[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const fromStop = sorted[i];
    const toStop = sorted[i + 1];
    const same = stopsShareRoom(fromStop, toStop);
    hops.push({
      fromStop,
      toStop,
      kind: same ? 'exhibit' : 'room',
      fromLabel: same ? exhibitLabel(fromStop, lang) : formatRoomRef(fromStop, lang),
      toLabel: same ? exhibitLabel(toStop, lang) : formatRoomRef(toStop, lang),
    });
  }
  return hops;
}

/** Exhibit→exhibit or room→room preview — not walking directions. */
export function itineraryPreview(
  stops: TourRouteStopDto[] | undefined,
  lang: 'vi' | 'en' = 'vi',
  max = 3,
): string {
  const hops = buildTourHops(stops ?? [], lang);
  if (hops.length === 0) {
    const names = sortStops(stops ?? [])
      .map((s) => s.exhibitName?.trim())
      .filter((n): n is string => Boolean(n));
    if (names.length === 0) return '';
    const shown = names.slice(0, max);
    return shown.join(' → ') + (names.length > max ? '…' : '');
  }
  const shown = hops.slice(0, max).map((h) => `${h.fromLabel} → ${h.toLabel}`);
  return shown.join(' · ') + (hops.length > max ? '…' : '');
}
