import type { RoomDto, TourRouteStopDto } from '../services/apiService';

export type CardinalDirection = 'up' | 'down' | 'left' | 'right';

export type RoomGridCell = {
  room: RoomDto;
  /** 0-based column in 2-col floor grid */
  col: number;
  /** 0-based row in floor grid */
  row: number;
  /** Index within floor rooms list */
  index: number;
};

export type RouteStepGuide = {
  from: TourRouteStopDto;
  to: TourRouteStopDto;
  direction: CardinalDirection;
  /** Primary move axes (may include secondary if diagonal-ish). */
  directions: CardinalDirection[];
  instructionVi: string;
  instructionShort: string;
  sameFloor: boolean;
  floorChange: number;
};

const ARROW: Record<CardinalDirection, string> = {
  up: '⬆️',
  down: '⬇️',
  left: '⬅️',
  right: '➡️',
};

const VERB: Record<CardinalDirection, string> = {
  up: 'Đi lên',
  down: 'Đi xuống',
  left: 'Rẽ trái',
  right: 'Rẽ phải',
};

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

/** Build 2-column grid cells for one floor. */
export function buildFloorGrid(roomsOnFloor: RoomDto[]): RoomGridCell[] {
  const sorted = sortRoomsForLayout(roomsOnFloor);
  return sorted.map((room, index) => ({
    room,
    index,
    col: index % 2,
    row: Math.floor(index / 2),
  }));
}

export function findRoomCell(
  cells: RoomGridCell[],
  roomCode?: string | null,
  roomId?: number | null,
): RoomGridCell | null {
  if (roomId != null) {
    const byId = cells.find((c) => c.room.id === roomId);
    if (byId) return byId;
  }
  if (roomCode) {
    const code = roomCode.trim().toLowerCase();
    return (
      cells.find((c) => c.room.roomCode.trim().toLowerCase() === code) ?? null
    );
  }
  return null;
}

/**
 * Cardinal direction from A → B using grid cells, or floor numbers when
 * rooms aren't on the same schematic floor.
 */
export function computeDirectionBetweenRooms(
  fromStop: TourRouteStopDto,
  toStop: TourRouteStopDto,
  allRooms: RoomDto[],
): { direction: CardinalDirection; directions: CardinalDirection[]; floorChange: number } {
  const floorFrom = fromStop.floorNumber ?? 1;
  const floorTo = toStop.floorNumber ?? 1;
  const floorChange = floorTo - floorFrom;

  if (floorChange !== 0) {
    const direction: CardinalDirection = floorChange > 0 ? 'up' : 'down';
    return { direction, directions: [direction], floorChange };
  }

  const floorRooms = allRooms.filter((r) => r.floorNumber === floorFrom);
  const cells = buildFloorGrid(floorRooms.length > 0 ? floorRooms : allRooms);
  const a =
    findRoomCell(cells, fromStop.roomCode, fromStop.roomId) ??
    // Fallback: invent cells from stop codes alone
    inventCellFromCode(fromStop.roomCode, 0);
  const b =
    findRoomCell(cells, toStop.roomCode, toStop.roomId) ??
    inventCellFromCode(toStop.roomCode, 1);

  const dCol = b.col - a.col;
  const dRow = b.row - a.row;
  const directions: CardinalDirection[] = [];

  if (Math.abs(dCol) >= Math.abs(dRow)) {
    if (dCol > 0) directions.push('right');
    else if (dCol < 0) directions.push('left');
    if (dRow > 0) directions.push('down');
    else if (dRow < 0) directions.push('up');
  } else {
    if (dRow > 0) directions.push('down');
    else if (dRow < 0) directions.push('up');
    if (dCol > 0) directions.push('right');
    else if (dCol < 0) directions.push('left');
  }

  // Same cell / unknown → use room-code numeric delta as last resort
  if (directions.length === 0) {
    const na = parseInt(String(fromStop.roomCode ?? '').replace(/\D/g, ''), 10);
    const nb = parseInt(String(toStop.roomCode ?? '').replace(/\D/g, ''), 10);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) {
      directions.push(nb > na ? 'right' : 'left');
    } else {
      directions.push('right');
    }
  }

  return { direction: directions[0], directions, floorChange: 0 };
}

function inventCellFromCode(
  roomCode: string | null | undefined,
  fallbackIndex: number,
): RoomGridCell {
  const n = parseInt(String(roomCode ?? '').replace(/\D/g, ''), 10);
  const index = Number.isFinite(n) ? Math.max(0, (n % 100) - 1) : fallbackIndex;
  return {
    room: {
      id: 0,
      museumId: 0,
      roomCode: roomCode ?? '?',
      roomName: roomCode ?? '?',
      floorNumber: 1,
    },
    index,
    col: index % 2,
    row: Math.floor(index / 2),
  };
}

export function buildRouteStepGuide(
  from: TourRouteStopDto,
  to: TourRouteStopDto,
  allRooms: RoomDto[],
  lang: 'vi' | 'en' = 'vi',
): RouteStepGuide {
  const { direction, directions, floorChange } = computeDirectionBetweenRooms(
    from,
    to,
    allRooms,
  );
  const sameFloor = floorChange === 0;
  const fromLabel = roomLabel(from, lang);
  const toLabel = roomLabel(to, lang);
  const en = lang === 'en';

  const VERB_EN: Record<CardinalDirection, string> = {
    up: 'Go up',
    down: 'Go down',
    left: 'Turn left',
    right: 'Turn right',
  };
  const primary = en ? VERB_EN[direction] : VERB[direction];
  const arrow = ARROW[direction];

  let detail: string;
  if (!sameFloor) {
    detail = en
      ? `${primary} ${arrow} to floor ${to.floorNumber ?? '?'} to ${toLabel}`
      : `${primary} ${arrow} lên tầng ${to.floorNumber ?? '?'} đến ${toLabel}`;
  } else if (directions.length > 1) {
    const secondary = directions[1];
    const secVerb = en
      ? VERB_EN[secondary].toLowerCase()
      : VERB[secondary].toLowerCase();
    detail = en
      ? `${primary} ${arrow} then ${secVerb} ${ARROW[secondary]} to ${toLabel}`
      : `${primary} ${arrow} rồi ${secVerb} ${ARROW[secondary]} đến ${toLabel}`;
  } else {
    detail = en
      ? `${primary} ${arrow} through the corridor to ${toLabel}`
      : `${primary} ${arrow} đi qua hành lang đến ${toLabel}`;
  }

  const instructionVi = en
    ? `From ${fromLabel} ➔ ${toLabel}: ${detail}`
    : `Đi từ ${fromLabel} ➔ ${toLabel}: ${detail}`;
  const instructionShort = `${fromLabel} ➔ ${toLabel}: ${primary} ${arrow}`;

  return {
    from,
    to,
    direction,
    directions,
    instructionVi,
    instructionShort,
    sameFloor,
    floorChange,
  };
}

export function roomLabel(stop: TourRouteStopDto, lang: 'vi' | 'en' = 'vi'): string {
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
